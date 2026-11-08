import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameLibraryItem } from '../gameLibrary';
import { LessonAttempt, StudentLearningProgress, StudentRecord } from '../components/StudentProfile';
import { LessonData } from '../types';
import { DesertAction, DesertState, normalizeDesert } from '../desert/desertModel';

export type WorkspaceSnapshot = {
  students: StudentRecord[];
  games: GameLibraryItem[];
  lesson: LessonData;
  activeStudentId: string | null;
};

export type LessonMediaProgress = {
  completed: number;
  total: number;
};

export type CloudWorkspace = {
  configured: boolean;
  session: Session | null;
  ready: boolean;
  loadError: string;
  snapshot: WorkspaceSnapshot | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  prepareMedia: (snapshot: WorkspaceSnapshot, onProgress?: (progress: LessonMediaProgress) => void) => Promise<WorkspaceSnapshot>;
  save: (snapshot: WorkspaceSnapshot) => Promise<void>;
  refresh: () => Promise<WorkspaceSnapshot | null>;
  reload: () => void;
};

export type StudentPortalData = {
  student: StudentRecord;
  games: GameLibraryItem[];
};

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client: SupabaseClient | null = url && key ? createClient(url, key) : null;
const LESSON_MEDIA_BUCKET = 'lesson-media';
const MEDIA_DATA_URL_KEYS = new Set(['backgroundImageDataUrl', 'imageDataUrl', 'regionMapDataUrl', 'videoDataUrl']);

type MediaReference = { parent: Record<string, unknown>; key: string; dataUrl: string };

export function getCloudClient() {
  return client;
}

function findMediaReferences(value: unknown, references: MediaReference[] = []): MediaReference[] {
  if (Array.isArray(value)) {
    value.forEach(item => findMediaReferences(item, references));
    return references;
  }
  if (!value || typeof value !== 'object') return references;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (MEDIA_DATA_URL_KEYS.has(key) && typeof child === 'string' && child.startsWith('data:')) {
      references.push({ parent: record, key, dataUrl: child });
    } else {
      findMediaReferences(child, references);
    }
  }
  return references;
}

function fileExtension(dataUrl: string, mimeType: string) {
  const declaredMime = /^data:([^;,]+)/i.exec(dataUrl)?.[1]?.toLowerCase() || mimeType.toLowerCase();
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };
  return extensions[declaredMime] || 'bin';
}

/**
 * Moves embedded lesson files out of JSON before saving the workspace. Existing
 * lessons keep working because components accept both data URLs and HTTPS URLs.
 */
async function moveLessonMediaToStorage(snapshot: WorkspaceSnapshot, userId: string, onProgress?: (progress: LessonMediaProgress) => void) {
  if (!client) return snapshot;
  const prepared = JSON.parse(JSON.stringify(snapshot)) as WorkspaceSnapshot;
  const references = findMediaReferences(prepared);
  const uniqueDataUrls = [...new Set(references.map(reference => reference.dataUrl))];
  if (!uniqueDataUrls.length) return prepared;

  const uploadedUrls = new Map<string, string>();
  let completed = 0;
  onProgress?.({ completed, total: uniqueDataUrls.length });
  for (const dataUrl of uniqueDataUrls) {
    const response = await fetch(dataUrl);
    const file = await response.blob();
    const extension = fileExtension(dataUrl, file.type || 'application/octet-stream');
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(LESSON_MEDIA_BUCKET).upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) throw new Error(`Не удалось загрузить файл урока: ${error.message}`);
    const { data } = client.storage.from(LESSON_MEDIA_BUCKET).getPublicUrl(path);
    uploadedUrls.set(dataUrl, data.publicUrl);
    completed += 1;
    onProgress?.({ completed, total: uniqueDataUrls.length });
  }
  references.forEach(reference => { reference.parent[reference.key] = uploadedUrls.get(reference.dataUrl) || reference.dataUrl; });
  return prepared;
}

async function hashPortalToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createStudentPortalLink(studentId: string) {
  if (!client) throw new Error('Облачное хранилище не настроено.');
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const tokenHash = await hashPortalToken(token);
  const { error } = await client.rpc('create_student_portal_link', {
    p_student_id: studentId,
    p_token_hash: tokenHash,
  });
  if (error) throw error;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = new URLSearchParams({ portal: token }).toString();
  return url.toString();
}

export async function loadStudentPortal(token: string): Promise<StudentPortalData> {
  if (!client) throw new Error('Облачное хранилище не настроено.');
  const { data, error } = await client.rpc('read_student_portal', {
    p_token_hash: await hashPortalToken(token),
  });
  if (error) throw error;
  if (!data?.student || !Array.isArray(data.student.lessons)) {
    throw new Error('Ссылка кабинета недействительна. Попросите учителя создать новую.');
  }
  return { student: data.student as StudentRecord, games: Array.isArray(data.games) ? data.games : [] };
}

export async function saveStudentPortalAttempt(token: string, lessonId: string, points: number, learningProgress: StudentLearningProgress): Promise<LessonAttempt> {
  if (!client) throw new Error('Облачное хранилище не настроено.');
  const { data, error } = await client.rpc('record_student_portal_attempt', {
    p_token_hash: await hashPortalToken(token),
    p_lesson_id: lessonId,
    p_points: points,
    p_learning_progress: learningProgress,
  });
  if (error) throw error;
  return data as LessonAttempt;
}

export async function loadStudentDesert(studentId: string | null, portalToken = ''): Promise<{ desert: DesertState; earned: number }> {
  if (!client) throw new Error('Облачное хранилище не настроено.');
  const { data, error } = await client.rpc('read_student_desert', {
    p_student_id: portalToken ? null : studentId,
    p_token_hash: portalToken ? await hashPortalToken(portalToken) : null,
  });
  if (error) throw error;
  return { desert: normalizeDesert(data?.desert), earned: Number(data?.earned) || 0 };
}

export async function mutateStudentDesert(studentId: string | null, portalToken: string, action: DesertAction): Promise<{ desert: DesertState; earned: number }> {
  if (!client) throw new Error('Облачное хранилище не настроено.');
  const { data, error } = await client.rpc('mutate_student_desert', {
    p_action: action,
    p_student_id: portalToken ? null : studentId,
    p_token_hash: portalToken ? await hashPortalToken(portalToken) : null,
  });
  if (error) throw error;
  return { desert: normalizeDesert(data?.desert), earned: Number(data?.earned) || 0 };
}

export function useCloudWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!client);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const userIdRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);

  useEffect(() => {
    if (!client) return;
    let active = true;
    setReady(false);
    setLoadError('');
    let timeoutId = 0;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Supabase не ответил при проверке входа. Проверьте подключение и повторите попытку.')), 12000);
    });
    Promise.race([client.auth.getSession(), timeout]).then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('Could not restore the sign-in session', error);
      setSession(data.session);
      userIdRef.current = data.session?.user.id ?? null;
      if (!data.session) setReady(true);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('Could not restore the sign-in session', error);
      setLoadError(error instanceof Error ? error.message : 'Не удалось проверить вход. Проверьте подключение и повторите попытку.');
      setReady(false);
    }).finally(() => window.clearTimeout(timeoutId));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      const userChanged = userIdRef.current !== nextUserId;
      userIdRef.current = nextUserId;
      setSession(nextSession);
      if (!nextSession) {
        setLoadError('');
        setSnapshot(null);
        setReady(true);
      } else if (userChanged) {
        setLoadError('');
        setReady(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [reloadKey]);

  useEffect(() => {
    if (!client || !session?.user) return;
    let active = true;
    setReady(false);
    let timeoutId = 0;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Supabase не ответил при загрузке данных. Проверьте подключение и повторите попытку.')), 12000);
    });
    Promise.race([client.from('teacher_workspaces').select('data').eq('user_id', session.user.id).maybeSingle(), timeout])
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Could not load the cloud workspace', error);
          setSnapshot(null);
        setLoadError(error.message || 'Не удалось загрузить облачные данные. Проверьте подключение и повторите попытку.');
        setReady(false);
        } else {
          setSnapshot((data?.data as WorkspaceSnapshot | null) || null);
        setLoadError('');
        setReady(true);
        }
      }, (error: unknown) => {
        if (!active) return;
        console.error('Could not load the cloud workspace', error);
        setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить облачные данные. Проверьте подключение и повторите попытку.');
        setReady(false);
      }).finally(() => window.clearTimeout(timeoutId));
    return () => { active = false; };
  }, [session?.user.id, reloadKey]);

  const refresh = useCallback(async () => {
    if (!client || !session?.user) return snapshot;
    let pendingSave: Promise<void>;
    do {
      pendingSave = saveQueueRef.current;
      await pendingSave.catch(() => {});
    } while (pendingSave !== saveQueueRef.current);
    const version = saveVersionRef.current;
    const { data, error } = await client.from('teacher_workspaces').select('data').eq('user_id', session.user.id).maybeSingle();
    if (error) throw error;
    if (version !== saveVersionRef.current) return snapshot;
    const nextSnapshot = (data?.data as WorkspaceSnapshot | null) || null;
    if (JSON.stringify(nextSnapshot) !== JSON.stringify(snapshot)) setSnapshot(nextSnapshot);
    return nextSnapshot;
  }, [session?.user.id, snapshot]);

  return useMemo<CloudWorkspace>(() => ({
    configured: Boolean(client),
    session,
    ready,
    loadError,
    snapshot,
    signIn: async (email, password) => {
      if (!client) throw new Error('Облачное хранилище не настроено.');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password) => {
      if (!client) throw new Error('Облачное хранилище не настроено.');
      const { error } = await client.auth.signUp({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    prepareMedia: async (nextSnapshot, onProgress) => {
      if (!client || !session?.user) return nextSnapshot;
      return moveLessonMediaToStorage(nextSnapshot, session.user.id, onProgress);
    },
    save: async (nextSnapshot) => {
      if (!client || !session?.user) return;
      const userId = session.user.id;
      saveVersionRef.current += 1;
      const write = saveQueueRef.current.catch(() => {}).then(async () => {
        const { error } = await client.from('teacher_workspaces').upsert({
          user_id: userId,
          data: nextSnapshot,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        if (error) throw error;
      });
      saveQueueRef.current = write;
      await write;
    },
    refresh,
    reload: () => {
      setLoadError('');
      setReady(false);
      setReloadKey(current => current + 1);
    },
  }), [session, ready, snapshot, loadError, refresh]);
}

export function CloudLogin({ configured, signIn, signUp }: Pick<CloudWorkspace, 'configured' | 'signIn' | 'signUp'>) {
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setBusy(true);
    try {
      if (creatingAccount) {
        await signUp(email.trim(), password);
        setMessage('Если для проекта включено подтверждение почты, проверьте входящие и подтвердите адрес. Затем войдите.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось выполнить вход. Проверьте данные и повторите попытку.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-pink-100 via-violet-50 to-amber-50 p-4 font-sans text-slate-800">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border-2 border-pink-200 bg-white/95 p-7 shadow-xl">
      <div className="text-center text-4xl">📚</div>
      <h1 className="mt-3 text-center text-2xl font-black">Кабинет учителя</h1>
      <p className="mt-2 text-center text-sm font-medium text-slate-500">Войдите, чтобы хранить уроки и карточки учеников и открывать их на других устройствах.</p>
      {!configured ? <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Облачное хранилище ещё не подключено к опубликованной версии сайта.</p> : <>
        <label className="mt-5 block text-xs font-bold">Электронная почта<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-pink-400" /></label>
        <label className="mt-3 block text-xs font-bold">Пароль<input required type="password" minLength={6} autoComplete={creatingAccount ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-pink-400" /></label>
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? 'Подождите…' : creatingAccount ? 'Создать аккаунт' : 'Войти'}</button>
        <button type="button" onClick={() => { setCreatingAccount(!creatingAccount); setMessage(''); }} className="mt-3 w-full text-xs font-bold text-pink-700">{creatingAccount ? 'У меня уже есть аккаунт' : 'Создать новый аккаунт'}</button>
      </>}
      {message && <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">{message}</p>}
    </form>
  </main>;
}

import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { GameLibraryItem } from '../gameLibrary';
import { LessonAttempt, StudentRecord } from '../components/StudentProfile';
import { LessonData } from '../types';

export type WorkspaceSnapshot = {
  students: StudentRecord[];
  games: GameLibraryItem[];
  lesson: LessonData;
  activeStudentId: string | null;
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
  save: (snapshot: WorkspaceSnapshot) => Promise<void>;
  reload: () => void;
};

export type StudentPortalData = {
  student: StudentRecord;
  games: GameLibraryItem[];
};

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client: SupabaseClient | null = url && key ? createClient(url, key) : null;

export function getCloudClient() {
  return client;
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

export async function saveStudentPortalAttempt(token: string, lessonId: string, points: number): Promise<LessonAttempt> {
  if (!client) throw new Error('Облачное хранилище не настроено.');
  const { data, error } = await client.rpc('record_student_portal_attempt', {
    p_token_hash: await hashPortalToken(token),
    p_lesson_id: lessonId,
    p_points: points,
  });
  if (error) throw error;
  return data as LessonAttempt;
}

export function useCloudWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!client);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
      if (!data.session) setReady(true);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('Could not restore the sign-in session', error);
      setLoadError(error instanceof Error ? error.message : 'Не удалось проверить вход. Проверьте подключение и повторите попытку.');
      setReady(false);
    }).finally(() => window.clearTimeout(timeoutId));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadError('');
      if (!nextSession) {
        setSnapshot(null);
        setReady(true);
      } else {
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
    save: async (nextSnapshot) => {
      if (!client || !session?.user) return;
      const { error } = await client.from('teacher_workspaces').upsert({
        user_id: session.user.id,
        data: nextSnapshot,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    reload: () => {
      setLoadError('');
      setReady(false);
      setReloadKey(current => current + 1);
    },
  }), [session, ready, snapshot, loadError]);
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

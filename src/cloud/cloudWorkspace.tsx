import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { GameLibraryItem } from '../gameLibrary';
import { StudentRecord } from '../components/StudentProfile';
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
  snapshot: WorkspaceSnapshot | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  save: (snapshot: WorkspaceSnapshot) => Promise<void>;
};

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client: SupabaseClient | null = url && key ? createClient(url, key) : null;

export function getCloudClient() {
  return client;
}

export function useCloudWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!client);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('Could not restore the sign-in session', error);
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setSnapshot(null);
        setReady(true);
      } else {
        setReady(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!client || !session?.user) return;
    let active = true;
    setReady(false);
    client.from('teacher_workspaces').select('data').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Could not load the cloud workspace', error);
          setSnapshot(null);
        } else {
          setSnapshot((data?.data as WorkspaceSnapshot | null) || null);
        }
        setReady(true);
      });
    return () => { active = false; };
  }, [session?.user.id]);

  return useMemo<CloudWorkspace>(() => ({
    configured: Boolean(client),
    session,
    ready,
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
  }), [session, ready, snapshot]);
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

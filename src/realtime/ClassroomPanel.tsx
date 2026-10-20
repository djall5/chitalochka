import { useMemo, useState } from 'react';
import { Check, Copy, Link2, Radio, Users, X } from 'lucide-react';
import { RoomMember, RoomRole } from './lessonRoom';

type Props = {
  configured: boolean;
  roomId: string | null;
  role: RoomRole | null;
  status: string;
  statusMessage: string | null;
  members: RoomMember[];
  lastAction: { role: RoomRole; name: string; label: string } | null;
  onCreate: (name: string) => Promise<string>;
  onJoin: (id: string, name: string) => Promise<string>;
  onLeave: () => Promise<void>;
};

const statusText: Record<string, string> = {
  idle: 'Пока не подключено',
  connecting: 'Подключаемся…',
  connected: 'Участники видят друг друга',
  disconnected: 'Соединение закрыто',
  error: 'Не удалось подключиться',
};

export function ClassroomPanel({ configured, roomId, role, status, statusMessage, members, lastAction, onCreate, onJoin, onLeave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const studentLink = useMemo(() => roomId ? `${window.location.origin}${window.location.pathname}?room=${roomId}&role=student` : '', [roomId]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось выполнить действие.'); }
    finally { setBusy(false); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(studentLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setError('Не удалось скопировать ссылку. Выделите и скопируйте её вручную.'); }
  };

  return <section className="mb-3 w-full rounded-2xl border border-violet-200 bg-white/90 p-3 shadow-sm md:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Users className="h-4 w-4" /></span>
        <div><div className="text-sm font-black text-slate-800">Совместный урок</div><div className="text-[11px] font-semibold text-slate-500">Курсоры, шаг и баллы синхронизируются</div></div>
      </div>
      <button onClick={() => setOpen(value => !value)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-violet-700">
        <Radio className="h-3.5 w-3.5" />{roomId ? 'Комната подключена' : 'Подключить ученика'}
      </button>
    </div>

    {open && <div className="mt-3 border-t border-violet-100 pt-3 text-left">
      {!configured && <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900">Для связи с другого устройства подключите Supabase. Инструкция находится в файле <b>REALTIME_SETUP.md</b>; после настройки перезапустите сайт.</div>}

      {roomId ? <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={`font-black ${status === 'connected' ? 'text-emerald-700' : 'text-violet-700'}`}>{statusText[status] || statusText.idle}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">{members.length} в комнате · {role === 'teacher' ? 'вы учитель' : 'вы ученик'}</span>
        </div>
        {lastAction && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{lastAction.name}: {lastAction.label}</div>}
        {role === 'teacher' && <div className="rounded-xl bg-violet-50 p-3">
          <div className="text-[11px] font-black text-violet-900">Код подключения</div>
          <div className="mt-1 flex flex-wrap items-center gap-2"><code className="rounded-lg bg-white px-3 py-2 text-sm font-black tracking-[0.15em] text-slate-800">{roomId}</code><button onClick={() => void copyLink()} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}</button></div>
          <div className="mt-2 break-all text-[10px] font-medium text-slate-500"><Link2 className="mr-1 inline h-3 w-3" />{studentLink}</div>
        </div>}
        {statusMessage && <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{statusMessage}</div>}
        <button disabled={busy} onClick={() => void run(onLeave)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50"><X className="h-3 w-3" />Завершить связь</button>
      </div> : configured ? <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-violet-50 p-3">
          <div className="text-xs font-black text-violet-900">Я учитель</div>
          <input value={name} onChange={event => setName(event.target.value)} maxLength={40} placeholder="Ваше имя" className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500" />
          <button disabled={busy} onClick={() => void run(() => onCreate(name || 'Учитель'))} className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy ? 'Подключаем…' : 'Создать комнату'}</button>
        </div>
        <div className="rounded-xl bg-pink-50 p-3">
          <div className="text-xs font-black text-pink-900">Я ученик</div>
          <input value={name} onChange={event => setName(event.target.value)} maxLength={40} placeholder="Ваше имя" className="mt-2 w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500" />
          <input value={code} onChange={event => setCode(event.target.value.replace(/[^a-f0-9]/gi, '').slice(0, 16))} placeholder="Код из 16 символов" maxLength={16} className="mt-2 w-full rounded-lg border border-pink-200 bg-white px-3 py-2 font-mono text-sm tracking-wider outline-none focus:border-pink-500" />
          <button disabled={busy || code.length !== 16} onClick={() => void run(() => onJoin(code, name || 'Ученик'))} className="mt-2 w-full rounded-lg bg-pink-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy ? 'Подключаем…' : 'Подключиться по коду'}</button>
        </div>
      </div> : null}
      {error && <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
    </div>}
  </section>;
}

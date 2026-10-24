import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type RoomRole = 'teacher' | 'student';

export interface ClassroomState {
  lesson: unknown;
  currentStep: number;
  score: number;
  studentName?: string;
  showCompletion?: boolean;
}

export interface ClassroomViewState {
  currentStep: number;
  score: number;
  showCompletion: boolean;
}

export interface RoomMember {
  id: string;
  role: RoomRole;
  name: string;
}

export interface RoomCursor {
  id: string;
  role: RoomRole;
  name: string;
  x: number;
  y: number;
  clickAt?: number;
}

export interface RoomInteraction {
  role: RoomRole;
  name: string;
  type: 'pointerdown' | 'pointermove' | 'pointerup';
  path: number[];
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  pointerType: string;
  button: number;
}

export interface LessonRoomCallbacks {
  onState?: (state: ClassroomState) => void;
  onProgress?: (score: number) => void;
  onStep?: (step: number) => void;
  onView?: (view: ClassroomViewState) => void;
  onMembers?: (members: RoomMember[]) => void;
  onCursor?: (cursor: RoomCursor | null) => void;
  onInteraction?: (interaction: RoomInteraction) => void;
  onAction?: (action: { role: RoomRole; name: string; label: string }) => void;
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
}

const ROOM_ID_PATTERN = /^[a-f0-9]{16}$/i;
const MESSAGE_LIMIT = 180_000;

function makeClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? createClient(url, key) : null;
}

export class LessonRoom {
  private client = makeClient();
  private channel: RealtimeChannel | null = null;
  private member: RoomMember | null = null;
  private callbacks: LessonRoomCallbacks = {};
  private latestState: ClassroomState | null = null;
  private broadcastTimer = 0;
  private interactionTimer = 0;

  setCallbacks(callbacks: LessonRoomCallbacks) {
    this.callbacks = callbacks;
  }

  get configured() {
    return Boolean(this.client);
  }

  async create(name: string, initialState?: ClassroomState) {
    const roomId = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    this.latestState = initialState || null;
    await this.connect(roomId, 'teacher', name);
    return roomId;
  }

  async join(roomId: string, name: string) {
    const normalized = roomId.replace(/[^a-f0-9]/gi, '').slice(0, 16);
    if (!ROOM_ID_PATTERN.test(normalized)) throw new Error('Введите код из 16 латинских букв и цифр.');
    await this.connect(normalized, 'student', name);
    return normalized;
  }

  private async connect(roomId: string, role: RoomRole, name: string) {
    if (!this.client) throw new Error('Сначала подключите Supabase: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.');
    const initialState = this.latestState;
    await this.leave();
    this.latestState = initialState;
    this.callbacks.onStatus?.('connecting');
    this.member = { id: crypto.randomUUID(), role, name: name.trim() || (role === 'teacher' ? 'Учитель' : 'Ученик') };
    const channel = this.client.channel(`lesson-room:${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: this.member.id } },
    });
    this.channel = channel;

    channel
      .on('broadcast', { event: 'lesson-state' }, ({ payload }) => this.callbacks.onState?.(payload as ClassroomState))
      .on('broadcast', { event: 'student-progress' }, ({ payload }) => this.callbacks.onProgress?.(Number(payload.score) || 0))
      .on('broadcast', { event: 'student-step' }, ({ payload }) => this.callbacks.onStep?.(Number(payload.step) || 0))
      .on('broadcast', { event: 'lesson-view' }, ({ payload }) => this.callbacks.onView?.(payload as ClassroomViewState))
      .on('broadcast', { event: 'cursor' }, ({ payload }) => this.callbacks.onCursor?.(payload as RoomCursor))
      .on('broadcast', { event: 'interaction' }, ({ payload }) => this.callbacks.onInteraction?.(payload as RoomInteraction))
      .on('broadcast', { event: 'action' }, ({ payload }) => this.callbacks.onAction?.(payload as { role: RoomRole; name: string; label: string }))
      .on('broadcast', { event: 'state-request' }, () => {
        if (this.member?.role === 'teacher' && this.latestState) void this.publishState(this.latestState);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<RoomMember>();
        const members = Object.values(state).flat().map(item => ({ id: item.id, role: item.role, name: item.name }));
        this.callbacks.onMembers?.(members);
      })
      .subscribe(async status => {
        if (this.channel !== channel) return;
        if (status === 'SUBSCRIBED') {
          this.callbacks.onStatus?.('connected');
          await channel.track(this.member!);
          if (role === 'student') void channel.send({ type: 'broadcast', event: 'state-request', payload: {} });
          else if (this.latestState) void this.publishState(this.latestState);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.callbacks.onStatus?.('error', 'Не удалось подключиться к комнате. Проверьте настройки Supabase и код.');
        } else if (status === 'CLOSED') {
          this.callbacks.onStatus?.('disconnected');
        }
      });
  }

  setLatestState(state: ClassroomState) {
    this.latestState = state;
  }

  async publishState(state: ClassroomState) {
    this.latestState = state;
    if (this.member?.role !== 'teacher' || !this.channel) return;
    const serialized = JSON.stringify(state);
    if (serialized.length > MESSAGE_LIMIT) {
      this.callbacks.onStatus?.('error', 'Урок слишком большой для синхронизации: уменьшите размер загруженных изображений.');
      return;
    }
    await this.channel.send({ type: 'broadcast', event: 'lesson-state', payload: state });
  }

  async publishProgress(score: number) {
    if (this.member?.role === 'student' && this.channel) {
      await this.channel.send({ type: 'broadcast', event: 'student-progress', payload: { score } });
    }
  }

  async publishStep(step: number) {
    if (this.member?.role === 'student' && this.channel) {
      await this.channel.send({ type: 'broadcast', event: 'student-step', payload: { step } });
    }
  }

  publishView(view: ClassroomViewState) {
    if (!this.channel || !this.member) return;
    void this.channel.send({ type: 'broadcast', event: 'lesson-view', payload: view });
  }

  publishCursor(x: number, y: number, clickAt?: number) {
    if (!this.channel || !this.member) return;
    const now = Date.now();
    if (!clickAt && now - this.broadcastTimer < 45) return;
    this.broadcastTimer = now;
    void this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { ...this.member, x, y, clickAt } satisfies RoomCursor,
    });
  }

  publishInteraction(interaction: Omit<RoomInteraction, 'role' | 'name'>) {
    if (!this.channel || !this.member) return;
    const now = Date.now();
    if (interaction.type === 'pointermove' && now - this.interactionTimer < 45) return;
    this.interactionTimer = now;
    void this.channel.send({
      type: 'broadcast',
      event: 'interaction',
      payload: { ...this.member, ...interaction } satisfies RoomInteraction,
    });
  }

  publishAction(label: string) {
    if (!this.channel || !this.member) return;
    void this.channel.send({ type: 'broadcast', event: 'action', payload: { role: this.member.role, name: this.member.name, label } });
  }

  async leave() {
    const channel = this.channel;
    this.channel = null;
    this.member = null;
    this.latestState = null;
    if (channel && this.client) await this.client.removeChannel(channel);
  }
}

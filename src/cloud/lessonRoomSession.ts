import type { GameLibraryItem } from '../gameLibrary';
import type { LessonData } from '../types';
import { getCloudClient } from './cloudWorkspace';

export type RoomLessonView = {
  currentStep: number;
  score: number;
  showCompletion: boolean;
  studentReadyStep?: number | null;
};

export type LessonRoomSession = {
  roomId: string;
  token: string;
  expiresAt: string;
  lesson: LessonData;
  games: GameLibraryItem[];
  view: RoomLessonView;
  studentName: string;
  studentId?: string;
  character?: unknown;
};

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createLessonRoomSession(input: Omit<LessonRoomSession, 'roomId' | 'token' | 'expiresAt'>) {
  const client = getCloudClient();
  if (!client) throw new Error('Облачное хранилище ещё не подключено.');
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error('Чтобы создать комнату, войдите в кабинет учителя.');
  const token = newToken();
  const { data, error } = await client.rpc('create_lesson_room', {
    p_token_hash: await hashToken(token),
    p_lesson: input.lesson,
    p_games: input.games,
    p_state: input.view,
    p_student_name: input.studentName,
    p_student_id: input.studentId || null,
    p_character: input.character || null,
  });
  if (error) throw error;
  if (!data?.roomId || !data?.expiresAt) throw new Error('Не удалось подготовить комнату. Повторите попытку.');
  return { ...input, roomId: String(data.roomId), expiresAt: String(data.expiresAt), token } satisfies LessonRoomSession;
}

export async function loadLessonRoomSession(roomId: string, token: string): Promise<LessonRoomSession> {
  const client = getCloudClient();
  if (!client) throw new Error('Облачное хранилище ещё не подключено.');
  const { data, error } = await client.rpc('read_lesson_room', { p_room_id: roomId, p_token_hash: await hashToken(token) });
  if (error) throw error;
  if (!data?.lesson || !data?.roomId) throw new Error('Эта ссылка на урок недействительна, закрыта или уже истекла. Попросите учителя создать новую.');
  return {
    roomId: String(data.roomId), token, expiresAt: String(data.expiresAt),
    lesson: data.lesson as LessonData,
    games: Array.isArray(data.games) ? data.games as GameLibraryItem[] : [],
    view: { currentStep: Number(data.state?.currentStep) || 0, score: Number(data.state?.score) || 0, showCompletion: Boolean(data.state?.showCompletion), studentReadyStep: Number.isInteger(data.state?.studentReadyStep) ? Number(data.state.studentReadyStep) : null },
    studentName: String(data.studentName || 'Ученик'), studentId: data.studentId || undefined, character: data.character || undefined,
  };
}

export async function saveLessonRoomView(roomId: string, view: RoomLessonView) {
  const client = getCloudClient();
  if (!client) return;
  const { error } = await client.rpc('update_lesson_room_state', { p_room_id: roomId, p_state: view });
  if (error) throw error;
}

export async function closeLessonRoomSession(roomId: string) {
  const client = getCloudClient();
  if (!client) return;
  const { error } = await client.rpc('close_lesson_room', { p_room_id: roomId });
  if (error) throw error;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { ClassroomState, ClassroomViewState, LessonRoom, RoomCursor, RoomInteraction, RoomMember, RoomRole } from './lessonRoom';
import type { DesertAction } from '../desert/desertModel';

export function useLessonRoom(callbacks: {
  onState: (state: ClassroomState) => void;
  onProgress: (score: number) => void;
  onStep: (step: number) => void;
  onView: (view: ClassroomViewState) => void;
  onAction: (action: { role: RoomRole; name: string; label: string }) => void;
  onDesertAction: (action: DesertAction) => void;
  onInteraction: (interaction: RoomInteraction) => void;
}) {
  const roomRef = useRef<LessonRoom | null>(null);
  if (!roomRef.current) roomRef.current = new LessonRoom();
  const room = roomRef.current;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<RoomRole | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RoomCursor[]>([]);
  const [lastAction, setLastAction] = useState<{ role: RoomRole; name: string; label: string } | null>(null);

  useEffect(() => {
    room.setCallbacks({
      onState: state => callbacksRef.current.onState(state),
      onProgress: score => callbacksRef.current.onProgress(score),
      onStep: step => callbacksRef.current.onStep(step),
      onView: view => callbacksRef.current.onView(view),
      onMembers: connected => {
        setMembers(connected);
      },
      onCursor: cursor => {
        if (!cursor) {
          setRemoteCursors([]);
          return;
        }
        setRemoteCursors(previous => [...previous.filter(item => item.id !== cursor.id), cursor]);
      },
      onInteraction: interaction => callbacksRef.current.onInteraction(interaction),
      onAction: action => { setLastAction(action); callbacksRef.current.onAction(action); },
      onDesertAction: action => callbacksRef.current.onDesertAction(action),
      onStatus: (next, message) => {
        setStatus(next);
        setStatusMessage(message || null);
      },
    });
  }, [room]);

  useEffect(() => () => { void room.leave(); }, [room]);

  const create = useCallback(async (name: string, initialState?: ClassroomState) => {
    const id = await room.create(name, initialState);
    setRoomId(id);
    setRole('teacher');
    return id;
  }, [room]);

  const join = useCallback(async (id: string, name: string) => {
    const normalized = await room.join(id, name);
    setRoomId(normalized);
    setRole('student');
    return normalized;
  }, [room]);

  const leave = useCallback(async () => {
    await room.leave();
    setRoomId(null);
    setRole(null);
    setMembers([]);
    setRemoteCursors([]);
    setLastAction(null);
    setStatus('idle');
    setStatusMessage(null);
  }, [room]);

  return {
    configured: room.configured,
    roomId,
    role,
    status,
    statusMessage,
    members,
    remoteCursors,
    lastAction,
    create,
    join,
    leave,
    publishState: (state: ClassroomState) => room.publishState(state),
    setLatestState: (state: ClassroomState) => room.setLatestState(state),
    publishProgress: (score: number) => room.publishProgress(score),
    publishStep: (step: number) => room.publishStep(step),
    publishView: (view: ClassroomViewState) => room.publishView(view),
    publishCursor: (x: number, y: number, clickAt?: number) => room.publishCursor(x, y, clickAt),
    publishInteraction: (interaction: Omit<RoomInteraction, 'role' | 'name'>) => room.publishInteraction(interaction),
    publishAction: (label: string) => room.publishAction(label),
    publishDesertAction: (action: DesertAction) => room.publishDesertAction(action),
  };
}

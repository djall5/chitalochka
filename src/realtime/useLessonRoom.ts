import { useCallback, useEffect, useRef, useState } from 'react';
import { ClassroomState, LessonRoom, RoomCursor, RoomMember, RoomRole } from './lessonRoom';

export function useLessonRoom(callbacks: {
  onState: (state: ClassroomState) => void;
  onProgress: (score: number) => void;
  onStep: (step: number) => void;
  onAction: (action: { role: RoomRole; name: string; label: string }) => void;
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
  const [remoteCursor, setRemoteCursor] = useState<RoomCursor | null>(null);
  const [lastAction, setLastAction] = useState<{ role: RoomRole; name: string; label: string } | null>(null);

  useEffect(() => {
    room.setCallbacks({
      onState: state => callbacksRef.current.onState(state),
      onProgress: score => callbacksRef.current.onProgress(score),
      onStep: step => callbacksRef.current.onStep(step),
      onMembers: connected => {
        setMembers(connected);
        setRemoteCursor(previous => previous && !connected.some(member => member.id === previous.id) ? null : previous);
      },
      onCursor: cursor => setRemoteCursor(cursor),
      onAction: action => { setLastAction(action); callbacksRef.current.onAction(action); },
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
    setRemoteCursor(null);
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
    remoteCursor,
    lastAction,
    create,
    join,
    leave,
    publishState: (state: ClassroomState) => room.publishState(state),
    setLatestState: (state: ClassroomState) => room.setLatestState(state),
    publishProgress: (score: number) => room.publishProgress(score),
    publishStep: (step: number) => room.publishStep(step),
    publishCursor: (x: number, y: number, clickAt?: number) => room.publishCursor(x, y, clickAt),
    publishAction: (label: string) => room.publishAction(label),
  };
}

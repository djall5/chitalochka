import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, Check, Edit3, Library, MousePointer2, Play, Volume2, VolumeX } from 'lucide-react';
import { LessonData } from './types';
import { defaultLessonY } from './defaultLessons';
import { Step1Coloring } from './components/steps/Step1Coloring';
import { Step2Falling } from './components/steps/Step2Falling';
import { Step3Maze } from './components/steps/Step3Maze';
import { Step4Drawing } from './components/steps/Step4Drawing';
import { Step5WordFill } from './components/steps/Step5WordFill';
import { Step6ReadingCards } from './components/steps/Step6ReadingCards';
import { Step7TextReading } from './components/steps/Step7TextReading';
import { Step8BuildHouse } from './components/steps/Step8BuildHouse';
import { Step9Memory } from './components/steps/Step9Memory';
import { Step10FillJar } from './components/steps/Step10FillJar';
import { LessonEditor } from './components/editor/LessonEditor';
import { LessonBuilder, TeacherWorkspace } from './components/TeacherWorkspace';
import { collectLessonLearningProgress, LessonAttempt, mergeLearningProgress, StudentProfile, StudentRecord } from './components/StudentProfile';
import { StudentSelection } from './components/StudentSelection';
import { cloneLesson, DEFAULT_GAME_LIBRARY, GameLibraryItem, GameStepKey, gameStepIndex, lessonGameOrder } from './gameLibrary';
import { playTransitionSound, isSoundMuted, toggleSound } from './utils/audio';
import { ClassroomPanel } from './realtime/ClassroomPanel';
import { RoomInteraction, RoomRole } from './realtime/lessonRoom';
import { useLessonRoom } from './realtime/useLessonRoom';
import { CloudLogin, CloudWorkspace, createStudentPortalLink, loadStudentPortal, loadStudentDesert, mutateStudentDesert, saveStudentPortalAttempt, useCloudWorkspace } from './cloud/cloudWorkspace';
import { StudentPortalDashboard } from './components/StudentPortalDashboard';
import { DesertGame } from './components/DesertGame';
import { applyDesertAction, blankDesert, DesertAction, DesertState, desertBalance } from './desert/desertModel';

const ACTIVE_LESSON_KEY = 'literacy_game_lesson_v2';
const LESSON_LIBRARY_KEY = 'literacy_teacher_lessons_v1';
const GAME_LIBRARY_KEY = 'literacy_teacher_games_v1';
const STUDENT_ATTEMPTS_KEY = 'literacy_student_attempts_v1';
const STUDENT_NAME_KEY = 'literacy_student_name_v1';
const STUDENTS_KEY = 'literacy_students_v1';
const ACTIVE_STUDENT_KEY = 'literacy_active_student_v1';

function readAttempts(): LessonAttempt[] {
  try {
    const saved = localStorage.getItem(STUDENT_ATTEMPTS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function readStudents(): StudentRecord[] {
  try {
    const stored = localStorage.getItem(STUDENTS_KEY);
    const legacyLibrary = localStorage.getItem(LESSON_LIBRARY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        let changed = false;
        const normalized = parsed.map((student, index) => {
          const lessons = Array.isArray(student.lessons)
            ? student.lessons.map((item: LessonData) => cloneLesson(item))
            : (index === 0 && legacyLibrary ? readLessons() : []);
          if (!Array.isArray(student.lessons)) changed = true;
          return { ...student, attempts: Array.isArray(student.attempts) ? student.attempts : [], lessons } as StudentRecord;
        });
        if (changed) {
          try { localStorage.setItem(STUDENTS_KEY, JSON.stringify(normalized)); } catch { /* migration remains available in memory */ }
        }
        return normalized;
      }
    }
    const oldAttempts = readAttempts();
    const oldName = localStorage.getItem(STUDENT_NAME_KEY);
    if (oldAttempts.length || oldName || legacyLibrary) {
      return [{ id: 'student-migrated', name: oldName || 'Мой ученик', attempts: oldAttempts, lessons: legacyLibrary ? readLessons().map(cloneLesson) : [] }];
    }
  } catch { /* create a clean student list */ }
  return [];
}

function readLessons(): LessonData[] {
  try {
    const stored = localStorage.getItem(LESSON_LIBRARY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
    const oldActive = localStorage.getItem(ACTIVE_LESSON_KEY);
    const imported = oldActive ? JSON.parse(oldActive) as LessonData : null;
    return imported ? [imported] : [];
  } catch {
    return [];
  }
}

function readGames(): GameLibraryItem[] {
  try {
    const stored = localStorage.getItem(GAME_LIBRARY_KEY);
    if (stored) {
      const custom = JSON.parse(stored) as GameLibraryItem[];
      if (Array.isArray(custom)) return [...DEFAULT_GAME_LIBRARY, ...custom.filter(game => game.custom)];
    }
  } catch { /* use the built-in activity catalog */ }
  return DEFAULT_GAME_LIBRARY;
}

function getElementPath(root: Element, target: Element): number[] | null {
  const path: number[] = [];
  let current: Element | null = target;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, current) as number);
    current = parent;
  }
  return current === root ? path : null;
}

function findElementAtPath(root: Element, path: number[]) {
  let current = root;
  for (const index of path) {
    const next = current.children.item(index);
    if (!next) return null;
    current = next;
  }
  return current;
}

type Screen = 'library' | 'builder' | 'preview' | 'play' | 'edit' | 'student' | 'student-select' | 'student-portal' | 'desert';

function WorkspaceApp({ cloud, studentPortalToken = '' }: { cloud: CloudWorkspace; studentPortalToken?: string }) {
  const [games, setGames] = useState<GameLibraryItem[]>(() => cloud.snapshot?.games || readGames());
  const [students, setStudents] = useState<StudentRecord[]>(() => cloud.snapshot?.students || readStudents());
  const [activeStudentId, setActiveStudentId] = useState<string | null>(() => cloud.snapshot?.activeStudentId ?? null);
  const [lesson, setLesson] = useState<LessonData>(() => {
    if (cloud.snapshot?.lesson) return cloud.snapshot.lesson;
    const portalLesson = studentPortalToken && cloud.snapshot?.students[0]?.lessons[0];
    if (portalLesson) return portalLesson;
    try {
      const saved = localStorage.getItem(ACTIVE_LESSON_KEY);
      if (saved) return JSON.parse(saved) as LessonData;
    } catch { /* use the starter lesson */ }
    return cloneLesson(defaultLessonY);
  });
  const [screen, setScreen] = useState<Screen>(studentPortalToken ? 'student-portal' : 'student-select');
  const [builderEditing, setBuilderEditing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [desertSnapshot, setDesertSnapshot] = useState<{ studentId: string; desert: DesertState; earned: number } | null>(null);
  const [desertReturnScreen, setDesertReturnScreen] = useState<Screen>('student');
  const [desertLoading, setDesertLoading] = useState(false);
  const answeredKeys = useRef(new Set<string>());
  const completedRun = useRef(false);
  const [editorStartTab, setEditorStartTab] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => isSoundMuted());
  const [roomStudentName, setRoomStudentName] = useState('');
  const [roomCharacter, setRoomCharacter] = useState<StudentRecord['character']>();
  const lessonSurfaceRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const cloudSnapshotRef = useRef(cloud.snapshot);

  const collaboration = useLessonRoom({
    onState: incoming => {
      if (!incoming.lesson || typeof incoming.lesson !== 'object') return;
      setLesson(incoming.lesson as LessonData);
      setRoomStudentName(incoming.studentName || 'Ученик');
      setRoomCharacter(incoming.character);
      setCurrentStep(incoming.currentStep);
      setScore(incoming.score);
      setShowCompletion(Boolean(incoming.showCompletion));
      if (incoming.desert && incoming.studentId) setDesertSnapshot({ studentId: incoming.studentId, desert: incoming.desert, earned: incoming.desertEarned || 0 });
      setScreen(incoming.desertOpen ? 'desert' : 'play');
    },
    onProgress: setScore,
    onStep: setCurrentStep,
    onView: incoming => {
      setCurrentStep(incoming.currentStep);
      setScore(incoming.score);
      setShowCompletion(incoming.showCompletion);
    },
    onAction: action => {
      if (action.role !== 'student') return;
      if (action.label === 'завершил урок' && collaboration.role === 'teacher') void handleFinishLesson();
      if (action.label === 'открыть пустыню' && collaboration.role === 'teacher') void openDesert();
      if (action.label === 'закрыть пустыню' && collaboration.role === 'teacher') closeDesert();
    },
    onDesertAction: action => {
      if (collaboration.role === 'teacher') void performDesertAction(action).catch(error => showToast(error instanceof Error ? error.message : 'Не удалось сохранить оазис.'));
    },
    onInteraction: interaction => {
      const surface = lessonSurfaceRef.current;
      if (!surface) return;
      const target = findElementAtPath(surface, interaction.path);
      if (!(target instanceof HTMLElement)) return;
      const bounds = surface.getBoundingClientRect();
      const targetBounds = target.getBoundingClientRect();
      const targetX = Number.isFinite(interaction.targetX) ? interaction.targetX : interaction.x;
      const targetY = Number.isFinite(interaction.targetY) ? interaction.targetY : interaction.y;
      const clientX = targetBounds.width > 0 ? targetBounds.left + targetX * targetBounds.width : bounds.left + interaction.x * bounds.width;
      const clientY = targetBounds.height > 0 ? targetBounds.top + targetY * targetBounds.height : bounds.top + interaction.y * bounds.height;
      const isDown = interaction.type === 'pointerdown';
      const isUp = interaction.type === 'pointerup';
      const buttons = isDown || (!isUp && interaction.type === 'pointermove') ? 1 : 0;
      const eventOptions = { bubbles: true, cancelable: true, clientX, clientY, pointerId: 1, pointerType: interaction.pointerType, button: interaction.button, buttons, isPrimary: true };
      target.dispatchEvent(new PointerEvent(interaction.type, eventOptions));
      const mouseType = interaction.type === 'pointerdown' ? 'mousedown' : interaction.type === 'pointermove' ? 'mousemove' : 'mouseup';
      target.dispatchEvent(new MouseEvent(mouseType, { bubbles: true, cancelable: true, clientX, clientY, button: interaction.button, buttons }));
      if (isUp) target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX, clientY, button: interaction.button }));
    },
  });

  const order = lessonGameOrder(lesson);
  const orderedGames = useMemo(() => order.map(id => {
    const sourceGameId = lesson.gameInstances?.[id]?.sourceGameId || id;
    const source = games.find(game => game.id === sourceGameId) || DEFAULT_GAME_LIBRARY.find(game => game.id === sourceGameId);
    return source ? { ...source, id } : undefined;
  }).filter(Boolean) as GameLibraryItem[], [order.join('|'), games, lesson.gameInstances]);
  const currentGame = orderedGames[currentStep];
  const currentGameConfig = currentGame ? lesson.gameInstances?.[currentGame.id]?.config[currentGame.stepKey] : undefined;
  const activeLesson = currentGameConfig ? { ...lesson, [currentGame.stepKey]: currentGameConfig } as LessonData : lesson;
  const activeStudent = students.find(student => student.id === activeStudentId);
  const lessons = activeStudent?.lessons || [];
  const studentAttempts = activeStudent?.attempts || [];
  const studentName = activeStudent?.name || 'Ученик';
  const displayStudentName = collaboration.role === 'student' ? roomStudentName || 'Ученик' : studentName;

  useEffect(() => {
    if (!activeStudent || (screen !== 'student' && screen !== 'student-portal')) return;
    let cancelled = false;
    void loadStudentDesert(activeStudent.id, studentPortalToken).then(result => {
      if (!cancelled) setDesertSnapshot({ studentId: activeStudent.id, ...result });
    }).catch(() => { if (!cancelled) setDesertSnapshot(null); });
    return () => { cancelled = true; };
  }, [activeStudent?.id, activeStudent?.attempts.length, screen, studentPortalToken]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const persistStudents = (next: StudentRecord[]) => {
    setStudents(next);
    if (studentPortalToken) return;
    try { localStorage.setItem(STUDENTS_KEY, JSON.stringify(next)); } catch { showToast('Не удалось сохранить данные учеников'); }
  };

  useEffect(() => {
    if (studentPortalToken || !cloud.snapshot || cloud.snapshot === cloudSnapshotRef.current) return;
    cloudSnapshotRef.current = cloud.snapshot;
    setStudents(cloud.snapshot.students);
    setGames(cloud.snapshot.games);
    setLesson(cloud.snapshot.lesson);
    setActiveStudentId(cloud.snapshot.activeStudentId);
  }, [studentPortalToken, cloud.snapshot]);

  useEffect(() => {
    if (studentPortalToken || !cloud.session) return;
    const refreshWorkspace = () => {
      if (document.visibilityState === 'visible') void cloud.refresh().catch(() => {});
    };
    const interval = window.setInterval(refreshWorkspace, 10000);
    window.addEventListener('focus', refreshWorkspace);
    document.addEventListener('visibilitychange', refreshWorkspace);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWorkspace);
      document.removeEventListener('visibilitychange', refreshWorkspace);
    };
  }, [studentPortalToken, cloud.session?.user.id, cloud.refresh]);

  useEffect(() => {
    if (!cloud.session || !cloud.ready) return;
    const snapshot = { students, games, lesson, activeStudentId };
    const timer = window.setTimeout(() => {
      void cloud.save(snapshot).catch(error => {
        console.error('Не удалось сохранить данные в облако', error);
        showToast('Не удалось сохранить в облако. Проверьте подключение.');
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [students, games, lesson, activeStudentId, cloud.session?.user.id, cloud.ready]);

  useEffect(() => {
    if (studentPortalToken || collaboration.role !== 'teacher' || collaboration.status !== 'connected' || (screen !== 'play' && screen !== 'desert')) return;
    const state = { lesson, currentStep, score, studentName, showCompletion, studentId: activeStudentId || undefined, desertOpen: screen === 'desert', desert: desertSnapshot?.desert, desertEarned: desertSnapshot?.earned, character: activeStudent?.character };
    collaboration.setLatestState(state);
    void collaboration.publishState(state);
  }, [studentPortalToken, collaboration.role, collaboration.status, screen, lesson, currentStep, score, studentName, showCompletion, activeStudentId, desertSnapshot, activeStudent?.character]);

  useEffect(() => {
    if (collaboration.role !== 'student' || collaboration.status !== 'connected' || screen !== 'play') return;
    void collaboration.publishProgress(score);
  }, [collaboration.role, collaboration.status, screen, score]);

  useEffect(() => {
    if (!collaboration.configured || collaboration.roomId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') !== 'student') return;
    const room = params.get('room');
    if (!room) return;
    void collaboration.join(room, 'Ученик').catch(error => showToast(error instanceof Error ? error.message : 'Не удалось подключиться к уроку'));
  }, [collaboration.configured, collaboration.roomId]);

  useEffect(() => {
    const surface = lessonSurfaceRef.current;
    if (!surface || !collaboration.roomId || collaboration.status !== 'connected') return;
    const publishPointer = (event: PointerEvent, clickAt?: number) => {
      const bounds = surface.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      collaboration.publishCursor(x, y, clickAt);
    };
    const publishInteraction = (event: PointerEvent, type: RoomInteraction['type']) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const bounds = surface.getBoundingClientRect();
      const path = getElementPath(surface, event.target);
      if (!path) return;
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      const targetBounds = event.target.getBoundingClientRect();
      const targetX = (event.clientX - targetBounds.left) / targetBounds.width;
      const targetY = (event.clientY - targetBounds.top) / targetBounds.height;
      collaboration.publishInteraction({ type, path, x, y, targetX, targetY, pointerType: event.pointerType, button: event.button });
    };
    const onMove = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      publishPointer(event);
      if (activePointerId.current === event.pointerId) publishInteraction(event, 'pointermove');
    };
    const onDown = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      activePointerId.current = event.pointerId;
      publishPointer(event, Date.now());
      publishInteraction(event, 'pointerdown');
      const target = event.target instanceof Element ? event.target.closest('button,[role="button"]') : null;
      const label = target?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70);
      if (label) collaboration.publishAction(label);
    };
    const onUp = (event: PointerEvent) => {
      if (!event.isTrusted || activePointerId.current !== event.pointerId) return;
      publishInteraction(event, 'pointerup');
      activePointerId.current = null;
    };
    const onLeave = () => collaboration.publishCursor(-1, -1);
    surface.addEventListener('pointermove', onMove, { passive: true });
    surface.addEventListener('pointerdown', onDown, { passive: true });
    surface.addEventListener('pointerup', onUp, { passive: true });
    surface.addEventListener('pointercancel', onUp, { passive: true });
    surface.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerdown', onDown);
      surface.removeEventListener('pointerup', onUp);
      surface.removeEventListener('pointercancel', onUp);
      surface.removeEventListener('pointerleave', onLeave);
    };
  }, [collaboration.roomId, collaboration.status, screen]);

  useEffect(() => {
    if (!collaboration.roomId || collaboration.status !== 'connected' || screen !== 'play') return;
    collaboration.publishView({ currentStep, score, showCompletion });
  }, [collaboration.roomId, collaboration.status, screen, currentStep, score, showCompletion]);

  const updateActiveStudentLessons = (nextLessons: LessonData[]) => {
    if (!activeStudent) return;
    persistStudents(students.map(student => student.id === activeStudent.id
      ? { ...student, lessons: nextLessons.map(cloneLesson) }
      : student));
  };

  const handleSaveLesson = (updated: LessonData) => {
    const savedLesson = { ...updated, isDraft: updated.isDraft && !updated.title.trim() };
    setLesson(savedLesson);
    try { localStorage.setItem(ACTIVE_LESSON_KEY, JSON.stringify(savedLesson)); } catch { /* library copy is still saved below */ }
    const exists = lessons.some(item => item.id === savedLesson.id);
    updateActiveStudentLessons(exists ? lessons.map(item => item.id === savedLesson.id ? cloneLesson(savedLesson) : item) : [cloneLesson(savedLesson), ...lessons]);
    showToast('Урок сохранён в библиотеку');
  };

  const handleSaveBuiltLesson = (updated: LessonData, playAfterSave: boolean) => {
    const savedLesson = { ...updated, isDraft: updated.isDraft && !updated.title.trim() };
    setLesson(savedLesson);
    setCurrentStep(0);
    try { localStorage.setItem(ACTIVE_LESSON_KEY, JSON.stringify(savedLesson)); } catch { /* continue with the in-memory lesson */ }
    const exists = lessons.some(item => item.id === savedLesson.id);
    updateActiveStudentLessons(exists ? lessons.map(item => item.id === savedLesson.id ? cloneLesson(savedLesson) : item) : [cloneLesson(savedLesson), ...lessons]);
    showToast('Урок добавлен в библиотеку');
    if (playAfterSave) resetSessionScore();
    setScreen(playAfterSave ? 'play' : 'library');
  };

  const handlePreviewBuiltLesson = (updated: LessonData) => {
    setLesson(cloneLesson(updated));
    setCurrentStep(0);
    resetSessionScore();
    setScreen('preview');
  };

  const handleOpenLesson = (item: LessonData, destination: 'play' | 'edit') => {
    const active = cloneLesson(item);
    setLesson(active);
    setCurrentStep(0);
    setEditorStartTab(0);
    if (destination === 'play') resetSessionScore();
    try { localStorage.setItem(ACTIVE_LESSON_KEY, JSON.stringify(active)); } catch { /* use the in-memory lesson */ }
    setBuilderEditing(destination === 'edit');
    setScreen(destination === 'edit' ? 'builder' : 'play');
  };

  const handleNewLesson = (preselectedGameId?: string) => {
    const draft = cloneLesson(defaultLessonY);
    draft.id = `lesson-${crypto.randomUUID()}`;
    draft.title = 'Новый урок';
    draft.subtitle = '';
    draft.targetLetter = '';
    draft.gameOrder = preselectedGameId ? [preselectedGameId] : [];
    draft.isDraft = false;
    setLesson(draft);
    setBuilderEditing(false);
    setCurrentStep(0);
    setScreen('builder');
  };

  const handleUseGameInLesson = (gameId: string) => {
    const existingDraft = lessons.find(item => item.isDraft);
    const draft = existingDraft ? cloneLesson(existingDraft) : cloneLesson(defaultLessonY);
    if (!existingDraft) {
      draft.id = `lesson-${crypto.randomUUID()}`;
      draft.title = '';
      draft.subtitle = '';
      draft.targetLetter = '';
      draft.gameOrder = [];
      draft.isDraft = true;
    }
    if (draft.gameOrder?.includes(gameId)) {
      showToast('Эта игра уже добавлена в черновик урока');
      return;
    }
    draft.gameOrder = [...(draft.gameOrder || []), gameId];
    setLesson(draft);
    setCurrentStep(0);
    try { localStorage.setItem(ACTIVE_LESSON_KEY, JSON.stringify(draft)); } catch { /* library copy is still saved below */ }
    updateActiveStudentLessons(existingDraft
      ? lessons.map(item => item.id === draft.id ? cloneLesson(draft) : item)
      : [cloneLesson(draft), ...lessons]);
    showToast(existingDraft ? 'Игра добавлена в черновик урока' : 'Создан черновик урока — добавляйте в него другие игры');
  };

  const handleCreateGame = (game: GameLibraryItem) => {
    const custom = [...games.filter(item => item.custom), game];
    const next = [...DEFAULT_GAME_LIBRARY, ...custom];
    setGames(next);
    try { localStorage.setItem(GAME_LIBRARY_KEY, JSON.stringify(custom)); } catch { showToast('Не удалось сохранить игру в библиотеку'); }
    showToast('Новая игра добавлена в библиотеку');
  };

  const handleDeleteLesson = (id: string) => {
    const next = lessons.filter(item => item.id !== id);
    updateActiveStudentLessons(next);
    showToast('Урок удалён из библиотеки');
  };

  const handleOpenStepInEditor = (index: number) => {
    const game = orderedGames[index];
    setEditorStartTab(game ? gameStepIndex(game.stepKey as GameStepKey) + 1 : 0);
    setScreen('edit');
  };

  const handleGoToStep = (index: number) => {
    const next = Math.max(0, Math.min(index, orderedGames.length - 1));
    if (next !== currentStep) playTransitionSound();
    setCurrentStep(next);
    if (collaboration.role === 'student') void collaboration.publishStep(next);
  };

  const handleToggleSound = () => {
    const isNowActive = toggleSound();
    setMuted(!isNowActive);
    showToast(isNowActive ? '🔊 Звуковые эффекты включены' : '🔇 Звуковые эффекты выключены');
  };

  const goNext = () => handleGoToStep(currentStep + 1);
  const goPrevious = () => handleGoToStep(currentStep - 1);
  const wide = screen === 'library' || screen === 'builder' || screen === 'student' || screen === 'student-select' || screen === 'student-portal';

  const resetSessionScore = () => {
    setScore(0);
    answeredKeys.current = new Set();
    completedRun.current = false;
    setShowCompletion(false);
  };

  const handleSelectStudent = (id: string) => {
    setActiveStudentId(id);
    try { localStorage.setItem(ACTIVE_STUDENT_KEY, id); } catch { /* selection remains active until the page closes */ }
    resetSessionScore();
    setScreen('library');
  };

  const handleCreateStudent = (name: string) => {
    const student: StudentRecord = { id: `student-${crypto.randomUUID()}`, name, attempts: [], lessons: [] };
    persistStudents([...students, student]);
    setActiveStudentId(student.id);
    try { localStorage.setItem(ACTIVE_STUDENT_KEY, student.id); } catch { /* keep selected in memory */ }
    resetSessionScore();
    setScreen('library');
  };

  const handleCorrectAnswer = (answerId: string, points = 10) => {
    const key = `${lesson.id}:${currentGame?.stepKey || currentStep}:${answerId}`;
    if (answeredKeys.current.has(key)) return;
    answeredKeys.current.add(key);
    setScore(previous => previous + points);
    if (collaboration.role === 'student') void collaboration.publishProgress(score + points);
  };

  const handleFinishLesson = async () => {
    if (collaboration.role === 'student') collaboration.publishAction('завершил урок');
    if (!completedRun.current && activeStudent) {
      completedRun.current = true;
      const learningProgress = collectLessonLearningProgress(lesson, orderedGames.map(game => ({
        stepKey: game.stepKey,
        config: lesson.gameInstances?.[game.id]?.config[game.stepKey],
      })));
      if (studentPortalToken) {
        try {
          const attempt = await saveStudentPortalAttempt(studentPortalToken, lesson.id, score, learningProgress);
          const next = students.map(student => student.id === activeStudent.id ? { ...student, attempts: [...student.attempts, attempt], learningProgress: mergeLearningProgress(student.learningProgress, learningProgress) } : student);
          persistStudents(next);
          showToast('Результат сохранён в кабинете');
        } catch (error) {
          completedRun.current = false;
          showToast(error instanceof Error ? error.message : 'Не удалось сохранить результат');
          return;
        }
      } else {
        const attempt: LessonAttempt = { id: crypto.randomUUID(), lessonId: lesson.id, lessonTitle: lesson.title, points: score, completedAt: new Date().toISOString() };
        const next = students.map(student => student.id === activeStudent.id ? { ...student, attempts: [...student.attempts, attempt], learningProgress: mergeLearningProgress(student.learningProgress, learningProgress) } : student);
        persistStudents(next);
        if (cloud.session) {
          try { await cloud.save({ students: next, games, lesson, activeStudentId }); }
          catch (error) {
            completedRun.current = false;
            showToast(error instanceof Error ? error.message : 'Не удалось сохранить результат урока.');
            return;
          }
        }
      }
    }
    setShowCompletion(true);
  };

  const openDesert = async () => {
    if (collaboration.role === 'student' && !studentPortalToken) {
      collaboration.publishAction('открыть пустыню');
      showToast('Открываем пустыню вместе с учителем…');
      return;
    }
    if (!activeStudent || desertLoading) { if (!activeStudent) showToast('Сначала выберите карточку ученика.'); return; }
    setDesertLoading(true);
    try {
      const result = await loadStudentDesert(activeStudent.id, studentPortalToken);
      setDesertSnapshot({ studentId: activeStudent.id, ...result });
      setDesertReturnScreen(screen === 'student' ? 'student' : studentPortalToken ? 'student-portal' : 'play');
      setShowCompletion(false);
      setScreen('desert');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Не удалось открыть пустыню.'); }
    finally { setDesertLoading(false); }
  };

  const performDesertAction = async (action: DesertAction): Promise<DesertState> => {
    if (collaboration.role === 'student' && !studentPortalToken) {
      if (!desertSnapshot) throw new Error('Дождись, пока учитель откроет пустыню.');
      const preview = applyDesertAction(desertSnapshot.desert, desertSnapshot.earned, action);
      collaboration.publishDesertAction(action);
      return preview;
    }
    const studentId = desertSnapshot?.studentId || activeStudent?.id;
    if (!studentId) throw new Error('Карточка ученика не найдена.');
    const result = await mutateStudentDesert(studentId, studentPortalToken, action);
    setDesertSnapshot({ studentId, ...result });
    return result.desert;
  };

  const closeDesert = () => {
    if (collaboration.role === 'student' && !studentPortalToken) collaboration.publishAction('закрыть пустыню');
    setScreen(collaboration.roomId ? 'play' : desertReturnScreen);
    setShowCompletion(false);
  };

  const handleStudentName = (name: string) => {
    if (!activeStudent) return;
    persistStudents(students.map(student => student.id === activeStudent.id ? { ...student, name } : student));
  };

  const createClassroom = (name: string) => collaboration.create(name, { lesson, currentStep, score, studentName, showCompletion, studentId: activeStudentId || undefined, character: activeStudent?.character });

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between p-3 md:p-6 bg-cover bg-center bg-no-repeat relative font-sans text-slate-800" style={{ backgroundImage: `linear-gradient(rgba(253, 232, 244, 0.75), rgba(245, 235, 255, 0.82)), url('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1920&q=80')`, backgroundAttachment: 'fixed' }}>
      {toastMessage && <div className="fixed top-4 right-4 z-50 bg-slate-900/90 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-white/20"><Check className="w-4 h-4 text-emerald-400" />{toastMessage}</div>}

      <header className={`w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} bg-white/90 backdrop-blur-md rounded-2xl px-3 py-2 md:px-5 md:py-2.5 shadow-md border-2 border-pink-200 flex flex-wrap items-center justify-between gap-2 mb-4`}>
        <div className="flex min-w-0 items-center gap-2"><div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center font-black text-sm shadow-xs">{screen === 'library' || screen === 'student-select' || screen === 'student-portal' ? <BookOpen className="w-4 h-4" /> : screen === 'builder' ? <Edit3 className="w-4 h-4" /> : lesson.targetLetter || 'Й'}</div><div className="min-w-0"><div className="truncate max-w-[210px] sm:max-w-sm font-black text-xs md:text-sm text-slate-800">{screen === 'library' ? `Уроки · ${studentName}` : screen === 'student-select' ? 'Выбор ученика' : screen === 'student-portal' ? `Кабинет · ${studentName}` : screen === 'builder' ? 'Создание нового урока' : screen === 'preview' ? `Предпросмотр: ${lesson.title || 'Новый урок'}` : lesson.title}</div><div className="text-[10px] text-pink-600 font-bold hidden sm:block">{screen === 'play' ? `🎮 Ученик: ${displayStudentName}` : screen === 'preview' ? '👀 Проверка урока до сохранения' : screen === 'edit' ? '✏️ Режим конструктора' : screen === 'builder' ? 'Соберите занятие из игр' : screen === 'student-select' ? 'Выберите или создайте карточку' : screen === 'student-portal' ? 'Твои занятия и успехи' : 'Пространство учителя'}</div></div></div>
        <div className="flex items-center gap-1.5">
          {screen === 'play' && <button onClick={handleToggleSound} title={muted ? 'Включить звуковые эффекты' : 'Выключить звуковые эффекты'} className="p-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200">{muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-pink-600" />}</button>}
          {screen === 'play' && <button onClick={handleFinishLesson} className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow"><Award className="h-3.5 w-3.5" />Завершить урок</button>}
          {screen === 'play' && <button onClick={() => { setShowCompletion(false); void collaboration.leave(); setScreen(studentPortalToken ? 'student-portal' : 'library'); }} className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600"><Library className="h-3.5 w-3.5" />{studentPortalToken ? 'В кабинет' : 'Выйти'}</button>}
          {(screen === 'edit' || screen === 'builder') && <button onClick={() => setScreen('library')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-black text-xs border border-pink-200"><Library className="w-3.5 h-3.5" /><span className="hidden sm:inline">Мои уроки</span></button>}
          {cloud.session && <button onClick={() => void cloud.signOut()} title={cloud.session.user.email || 'Выйти из аккаунта'} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600">Выйти</button>}
          {screen === 'play' && !studentPortalToken && <button onClick={() => handleOpenStepInEditor(currentStep)} title="Редактировать текущее задание" className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-black text-xs border border-pink-200"><Edit3 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Редактировать шаг</span></button>}
          {screen === 'preview' && <button onClick={() => setScreen('builder')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-black text-xs border border-pink-200"><Edit3 className="w-3.5 h-3.5" />Вернуться к редактированию</button>}
          {screen === 'edit' && <button onClick={() => { playTransitionSound(); setScreen('play'); }} className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md"><Play className="w-3.5 h-3.5 fill-white" />В игру ▶</button>}
        </div>
      </header>

      <main className={`w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} flex-1 flex flex-col items-center justify-center`}>
        {screen === 'play' && !studentPortalToken && <ClassroomPanel configured={collaboration.configured} roomId={collaboration.roomId} role={collaboration.role} status={collaboration.status} statusMessage={collaboration.statusMessage} members={collaboration.members} lastAction={collaboration.lastAction} onCreate={createClassroom} onJoin={collaboration.join} onLeave={collaboration.leave} />}
        {screen === 'student-select' && <StudentSelection students={students} onSelect={handleSelectStudent} onCreate={handleCreateStudent} />}
        {screen === 'student-portal' && activeStudent && <StudentPortalDashboard student={activeStudent} availablePoints={desertSnapshot?.studentId === activeStudent.id ? desertBalance(desertSnapshot.earned, desertSnapshot.desert) : null} onStart={item => handleOpenLesson(item, 'play')} />}
        {screen === 'library' && <TeacherWorkspace lessons={lessons} games={games} onNewLesson={handleNewLesson} onUseGameInLesson={handleUseGameInLesson} onOpenLesson={handleOpenLesson} onDeleteLesson={handleDeleteLesson} onCreateGame={handleCreateGame} onOpenStudent={() => setScreen('student')} studentName={studentName} onSwitchStudent={() => setScreen('student-select')} />}
        {screen === 'student' && activeStudent && <StudentProfile studentId={activeStudent.id} name={studentName} attempts={studentAttempts} lessons={lessons} games={games} learningProgress={activeStudent.learningProgress} teacherNotes={activeStudent.teacherNotes || ''} onNameChange={handleStudentName} onLearningProgressChange={learningProgress => persistStudents(students.map(student => student.id === activeStudent.id ? { ...student, learningProgress } : student))} onTeacherNotesChange={teacherNotes => persistStudents(students.map(student => student.id === activeStudent.id ? { ...student, teacherNotes } : student))} onBack={() => setScreen('library')} onCreatePortalLink={createStudentPortalLink} character={activeStudent.character} onCharacterChange={character => persistStudents(students.map(student => student.id === activeStudent.id ? { ...student, character } : student))} desertBalance={desertSnapshot?.studentId === activeStudent.id ? desertBalance(desertSnapshot.earned, desertSnapshot.desert) : null} onOpenDesert={() => void openDesert()} />}
        {screen === 'builder' && <LessonBuilder key={lesson.id} initialLesson={lesson} games={games} isEditing={builderEditing} onBack={() => setScreen('library')} onSave={handleSaveBuiltLesson} onPreview={handlePreviewBuiltLesson} />}
        {screen === 'edit' && <LessonEditor lesson={lesson} onSave={handleSaveLesson} onClose={() => setScreen('play')} activeStepTab={editorStartTab} />}
        {(screen === 'play' || screen === 'preview') && <div ref={lessonSurfaceRef} className="w-full max-w-[650px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-200 p-4 md:p-7 relative text-center">
          {collaboration.remoteCursors.filter(cursor => cursor.x >= 0 && cursor.x <= 1 && cursor.y >= 0 && cursor.y <= 1).map(cursor => <div key={cursor.id} className={`pointer-events-none absolute z-[60] transition-[left,top] duration-75 ${cursor.role === 'teacher' ? 'text-violet-700' : 'text-emerald-700'}`} style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}>
            {cursor.role === 'teacher'
              ? <span aria-label="Указка учителя" className="block -translate-x-1 -translate-y-1 select-none text-3xl leading-none drop-shadow-md">👉</span>
              : <><MousePointer2 className="h-6 w-6 fill-emerald-300 drop-shadow" /><span className="ml-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white shadow">{cursor.name || 'Ученик'}</span></>}
          </div>)}
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">⭐ {score} баллов</div>
          <div className="flex justify-center items-center gap-2 mb-5">{orderedGames.map((game, idx) => { const isActive = currentStep === idx; const isCompleted = currentStep > idx; return <button key={`${game.id}-${idx}`} onClick={() => handleGoToStep(idx)} title={`${idx + 1}. ${game.title}`} className={`w-7 h-7 md:w-8 md:h-8 rounded-full font-black text-xs md:text-sm flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-pink-500 text-white scale-110 shadow-md ring-3 ring-pink-200' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-pink-100'}`}>{idx + 1}</button>; })}</div>
          <div className="min-h-[360px] flex flex-col items-center justify-center">
            {currentGame?.stepKey === 'step1' && <Step1Coloring config={activeLesson.step1} onNext={goNext} onCorrectAnswer={(id, count) => handleCorrectAnswer(id, (count || 1) * 10)} onEditStep={() => handleOpenStepInEditor(currentStep)} />}
            {currentGame?.stepKey === 'step2' && <Step2Falling config={activeLesson.step2} onPrev={goPrevious} onNext={goNext} onCorrectAnswer={handleCorrectAnswer} sharedSeed={collaboration.roomId || undefined} />}
            {currentGame?.stepKey === 'step3' && <Step3Maze config={activeLesson.step3} onPrev={goPrevious} onNext={goNext} onCorrectAnswer={handleCorrectAnswer} />}
            {currentGame?.stepKey === 'step4' && <Step4Drawing config={activeLesson.step4} onPrev={goPrevious} onNext={goNext} />}
            {currentGame?.stepKey === 'step5' && <Step5WordFill config={activeLesson.step5} onPrev={goPrevious} onNext={goNext} onCorrectAnswer={handleCorrectAnswer} />}
            {currentGame?.stepKey === 'step6' && <Step6ReadingCards config={activeLesson.step6} onPrev={goPrevious} onCorrectAnswer={handleCorrectAnswer} />}
            {currentGame?.stepKey === 'step7' && <Step7TextReading config={activeLesson.step7} onPrev={goPrevious} onNext={goNext} onCorrectAnswer={handleCorrectAnswer} />}
            {currentGame?.stepKey === 'step8' && <Step8BuildHouse config={activeLesson.step8} onPrev={goPrevious} onNext={goNext} isLastGame={currentStep === orderedGames.length - 1} onCorrectAnswer={handleCorrectAnswer} />}
            {currentGame?.stepKey === 'step9' && <Step9Memory config={activeLesson.step9} onPrev={goPrevious} onNext={goNext} isLastGame={currentStep === orderedGames.length - 1} onCorrectAnswer={handleCorrectAnswer} sharedSeed={collaboration.roomId || undefined} />}
            {currentGame?.stepKey === 'step10' && <Step10FillJar config={activeLesson.step10} onPrev={goPrevious} onNext={goNext} isLastGame={currentStep === orderedGames.length - 1} onCorrectAnswer={handleCorrectAnswer} sharedSeed={collaboration.roomId || undefined} />}
          </div>
          {currentGame && currentStep < orderedGames.length - 1 && <div className="mt-4 flex justify-center"><button onClick={goNext} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700">Пропустить задание <span aria-hidden="true">→</span></button></div>}
          {currentGame && currentStep === orderedGames.length - 1 && <div className="mt-4 flex justify-center">{screen === 'preview' ? <button onClick={() => setScreen('builder')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-md transition hover:brightness-105 active:scale-[.98]"><Edit3 className="h-4 w-4" />Вернуться к редактированию</button> : <button onClick={handleFinishLesson} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-black text-white shadow-md transition hover:brightness-105 active:scale-[.98]"><Award className="h-4 w-4" />Завершить урок</button>}</div>}
          {currentGame && <div className="mt-4 text-[10px] font-bold text-slate-400">{currentStep + 1} из {orderedGames.length} · {currentGame.title}</div>}
        </div>}
      </main>

      {showCompletion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"><div className="w-full max-w-sm rounded-3xl border-4 border-pink-200 bg-white p-7 text-center shadow-2xl"><div className="text-5xl">🏆</div><h2 className="mt-3 text-2xl font-black text-pink-600">Урок завершён!</h2><p className="mt-2 text-sm font-semibold text-slate-600">{displayStudentName} заработал(а) <strong className="text-amber-600">{score} баллов</strong>.</p><button disabled={desertLoading} onClick={() => void openDesert()} className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{desertLoading ? 'Открываем…' : '🌍 Перейти в пустыню'}</button><button onClick={() => { setShowCompletion(false); void collaboration.leave(); setScreen(studentPortalToken ? 'student-portal' : 'library'); }} className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600">Завершить и выйти</button></div></div>}
      {screen === 'desert' && desertSnapshot && <DesertGame studentName={displayStudentName} earned={desertSnapshot.earned} desert={desertSnapshot.desert} character={activeStudent?.character || roomCharacter} onAction={performDesertAction} onClose={closeDesert} />}

      {screen === 'play' && <footer className="mt-4 text-center text-xs font-semibold text-slate-500/90 flex flex-wrap items-center justify-center gap-3"><span>🌟 Интерактивный урок обучения грамоте и чтению</span>{!studentPortalToken && <><span>•</span><button onClick={() => { const reset = cloneLesson(defaultLessonY); handleSaveLesson(reset); setCurrentStep(0); }} className="text-pink-600 hover:underline">Сбросить к образцу</button></>}</footer>}
    </div>
  );
}

function StudentPortalEntry({ token, cloud }: { token: string; cloud: CloudWorkspace }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadStudentPortal>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void loadStudentPortal(token).then(result => {
      if (active) setData(result);
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не удалось открыть кабинет ученика.');
    });
    return () => { active = false; };
  }, [token]);

  if (error) return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-pink-100 via-violet-50 to-amber-50 p-4 font-sans text-slate-800"><section className="max-w-md rounded-3xl border-2 border-pink-200 bg-white p-7 text-center shadow-xl"><div className="text-4xl">🔗</div><h1 className="mt-3 text-xl font-black">Не удалось открыть кабинет</h1><p className="mt-2 text-sm font-semibold text-slate-500">{error}</p></section></main>;
  if (!data) return <main className="grid min-h-screen place-items-center bg-pink-50 font-sans text-sm font-bold text-pink-700">Открываем кабинет ученика…</main>;

  const snapshot = {
    students: [data.student],
    games: data.games.length ? data.games : DEFAULT_GAME_LIBRARY,
    lesson: data.student.lessons[0] || cloneLesson(defaultLessonY),
    activeStudentId: data.student.id,
  };
  return <WorkspaceApp key={token} cloud={{ ...cloud, session: null, ready: true, snapshot, save: async () => {} }} studentPortalToken={token} />;
}

export default function App() {
  const cloud = useCloudWorkspace();
  const params = new URLSearchParams(window.location.search);
  const portalToken = params.get('portal') || new URLSearchParams(window.location.hash.slice(1)).get('portal');
  const isStudentLink = params.get('role') === 'student';
  if (portalToken) return <StudentPortalEntry token={portalToken} cloud={cloud} />;
  if (isStudentLink) return <WorkspaceApp cloud={{ ...cloud, session: null, save: async () => {} }} />;
  if (!cloud.configured || !cloud.session) return <CloudLogin configured={cloud.configured} signIn={cloud.signIn} signUp={cloud.signUp} />;
  if (!cloud.ready && cloud.loadError) return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-pink-100 via-violet-50 to-amber-50 p-4 font-sans text-slate-800"><section className="max-w-md rounded-3xl border-2 border-pink-200 bg-white p-7 text-center shadow-xl"><div className="text-4xl">☁️</div><h1 className="mt-3 text-xl font-black">Не удалось загрузить данные</h1><p className="mt-2 text-sm font-semibold text-slate-500">{cloud.loadError}</p><button onClick={cloud.reload} className="mt-5 w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-sm font-black text-white">Повторить загрузку</button></section></main>;
  if (!cloud.ready) return <main className="grid min-h-screen place-items-center bg-pink-50 font-sans text-sm font-bold text-pink-700">Загружаем ваши данные…</main>;
  return <WorkspaceApp key={cloud.session.user.id} cloud={cloud} />;
}

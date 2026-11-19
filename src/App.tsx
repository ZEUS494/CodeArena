import React, { useEffect, useState } from 'react';
import { Lock, Volume2, VolumeX } from 'lucide-react';
import { useCompetitionSocket } from './hooks/useCompetitionSocket.ts';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { StudentView } from './components/StudentView.tsx';
import { TasksOverview } from './components/TasksOverview.tsx';
import { ResultsArchiveView } from './components/ResultsArchiveView.tsx';

type ActiveTab = 'teacher' | 'student' | 'results' | 'tasks';

const TEACHER_PIN = ((import.meta.env.VITE_TEACHER_PIN as string | undefined) ?? '').trim();
const STORAGE_KEY_TEACHER_UNLOCKED = 'codeclimb_teacher_unlocked';

function getInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'teacher';
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role');
  if (role === 'student') return 'student';
  if (role === 'results') return 'results';
  if (role === 'tasks') return 'tasks';
  if (/^#[A-Za-z0-9_-]{2,12}$/.test(window.location.hash)) {
    return 'student';
  }
  return 'teacher';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [teacherUnlocked, setTeacherUnlocked] = useState<boolean>(() => {
    if (!TEACHER_PIN) return true;
    try {
      return sessionStorage.getItem(STORAGE_KEY_TEACHER_UNLOCKED) === '1';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const socketRole = activeTab === 'student' ? 'student' : 'teacher';
  const {
    roomId,
    teacherName,
    availableRooms,
    roomState,
    connected,
    myParticipant,
    tasks,
    lastAnswer,
    errorMessage,
    activeClimbs,
    refreshRooms,
    createRoom,
    switchRoom,
    deleteRoom,
    leaveRoom,
    checkRoomCode,
    updateTeacherName,
    assignParticipantTrack,
    assignParticipantGroup,
    extendTimer,
    joinAsStudent,
    leaveAsStudent,
    submitAnswer,
    skipTask,
    customizeCharacter,
    startCompetition,
    finishCompetition,
    resetProgress,
    clearRoom,
    removeParticipant,
    seedDemoParticipants,
    demoStepClimb,
    toggleDemoAuto,
    clearError,
    clearLastAnswer,
  } = useCompetitionSocket(socketRole, soundEnabled);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (tab: ActiveTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'teacher') {
      url.searchParams.delete('role');
    } else {
      url.searchParams.set('role', tab);
    }
    window.history.pushState({}, '', url.toString());
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === TEACHER_PIN) {
      setTeacherUnlocked(true);
      setPinError(false);
      setPinInput('');
      try {
        sessionStorage.setItem(STORAGE_KEY_TEACHER_UNLOCKED, '1');
      } catch {
        // ignore
      }
    } else {
      setPinError(true);
    }
  };

  const isTeacherTab = activeTab !== 'student';
  const needsPin = isTeacherTab && Boolean(TEACHER_PIN) && !teacherUnlocked;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120] arena-surface-glow text-[#F8FAFC]">
      {/* Top Navigation Bar: strict 3-zone contract */}
      <header className="bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800/90 sticky top-0 z-30">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('teacher')}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Высота Кода
          </button>

          {/* Zone 2: Clean single-line text navigation */}
          <nav
            className="flex items-center gap-5 sm:gap-6 text-sm font-medium overflow-x-auto"
            aria-label="Основная навигация"
          >
            <button
              type="button"
              onClick={() => navigateTo('teacher')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'teacher'
                  ? 'border-amber-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Сцена ведущего
            </button>
            <button
              type="button"
              onClick={() => navigateTo('student')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'student'
                  ? 'border-amber-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Экран ученика
            </button>
            <button
              type="button"
              onClick={() => navigateTo('results')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'results'
                  ? 'border-amber-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Результаты
            </button>
            <button
              type="button"
              onClick={() => navigateTo('tasks')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'border-amber-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Задания
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="hidden md:flex items-center shrink-0">
            {activeTab === 'student' ? (
              <button
                type="button"
                onClick={() => navigateTo('teacher')}
                className="px-4 py-2 text-xs font-semibold text-slate-100 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                К сцене ведущего
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('student')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Войти как ученик
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Reconnection notice only when disconnected */}
      {!connected && (
        <div
          role="status"
          className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-medium text-amber-200"
        >
          Соединение с сервером восстанавливается...
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {needsPin ? (
          <div className="max-w-md mx-auto mt-10 bg-[#121B2F] border border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Панель преподавателя
                </h1>
                <p className="text-xs text-slate-400">
                  Введите PIN-код преподавателя для доступа к управлению и результатам.
                </p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="teacher-pin-input"
                  className="block text-xs font-semibold text-slate-300"
                >
                  PIN-код
                </label>
                <input
                  id="teacher-pin-input"
                  type="password"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Введите PIN"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#0B1120] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                {pinError && (
                  <p className="text-xs text-rose-400">Неверный PIN-код.</p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer"
                >
                  Войти
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('student')}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Я ученик
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {activeTab === 'teacher' && (
              <TeacherDashboard
                roomId={roomId}
                teacherName={teacherName}
                availableRooms={availableRooms}
                roomState={roomState}
                activeClimbs={activeClimbs}
                errorMessage={errorMessage}
                onRefreshRooms={refreshRooms}
                onCreateRoom={createRoom}
                onSwitchRoom={switchRoom}
                onDeleteRoom={deleteRoom}
                onLeaveRoom={leaveRoom}
                onUpdateTeacherName={updateTeacherName}
                onAssignTrack={assignParticipantTrack}
                onAssignGroup={assignParticipantGroup}
                onExtendTimer={extendTimer}
                onClearError={clearError}
                onStart={startCompetition}
                onFinish={finishCompetition}
                onResetProgress={resetProgress}
                onClearRoom={clearRoom}
                onRemoveParticipant={removeParticipant}
                onSeedDemo={seedDemoParticipants}
                onDemoStep={demoStepClimb}
                onToggleDemoAuto={toggleDemoAuto}
                onOpenStudentTab={() => navigateTo('student')}
              />
            )}

            {activeTab === 'student' && (
              <StudentView
                roomId={roomId}
                roomState={roomState}
                myParticipant={myParticipant}
                tasks={tasks}
                lastAnswer={lastAnswer}
                errorMessage={errorMessage}
                activeClimbs={activeClimbs}
                onCheckRoom={checkRoomCode}
                onJoin={joinAsStudent}
                onLeave={leaveAsStudent}
                onSubmitAnswer={submitAnswer}
                onSkipTask={skipTask}
                onCustomize={customizeCharacter}
                onClearError={clearError}
                onClearLastAnswer={clearLastAnswer}
              />
            )}

            {activeTab === 'results' && <ResultsArchiveView />}

            {activeTab === 'tasks' && <TasksOverview />}
          </>
        )}
      </main>

      {/* Quiet Footer with sound preference toggle */}
      <footer className="border-t border-slate-800/90 bg-[#0A0F1D] mt-8">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <span>
            Высота Кода · C++, C#, Python · До 16 участников · 3 экрана групп
          </span>
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Звук подъёма включён
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                Звук подъёма выключен
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

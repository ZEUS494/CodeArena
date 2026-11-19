import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  LogOut,
  Send,
  SkipForward,
} from 'lucide-react';
import {
  GROUP_LIST,
  GROUP_META,
  MAX_LEVEL,
  MAX_PARTICIPANTS,
  TRACK_LIST,
  createDefaultCustomization,
  type CharacterCustomization,
  type GroupId,
  type Participant,
  type PublicTask,
  type RoomState,
  type TrackId,
} from '../shared/types.ts';
import type {
  ActiveClimbAnimation,
  AnswerFeedback,
} from '../hooks/useCompetitionSocket.ts';
import { ClimbingArena } from './ClimbingArena.tsx';
import { LeaderboardPanel, sortLeaderboard } from './LeaderboardPanel.tsx';
import { CharacterCustomizer } from './CharacterCustomizer.tsx';
import { CountdownBadge } from './CountdownBadge.tsx';
import { PodiumView } from './PodiumView.tsx';

const TRACK_DARK_ACCENT: Record<string, string> = {
  cpp: '#38BDF8',
  csharp: '#C084FC',
  python: '#34D399',
};

interface StudentViewProps {
  roomId: string;
  roomState: RoomState;
  myParticipant: Participant | null;
  tasks: PublicTask[];
  lastAnswer: AnswerFeedback | null;
  errorMessage: string | null;
  activeClimbs: Record<string, ActiveClimbAnimation>;
  onJoin: (payload: {
    firstName: string;
    lastName: string;
    track: TrackId;
    group: GroupId;
    roomCode?: string;
  }) => void;
  onLeave: () => void;
  onSubmitAnswer: (taskId: string, answer: string) => void;
  onSkipTask: (taskId: string) => void;
  onCustomize: (patch: Partial<CharacterCustomization>) => void;
  onClearError: () => void;
  onClearLastAnswer: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({
  roomId,
  roomState,
  myParticipant,
  tasks,
  lastAnswer,
  errorMessage,
  activeClimbs,
  onJoin,
  onLeave,
  onSubmitAnswer,
  onSkipTask,
  onCustomize,
  onClearError,
  onClearLastAnswer,
}) => {
  const [roomCode, setRoomCode] = useState(roomId);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [track, setTrack] = useState<TrackId>('python');
  const [group, setGroup] = useState<GroupId>('Группа 1');
  const [answerInput, setAnswerInput] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setRoomCode(roomId);
  }, [roomId]);

  const solvedSet = useMemo(
    () => new Set(myParticipant?.solvedTaskIds ?? []),
    [myParticipant?.solvedTaskIds]
  );
  const skippedSet = useMemo(
    () => new Set(myParticipant?.skippedTaskIds ?? []),
    [myParticipant?.skippedTaskIds]
  );

  // Pick next task automatically if selected task is missing or just got solved
  const findNextTask = (fromTaskId: string | null, excludeCurrent = false): PublicTask | null => {
    if (tasks.length === 0) return null;
    const startIdx = fromTaskId
      ? Math.max(
          0,
          tasks.findIndex((t) => t.id === fromTaskId)
        )
      : 0;

    // 1st pass: look forward for unsolved & unskipped tasks
    for (let offset = excludeCurrent ? 1 : 0; offset < tasks.length; offset++) {
      const candidate = tasks[(startIdx + offset) % tasks.length];
      if (!solvedSet.has(candidate.id) && !skippedSet.has(candidate.id)) {
        return candidate;
      }
    }
    // 2nd pass: fall back to any unsolved (including skipped) task
    for (let offset = excludeCurrent ? 1 : 0; offset < tasks.length; offset++) {
      const candidate = tasks[(startIdx + offset) % tasks.length];
      if (!solvedSet.has(candidate.id)) {
        return candidate;
      }
    }
    return null;
  };

  useEffect(() => {
    if (tasks.length === 0) return;
    if (!selectedTaskId || solvedSet.has(selectedTaskId)) {
      const next = findNextTask(selectedTaskId, false);
      if (next) {
        setSelectedTaskId(next.id);
        setAnswerInput('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, solvedSet]);

  const activeTask =
    tasks.find((t) => t.id === selectedTaskId && !solvedSet.has(t.id)) ??
    findNextTask(null, false);

  const remainingUnsolvedCount = tasks.filter((t) => !solvedSet.has(t.id)).length;

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onJoin({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      track,
      group,
      roomCode: roomCode.trim() || 'main',
    });
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !answerInput.trim()) return;
    onSubmitAnswer(activeTask.id, answerInput);
  };

  const handleSkipCurrent = () => {
    if (!activeTask || remainingUnsolvedCount <= 1) return;
    onSkipTask(activeTask.id);
    onClearLastAnswer();
    setAnswerInput('');
    const next = findNextTask(activeTask.id, true);
    if (next) {
      setSelectedTaskId(next.id);
    }
  };

  // STEP 1: Registration Form
  if (!myParticipant) {
    const isFull = roomState.participants.length >= MAX_PARTICIPANTS;
    const previewGroupParticipants = roomState.participants.filter(
      (p) => p.group === group
    );
    const previewGroupMeta = GROUP_META[group];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-[#121B2F] border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Вход в соревнование
            </h1>
            <p className="text-sm text-slate-400 tabular-nums">
              Свободных мест:{' '}
              <strong className="text-white">
                {Math.max(0, MAX_PARTICIPANTS - roomState.participants.length)}
              </strong>{' '}
              из {MAX_PARTICIPANTS} · {MAX_LEVEL} заданий до вершины
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 text-sm text-rose-200 bg-rose-500/15 border border-rose-500/30 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isFull ? (
            <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-lg text-sm text-amber-200 space-y-1">
              <p className="font-semibold text-amber-300">
                Все {MAX_PARTICIPANTS} мест сейчас заняты
              </p>
              <p className="text-xs text-amber-200/80">
                Попросите преподавателя освободить место или дождитесь нового раунда.
              </p>
            </div>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="student-room-code"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Код комнаты (от преподавателя)
                </label>
                <input
                  id="student-room-code"
                  type="text"
                  maxLength={12}
                  placeholder="Например: K7M2P или main"
                  value={roomCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRoomCode(val.toLowerCase() === 'main' ? 'main' : val.toUpperCase());
                    if (errorMessage) onClearError();
                  }}
                  className="w-full px-3.5 py-2.5 text-sm font-mono tracking-wider bg-[#0B1120] border border-slate-700 rounded-lg text-sky-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="student-first-name"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Имя
                  </label>
                  <input
                    id="student-first-name"
                    type="text"
                    required
                    maxLength={24}
                    placeholder="Например: Максим"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errorMessage) onClearError();
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B1120] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="student-last-name"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Фамилия
                  </label>
                  <input
                    id="student-last-name"
                    type="text"
                    required
                    maxLength={24}
                    placeholder="Например: Иванов"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errorMessage) onClearError();
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B1120] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Direction Selector */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-300">
                  Направление
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {TRACK_LIST.map((item) => {
                    const selected = track === item.id;
                    const accentColor = TRACK_DARK_ACCENT[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTrack(item.id)}
                        className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#1D4ED8]/25 text-white border-sky-400'
                            : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className="font-mono text-sm font-bold"
                          style={{ color: selected ? '#FFFFFF' : accentColor }}
                        >
                          {item.label}
                        </div>
                        <div className="text-[11px] mt-1 text-slate-400">
                          {MAX_LEVEL} заданий
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group Selector */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-300">
                  Учебная группа (у каждой группы свой экран)
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {GROUP_LIST.map((grp) => {
                    const selected = group === grp;
                    const grpMeta = GROUP_META[grp];
                    const grpCount = roomState.participants.filter(
                      (p) => p.group === grp
                    ).length;
                    return (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setGroup(grp)}
                        className={`py-2.5 px-3 text-left rounded-lg border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#16233E] text-white'
                            : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                        style={
                          selected
                            ? { borderColor: grpMeta.accent }
                            : undefined
                        }
                      >
                        <div className="text-xs font-bold whitespace-nowrap">{grp}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                          {grpCount} уч.
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors whitespace-nowrap cursor-pointer"
              >
                Выйти на старт
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Live Arena Preview of the Selected Group's Dedicated Screen */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">
              Экран «{group}»
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">
              В группе: {previewGroupParticipants.length} · Всего в зале:{' '}
              {roomState.participants.length} из {MAX_PARTICIPANTS}
            </span>
          </div>
          <ClimbingArena
            participants={previewGroupParticipants}
            activeClimbs={activeClimbs}
            screenTitle={`Экран арены — ${group}`}
            screenSubtitle={`Участников в группе: ${previewGroupParticipants.length}`}
            screenAccent={previewGroupMeta.accent}
            compact
          />
        </div>
      </div>
    );
  }

  const myTrackMeta = TRACK_LIST.find((t) => t.id === myParticipant.track);
  const myTrackColor = TRACK_DARK_ACCENT[myParticipant.track] ?? '#38BDF8';
  const myGroupParticipants = roomState.participants.filter(
    (p) => p.group === myParticipant.group
  );
  const myGroupMeta = GROUP_META[myParticipant.group];
  const myLaneNumber =
    myGroupParticipants.findIndex((p) => p.id === myParticipant.id) + 1;
  const myCustomization =
    myParticipant.customization ??
    createDefaultCustomization(myParticipant.colorIndex);

  // STEP 2: Connected & Waiting for Teacher to Press Start (+ Character Customizer!)
  if (roomState.status === 'lobby') {
    return (
      <div className="space-y-6">
        <div className="bg-[#121B2F] border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Ожидание старта от преподавателя</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {myParticipant.firstName} {myParticipant.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400 tabular-nums">
              <span className="font-mono font-semibold" style={{ color: myTrackColor }}>
                {myTrackMeta?.label}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold" style={{ color: myGroupMeta.accent }}>
                {myParticipant.group}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                В вашей группе: {myGroupParticipants.length} · Всего: {roomState.participants.length} из {MAX_PARTICIPANTS}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start md:self-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            Изменить данные
          </button>
        </div>

        {/* Live Character Customizer while waiting in lobby */}
        <CharacterCustomizer
          customization={myCustomization}
          laneNumber={myLaneNumber > 0 ? myLaneNumber : 1}
          playerName={`${myParticipant.firstName} ${myParticipant.lastName}`}
          onChange={onCustomize}
        />

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">
            Экран вашей группы ({myParticipant.group}) — ваш персонаж выделен голубой рамкой
          </h2>
          <ClimbingArena
            participants={myGroupParticipants}
            activeClimbs={activeClimbs}
            highlightParticipantId={myParticipant.id}
            screenTitle={`Экран арены — ${myParticipant.group}`}
            screenSubtitle={`Участников в группе: ${myGroupParticipants.length}`}
            screenAccent={myGroupMeta.accent}
          />
        </div>
      </div>
    );
  }

  // STEP 4: Competition Finished (All finished, Timer expired, or Teacher pressed Stop) -> Show Championship Podium!
  if (roomState.status === 'finished') {
    return (
      <PodiumView
        roomState={roomState}
        isTeacher={false}
        currentParticipantId={myParticipant.id}
        initialGroup={myParticipant.group}
      />
    );
  }

  // STEP 3: Active Competition
  const isMyFinish = myParticipant.level >= MAX_LEVEL;
  const rankedInGroup = sortLeaderboard(myGroupParticipants);
  const myLiveRank = rankedInGroup.findIndex((p) => p.id === myParticipant.id) + 1;

  return (
    <div className="space-y-6">
      {/* Compact Participant Identity Header + Live Countdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-white">
              {myParticipant.firstName} {myParticipant.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 tabular-nums">
              <span className="font-mono font-semibold" style={{ color: myTrackColor }}>
                {myTrackMeta?.label}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold" style={{ color: myGroupMeta.accent }}>
                {myParticipant.group}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-amber-400">
                Место в группе: #{myLiveRank} из {myGroupParticipants.length}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-white">
                {myParticipant.level === 0
                  ? 'На старте'
                  : `Этаж ${myParticipant.level} из ${MAX_LEVEL}`}
              </span>
              {skippedSet.size > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300">
                    Пропущено: {skippedSet.size}
                  </span>
                </>
              )}
            </div>
          </div>

          <CountdownBadge
            endsAt={roomState.endsAt}
            startedAt={roomState.startedAt}
            running={true}
          />
        </div>

        {/* 10-Task Interactive Stepper (click any unsolved/skipped task to jump to it!) */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Навигация по 10 заданиям"
        >
          {tasks.map((task) => {
            const isSolved = solvedSet.has(task.id);
            const isSkipped = skippedSet.has(task.id) && !isSolved;
            const isActive = !isMyFinish && activeTask?.id === task.id;

            return (
              <button
                key={task.id}
                type="button"
                disabled={isSolved}
                onClick={() => {
                  if (!isSolved) {
                    setSelectedTaskId(task.id);
                    setAnswerInput('');
                    onClearLastAnswer();
                  }
                }}
                title={
                  isSolved
                    ? `Задача ${task.floor}: решена`
                    : isSkipped
                    ? `Задача ${task.floor}: пропущена (нажмите, чтобы вернуться)`
                    : `Перейти к задаче ${task.floor}`
                }
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold tabular-nums border transition-colors ${
                  isSolved
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 cursor-default'
                    : isActive
                    ? 'bg-[#2563EB] text-white border-sky-400 cursor-pointer'
                    : isSkipped
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 cursor-pointer'
                    : 'bg-[#121B2F] text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white cursor-pointer'
                }`}
              >
                {task.floor}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Zone Split: Task Workspace (Left) + Live Arena & Leaderboard (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-6 space-y-5">
          {isMyFinish ? (
            <div className="bg-[#121B2F] border border-emerald-500/35 rounded-xl p-8 space-y-4">
              <div className="inline-flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Award className="w-5 h-5" />
                <span>Вершина взята — ждём остальных на пьедестал</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Финиш! Все {MAX_LEVEL} этажей пройдены
                {myParticipant.finishPlace ? ` — ${myParticipant.finishPlace}-е место` : ''}
              </h2>
              <p className="text-sm text-slate-300">
                Ваш спортсмен уже стоит на вершине лицом к зрителям по направлению{' '}
                <strong className="font-mono" style={{ color: myTrackColor }}>
                  {myTrackMeta?.label}
                </strong>
                . Как только все закончат или преподаватель нажмёт «Стоп», откроется пьедестал почёта.
              </p>
            </div>
          ) : activeTask ? (
            <div className="bg-[#121B2F] border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="font-mono font-semibold text-sky-400">
                    Задача #{activeTask.floor} из {MAX_LEVEL} ·{' '}
                    {myParticipant.level === 0
                      ? 'Прыжок на этаж 1'
                      : `Перехват на этаж ${myParticipant.level + 1}`}
                  </span>
                  <span>
                    {skippedSet.has(activeTask.id)
                      ? 'Пропущенная задача · '
                      : ''}
                    {activeTask.answerType === 'output'
                      ? 'Результат вывода'
                      : 'Дополнение кода'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {activeTask.title}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeTask.prompt}
                </p>
              </div>

              {/* Pro IDE Code Block */}
              <div className="bg-[#070C17] text-slate-100 rounded-lg p-4 overflow-x-auto border border-slate-800">
                <pre className="font-mono text-xs sm:text-sm leading-relaxed">
                  {activeTask.code.split('\n').map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-slate-600 select-none w-5 text-right tabular-nums shrink-0">
                        {i + 1}
                      </span>
                      <code className="whitespace-pre text-sky-100">{line}</code>
                    </div>
                  ))}
                </pre>
              </div>

              {/* Feedback Banner */}
              {lastAnswer && (
                <div
                  role="status"
                  className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-sm ${
                    lastAnswer.correct
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/35 text-rose-200'
                  }`}
                >
                  {lastAnswer.correct ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
                  )}
                  <span>{lastAnswer.message}</span>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-lg border bg-rose-500/15 border-rose-500/35 text-rose-200 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Answer Input Form + Skip Task Action */}
              <form onSubmit={handleAnswerSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="task-answer-input"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Ваш ответ
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      id="task-answer-input"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={answerInput}
                      onChange={(e) => {
                        setAnswerInput(e.target.value);
                        if (lastAnswer && !lastAnswer.correct) onClearLastAnswer();
                      }}
                      placeholder={activeTask.inputPlaceholder}
                      className="flex-1 min-w-0 px-3.5 py-2.5 font-mono text-sm bg-[#0B1120] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={!answerInput.trim()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Проверить
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-xs text-slate-400">{activeTask.inputHint}</p>
                    <button
                      type="button"
                      disabled={remainingUnsolvedCount <= 1}
                      onClick={handleSkipCurrent}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 disabled:opacity-35 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Пропустить задачу
                    </button>
                  </div>
                </div>
              </form>

              {skippedSet.size > 0 && (
                <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                  Пропущенные задачи отмечены жёлтым сверху — вы можете вернуться к любой из них в любой момент, чтобы подняться выше.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-[#121B2F] border border-slate-800 rounded-xl p-6 text-sm text-slate-400">
              Загрузка заданий направления...
            </div>
          )}
        </div>

        {/* Right Column: Dedicated Group Arena Screen + Live Leaderboard */}
        <div className="xl:col-span-6 space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Экран «{myParticipant.group}»
              </h2>
              <span className="text-xs text-slate-400">
                Ваша дорожка выделена голубой рамкой
              </span>
            </div>
            <ClimbingArena
              participants={myGroupParticipants}
              activeClimbs={activeClimbs}
              highlightParticipantId={myParticipant.id}
              screenTitle={`Экран арены — ${myParticipant.group}`}
              screenSubtitle={`Участников в группе: ${myGroupParticipants.length}`}
              screenAccent={myGroupMeta.accent}
              compact
            />
          </div>

          <LeaderboardPanel
            participants={roomState.participants}
            currentParticipantId={myParticipant.id}
            currentGroup={myParticipant.group}
            compact
          />
        </div>
      </div>
    </div>
  );
};

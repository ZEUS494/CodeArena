import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Clock,
  Copy,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  GROUP_LIST,
  GROUP_META,
  MAX_LEVEL,
  MAX_PARTICIPANTS,
  TRACK_LIST,
  type GroupId,
  type RoomState,
  type RoomSummary,
} from '../shared/types.ts';
import type { ActiveClimbAnimation } from '../hooks/useCompetitionSocket.ts';
import { ClimbingArena } from './ClimbingArena.tsx';
import { sortLeaderboard } from './LeaderboardPanel.tsx';
import { CountdownBadge } from './CountdownBadge.tsx';
import { PodiumView } from './PodiumView.tsx';

import TROPHY_IMG from '../assets/images/competition_trophy_badge_1795083429962.jpg';

const TRACK_DARK_ACCENT: Record<string, string> = {
  cpp: '#38BDF8',
  csharp: '#C084FC',
  python: '#34D399',
};

const TIMER_PRESETS: { label: string; minutes: number | null }[] = [
  { label: 'Без лимита', minutes: null },
  { label: '15 мин', minutes: 15 },
  { label: '30 мин', minutes: 30 },
  { label: '40 мин', minutes: 40 },
  { label: '45 мин', minutes: 45 },
  { label: '60 мин', minutes: 60 },
  { label: '90 мин', minutes: 90 },
];

interface TeacherDashboardProps {
  roomId: string;
  teacherName: string;
  availableRooms: RoomSummary[];
  roomState: RoomState;
  activeClimbs: Record<string, ActiveClimbAnimation>;
  errorMessage: string | null;
  onRefreshRooms: () => Promise<void>;
  onCreateRoom: (customCode?: string, customTeacherName?: string) => Promise<string | null>;
  onSwitchRoom: (targetCode: string) => Promise<boolean>;
  onUpdateTeacherName: (name: string) => Promise<void>;
  onExtendTimer: (addMinutes: number) => Promise<void>;
  onClearError: () => void;
  onStart: (durationMinutes?: number | null) => void;
  onFinish: () => void;
  onResetProgress: () => void;
  onClearRoom: () => void;
  onRemoveParticipant: (id: string) => void;
  onSeedDemo: () => void;
  onDemoStep: (participantId?: string, group?: GroupId) => void;
  onToggleDemoAuto: (enabled: boolean) => void;
  onOpenStudentTab: () => void;
}

const STATUS_LABELS: Record<RoomState['status'], string> = {
  lobby: 'Набор участников',
  running: 'Идёт соревнование',
  finished: 'Этап завершён',
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  roomId,
  teacherName,
  availableRooms,
  roomState,
  activeClimbs,
  errorMessage,
  onRefreshRooms,
  onCreateRoom,
  onSwitchRoom,
  onUpdateTeacherName,
  onExtendTimer,
  onClearError,
  onStart,
  onFinish,
  onResetProgress,
  onClearRoom,
  onRemoveParticipant,
  onSeedDemo,
  onDemoStep,
  onToggleDemoAuto,
  onOpenStudentTab,
}) => {
  const [activeGroup, setActiveGroup] = useState<GroupId>('Группа 1');
  const [tableScope, setTableScope] = useState<'group' | 'all'>('group');
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [trophyFailed, setTrophyFailed] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(45);
  const [customMinutesInput, setCustomMinutesInput] = useState('45');
  const [showArenaAfterFinish, setShowArenaAfterFinish] = useState(false);
  const [teacherInput, setTeacherInput] = useState(teacherName || roomState.teacherName || '');
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [roomPanelOpen, setRoomPanelOpen] = useState(false);

  useEffect(() => {
    void onRefreshRooms();
  }, [onRefreshRooms]);

  useEffect(() => {
    if (teacherName) setTeacherInput(teacherName);
  }, [teacherName]);

  // Automatically reveal Podium whenever competition transitions into 'finished'
  useEffect(() => {
    if (roomState.status === 'finished') {
      setShowArenaAfterFinish(false);
    }
  }, [roomState.status]);

  const studentJoinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const roomQuery = roomId && roomId !== 'main' ? `&room=${encodeURIComponent(roomId)}` : '';
    return `${window.location.origin}${window.location.pathname}?role=student${roomQuery}`;
  }, [roomId]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(studentJoinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = studentJoinUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCustomMinutesChange = (val: string) => {
    setCustomMinutesInput(val);
    const parsed = parseInt(val, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 90) {
      setSelectedMinutes(parsed);
    } else if (val.trim() === '') {
      setSelectedMinutes(null);
    }
  };

  const groupSummaries = useMemo(() => {
    return GROUP_LIST.map((grp) => {
      const members = roomState.participants.filter((p) => p.group === grp);
      const finishedCount = members.filter((p) => p.level >= MAX_LEVEL).length;
      const topFloor = members.reduce((max, p) => Math.max(max, p.level), 0);
      return {
        group: grp,
        meta: GROUP_META[grp],
        members,
        count: members.length,
        finishedCount,
        topFloor,
      };
    });
  }, [roomState.participants]);

  const activeGroupParticipants = useMemo(
    () => roomState.participants.filter((p) => p.group === activeGroup),
    [roomState.participants, activeGroup]
  );

  const activeGroupMeta = GROUP_META[activeGroup];

  const sortedTableParticipants = useMemo(() => {
    const base =
      tableScope === 'group' ? activeGroupParticipants : roomState.participants;
    return sortLeaderboard(base);
  }, [tableScope, activeGroupParticipants, roomState.participants]);

  const canStart = roomState.participants.length > 0 && roomState.status === 'lobby';
  const activeGroupHasUnfinished = activeGroupParticipants.some(
    (p) => p.level < MAX_LEVEL
  );

  // Show Championship Podium Screen automatically when finished
  if (roomState.status === 'finished' && !showArenaAfterFinish) {
    return (
      <PodiumView
        roomState={roomState}
        isTeacher={true}
        initialGroup={activeGroup}
        onResetProgress={onResetProgress}
        onClearRoom={onClearRoom}
        onToggleArenaPreview={() => setShowArenaAfterFinish(true)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Multi-Teacher & Room Switcher Bar */}
      <section className="bg-[#121B2F] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Комната:</span>
              <span className="px-2.5 py-1 text-sm font-mono font-bold tracking-wider text-sky-300 bg-sky-500/15 border border-sky-500/35 rounded-lg">
                {roomId}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Скопировать код комнаты"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-[#0B1120] border border-slate-700 hover:border-slate-500 rounded-lg transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Скопировано' : 'Код'}
              </button>
            </div>

            {(roomState.teacherName || teacherName) && (
              <span className="text-xs text-slate-300">
                Преподаватель: <strong className="text-white">{roomState.teacherName || teacherName}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await onCreateRoom(undefined, teacherInput);
                setRoomPanelOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer"
            >
              + Новая комната
            </button>
            <button
              type="button"
              onClick={() => {
                setRoomPanelOpen((prev) => !prev);
                void onRefreshRooms();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-[#0B1120] border border-slate-700 hover:border-slate-500 rounded-lg transition-colors cursor-pointer"
            >
              {roomPanelOpen ? 'Скрыть настройки комнат' : 'Сменить учителя / комнату'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center justify-between gap-2 p-3 text-xs text-rose-200 bg-rose-500/15 border border-rose-500/30 rounded-lg">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={onClearError}
              className="text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {roomPanelOpen && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onUpdateTeacherName(teacherInput);
              }}
              className="space-y-2"
            >
              <label className="block text-xs font-semibold text-slate-300">
                Имя преподавателя для этой комнаты
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={40}
                  value={teacherInput}
                  onChange={(e) => setTeacherInput(e.target.value)}
                  placeholder="Например: Анна Сергеевна"
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-[#0B1120] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Сохранить
                </button>
              </div>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const code = await onCreateRoom(customRoomInput || undefined, teacherInput);
                if (code) {
                  setCustomRoomInput('');
                  setRoomPanelOpen(false);
                }
              }}
              className="space-y-2"
            >
              <label className="block text-xs font-semibold text-slate-300">
                Создать комнату со своим кодом
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={12}
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value.toUpperCase())}
                  placeholder="Код (или пусто — авто)"
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-[#0B1120] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Создать
                </button>
              </div>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!joinRoomInput.trim()) return;
                const ok = await onSwitchRoom(joinRoomInput);
                if (ok) {
                  setJoinRoomInput('');
                  setRoomPanelOpen(false);
                }
              }}
              className="space-y-2"
            >
              <label className="block text-xs font-semibold text-slate-300">
                Перейти в комнату по коду
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={12}
                  value={joinRoomInput}
                  onChange={(e) => setJoinRoomInput(e.target.value)}
                  placeholder="Например: K7M2P или main"
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-[#0B1120] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Открыть
                </button>
              </div>
            </form>

            {availableRooms.length > 0 && (
              <div className="lg:col-span-3 pt-2 space-y-2">
                <div className="text-xs font-semibold text-slate-400">
                  Активные комнаты ({availableRooms.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableRooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={async () => {
                        await onSwitchRoom(r.id);
                        setRoomPanelOpen(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer flex items-center gap-2 ${
                        r.id === roomId
                          ? 'bg-[#2563EB]/25 border-sky-400 text-white'
                          : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span className="font-mono font-bold text-sky-300">{r.id}</span>
                      {r.teacherName && <span className="text-slate-400">· {r.teacherName}</span>}
                      <span className="text-slate-500 tabular-nums">({r.participantCount} уч.)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stage Header & Controls */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Арена «Большие гонки кода»
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400 tabular-nums">
              <span className="font-semibold text-amber-400">
                {STATUS_LABELS[roomState.status]}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Всего участников:{' '}
                <strong className="text-white">{roomState.participants.length}</strong> из{' '}
                {MAX_PARTICIPANTS}
              </span>
              <span aria-hidden="true">·</span>
              <span>3 отдельных экрана групп</span>
              <span aria-hidden="true">·</span>
              <span>
                {roomState.status === 'running'
                  ? roomState.durationMinutes
                    ? `Лимит: ${roomState.durationMinutes} мин`
                    : 'Без лимита времени'
                  : selectedMinutes
                  ? `Таймер: ${selectedMinutes} мин`
                  : 'Без лимита времени'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Countdown Clock while running */}
            {roomState.status === 'running' && (
              <>
                <CountdownBadge
                  endsAt={roomState.endsAt}
                  startedAt={roomState.startedAt}
                  running={true}
                />
                {roomState.endsAt && (
                  <button
                    type="button"
                    onClick={() => void onExtendTimer(5)}
                    className="px-3 py-2 text-xs font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/35 hover:bg-sky-500/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    +5 мин
                  </button>
                )}
              </>
            )}

            {/* Main Competition State Action */}
            {roomState.status === 'lobby' ? (
              <button
                type="button"
                onClick={() => onStart(selectedMinutes)}
                disabled={!canStart}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Старт соревнования
              </button>
            ) : roomState.status === 'running' ? (
              <button
                type="button"
                onClick={onFinish}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Стоп — пьедестал
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowArenaAfterFinish(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                Открыть пьедестал
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Group Screen Switcher (3 separate screens, not dimmed lanes) */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          role="tablist"
          aria-label="Переключение экранов групп"
        >
          {groupSummaries.map(({ group, meta, count, finishedCount, topFloor }) => {
            const isSelected = activeGroup === group;
            return (
              <button
                key={group}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveGroup(group)}
                className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#16233E] shadow-md'
                    : 'bg-[#121B2F] border-slate-800 hover:border-slate-700'
                }`}
                style={
                  isSelected
                    ? { borderColor: meta.accent }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Monitor
                      className="w-4 h-4 shrink-0"
                      style={{ color: isSelected ? meta.accent : '#64748B' }}
                    />
                    <span className="text-sm font-bold text-white truncate">
                      Экран «{group}»
                    </span>
                  </div>
                  <span
                    className="font-mono text-xs font-semibold tabular-nums shrink-0"
                    style={{ color: isSelected ? meta.accent : '#94A3B8' }}
                  >
                    {count} уч.
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400 tabular-nums">
                  <span>
                    {count === 0
                      ? 'Дорожки свободны'
                      : finishedCount > 0
                      ? `На вершине: ${finishedCount} из ${count}`
                      : topFloor > 0
                      ? `Лидер: этаж ${topFloor}/${MAX_LEVEL}`
                      : 'Все на старте'}
                  </span>
                  {isSelected && (
                    <span className="font-semibold text-white">Активен</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Teacher Timer Selector Bar (visible in Lobby before starting) */}
        {roomState.status === 'lobby' && (
          <div className="bg-[#121B2F] border border-slate-800 rounded-xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 whitespace-nowrap">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Время на этап (до 90 мин):</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {TIMER_PRESETS.map((preset) => {
                const active = selectedMinutes === preset.minutes;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSelectedMinutes(preset.minutes);
                      setCustomMinutesInput(
                        preset.minutes !== null ? String(preset.minutes) : ''
                      );
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#2563EB] text-white border-sky-400'
                        : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-800">
                <label
                  htmlFor="custom-timer-minutes"
                  className="text-xs text-slate-400 whitespace-nowrap"
                >
                  Своё:
                </label>
                <input
                  id="custom-timer-minutes"
                  type="number"
                  min={1}
                  max={90}
                  value={customMinutesInput}
                  onChange={(e) => handleCustomMinutesChange(e.target.value)}
                  placeholder="45"
                  className="w-16 px-2.5 py-1.5 text-xs font-mono text-white bg-[#0B1120] border border-slate-700 rounded-lg text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <span className="text-xs text-slate-400">мин</span>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Arena Screen for Active Group */}
        <ClimbingArena
          participants={activeGroupParticipants}
          activeClimbs={activeClimbs}
          screenTitle={`Экран арены — ${activeGroup}`}
          screenSubtitle={`Участников в группе: ${activeGroupParticipants.length} · Всего в зале: ${roomState.participants.length}/${MAX_PARTICIPANTS}`}
          screenAccent={activeGroupMeta.accent}
          canQuickStep={true}
          onQuickStep={(id) => onDemoStep(id)}
        />

        <p className="text-xs text-slate-400">
          Каждая группа выступает на собственном экране арены. Переключайтесь между вкладками «Группа 1», «Группа 2» и «Группа 3» выше, чтобы показывать ход прохождения каждой группы отдельно.
        </p>
      </section>

      {/* Secondary Two-Column Deck: Standings + Connection & Visual Testing */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 cols: Standings Table */}
        <div className="lg:col-span-8 bg-[#121B2F] border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {!trophyFailed ? (
                <img
                  src={TROPHY_IMG}
                  alt="Таблица лидеров"
                  referrerPolicy="no-referrer"
                  onError={() => setTrophyFailed(true)}
                  className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
              )}
              <div>
                <h2 className="text-base font-semibold text-white">
                  {tableScope === 'group'
                    ? `Таблица результатов — ${activeGroup}`
                    : 'Общая таблица всех групп'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  {tableScope === 'group'
                    ? `${activeGroup} · ${sortedTableParticipants.length} чел.`
                    : `Все группы · ${roomState.participants.length} из ${MAX_PARTICIPANTS}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center p-0.5 bg-[#0B1120] border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTableScope('group')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    tableScope === 'group'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {activeGroup}
                </button>
                <button
                  type="button"
                  onClick={() => setTableScope('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    tableScope === 'all'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Все ({roomState.participants.length})
                </button>
              </div>

              {roomState.participants.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onResetProgress}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Сбросить
                  </button>
                  <button
                    type="button"
                    onClick={onClearRoom}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Очистить
                  </button>
                </>
              )}
            </div>
          </div>

          {sortedTableParticipants.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-4">
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                {roomState.participants.length === 0
                  ? `Пока никто не подключился. Отправьте ученикам ссылку или добавьте ${MAX_PARTICIPANTS} тестовых участников по всем 3 группам.`
                  : `В «${activeGroup}» пока нет участников. Переключите экран на другую группу или добавьте тестовых участников.`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onSeedDemo}
                  disabled={roomState.participants.length >= MAX_PARTICIPANTS}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  Заполнить {MAX_PARTICIPANTS} тестовых (3 группы)
                </button>
                <button
                  type="button"
                  onClick={onOpenStudentTab}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Войти как ученик
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 bg-[#0D1526]">
                    <th className="py-3 pl-6 pr-3 w-14">Место</th>
                    <th className="py-3 px-3">Участник</th>
                    <th className="py-3 px-3">Направление</th>
                    <th className="py-3 px-3">Группа</th>
                    <th className="py-3 px-3">Баллы / этаж</th>
                    <th className="py-3 px-3">Ошибки</th>
                    <th className="py-3 pl-3 pr-6 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {sortedTableParticipants.map((p, index) => {
                    const rank = index + 1;
                    const track = TRACK_LIST.find((t) => t.id === p.track);
                    const trackColor = TRACK_DARK_ACCENT[p.track] ?? '#94A3B8';
                    const totalErrors = Object.values(p.wrongAttemptsByTask ?? {}).reduce(
                      (sum, n) => sum + n,
                      0
                    );
                    const rankColor =
                      rank === 1
                        ? 'text-amber-400 font-bold'
                        : rank === 2
                        ? 'text-slate-200 font-bold'
                        : rank === 3
                        ? 'text-orange-400 font-bold'
                        : 'text-slate-400';

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/35 transition-colors">
                        <td className={`py-3 pl-6 pr-3 font-mono text-xs tabular-nums ${rankColor}`}>
                          #{rank}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-100 whitespace-nowrap">
                          {p.firstName} {p.lastName}
                          {p.isDemo && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              тест
                            </span>
                          )}
                        </td>
                        <td
                          className="py-3 px-3 font-mono text-xs font-semibold"
                          style={{ color: trackColor }}
                        >
                          {track?.label}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-xs whitespace-nowrap">
                          {p.group}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-100 tabular-nums whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="hidden sm:flex items-center gap-0.5" aria-hidden="true">
                              {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((step) => (
                                <span
                                  key={step}
                                  className={`w-2 h-1.5 rounded-xs ${
                                    p.level >= step
                                      ? p.finishPlace !== null
                                        ? 'bg-emerald-400'
                                        : 'bg-amber-400'
                                      : 'bg-slate-800'
                                  }`}
                                />
                              ))}
                            </div>
                            <span>
                              {p.level === 0 ? 'Старт' : `${p.level} / ${MAX_LEVEL}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs tabular-nums">
                          {totalErrors > 0 ? (
                            <span className="text-rose-300">{totalErrors}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 pl-3 pr-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={p.level >= MAX_LEVEL}
                              onClick={() => onDemoStep(p.id)}
                              title="Тестовый подъём на 1 этаж"
                              className="px-2.5 py-1 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-35 disabled:cursor-not-allowed rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              +1 этаж
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveParticipant(p.id)}
                              aria-label={`Удалить ${p.firstName} ${p.lastName}`}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 rounded-md transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 4 cols: Invite Link + Visual Test Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#121B2F] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">
                Ссылка для учеников
              </h2>
              <p className="text-xs text-slate-400">
                До {MAX_PARTICIPANTS} участников могут зайти одновременно, выбрать направление и свою группу — каждая группа попадёт на отдельный экран.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={studentJoinUrl}
                aria-label="Ссылка для подключения учеников"
                className="w-full min-w-0 px-3 py-2 text-xs font-mono text-slate-200 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Готово
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Копировать
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenStudentTab}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Открыть экран ученика
            </button>
          </div>

          <div className="bg-[#121B2F] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">
                Визуальное тестирование
              </h2>
              <p className="text-xs text-slate-400">
                Заполните 16 тестовых участников по всем 3 группам и переключайтесь между экранами.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onSeedDemo}
                disabled={roomState.participants.length >= MAX_PARTICIPANTS}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Добавить тестовых участников (до {MAX_PARTICIPANTS})
              </button>

              <button
                type="button"
                onClick={() => onDemoStep(undefined, activeGroup)}
                disabled={activeGroupParticipants.length === 0 || !activeGroupHasUnfinished}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Подъём +1 этаж в «{activeGroup}»
              </button>

              <button
                type="button"
                onClick={() => onToggleDemoAuto(!roomState.demoAutoRunning)}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  roomState.demoAutoRunning
                    ? 'text-slate-950 bg-amber-400 hover:bg-amber-300'
                    : 'text-white bg-[#2563EB] hover:bg-[#1D4ED8]'
                }`}
              >
                {roomState.demoAutoRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    Остановить авто-демо
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Запустить авто-демо (все 3 группы)
                  </>
                )}
              </button>
            </div>

            {roomState.recentEvents.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <h3 className="text-xs font-semibold text-slate-400">
                  Последние подъёмы
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {roomState.recentEvents.slice(0, 5).map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-2 tabular-nums"
                    >
                      <span className="truncate font-medium text-slate-100">
                        {ev.participantName}{' '}
                        <span className="text-slate-500">
                          ({ev.group.replace('Группа ', 'Гр.')})
                        </span>
                      </span>
                      <span className="text-amber-400 whitespace-nowrap shrink-0 font-mono">
                        Этаж {ev.toLevel}/{MAX_LEVEL}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

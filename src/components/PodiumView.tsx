import React, { useMemo, useState } from 'react';
import { Award, Eye, RotateCcw, Trash2 } from 'lucide-react';
import {
  GROUP_LIST,
  GROUP_META,
  MAX_LEVEL,
  TRACK_LIST,
  type FinishReason,
  type GroupId,
  type Participant,
  type RoomState,
} from '../shared/types.ts';
import { FrontAthleteFigure } from './FrontAthleteFigure.tsx';
import { sortLeaderboard } from './LeaderboardPanel.tsx';

import ARENA_BACKDROP_IMG from '../assets/images/arena_tv_backdrop_1795083427596.jpg';
import TROPHY_IMG from '../assets/images/competition_trophy_badge_1795083429962.jpg';

const TRACK_DARK_ACCENT: Record<string, string> = {
  cpp: '#38BDF8',
  csharp: '#C084FC',
  python: '#34D399',
};

const FINISH_REASON_LABELS: Record<FinishReason, string> = {
  all_finished: 'Все участники покорили вершину',
  teacher_stopped: 'Этап завершён преподавателем — итоги подведены',
  time_up: 'Время соревнования вышло — итоги подведены',
};

function formatMistakesList(wrongAttemptsByTask?: Record<string, number>): {
  totalErrors: number;
  items: { floor: string; count: number }[];
} {
  if (!wrongAttemptsByTask) return { totalErrors: 0, items: [] };
  const entries = Object.entries(wrongAttemptsByTask)
    .filter(([, count]) => count > 0)
    .map(([taskId, count]) => {
      const parts = taskId.split('-');
      const floor = parts[parts.length - 1] || taskId;
      return { floor, floorNum: parseInt(floor, 10) || 0, count };
    })
    .sort((a, b) => a.floorNum - b.floorNum);

  const totalErrors = entries.reduce((acc, item) => acc + item.count, 0);
  return {
    totalErrors,
    items: entries.map(({ floor, count }) => ({ floor, count })),
  };
}

interface PodiumViewProps {
  roomState: RoomState;
  isTeacher?: boolean;
  currentParticipantId?: string | null;
  initialGroup?: GroupId | 'all';
  onResetProgress?: () => void;
  onClearRoom?: () => void;
  onToggleArenaPreview?: () => void;
}

export const PodiumView: React.FC<PodiumViewProps> = ({
  roomState,
  isTeacher = false,
  currentParticipantId = null,
  initialGroup = 'all',
  onResetProgress,
  onClearRoom,
  onToggleArenaPreview,
}) => {
  const [selectedScope, setSelectedScope] = useState<GroupId | 'all'>(initialGroup);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [trophyFailed, setTrophyFailed] = useState(false);

  const scopedParticipants = useMemo(() => {
    if (selectedScope === 'all') return roomState.participants;
    return roomState.participants.filter((p) => p.group === selectedScope);
  }, [roomState.participants, selectedScope]);

  const ranked = useMemo(() => {
    const sorted = sortLeaderboard(scopedParticipants);
    return sorted.map((p, idx) => {
      const groupMembers = roomState.participants.filter((x) => x.group === p.group);
      const laneInGroup = groupMembers.findIndex((x) => x.id === p.id) + 1;
      return {
        participant: p,
        rank: idx + 1,
        laneNumber: laneInGroup > 0 ? laneInGroup : idx + 1,
      };
    });
  }, [scopedParticipants, roomState.participants]);

  const first = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  const third = ranked[2] ?? null;

  const myEntry = currentParticipantId
    ? ranked.find((r) => r.participant.id === currentParticipantId) ?? null
    : null;

  const reasonText = roomState.finishReason
    ? FINISH_REASON_LABELS[roomState.finishReason]
    : 'Итоги соревновательного этапа';

  const activeScopeAccent =
    selectedScope === 'all' ? '#FBBF24' : GROUP_META[selectedScope].accent;

  const renderPodiumSpot = (
    entry: { participant: Participant; rank: number; laneNumber: number } | null,
    place: 1 | 2 | 3,
    cx: number,
    blockTopY: number,
    blockH: number,
    blockW: number,
    colors: { top: string; front: string; border: string; badgeBg: string; text: string }
  ) => {
    const trackMeta = entry
      ? TRACK_LIST.find((t) => t.id === entry.participant.track)
      : null;
    const trackColor = entry
      ? TRACK_DARK_ACCENT[entry.participant.track] ?? '#94A3B8'
      : '#64748B';

    return (
      <g key={`podium-${place}`}>
        {entry && (
          <FrontAthleteFigure
            customization={entry.participant.customization}
            colorIndex={entry.participant.colorIndex}
            laneNumber={entry.laneNumber}
            pose={place === 1 ? 'bar_overhead' : place === 2 ? 'arms_up' : 'cheer'}
            scale={place === 1 ? 1.48 : 1.32}
            x={cx}
            y={blockTopY - 2}
          />
        )}

        <polygon
          points={`
            ${cx - blockW / 2},${blockTopY}
            ${cx + blockW / 2},${blockTopY}
            ${cx + blockW / 2 - 10},${blockTopY - 12}
            ${cx - blockW / 2 + 10},${blockTopY - 12}
          `}
          fill={colors.top}
        />
        <rect
          x={cx - blockW / 2}
          y={blockTopY}
          width={blockW}
          height={blockH}
          rx={4}
          fill={colors.front}
          stroke={colors.border}
          strokeWidth={2}
        />

        <text
          x={cx}
          y={blockTopY + 46}
          textAnchor="middle"
          fontSize={place === 1 ? '44' : '36'}
          fontWeight={800}
          fontFamily="var(--font-display)"
          fill={colors.text}
        >
          {place}
        </text>
        <text
          x={cx}
          y={blockTopY + 64}
          textAnchor="middle"
          fontSize="11"
          fontWeight={700}
          fontFamily="var(--font-sans)"
          fill={colors.text}
          opacity={0.85}
        >
          МЕСТО
        </text>

        {entry ? (
          <g transform={`translate(${cx}, ${blockTopY + 90})`}>
            <text
              x={0}
              y={0}
              textAnchor="middle"
              fontSize="14.5"
              fontWeight={700}
              fill="#FFFFFF"
              fontFamily="var(--font-sans)"
            >
              {entry.participant.firstName} {entry.participant.lastName}
            </text>
            <text
              x={0}
              y={19}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight={600}
              fill={trackColor}
              fontFamily="var(--font-mono)"
            >
              {trackMeta?.shortLabel} · {entry.participant.group}
            </text>
            <text
              x={0}
              y={36}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight={600}
              fill="#CBD5E1"
              fontFamily="var(--font-mono)"
            >
              Этаж {entry.participant.level}/{MAX_LEVEL}
            </text>
          </g>
        ) : (
          <text
            x={cx}
            y={blockTopY + 96}
            textAnchor="middle"
            fontSize="12"
            fill="#64748B"
            fontFamily="var(--font-sans)"
          >
            —
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-7">
      {/* Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {!trophyFailed ? (
            <img
              src={TROPHY_IMG}
              alt="Пьедестал почёта"
              referrerPolicy="no-referrer"
              onError={() => setTrophyFailed(true)}
              className="w-12 h-12 rounded-xl object-contain bg-white p-1 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Пьедестал почёта{' '}
              <span style={{ color: activeScopeAccent }}>
                {selectedScope === 'all' ? '· Общий зачёт' : `· ${selectedScope}`}
              </span>
            </h1>
            <p className="text-sm text-amber-300 font-medium">{reasonText}</p>
          </div>
        </div>

        {isTeacher && (
          <div className="flex flex-wrap items-center gap-2.5">
            {onToggleArenaPreview && (
              <button
                type="button"
                onClick={onToggleArenaPreview}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-[#121B2F] border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Посмотреть арены групп
              </button>
            )}
            {onResetProgress && (
              <button
                type="button"
                onClick={onResetProgress}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Новый раунд
              </button>
            )}
            {onClearRoom && (
              <button
                type="button"
                onClick={onClearRoom}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Очистить зал
              </button>
            )}
          </div>
        )}
      </div>

      {/* Group Screen Switcher for Podium */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        role="tablist"
        aria-label="Переключение пьедестала по группам"
      >
        {GROUP_LIST.map((grp) => {
          const meta = GROUP_META[grp];
          const count = roomState.participants.filter((p) => p.group === grp).length;
          const active = selectedScope === grp;
          return (
            <button
              key={grp}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedScope(grp)}
              className={`px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-[#16233E] text-white'
                  : 'bg-[#121B2F] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
              style={active ? { borderColor: meta.accent } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{grp}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.accent }}
                  aria-hidden="true"
                />
              </div>
              <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                {count} уч.
              </div>
            </button>
          );
        })}

        <button
          type="button"
          role="tab"
          aria-selected={selectedScope === 'all'}
          onClick={() => setSelectedScope('all')}
          className={`px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
            selectedScope === 'all'
              ? 'bg-[#16233E] border-amber-400 text-white'
              : 'bg-[#121B2F] border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold">Общий зачёт</span>
            <span
              className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"
              aria-hidden="true"
            />
          </div>
          <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
            Все ({roomState.participants.length} уч.)
          </div>
        </button>
      </div>

      {/* Personal Student Summary Banner when viewing as student */}
      {myEntry && (
        <div className="bg-[#121B2F] border border-sky-500/35 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-sky-400">
              {selectedScope === 'all'
                ? 'Ваш результат в общем зачёте'
                : `Ваш результат в «${selectedScope}»`}
            </p>
            <p className="text-lg font-bold text-white">
              {myEntry.participant.firstName} {myEntry.participant.lastName} —{' '}
              <span className="text-amber-400">{myEntry.rank}-е место</span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300 font-mono tabular-nums">
            <span>
              Баллы (этажи):{' '}
              <strong className="text-white">
                {myEntry.participant.level}/{MAX_LEVEL}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Попыток: <strong className="text-white">{myEntry.participant.attempts}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 3-Step Olympic Championship Podium Visual */}
      <section className="relative w-full overflow-x-auto bg-[#0C1324] border border-slate-800 rounded-2xl shadow-xl">
        <div className="relative min-w-[760px]">
          {!backdropFailed && (
            <div
              className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none"
              aria-hidden="true"
            >
              <img
                src={ARENA_BACKDROP_IMG}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setBackdropFailed(true)}
                className="w-full h-full object-cover object-center opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/45 via-[#0C1324]/75 to-[#0C1324]" />
            </div>
          )}

          <svg
            viewBox="0 0 1000 470"
            className="relative w-full h-auto block select-none"
            role="img"
            aria-label="Пьедестал с победителями: первое, второе и третье места"
          >
            <defs>
              <radialGradient id="podiumSpotlight" cx="50%" cy="22%" r="60%">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.22" />
                <stop offset="55%" stopColor="#3B82F6" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#0C1324" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect x={0} y={0} width={1000} height={470} fill="url(#podiumSpotlight)" />

            <g fill="#FBBF24" opacity={0.75}>
              <circle cx={405} cy={72} r={3} />
              <circle cx={598} cy={66} r={3.5} />
              <circle cx={442} cy={42} r={2.2} />
              <circle cx={555} cy={48} r={2.4} />
              <circle cx={260} cy={120} r={2.5} fill="#93C5FD" />
              <circle cx={745} cy={135} r={2.5} fill="#FB923C" />
            </g>

            <rect x={70} y={432} width={860} height={6} rx={3} fill="#1E293B" />

            {renderPodiumSpot(second, 2, 240, 272, 160, 226, {
              top: '#64748B',
              front: '#1E293B',
              border: '#94A3B8',
              badgeBg: '#94A3B8',
              text: '#E2E8F0',
            })}

            {renderPodiumSpot(third, 3, 760, 298, 134, 226, {
              top: '#B45309',
              front: '#271A12',
              border: '#D97706',
              badgeBg: '#D97706',
              text: '#FDBA74',
            })}

            {renderPodiumSpot(first, 1, 500, 222, 210, 254, {
              top: '#F59E0B',
              front: '#1E2436',
              border: '#FBBF24',
              badgeBg: '#FBBF24',
              text: '#FBBF24',
            })}
          </svg>
        </div>
      </section>

      {/* Complete Final Results Table with Per-Task Mistake Breakdown */}
      <section className="bg-[#121B2F] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">
              {selectedScope === 'all'
                ? 'Полные итоги — все группы'
                : `Итоги — ${selectedScope}`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Участников в списке: {ranked.length} · Показаны баллы (этажи) и разбор ошибок по задачам
            </p>
          </div>
        </div>

        {ranked.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            В этой группе нет участников.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 bg-[#0D1526]">
                  <th className="py-3 pl-6 pr-3 w-16">Место</th>
                  <th className="py-3 px-3">Участник</th>
                  <th className="py-3 px-3">Направление</th>
                  <th className="py-3 px-3">Группа</th>
                  <th className="py-3 px-3">Баллы / этажи</th>
                  <th className="py-3 px-3">Ошибки по задачам</th>
                  <th className="py-3 pl-3 pr-6 text-right">Итог</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {ranked.map(({ participant: p, rank }) => {
                  const isMe = p.id === currentParticipantId;
                  const trackMeta = TRACK_LIST.find((t) => t.id === p.track);
                  const trackColor = TRACK_DARK_ACCENT[p.track] ?? '#94A3B8';
                  const mistakes = formatMistakesList(p.wrongAttemptsByTask);

                  const rankStyle =
                    rank === 1
                      ? 'text-amber-400 font-bold'
                      : rank === 2
                      ? 'text-slate-200 font-bold'
                      : rank === 3
                      ? 'text-orange-400 font-bold'
                      : 'text-slate-400 font-semibold';

                  const statusLabel =
                    rank === 1
                      ? 'Победитель'
                      : rank === 2 || rank === 3
                      ? 'Призёр'
                      : p.level >= MAX_LEVEL
                      ? 'Финишировал'
                      : 'Участник';

                  const statusColor =
                    rank === 1
                      ? 'text-amber-400 font-semibold'
                      : rank <= 3
                      ? 'text-sky-300 font-semibold'
                      : p.level >= MAX_LEVEL
                      ? 'text-emerald-400 font-medium'
                      : 'text-slate-400';

                  return (
                    <tr
                      key={p.id}
                      className={isMe ? 'bg-[#1D4ED8]/20' : 'hover:bg-slate-800/30'}
                    >
                      <td className={`py-3 pl-6 pr-3 font-mono text-xs tabular-nums ${rankStyle}`}>
                        #{rank}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                        {p.firstName} {p.lastName}
                        {isMe && (
                          <span className="ml-2 text-xs font-semibold text-sky-400">
                            (Вы)
                          </span>
                        )}
                      </td>
                      <td
                        className="py-3 px-3 font-mono text-xs font-semibold"
                        style={{ color: trackColor }}
                      >
                        {trackMeta?.label}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
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
                                    ? rank === 1
                                      ? 'bg-amber-400'
                                      : p.level >= MAX_LEVEL
                                      ? 'bg-emerald-400'
                                      : 'bg-sky-400'
                                    : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <span>
                            {p.level} / {MAX_LEVEL}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs tabular-nums">
                        {mistakes.totalErrors === 0 ? (
                          <span className="text-emerald-400 font-sans">Без ошибок</span>
                        ) : (
                          <span className="text-rose-300">
                            {mistakes.items
                              .map((m) => `№${m.floor}${m.count > 1 ? ` (×${m.count})` : ''}`)
                              .join(', ')}
                          </span>
                        )}
                      </td>
                      <td className={`py-3 pl-3 pr-6 text-right text-xs whitespace-nowrap ${statusColor}`}>
                        {statusLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import {
  MAX_LEVEL,
  TRACK_LIST,
  type GroupId,
  type Participant,
} from '../shared/types.ts';

import TROPHY_IMG from '../assets/images/competition_trophy_badge_1795083429962.jpg';

const TRACK_DARK_ACCENT: Record<string, string> = {
  cpp: '#38BDF8',
  csharp: '#C084FC',
  python: '#34D399',
};

export function sortLeaderboard(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => {
    if (a.finishPlace !== null && b.finishPlace !== null) {
      return a.finishPlace - b.finishPlace;
    }
    if (a.finishPlace !== null) return -1;
    if (b.finishPlace !== null) return 1;
    if (b.level !== a.level) return b.level - a.level;
    const aClimb = a.lastClimbAt ?? Number.MAX_SAFE_INTEGER;
    const bClimb = b.lastClimbAt ?? Number.MAX_SAFE_INTEGER;
    if (aClimb !== bClimb) return aClimb - bClimb;
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    return a.joinedAt - b.joinedAt;
  });
}

interface LeaderboardPanelProps {
  participants: Participant[];
  currentParticipantId?: string | null;
  currentGroup?: GroupId;
  compact?: boolean;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  participants,
  currentParticipantId = null,
  currentGroup,
  compact = false,
}) => {
  const [onlyMyGroup, setOnlyMyGroup] = useState(Boolean(currentGroup));
  const [imgFailed, setImgFailed] = useState(false);

  const ranked = useMemo(() => {
    const base =
      onlyMyGroup && currentGroup
        ? participants.filter((p) => p.group === currentGroup)
        : participants;
    return sortLeaderboard(base);
  }, [participants, onlyMyGroup, currentGroup]);

  const myRank = useMemo(() => {
    if (!currentParticipantId) return null;
    const idx = ranked.findIndex((p) => p.id === currentParticipantId);
    return idx === -1 ? null : idx + 1;
  }, [ranked, currentParticipantId]);

  return (
    <section
      aria-label="Таблица лидеров"
      className="bg-[#121B2F] border border-slate-800 rounded-xl overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {!imgFailed ? (
            <img
              src={TROPHY_IMG}
              alt="Кубок лидеров"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-amber-400" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              {onlyMyGroup && currentGroup
                ? `Лидеры — ${currentGroup}`
                : 'Общая таблица лидеров'}
            </h2>
            <p className="text-xs text-slate-400 tabular-nums">
              {myRank !== null
                ? `Ваша позиция: ${myRank}-е место из ${ranked.length}`
                : `Участников в рейтинге: ${ranked.length}`}
            </p>
          </div>
        </div>

        {currentGroup && (
          <div className="inline-flex items-center p-0.5 bg-[#0B1120] border border-slate-800 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setOnlyMyGroup(true)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                onlyMyGroup
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {currentGroup.replace('Группа ', 'Гр. ')}
            </button>
            <button
              type="button"
              onClick={() => setOnlyMyGroup(false)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                !onlyMyGroup
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Все
            </button>
          </div>
        )}
      </div>

      {ranked.length === 0 ? (
        <div className="px-5 py-6 text-xs text-slate-400 text-center">
          Участники появятся в таблице после подключения.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {ranked.map((p, idx) => {
            const rank = idx + 1;
            const isMe = p.id === currentParticipantId;
            const trackMeta = TRACK_LIST.find((t) => t.id === p.track);
            const trackColor = TRACK_DARK_ACCENT[p.track] ?? '#94A3B8';
            const isFinished = p.level >= MAX_LEVEL;

            const rankColor =
              rank === 1
                ? 'text-amber-400 font-bold'
                : rank === 2
                ? 'text-slate-200 font-bold'
                : rank === 3
                ? 'text-orange-400 font-bold'
                : 'text-slate-500 font-semibold';

            return (
              <div
                key={p.id}
                className={`px-4 sm:px-5 ${
                  compact ? 'py-2.5' : 'py-3'
                } flex items-center justify-between gap-3 transition-colors ${
                  isMe ? 'bg-[#1D4ED8]/20' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 text-center font-mono text-xs tabular-nums shrink-0 ${rankColor}`}
                  >
                    #{rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-100 truncate">
                      <span className="truncate">
                        {p.firstName} {p.lastName}
                      </span>
                      {isMe && (
                        <span className="text-[11px] font-semibold text-sky-400 shrink-0">
                          (Вы)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span
                        className="font-mono font-semibold"
                        style={{ color: trackColor }}
                      >
                        {trackMeta?.shortLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{p.group}</span>
                      {isFinished && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-emerald-400">
                            Финиш
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-0.5" aria-hidden="true">
                    {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((step) => (
                      <span
                        key={step}
                        className={`w-2 h-1.5 rounded-xs transition-colors ${
                          p.level >= step
                            ? isFinished
                              ? 'bg-emerald-400'
                              : isMe
                              ? 'bg-sky-400'
                              : 'bg-amber-400'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums whitespace-nowrap w-18 text-right">
                    {p.level === 0 ? 'Старт' : `Эт. ${p.level}/${MAX_LEVEL}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

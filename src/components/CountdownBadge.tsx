import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownBadgeProps {
  endsAt: number | null;
  startedAt: number | null;
  running: boolean;
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({
  endsAt,
  startedAt,
  running,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [running]);

  if (!running) return null;

  if (endsAt !== null) {
    const remainingMs = Math.max(0, endsAt - now);
    const isWarning = remainingMs <= 5 * 60_000 && remainingMs > 60_000;
    const isCritical = remainingMs <= 60_000;

    return (
      <div
        role="timer"
        aria-live="off"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-sm font-bold tabular-nums whitespace-nowrap shrink-0 ${
          isCritical
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
            : isWarning
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
            : 'bg-[#121B2F] border-slate-700 text-white'
        }`}
      >
        <Clock
          className={`w-4 h-4 shrink-0 ${
            isCritical
              ? 'text-rose-400'
              : isWarning
              ? 'text-amber-400'
              : 'text-sky-400'
          }`}
        />
        <span className="text-xs font-sans font-medium text-slate-300">
          Осталось:
        </span>
        <span>{formatDurationMs(remainingMs)}</span>
      </div>
    );
  }

  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-800 bg-[#121B2F] font-mono text-sm font-semibold text-slate-200 tabular-nums whitespace-nowrap shrink-0">
      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="text-xs font-sans font-medium text-slate-400">Время:</span>
      <span>{formatDurationMs(elapsedMs)}</span>
    </div>
  );
};

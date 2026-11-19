import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  TRACK_LIST,
  type PublicTask,
  type TeacherPreviewTask,
  type TrackId,
} from '../shared/types.ts';
import { getAllPublicTasks } from '../shared/publicTasks.ts';
import { isSupabaseConfigured } from '../lib/supabaseClient.ts';

type PreviewOrPublicTask = PublicTask & Partial<Pick<TeacherPreviewTask, 'sampleAnswer' | 'explanation'>>;

const TRACK_DARK_ACCENT: Record<string, string> = {
  cpp: '#38BDF8',
  csharp: '#C084FC',
  python: '#34D399',
};

export const TasksOverview: React.FC = () => {
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('cpp');
  const [showAnswers, setShowAnswers] = useState(false);
  const [tasksByTrack, setTasksByTrack] = useState<
    Record<TrackId, PreviewOrPublicTask[]> | null
  >(() => (isSupabaseConfigured ? getAllPublicTasks() : null));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    let active = true;
    fetch('/api/tasks/preview')
      .then((res) => {
        if (!res.ok) throw new Error('fallback');
        return res.json();
      })
      .then((data: Record<TrackId, TeacherPreviewTask[]>) => {
        if (active) setTasksByTrack(data);
      })
      .catch(() => {
        if (active) {
          setTasksByTrack(getAllPublicTasks());
          setLoadError(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const currentTasks = tasksByTrack?.[selectedTrack] ?? [];
  const trackMeta = TRACK_LIST.find((t) => t.id === selectedTrack);
  const trackColor = TRACK_DARK_ACCENT[selectedTrack] ?? '#38BDF8';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Банк заданий этапа
          </h1>
          <p className="text-sm text-slate-400">
            По 10 заданий в каждом направлении — 1-е задание запускает прыжок на 1-й этаж, а задания 2–10 позволяют перехватываться до вершины.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center p-1 bg-[#121B2F] border border-slate-800 rounded-lg"
            role="tablist"
            aria-label="Направление заданий"
          >
            {TRACK_LIST.map((track) => (
              <button
                key={track.id}
                type="button"
                role="tab"
                aria-selected={selectedTrack === track.id}
                onClick={() => setSelectedTrack(track.id)}
                className={`px-4 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedTrack === track.id
                    ? 'bg-[#2563EB] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {track.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAnswers((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-[#121B2F] border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showAnswers ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Скрыть ответы
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                Показать ответы преподавателю
              </>
            )}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="p-6 bg-rose-500/15 border border-rose-500/35 rounded-xl text-sm text-rose-200">
          {loadError}
        </div>
      ) : !tasksByTrack ? (
        <div className="p-8 bg-[#121B2F] border border-slate-800 rounded-xl text-sm text-slate-400">
          Загрузка заданий...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentTasks.map((task) => (
            <article
              key={task.id}
              className="bg-[#121B2F] border border-slate-800 rounded-xl p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span
                    className="font-mono font-semibold"
                    style={{ color: trackColor }}
                  >
                    Этаж {task.floor} · {trackMeta?.label}
                  </span>
                  <span>
                    {task.answerType === 'output'
                      ? 'Вывод программы'
                      : 'Фрагмент кода'}
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-white">
                  {task.floor}. {task.title}
                </h2>
                <p className="text-sm text-slate-300">{task.prompt}</p>

                <div className="bg-[#070C17] text-sky-100 border border-slate-800 rounded-lg p-3.5 overflow-x-auto">
                  <pre className="font-mono text-xs leading-relaxed whitespace-pre">
                    {task.code}
                  </pre>
                </div>
              </div>

              {showAnswers && (
                <div className="pt-3 border-t border-slate-800 space-y-1">
                  {task.sampleAnswer ? (
                    <>
                      <div className="text-xs text-slate-400">
                        Правильный ответ:{' '}
                        <code className="font-mono font-semibold text-emerald-400">
                          {task.sampleAnswer}
                        </code>
                      </div>
                      {task.explanation && (
                        <p className="text-xs text-slate-300">{task.explanation}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-amber-300/90">
                      В онлайн-режиме ответы скрыты из кода сайта, чтобы ученики не могли подсмотреть их через DevTools.
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

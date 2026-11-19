import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  GROUP_LIST,
  GROUP_META,
  TRACK_LIST,
  type FinishReason,
  type GroupId,
  type SavedParticipantResult,
  type SavedRoundRecord,
  type TrackId,
} from '../shared/types.ts';
import { getAllPublicTasks } from '../shared/publicTasks.ts';
import { deleteSavedRound, fetchSavedRounds } from '../lib/resultsArchive.ts';
import { isSupabaseConfigured } from '../lib/supabaseClient.ts';

const TRACK_DARK_ACCENT: Record<string, string> = {
  cpp: '#38BDF8',
  csharp: '#C084FC',
  python: '#34D399',
};

const FINISH_REASON_SHORT: Record<FinishReason, string> = {
  all_finished: 'Все финишировали',
  teacher_stopped: 'Остановлено учителем',
  time_up: 'Вышло время',
};

function formatDateTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function parseTaskFloor(taskId: string): number {
  const parts = taskId.split('-');
  return parseInt(parts[parts.length - 1] ?? '0', 10) || 0;
}

function csvEscape(val: string | number): string {
  const s = String(val);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const ResultsArchiveView: React.FC = () => {
  const [rounds, setRounds] = useState<SavedRoundRecord[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<GroupId | 'all'>('all');
  const [trackFilter, setTrackFilter] = useState<TrackId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskTitleById = useMemo(() => {
    const preview = getAllPublicTasks();
    const map: Record<string, string> = {};
    for (const list of Object.values(preview)) {
      for (const task of list) {
        map[task.id] = task.title;
      }
    }
    return map;
  }, []);

  const loadRounds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSavedRounds();
      setRounds(data);
      setSelectedRoundId((prev) =>
        prev && data.some((r) => r.id === prev) ? prev : data[0]?.id ?? null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки архива.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRounds();
  }, [loadRounds]);

  const selectedRound = useMemo(
    () => rounds.find((r) => r.id === selectedRoundId) ?? rounds[0] ?? null,
    [rounds, selectedRoundId]
  );

  const filteredResults = useMemo(() => {
    if (!selectedRound) return [];
    const q = searchQuery.trim().toLowerCase();
    return selectedRound.results.filter((r) => {
      if (groupFilter !== 'all' && r.group !== groupFilter) return false;
      if (trackFilter !== 'all' && r.track !== trackFilter) return false;
      if (q) {
        const full = `${r.firstName} ${r.lastName}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [selectedRound, groupFilter, trackFilter, searchQuery]);

  // Aggregate hardest tasks across filtered students
  const hardestTasks = useMemo(() => {
    const counts = new Map<
      string,
      { taskId: string; track: TrackId; floor: number; totalErrors: number; studentsAffected: number }
    >();
    for (const r of filteredResults) {
      for (const [taskId, errCount] of Object.entries(r.wrongAttemptsByTask ?? {})) {
        if (!errCount || errCount <= 0) continue;
        const existing = counts.get(taskId);
        if (existing) {
          existing.totalErrors += errCount;
          existing.studentsAffected += 1;
        } else {
          const track = (taskId.split('-')[0] as TrackId) || r.track;
          counts.set(taskId, {
            taskId,
            track,
            floor: parseTaskFloor(taskId),
            totalErrors: errCount,
            studentsAffected: 1,
          });
        }
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.totalErrors - a.totalErrors)
      .slice(0, 6);
  }, [filteredResults]);

  const handleDeleteRound = async (roundId: string) => {
    try {
      await deleteSavedRound(roundId);
      const next = rounds.filter((r) => r.id !== roundId);
      setRounds(next);
      if (selectedRoundId === roundId) {
        setSelectedRoundId(next[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить запись.');
    }
  };

  const handleExportCsv = () => {
    if (!selectedRound) return;
    const header = [
      'Место (общее)',
      'Место в группе',
      'Имя',
      'Фамилия',
      'Группа',
      'Направление',
      'Баллы',
      'Макс. баллов',
      'Попыток',
      'Всего ошибок',
      'Задачи с ошибками',
    ];
    const rows = filteredResults.map((r) => {
      const mistakes = Object.entries(r.wrongAttemptsByTask ?? {})
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => parseTaskFloor(a) - parseTaskFloor(b));
      const totalErrors = mistakes.reduce((sum, [, c]) => sum + c, 0);
      const mistakesText =
        mistakes.length === 0
          ? 'Без ошибок'
          : mistakes
              .map(([tid, c]) => {
                const floor = parseTaskFloor(tid);
                const title = taskTitleById[tid] ? ` ${taskTitleById[tid]}` : '';
                return `№${floor}${title} (${c} ош.)`;
              })
              .join(', ');
      const trackLabel =
        TRACK_LIST.find((t) => t.id === r.track)?.label ?? r.track;
      return [
        r.finalRank,
        r.groupRank,
        r.firstName,
        r.lastName,
        r.group,
        trackLabel,
        r.score,
        r.maxScore,
        r.attempts,
        totalErrors,
        mistakesText,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date(selectedRound.finishedAt)
      .toISOString()
      .slice(0, 10);
    link.download = `vysota_koda_results_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderStudentMistakes = (r: SavedParticipantResult) => {
    const entries = Object.entries(r.wrongAttemptsByTask ?? {})
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => parseTaskFloor(a) - parseTaskFloor(b));

    if (entries.length === 0) {
      return <span className="text-emerald-400 text-xs">Без ошибок</span>;
    }

    const isExpanded = expandedStudentId === r.id;

    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-rose-300">
            {entries
              .map(([tid, count]) => `№${parseTaskFloor(tid)}${count > 1 ? ` (×${count})` : ''}`)
              .join(', ')}
          </span>
          {r.wrongAnswersLog.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setExpandedStudentId(isExpanded ? null : r.id)
              }
              className="text-[11px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
            >
              {isExpanded ? 'скрыть ответы' : 'подробнее'}
            </button>
          )}
        </div>

        {isExpanded && r.wrongAnswersLog.length > 0 && (
          <div className="bg-[#0B1120] border border-slate-800 rounded-lg p-2.5 space-y-1.5 text-xs">
            {r.wrongAnswersLog.map((entry, i) => {
              const floor = parseTaskFloor(entry.taskId);
              const title = taskTitleById[entry.taskId] ?? entry.taskId;
              return (
                <div
                  key={`${entry.taskId}-${i}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-slate-300"
                >
                  <span className="text-slate-400">
                    Задача №{floor} ({title}):
                  </span>
                  <code className="font-mono text-rose-300">
                    {entry.answer || 'пусто'}
                  </code>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Архив результатов и разбор ошибок
          </h1>
          <p className="text-sm text-slate-400">
            {isSupabaseConfigured
              ? 'Все завершённые этапы автоматически сохраняются в облачную базу Supabase.'
              : 'Завершённые этапы сохраняются автоматически — вы можете просмотреть баллы и задачи с ошибками или выгрузить таблицу в Excel.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadRounds()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-[#121B2F] border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Обновить
          </button>
          {selectedRound && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Скачать CSV (Excel)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/35 rounded-xl text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-10 bg-[#121B2F] border border-slate-800 rounded-xl text-center text-sm text-slate-400">
          Загрузка сохранённых результатов...
        </div>
      ) : rounds.length === 0 ? (
        <div className="p-10 bg-[#121B2F] border border-slate-800 rounded-xl text-center space-y-2">
          <Archive className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-base font-semibold text-white">
            Пока нет завершённых этапов
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Как только соревнование закончится (все финишируют, выйдет таймер или вы нажмёте «Стоп — пьедестал»), результаты всех учеников и разбор ошибок автоматически появятся здесь.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 cols: Saved Rounds List */}
          <aside className="lg:col-span-4 bg-[#121B2F] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Проведённые этапы
              </h2>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {rounds.length}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
              {rounds.map((round) => {
                const active = selectedRound?.id === round.id;
                const avgScore =
                  round.results.length > 0
                    ? (
                        round.results.reduce((s, r) => s + r.score, 0) /
                        round.results.length
                      ).toFixed(1)
                    : '0';

                return (
                  <div
                    key={round.id}
                    className={`p-4 flex items-start justify-between gap-2 transition-colors ${
                      active ? 'bg-[#1D4ED8]/20' : 'hover:bg-slate-800/35'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoundId(round.id);
                        setExpandedStudentId(null);
                      }}
                      className="flex-1 text-left space-y-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-mono text-white font-semibold tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{formatDateTime(round.finishedAt)}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {FINISH_REASON_SHORT[round.finishReason] ?? 'Завершён'}
                        {round.durationMinutes ? ` · таймер ${round.durationMinutes} мин` : ''}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-300 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {round.participantCount} уч.
                        </span>
                        <span className="font-mono text-amber-300">
                          Ср. балл: {avgScore}/{round.maxLevel}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteRound(round.id)}
                      title="Удалить запись раунда"
                      aria-label="Удалить запись раунда"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 rounded-md transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right 8 cols: Detailed Round Analytics & Student Table */}
          {selectedRound && (
            <div className="lg:col-span-8 space-y-5">
              {/* Hardest Tasks Summary */}
              {hardestTasks.length > 0 && (
                <section className="bg-[#121B2F] border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Задачи с наибольшим числом ошибок</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {hardestTasks.map((item) => {
                      const trackLabel =
                        TRACK_LIST.find((t) => t.id === item.track)?.label ?? item.track;
                      const trackColor = TRACK_DARK_ACCENT[item.track] ?? '#94A3B8';
                      return (
                        <div
                          key={item.taskId}
                          className="bg-[#0B1120] border border-slate-800 rounded-lg p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs font-mono">
                            <span style={{ color: trackColor }} className="font-semibold">
                              {trackLabel} · №{item.floor}
                            </span>
                            <span className="text-rose-300 font-bold tabular-nums">
                              {item.totalErrors} ош.
                            </span>
                          </div>
                          <div className="text-xs text-slate-200 font-medium truncate">
                            {taskTitleById[item.taskId] ?? item.taskId}
                          </div>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            Ошиблись: {item.studentsAffected} уч.
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Filters & Results Table */}
              <section className="bg-[#121B2F] border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 sm:px-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center p-0.5 bg-[#0B1120] border border-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setGroupFilter('all')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          groupFilter === 'all'
                            ? 'bg-[#2563EB] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Все группы
                      </button>
                      {GROUP_LIST.map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setGroupFilter(grp)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            groupFilter === grp
                              ? 'bg-[#2563EB] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {GROUP_META[grp].shortLabel}
                        </button>
                      ))}
                    </div>

                    <div className="inline-flex items-center p-0.5 bg-[#0B1120] border border-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setTrackFilter('all')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          trackFilter === 'all'
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Все языки
                      </button>
                      {TRACK_LIST.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTrackFilter(t.id)}
                          className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer ${
                            trackFilter === t.id
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск по фамилии..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0B1120] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </div>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-slate-400">
                    По выбранным фильтрам участников не найдено.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 bg-[#0D1526]">
                          <th className="py-3 pl-5 pr-3 w-14">Место</th>
                          <th className="py-3 px-3">Ученик</th>
                          <th className="py-3 px-3">Язык</th>
                          <th className="py-3 px-3">Группа</th>
                          <th className="py-3 px-3">Баллы</th>
                          <th className="py-3 pl-3 pr-5">Задачи с ошибками</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-sm">
                        {filteredResults.map((r) => {
                          const trackMeta = TRACK_LIST.find((t) => t.id === r.track);
                          const trackColor = TRACK_DARK_ACCENT[r.track] ?? '#94A3B8';
                          const displayRank =
                            groupFilter === 'all' ? r.finalRank : r.groupRank;
                          return (
                            <tr
                              key={r.id}
                              className="hover:bg-slate-800/30 align-top"
                            >
                              <td className="py-3 pl-5 pr-3 font-mono text-xs font-bold text-amber-400 tabular-nums">
                                #{displayRank}
                              </td>
                              <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                                {r.firstName} {r.lastName}
                                {r.isDemo && (
                                  <span className="ml-1.5 text-xs font-normal text-slate-500">
                                    тест
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
                                {r.group}
                              </td>
                              <td className="py-3 px-3 font-mono text-xs font-bold text-slate-100 tabular-nums whitespace-nowrap">
                                {r.score} / {r.maxScore}
                              </td>
                              <td className="py-3 pl-3 pr-5">
                                {renderStudentMistakes(r)}
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
          )}
        </div>
      )}
    </div>
  );
};

import { isSupabaseConfigured, supabase } from './supabaseClient.ts';
import type {
  FinishReason,
  GroupId,
  SavedParticipantResult,
  SavedRoundRecord,
  TrackId,
  WrongAnswerEntry,
} from '../shared/types.ts';

interface DbRoundResultRow {
  id: string;
  round_id: string;
  first_name: string;
  last_name: string;
  track: string;
  group_name: string;
  score: number;
  max_score: number;
  final_rank: number;
  group_rank: number;
  attempts: number;
  solved_task_ids: string[] | null;
  skipped_task_ids: string[] | null;
  wrong_attempts_by_task: Record<string, number> | null;
  wrong_answers_log: WrongAnswerEntry[] | null;
  finished_at: number | null;
  is_demo: boolean | null;
}

interface DbRoundRow {
  id: string;
  started_at: number | null;
  finished_at: number;
  duration_minutes: number | null;
  finish_reason: string;
  participant_count: number;
  max_level: number;
  competition_round_results?: DbRoundResultRow[];
}

function mapResultRow(row: DbRoundResultRow): SavedParticipantResult {
  return {
    id: row.id,
    roundId: row.round_id,
    firstName: row.first_name,
    lastName: row.last_name,
    track: row.track as TrackId,
    group: row.group_name as GroupId,
    score: row.score ?? 0,
    maxScore: row.max_score ?? 10,
    finalRank: row.final_rank ?? 1,
    groupRank: row.group_rank ?? 1,
    attempts: row.attempts ?? 0,
    solvedTaskIds: row.solved_task_ids ?? [],
    skippedTaskIds: row.skipped_task_ids ?? [],
    wrongAttemptsByTask: row.wrong_attempts_by_task ?? {},
    wrongAnswersLog: Array.isArray(row.wrong_answers_log) ? row.wrong_answers_log : [],
    finishedAt: row.finished_at ?? null,
    isDemo: Boolean(row.is_demo),
  };
}

export async function fetchSavedRounds(): Promise<SavedRoundRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('competition_rounds')
      .select('*, competition_round_results(*)')
      .order('finished_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Ошибка загрузки из Supabase: ${error.message}`);
    }

    return ((data ?? []) as DbRoundRow[]).map((row) => ({
      id: row.id,
      startedAt: row.started_at ?? null,
      finishedAt: Number(row.finished_at),
      durationMinutes: row.duration_minutes ?? null,
      finishReason: (row.finish_reason as FinishReason) ?? 'teacher_stopped',
      participantCount: row.participant_count ?? 0,
      maxLevel: row.max_level ?? 10,
      results: (row.competition_round_results ?? [])
        .map(mapResultRow)
        .sort((a, b) => a.finalRank - b.finalRank),
    }));
  }

  const res = await fetch('/api/results');
  if (!res.ok) {
    throw new Error('Не удалось загрузить архив результатов.');
  }
  return (await res.json()) as SavedRoundRecord[];
}

export async function deleteSavedRound(roundId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('competition_rounds')
      .delete()
      .eq('id', roundId);

    if (error) {
      throw new Error(`Не удалось удалить запись: ${error.message}`);
    }
    return;
  }

  const res = await fetch(`/api/results/${encodeURIComponent(roundId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Не удалось удалить запись раунда.');
  }
}

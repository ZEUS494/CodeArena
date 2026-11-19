export type TrackId = 'cpp' | 'csharp' | 'python';

export type GroupId = 'Группа 1' | 'Группа 2' | 'Группа 3';

export type CompetitionStatus = 'lobby' | 'running' | 'finished';

export type FinishReason = 'all_finished' | 'teacher_stopped' | 'time_up';

export type HairStyle = 'short' | 'spiky' | 'ponytail' | 'cap' | 'helmet';
export type SuitPattern = 'stripes' | 'lightning' | 'star' | 'chevron';
export type BarStyle = 'classic' | 'gold' | 'neon' | 'emerald';

export interface CharacterCustomization {
  suitColorIndex: number;
  hairStyle: HairStyle;
  hairColor: string;
  pattern: SuitPattern;
  barStyle: BarStyle;
}

export const SUIT_COLOR_OPTIONS = [
  { index: 0, label: 'Жёлтый', swatch: '#FACC15' },
  { index: 1, label: 'Красный', swatch: '#EF4444' },
  { index: 2, label: 'Синий', swatch: '#3B82F6' },
  { index: 3, label: 'Изумруд', swatch: '#10B981' },
  { index: 4, label: 'Фиолет', swatch: '#8B5CF6' },
  { index: 5, label: 'Оранж', swatch: '#F97316' },
  { index: 6, label: 'Бирюза', swatch: '#06B6D4' },
  { index: 7, label: 'Розовый', swatch: '#EC4899' },
] as const;

export const HAIR_STYLE_OPTIONS: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Классика' },
  { id: 'spiky', label: 'Ёжик' },
  { id: 'ponytail', label: 'Хвост' },
  { id: 'cap', label: 'Кепка' },
  { id: 'helmet', label: 'Шлем' },
];

export const HAIR_COLOR_OPTIONS: { color: string; label: string }[] = [
  { color: '#1E1B18', label: 'Чёрный' },
  { color: '#4A2E1B', label: 'Каштан' },
  { color: '#A16207', label: 'Русый' },
  { color: '#C2410C', label: 'Рыжий' },
  { color: '#CBD5E1', label: 'Пепел' },
  { color: '#38BDF8', label: 'Неон' },
];

export const SUIT_PATTERN_OPTIONS: { id: SuitPattern; label: string }[] = [
  { id: 'stripes', label: 'Полосы' },
  { id: 'lightning', label: 'Молния' },
  { id: 'star', label: 'Звезда' },
  { id: 'chevron', label: 'Шеврон' },
];

export const BAR_STYLE_OPTIONS: { id: BarStyle; label: string; color: string }[] = [
  { id: 'classic', label: 'Сталь', color: '#94A3B8' },
  { id: 'gold', label: 'Золото', color: '#FBBF24' },
  { id: 'neon', label: 'Электрик', color: '#38BDF8' },
  { id: 'emerald', label: 'Кибер', color: '#34D399' },
];

export function createDefaultCustomization(colorIndex: number): CharacterCustomization {
  const hairColors = HAIR_COLOR_OPTIONS.map((h) => h.color);
  return {
    suitColorIndex: colorIndex % SUIT_COLOR_OPTIONS.length,
    hairStyle: 'short',
    hairColor: hairColors[colorIndex % hairColors.length],
    pattern: 'stripes',
    barStyle: 'classic',
  };
}

export const TRACK_LIST: {
  id: TrackId;
  label: string;
  shortLabel: string;
  accent: string;
  subtitle: string;
}[] = [
  {
    id: 'cpp',
    label: 'C++',
    shortLabel: 'C++',
    accent: '#38BDF8',
    subtitle: 'Типы, циклы, ссылки, строки и STL',
  },
  {
    id: 'csharp',
    label: 'C#',
    shortLabel: 'C#',
    accent: '#C084FC',
    subtitle: 'Массивы, List, строки, циклы и LINQ',
  },
  {
    id: 'python',
    label: 'Python',
    shortLabel: 'Python',
    accent: '#34D399',
    subtitle: 'Срезы, списки, словари и генераторы',
  },
];

export const GROUP_LIST: GroupId[] = ['Группа 1', 'Группа 2', 'Группа 3'];

export const GROUP_META: Record<
  GroupId,
  { id: GroupId; shortLabel: string; accent: string; softBg: string; border: string }
> = {
  'Группа 1': {
    id: 'Группа 1',
    shortLabel: 'Гр. 1',
    accent: '#38BDF8',
    softBg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.45)',
  },
  'Группа 2': {
    id: 'Группа 2',
    shortLabel: 'Гр. 2',
    accent: '#34D399',
    softBg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.45)',
  },
  'Группа 3': {
    id: 'Группа 3',
    shortLabel: 'Гр. 3',
    accent: '#A78BFA',
    softBg: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.45)',
  },
};

export const MAX_PARTICIPANTS = 16;
export const MAX_LEVEL = 10;

export interface WrongAnswerEntry {
  taskId: string;
  answer: string;
  timestamp: number;
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  track: TrackId;
  group: GroupId;
  level: number;
  maxLevel: number;
  solvedTaskIds: string[];
  skippedTaskIds: string[];
  wrongAttemptsByTask: Record<string, number>;
  wrongAnswersLog?: WrongAnswerEntry[];
  attempts: number;
  connected: boolean;
  joinedAt: number;
  finishedAt: number | null;
  finishPlace: number | null;
  finalRank: number | null;
  lastClimbAt: number | null;
  colorIndex: number;
  customization: CharacterCustomization;
  isDemo?: boolean;
}

export interface SavedParticipantResult {
  id: string;
  roundId: string;
  firstName: string;
  lastName: string;
  track: TrackId;
  group: GroupId;
  score: number;
  maxScore: number;
  finalRank: number;
  groupRank: number;
  attempts: number;
  solvedTaskIds: string[];
  skippedTaskIds: string[];
  wrongAttemptsByTask: Record<string, number>;
  wrongAnswersLog: WrongAnswerEntry[];
  finishedAt: number | null;
  isDemo?: boolean;
}

export interface SavedRoundRecord {
  id: string;
  startedAt: number | null;
  finishedAt: number;
  durationMinutes: number | null;
  finishReason: FinishReason;
  participantCount: number;
  maxLevel: number;
  results: SavedParticipantResult[];
}

export interface PublicTask {
  id: string;
  floor: number;
  track: TrackId;
  title: string;
  answerType: 'output' | 'code';
  prompt: string;
  code: string;
  inputPlaceholder: string;
  inputHint: string;
}

export interface TeacherPreviewTask extends PublicTask {
  sampleAnswer: string;
  explanation: string;
}

export interface ClimbEvent {
  id: string;
  participantId: string;
  participantName: string;
  track: TrackId;
  group: GroupId;
  fromLevel: number;
  toLevel: number;
  timestamp: number;
  finished: boolean;
}

export interface RoomSummary {
  id: string;
  teacherName: string;
  status: CompetitionStatus;
  participantCount: number;
  updatedAt?: string;
}

export function normalizeRoomCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'main';
  if (trimmed.toLowerCase() === 'main') return 'main';
  return trimmed
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 12) || 'main';
}

export function generateRoomCode(length = 5): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export interface RoomState {
  roomId?: string;
  teacherName?: string;
  status: CompetitionStatus;
  maxParticipants: number;
  maxLevel: number;
  startedAt: number | null;
  durationMinutes: number | null;
  endsAt: number | null;
  finishedAt: number | null;
  finishReason: FinishReason | null;
  demoAutoRunning: boolean;
  participants: Participant[];
  recentEvents: ClimbEvent[];
}

export type ClientMessage =
  | { type: 'client:hello'; role: 'teacher' | 'student'; participantId?: string }
  | {
      type: 'student:join';
      firstName: string;
      lastName: string;
      track: TrackId;
      group: GroupId;
      existingId?: string;
      customization?: Partial<CharacterCustomization>;
    }
  | {
      type: 'student:customize';
      participantId: string;
      customization: Partial<CharacterCustomization>;
    }
  | { type: 'student:leave'; participantId: string }
  | { type: 'student:submit_answer'; participantId: string; taskId: string; answer: string }
  | { type: 'student:skip_task'; participantId: string; taskId: string }
  | { type: 'teacher:start'; durationMinutes?: number | null }
  | { type: 'teacher:finish' }
  | { type: 'teacher:reset_progress' }
  | { type: 'teacher:clear_room' }
  | { type: 'teacher:remove_participant'; participantId: string }
  | { type: 'teacher:seed_demo' }
  | { type: 'teacher:demo_step'; participantId?: string; group?: GroupId }
  | { type: 'teacher:toggle_demo_auto'; enabled: boolean };

export type ServerMessage =
  | { type: 'state:sync'; state: RoomState }
  | { type: 'student:joined'; participant: Participant; tasks: PublicTask[] }
  | { type: 'student:tasks'; tasks: PublicTask[] }
  | {
      type: 'answer:result';
      taskId: string;
      correct: boolean;
      newLevel: number;
      finished: boolean;
      message: string;
    }
  | { type: 'participant:climbed'; event: ClimbEvent }
  | { type: 'error'; message: string };

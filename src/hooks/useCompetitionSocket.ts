import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_LEVEL,
  MAX_PARTICIPANTS,
  SUIT_COLOR_OPTIONS,
  createDefaultCustomization,
  generateRoomCode,
  normalizeRoomCode,
  type CharacterCustomization,
  type ClimbEvent,
  type ClientMessage,
  type FinishReason,
  type GroupId,
  type Participant,
  type PublicTask,
  type RoomState,
  type RoomSummary,
  type ServerMessage,
  type TrackId,
  type WrongAnswerEntry,
} from '../shared/types.ts';
import { getPublicTasks } from '../shared/publicTasks.ts';
import { DEMO_ROSTER } from '../shared/demoRoster.ts';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts';
import {
  playHookClimbSound,
  playVictorySound,
  playWrongAnswerSound,
} from '../utils/sound.ts';

const STORAGE_KEY_PARTICIPANT_ID = 'codeclimb_participant_id';
const STORAGE_KEY_ROOM_ID = 'codeclimb_room_id';
const STORAGE_KEY_TEACHER_NAME = 'codeclimb_teacher_name';

function getInitialRoomId(): string {
  if (typeof window === 'undefined') return 'main';
  const hash = window.location.hash;
  if (/^#[A-Za-z0-9_-]{2,12}$/.test(hash)) {
    return normalizeRoomCode(hash.slice(1));
  }
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('room');
  if (fromUrl && fromUrl.trim()) {
    return normalizeRoomCode(fromUrl);
  }
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY_ROOM_ID);
    if (saved && saved.trim()) return normalizeRoomCode(saved);
  } catch {
    // ignore
  }
  return 'main';
}

function syncRoomParamToUrl(code: string) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (code === 'main') {
      url.searchParams.delete('room');
    } else {
      url.searchParams.set('room', code);
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // ignore
  }
}

const INITIAL_ROOM_STATE: RoomState = {
  roomId: 'main',
  teacherName: '',
  status: 'lobby',
  maxParticipants: MAX_PARTICIPANTS,
  maxLevel: MAX_LEVEL,
  startedAt: null,
  durationMinutes: null,
  endsAt: null,
  finishedAt: null,
  finishReason: null,
  demoAutoRunning: false,
  participants: [],
  recentEvents: [],
};

export interface AnswerFeedback {
  taskId: string;
  correct: boolean;
  message: string;
  timestamp: number;
}

export interface ActiveClimbAnimation {
  eventId: string;
  fromLevel: number;
  toLevel: number;
  startedAt: number;
}

interface DbRoomRow {
  id: string;
  teacher_name?: string | null;
  status: RoomState['status'];
  max_participants: number;
  max_level: number;
  started_at: number | null;
  duration_minutes: number | null;
  ends_at: number | null;
  finished_at: number | null;
  finish_reason: FinishReason | null;
  updated_at?: string | null;
}

interface DbParticipantRow {
  id: string;
  room_id: string;
  first_name: string;
  last_name: string;
  track: TrackId;
  group_name: GroupId;
  level: number;
  max_level: number;
  solved_task_ids: string[] | null;
  skipped_task_ids: string[] | null;
  wrong_attempts_by_task: Record<string, number> | null;
  wrong_answers_log: WrongAnswerEntry[] | null;
  attempts: number;
  connected: boolean;
  joined_at: number;
  finished_at: number | null;
  finish_place: number | null;
  final_rank: number | null;
  last_climb_at: number | null;
  color_index: number;
  customization: Partial<CharacterCustomization> | null;
  is_demo: boolean | null;
}

interface DbClimbEventRow {
  id: string;
  participant_id: string;
  participant_name: string;
  track: TrackId;
  group_name: GroupId;
  from_level: number;
  to_level: number;
  finished: boolean;
  created_at: number;
}

function mapDbParticipant(row: DbParticipantRow): Participant {
  const colorIndex = Number(row.color_index ?? 0);
  const baseCustom = createDefaultCustomization(colorIndex);
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    track: row.track,
    group: row.group_name,
    level: Number(row.level ?? 0),
    maxLevel: Number(row.max_level ?? MAX_LEVEL),
    solvedTaskIds: row.solved_task_ids ?? [],
    skippedTaskIds: row.skipped_task_ids ?? [],
    wrongAttemptsByTask: row.wrong_attempts_by_task ?? {},
    wrongAnswersLog: Array.isArray(row.wrong_answers_log) ? row.wrong_answers_log : [],
    attempts: Number(row.attempts ?? 0),
    connected: row.connected !== false,
    joinedAt: Number(row.joined_at ?? Date.now()),
    finishedAt: row.finished_at !== null ? Number(row.finished_at) : null,
    finishPlace: row.finish_place !== null ? Number(row.finish_place) : null,
    finalRank: row.final_rank !== null ? Number(row.final_rank) : null,
    lastClimbAt: row.last_climb_at !== null ? Number(row.last_climb_at) : null,
    colorIndex,
    customization: { ...baseCustom, ...(row.customization ?? {}) },
    isDemo: Boolean(row.is_demo),
  };
}

function mapDbClimbEvent(row: DbClimbEventRow): ClimbEvent {
  return {
    id: row.id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    track: row.track,
    group: row.group_name,
    fromLevel: Number(row.from_level),
    toLevel: Number(row.to_level),
    timestamp: Number(row.created_at),
    finished: Boolean(row.finished),
  };
}

export function useCompetitionSocket(role: 'teacher' | 'student', soundEnabled: boolean) {
  const [roomId, setRoomId] = useState<string>(getInitialRoomId);
  const [teacherName, setTeacherNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TEACHER_NAME) ?? '';
    } catch {
      return '';
    }
  });
  const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);
  const [roomState, setRoomState] = useState<RoomState>(INITIAL_ROOM_STATE);
  const [connected, setConnected] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_PARTICIPANT_ID);
    } catch {
      return null;
    }
  });
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [lastAnswer, setLastAnswer] = useState<AnswerFeedback | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeClimbs, setActiveClimbs] = useState<Record<string, ActiveClimbAnimation>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const demoAutoTimerRef = useRef<number | null>(null);
  const seenClimbIdsRef = useRef<Set<string>>(new Set());
  const roleRef = useRef(role);
  const soundRef = useRef(soundEnabled);
  const myIdRef = useRef(myParticipantId);
  const roomStateRef = useRef(roomState);
  const roomIdRef = useRef(roomId);

  roleRef.current = role;
  soundRef.current = soundEnabled;
  myIdRef.current = myParticipantId;
  roomStateRef.current = roomState;
  roomIdRef.current = roomId;

  const sendMessage = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const triggerClimbAnimation = useCallback((event: ClimbEvent) => {
    setActiveClimbs((prev) => ({
      ...prev,
      [event.participantId]: {
        eventId: event.id,
        fromLevel: event.fromLevel,
        toLevel: event.toLevel,
        startedAt: Date.now(),
      },
    }));

    window.setTimeout(() => {
      setActiveClimbs((prev) => {
        const current = prev[event.participantId];
        if (!current || current.eventId !== event.id) return prev;
        const copy = { ...prev };
        delete copy[event.participantId];
        return copy;
      });
    }, 1300);
  }, []);

  // =========================================================================
  // SUPABASE REALTIME SYNC (when VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY set)
  // =========================================================================
  const fetchSupabaseState = useCallback(async (overrideRoomId?: string) => {
    if (!supabase) return;
    const targetRoomId = overrideRoomId ?? roomIdRef.current;

    const [roomRes, partRes, eventsRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', targetRoomId).maybeSingle(),
      supabase
        .from('participants')
        .select('*')
        .eq('room_id', targetRoomId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('climb_events')
        .select('*')
        .eq('room_id', targetRoomId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (roomRes.error || partRes.error) {
      setErrorMessage(
        roomRes.error?.message ||
          partRes.error?.message ||
          'Не удалось синхронизироваться с Supabase.'
      );
      return;
    }

    const room = roomRes.data as DbRoomRow | null;
    const participants = ((partRes.data ?? []) as DbParticipantRow[]).map(mapDbParticipant);
    const recentEvents = ((eventsRes.data ?? []) as DbClimbEventRow[]).map(mapDbClimbEvent);

    // Seed seen climb IDs on initial load so historical events don't replay sounds
    if (seenClimbIdsRef.current.size === 0 && recentEvents.length > 0) {
      for (const ev of recentEvents) {
        seenClimbIdsRef.current.add(ev.id);
      }
    }

    setRoomState((prev) => ({
      roomId: room?.id ?? targetRoomId,
      teacherName: room?.teacher_name ?? '',
      status: room?.status ?? 'lobby',
      maxParticipants: Number(room?.max_participants ?? MAX_PARTICIPANTS),
      maxLevel: Number(room?.max_level ?? MAX_LEVEL),
      startedAt: room?.started_at !== null && room?.started_at !== undefined ? Number(room.started_at) : null,
      durationMinutes: room?.duration_minutes ?? null,
      endsAt: room?.ends_at !== null && room?.ends_at !== undefined ? Number(room.ends_at) : null,
      finishedAt: room?.finished_at !== null && room?.finished_at !== undefined ? Number(room.finished_at) : null,
      finishReason: room?.finish_reason ?? null,
      demoAutoRunning: prev.demoAutoRunning,
      participants,
      recentEvents,
    }));

    if (myIdRef.current) {
      const me = participants.find((p) => p.id === myIdRef.current);
      if (!me) {
        setMyParticipantId(null);
        setTasks([]);
        setLastAnswer(null);
        try {
          sessionStorage.removeItem(STORAGE_KEY_PARTICIPANT_ID);
        } catch {
          // ignore
        }
      } else {
        setTasks(getPublicTasks(me.track));
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    const activeRoom = roomId;

    let unmounted = false;
    void fetchSupabaseState(activeRoom).then(() => {
      if (!unmounted) setConnected(true);
    });

    const channel = sb
      .channel(`codeclimb_room_${activeRoom}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${activeRoom}` },
        () => {
          void fetchSupabaseState(activeRoom);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${activeRoom}` },
        () => {
          void fetchSupabaseState(activeRoom);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'climb_events', filter: `room_id=eq.${activeRoom}` },
        (payload) => {
          const row = payload.new as DbClimbEventRow;
          if (!row?.id || seenClimbIdsRef.current.has(row.id)) return;
          seenClimbIdsRef.current.add(row.id);
          const ev = mapDbClimbEvent(row);
          triggerClimbAnimation(ev);
          if (ev.finished) {
            playVictorySound(soundRef.current);
          } else {
            playHookClimbSound(ev.toLevel, soundRef.current);
          }
          void fetchSupabaseState();
        }
      )
      .subscribe((status) => {
        if (unmounted) return;
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          setErrorMessage(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
        }
      });

    // Periodic safety poll (every 8s) in case a realtime event drops on mobile/school Wi-Fi
    const pollId = window.setInterval(() => {
      void fetchSupabaseState();
    }, 8000);

    return () => {
      unmounted = true;
      window.clearInterval(pollId);
      if (demoAutoTimerRef.current !== null) {
        window.clearInterval(demoAutoTimerRef.current);
        demoAutoTimerRef.current = null;
      }
      void sb.removeChannel(channel);
    };
  }, [fetchSupabaseState, triggerClimbAnimation, roomId]);

  // Client-side countdown expiry trigger in Supabase mode (server RPC guards against duplicates)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    if (roomState.status !== 'running' || !roomState.endsAt) return;
    const sb = supabase;
    const activeRoom = roomId;

    const msLeft = roomState.endsAt - Date.now();
    if (msLeft <= 0) {
      void sb.rpc('finalize_competition_round', { p_reason: 'time_up', p_room_id: activeRoom });
      return;
    }
    const timer = window.setTimeout(() => {
      void sb.rpc('finalize_competition_round', { p_reason: 'time_up', p_room_id: activeRoom });
    }, msLeft + 250);

    return () => window.clearTimeout(timer);
  }, [roomState.status, roomState.endsAt, roomId]);

  // =========================================================================
  // LOCAL WEBSOCKET SYNC (when Supabase env vars are not configured)
  // =========================================================================
  useEffect(() => {
    if (isSupabaseConfigured) return;

    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setConnected(true);
        setErrorMessage(null);
        ws.send(
          JSON.stringify({
            type: 'client:hello',
            role: roleRef.current,
            participantId: myIdRef.current ?? undefined,
          } satisfies ClientMessage)
        );
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data as string) as ServerMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'state:sync': {
            setRoomState(msg.state);
            if (myIdRef.current) {
              const stillThere = msg.state.participants.some(
                (p) => p.id === myIdRef.current
              );
              if (!stillThere) {
                setMyParticipantId(null);
                setTasks([]);
                setLastAnswer(null);
                try {
                  sessionStorage.removeItem(STORAGE_KEY_PARTICIPANT_ID);
                } catch {
                  // ignore storage errors
                }
              }
            }
            break;
          }

          case 'student:joined': {
            setMyParticipantId(msg.participant.id);
            setTasks(msg.tasks);
            setErrorMessage(null);
            try {
              sessionStorage.setItem(STORAGE_KEY_PARTICIPANT_ID, msg.participant.id);
            } catch {
              // ignore storage errors
            }
            break;
          }

          case 'student:tasks': {
            setTasks(msg.tasks);
            break;
          }

          case 'answer:result': {
            setLastAnswer({
              taskId: msg.taskId,
              correct: msg.correct,
              message: msg.message,
              timestamp: Date.now(),
            });
            if (!msg.correct) {
              playWrongAnswerSound(soundRef.current);
            }
            break;
          }

          case 'participant:climbed': {
            triggerClimbAnimation(msg.event);
            if (msg.event.finished) {
              playVictorySound(soundRef.current);
            } else {
              playHookClimbSound(msg.event.toLevel, soundRef.current);
            }
            break;
          }

          case 'error': {
            setErrorMessage(msg.message);
            break;
          }
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [triggerClimbAnimation]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    if (connected) {
      sendMessage({
        type: 'client:hello',
        role,
        participantId: myParticipantId ?? undefined,
      });
    }
  }, [role, connected, myParticipantId, sendMessage]);

  // =========================================================================
  // UNIFIED ACTIONS (Dual-Mode: Supabase or WebSocket)
  // =========================================================================
  const joinAsStudent = useCallback(
    async (payload: {
      firstName: string;
      lastName: string;
      track: TrackId;
      group: GroupId;
      roomCode?: string;
    }) => {
      setErrorMessage(null);

      const first = payload.firstName.trim();
      const last = payload.lastName.trim();
      if (!first || !last) {
        setErrorMessage('Введите имя и фамилию.');
        return;
      }

      if (isSupabaseConfigured && supabase) {
        const targetRoomId = payload.roomCode ? normalizeRoomCode(payload.roomCode) : roomIdRef.current;

        // Verify target room exists in Supabase
        const { data: roomData, error: roomErr } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', targetRoomId)
          .maybeSingle();

        if (roomErr || !roomData) {
          setErrorMessage(`Комната «${targetRoomId}» не найдена. Проверьте код у преподавателя.`);
          return;
        }

        if (targetRoomId !== roomIdRef.current) {
          seenClimbIdsRef.current.clear();
          roomIdRef.current = targetRoomId;
          setRoomId(targetRoomId);
          syncRoomParamToUrl(targetRoomId);
          try {
            sessionStorage.setItem(STORAGE_KEY_ROOM_ID, targetRoomId);
          } catch {
            // ignore
          }
        }

        const { data: partData } = await supabase
          .from('participants')
          .select('*')
          .eq('room_id', targetRoomId);
        const current = ((partData ?? []) as DbParticipantRow[]).map(mapDbParticipant);

        if (current.length >= MAX_PARTICIPANTS) {
          setErrorMessage(`Достигнут лимит участников (${MAX_PARTICIPANTS} из ${MAX_PARTICIPANTS}).`);
          return;
        }

        const fullLower = `${first} ${last}`.toLowerCase();
        if (
          current.some(
            (p) => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === fullLower
          )
        ) {
          setErrorMessage('Участник с таким именем и фамилией уже находится в комнате.');
          return;
        }

        const inGroup = current.filter((p) => p.group === payload.group);
        const usedColors = new Set(inGroup.map((p) => p.colorIndex));
        let colorIdx = inGroup.length % SUIT_COLOR_OPTIONS.length;
        for (let i = 0; i < SUIT_COLOR_OPTIONS.length; i++) {
          if (!usedColors.has(i)) {
            colorIdx = i;
            break;
          }
        }
        const customization = createDefaultCustomization(colorIdx);

        const { data, error } = await supabase
          .from('participants')
          .insert({
            room_id: targetRoomId,
            first_name: first,
            last_name: last,
            track: payload.track,
            group_name: payload.group,
            level: 0,
            max_level: MAX_LEVEL,
            color_index: colorIdx,
            customization,
            joined_at: Date.now(),
            is_demo: false,
          })
          .select('*')
          .single();

        if (error || !data) {
          setErrorMessage(error?.message || 'Не удалось войти в комнату.');
          return;
        }

        const joined = mapDbParticipant(data as DbParticipantRow);
        setMyParticipantId(joined.id);
        setTasks(getPublicTasks(joined.track));
        try {
          sessionStorage.setItem(STORAGE_KEY_PARTICIPANT_ID, joined.id);
        } catch {
          // ignore
        }
        await fetchSupabaseState();
        return;
      }

      sendMessage({
        type: 'student:join',
        ...payload,
        existingId: myIdRef.current ?? undefined,
      });
    },
    [sendMessage, fetchSupabaseState]
  );

  const leaveAsStudent = useCallback(async () => {
    const pid = myIdRef.current;
    if (isSupabaseConfigured && supabase) {
      if (pid) {
        await supabase.from('participants').delete().eq('id', pid);
      }
      setMyParticipantId(null);
      setTasks([]);
      setLastAnswer(null);
      try {
        sessionStorage.removeItem(STORAGE_KEY_PARTICIPANT_ID);
      } catch {
        // ignore
      }
      await fetchSupabaseState();
      return;
    }

    if (pid) {
      sendMessage({ type: 'student:leave', participantId: pid });
    }
    setMyParticipantId(null);
    setTasks([]);
    setLastAnswer(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY_PARTICIPANT_ID);
    } catch {
      // ignore
    }
  }, [sendMessage, fetchSupabaseState]);

  const submitAnswer = useCallback(
    async (taskId: string, answer: string) => {
      if (!myIdRef.current) return;
      setErrorMessage(null);

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('submit_task_answer', {
          p_participant_id: myIdRef.current,
          p_task_id: taskId,
          p_answer: answer,
        });

        if (error) {
          setErrorMessage(`Ошибка проверки ответа: ${error.message}`);
          return;
        }

        const res = data as {
          correct?: boolean;
          message?: string;
          error?: string;
        } | null;

        if (res?.error) {
          setErrorMessage(res.error);
          return;
        }

        const isCorrect = Boolean(res?.correct);
        setLastAnswer({
          taskId,
          correct: isCorrect,
          message:
            res?.message ??
            (isCorrect
              ? 'Верно! Отличный подъём!'
              : 'Ответ не совпал. Попробуйте снова или пропустите задачу.'),
          timestamp: Date.now(),
        });

        if (!isCorrect) {
          playWrongAnswerSound(soundRef.current);
        }
        await fetchSupabaseState();
        return;
      }

      sendMessage({
        type: 'student:submit_answer',
        participantId: myIdRef.current,
        taskId,
        answer,
      });
    },
    [sendMessage, fetchSupabaseState]
  );

  const skipTask = useCallback(
    async (taskId: string) => {
      if (!myIdRef.current) return;
      setErrorMessage(null);

      if (isSupabaseConfigured && supabase) {
        const me = roomStateRef.current.participants.find(
          (p) => p.id === myIdRef.current
        );
        if (!me || me.solvedTaskIds.includes(taskId) || me.skippedTaskIds.includes(taskId)) {
          return;
        }
        const nextSkipped = [...me.skippedTaskIds, taskId];
        await supabase
          .from('participants')
          .update({ skipped_task_ids: nextSkipped })
          .eq('id', me.id);
        await fetchSupabaseState();
        return;
      }

      sendMessage({
        type: 'student:skip_task',
        participantId: myIdRef.current,
        taskId,
      });
    },
    [sendMessage, fetchSupabaseState]
  );

  const customizeCharacter = useCallback(
    async (customization: Partial<CharacterCustomization>) => {
      if (!myIdRef.current) return;

      if (isSupabaseConfigured && supabase) {
        const me = roomStateRef.current.participants.find(
          (p) => p.id === myIdRef.current
        );
        if (!me) return;
        const merged: CharacterCustomization = {
          ...me.customization,
          ...customization,
        };
        await supabase
          .from('participants')
          .update({
            customization: merged,
            color_index: merged.suitColorIndex,
          })
          .eq('id', me.id);
        await fetchSupabaseState();
        return;
      }

      sendMessage({
        type: 'student:customize',
        participantId: myIdRef.current,
        customization,
      });
    },
    [sendMessage, fetchSupabaseState]
  );

  const startCompetition = useCallback(
    async (durationMinutes?: number | null) => {
      if (isSupabaseConfigured && supabase) {
        const now = Date.now();
        const clamped =
          durationMinutes && durationMinutes > 0
            ? Math.min(90, Math.max(1, Math.round(durationMinutes)))
            : null;
        await supabase
          .from('rooms')
          .update({
            status: 'running',
            started_at: now,
            duration_minutes: clamped,
            ends_at: clamped ? now + clamped * 60_000 : null,
            finished_at: null,
            finish_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', roomIdRef.current);
        await fetchSupabaseState();
        return;
      }
      sendMessage({ type: 'teacher:start', durationMinutes: durationMinutes ?? null });
    },
    [sendMessage, fetchSupabaseState]
  );

  const stopSupabaseDemoAuto = useCallback(() => {
    if (demoAutoTimerRef.current !== null) {
      window.clearInterval(demoAutoTimerRef.current);
      demoAutoTimerRef.current = null;
    }
    setRoomState((prev) => ({ ...prev, demoAutoRunning: false }));
  }, []);

  const finishCompetition = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      stopSupabaseDemoAuto();
      await supabase.rpc('finalize_competition_round', {
        p_reason: 'teacher_stopped',
        p_room_id: roomIdRef.current,
      });
      await fetchSupabaseState();
      return;
    }
    sendMessage({ type: 'teacher:finish' });
  }, [sendMessage, fetchSupabaseState, stopSupabaseDemoAuto]);

  const resetProgress = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      stopSupabaseDemoAuto();
      const activeRoom = roomIdRef.current;
      await Promise.all([
        supabase
          .from('rooms')
          .update({
            status: 'lobby',
            started_at: null,
            ends_at: null,
            finished_at: null,
            finish_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeRoom),
        supabase
          .from('participants')
          .update({
            level: 0,
            solved_task_ids: [],
            skipped_task_ids: [],
            wrong_attempts_by_task: {},
            wrong_answers_log: [],
            attempts: 0,
            finished_at: null,
            finish_place: null,
            final_rank: null,
            last_climb_at: null,
          })
          .eq('room_id', activeRoom),
        supabase.from('climb_events').delete().eq('room_id', activeRoom),
      ]);
      seenClimbIdsRef.current.clear();
      await fetchSupabaseState();
      return;
    }
    sendMessage({ type: 'teacher:reset_progress' });
  }, [sendMessage, fetchSupabaseState, stopSupabaseDemoAuto]);

  const clearRoom = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      stopSupabaseDemoAuto();
      const activeRoom = roomIdRef.current;
      await Promise.all([
        supabase.from('participants').delete().eq('room_id', activeRoom),
        supabase.from('climb_events').delete().eq('room_id', activeRoom),
        supabase
          .from('rooms')
          .update({
            status: 'lobby',
            started_at: null,
            duration_minutes: null,
            ends_at: null,
            finished_at: null,
            finish_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeRoom),
      ]);
      seenClimbIdsRef.current.clear();
      await fetchSupabaseState();
      return;
    }
    sendMessage({ type: 'teacher:clear_room' });
  }, [sendMessage, fetchSupabaseState, stopSupabaseDemoAuto]);

  const removeParticipant = useCallback(
    async (participantId: string) => {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('participants').delete().eq('id', participantId);
        await fetchSupabaseState();
        return;
      }
      sendMessage({ type: 'teacher:remove_participant', participantId });
    },
    [sendMessage, fetchSupabaseState]
  );

  const seedDemoParticipants = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const existing = roomStateRef.current.participants;
      const toInsert = [];
      let count = existing.length;
      const now = Date.now();
      for (let i = 0; i < DEMO_ROSTER.length && count < MAX_PARTICIPANTS; i++) {
        const c = DEMO_ROSTER[i];
        const dup = existing.some(
          (p) => p.firstName === c.firstName && p.lastName === c.lastName
        );
        if (dup) continue;
        count += 1;
        toInsert.push({
          room_id: roomIdRef.current,
          first_name: c.firstName,
          last_name: c.lastName,
          track: c.track,
          group_name: c.group,
          level: 0,
          max_level: MAX_LEVEL,
          color_index: c.customization.suitColorIndex,
          customization: c.customization,
          joined_at: now + i,
          is_demo: true,
        });
      }
      if (toInsert.length > 0) {
        await supabase.from('participants').insert(toInsert);
        await fetchSupabaseState();
      }
      return;
    }
    sendMessage({ type: 'teacher:seed_demo' });
  }, [sendMessage, fetchSupabaseState]);

  const demoStepClimb = useCallback(
    async (participantId?: string, group?: GroupId) => {
      if (isSupabaseConfigured && supabase) {
        await supabase.rpc('advance_demo_participant', {
          p_participant_id: participantId ?? null,
          p_group: group ?? null,
          p_room_id: roomIdRef.current,
        });
        await fetchSupabaseState();
        return;
      }
      sendMessage({ type: 'teacher:demo_step', participantId, group });
    },
    [sendMessage, fetchSupabaseState]
  );

  const toggleDemoAuto = useCallback(
    async (enabled: boolean) => {
      if (isSupabaseConfigured && supabase) {
        const sb = supabase;
        if (!enabled) {
          stopSupabaseDemoAuto();
          return;
        }
        if (roomStateRef.current.participants.length === 0) {
          await seedDemoParticipants();
        }
        if (roomStateRef.current.status === 'finished') {
          await resetProgress();
        }
        setRoomState((prev) => ({ ...prev, demoAutoRunning: true }));
        const tick = async () => {
          const unfinished = roomStateRef.current.participants.some(
            (p) => p.level < MAX_LEVEL
          );
          if (!unfinished && roomStateRef.current.participants.length > 0) {
            stopSupabaseDemoAuto();
            return;
          }
          await sb.rpc('advance_demo_participant', {
            p_participant_id: null,
            p_group: null,
            p_room_id: roomIdRef.current,
          });
        };
        void tick();
        demoAutoTimerRef.current = window.setInterval(() => {
          void tick();
        }, 900);
        return;
      }
      sendMessage({ type: 'teacher:toggle_demo_auto', enabled });
    },
    [sendMessage, seedDemoParticipants, resetProgress, stopSupabaseDemoAuto]
  );

  const refreshRooms = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const [roomsRes, partsRes] = await Promise.all([
      supabase.from('rooms').select('*').order('updated_at', { ascending: false }).limit(25),
      supabase.from('participants').select('room_id'),
    ]);
    if (roomsRes.error) return;
    const counts = new Map<string, number>();
    for (const row of (partsRes.data ?? []) as { room_id: string }[]) {
      counts.set(row.room_id, (counts.get(row.room_id) ?? 0) + 1);
    }
    const list: RoomSummary[] = ((roomsRes.data ?? []) as DbRoomRow[]).map((r) => ({
      id: r.id,
      teacherName: r.teacher_name ?? '',
      status: r.status,
      participantCount: counts.get(r.id) ?? 0,
      updatedAt: r.updated_at ?? undefined,
    }));
    setAvailableRooms(list);
  }, []);

  const switchRoom = useCallback(
    async (targetCode: string): Promise<boolean> => {
      const normalized = normalizeRoomCode(targetCode);
      setErrorMessage(null);
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', normalized)
          .maybeSingle();
        if (error || !data) {
          setErrorMessage(`Комната «${normalized}» не найдена.`);
          return false;
        }
      }
      stopSupabaseDemoAuto();
      seenClimbIdsRef.current.clear();
      roomIdRef.current = normalized;
      setRoomId(normalized);
      syncRoomParamToUrl(normalized);
      try {
        sessionStorage.setItem(STORAGE_KEY_ROOM_ID, normalized);
      } catch {
        // ignore
      }
      if (isSupabaseConfigured && supabase) {
        await fetchSupabaseState(normalized);
      }
      return true;
    },
    [fetchSupabaseState, stopSupabaseDemoAuto]
  );

  const createRoom = useCallback(
    async (customCode?: string, customTeacherName?: string): Promise<string | null> => {
      setErrorMessage(null);
      const code = customCode?.trim() ? normalizeRoomCode(customCode) : generateRoomCode(5);
      const tName = (customTeacherName ?? teacherName).trim();

      if (isSupabaseConfigured && supabase) {
        const { data: existing } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', code)
          .maybeSingle();

        if (existing) {
          setErrorMessage(`Комната с кодом «${code}» уже существует. Выберите другой код или подключитесь к ней.`);
          return null;
        }

        const { error } = await supabase.from('rooms').insert({
          id: code,
          teacher_name: tName,
          status: 'lobby',
          max_participants: MAX_PARTICIPANTS,
          max_level: MAX_LEVEL,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          setErrorMessage(error.message || 'Не удалось создать комнату.');
          return null;
        }

        stopSupabaseDemoAuto();
        seenClimbIdsRef.current.clear();
        roomIdRef.current = code;
        setRoomId(code);
        syncRoomParamToUrl(code);
        try {
          sessionStorage.setItem(STORAGE_KEY_ROOM_ID, code);
        } catch {
          // ignore
        }
        await Promise.all([fetchSupabaseState(code), refreshRooms()]);
        return code;
      }

      return code;
    },
    [teacherName, fetchSupabaseState, refreshRooms, stopSupabaseDemoAuto]
  );

  const updateTeacherName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      setTeacherNameState(trimmed);
      try {
        localStorage.setItem(STORAGE_KEY_TEACHER_NAME, trimmed);
      } catch {
        // ignore
      }
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('rooms')
          .update({ teacher_name: trimmed, updated_at: new Date().toISOString() })
          .eq('id', roomIdRef.current);
        await Promise.all([fetchSupabaseState(), refreshRooms()]);
      }
    },
    [fetchSupabaseState, refreshRooms]
  );

  const extendTimer = useCallback(
    async (addMinutes: number) => {
      if (!isSupabaseConfigured || !supabase) return;
      const cur = roomStateRef.current;
      if (cur.status !== 'running') return;
      const now = Date.now();
      const baseEnd = cur.endsAt && cur.endsAt > now ? cur.endsAt : now;
      const newEndsAt = baseEnd + addMinutes * 60_000;
      const newDuration = (cur.durationMinutes ?? 0) + addMinutes;
      await supabase
        .from('rooms')
        .update({
          duration_minutes: newDuration,
          ends_at: newEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomIdRef.current);
      await fetchSupabaseState();
    },
    [fetchSupabaseState]
  );

  const clearError = useCallback(() => setErrorMessage(null), []);
  const clearLastAnswer = useCallback(() => setLastAnswer(null), []);

  const myParticipant =
    roomState.participants.find((p) => p.id === myParticipantId) ?? null;

  return {
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
    updateTeacherName,
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
  };
}

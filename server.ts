import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  BAR_STYLE_OPTIONS,
  GROUP_LIST,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  MAX_LEVEL,
  MAX_PARTICIPANTS,
  SUIT_COLOR_OPTIONS,
  SUIT_PATTERN_OPTIONS,
  createDefaultCustomization,
  type CharacterCustomization,
  type ClimbEvent,
  type ClientMessage,
  type FinishReason,
  type GroupId,
  type Participant,
  type RoomState,
  type SavedParticipantResult,
  type SavedRoundRecord,
  type ServerMessage,
  type TrackId,
} from './src/shared/types.ts';
import {
  checkTaskAnswer,
  getPublicTasks,
  getTeacherPreviewTasks,
} from './src/shared/tasks.ts';
import { DEMO_ROSTER } from './src/shared/demoRoster.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ARCHIVE_FILE = path.resolve(__dirname, 'data', 'results_archive.json');

function loadLocalArchive(): SavedRoundRecord[] {
  try {
    if (!fs.existsSync(ARCHIVE_FILE)) return [];
    const raw = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedRoundRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalArchive(records: SavedRoundRecord[]) {
  try {
    fs.mkdirSync(path.dirname(ARCHIVE_FILE), { recursive: true });
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(records.slice(0, 50), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist local archive:', err);
  }
}

function sanitizeCustomization(
  base: CharacterCustomization,
  patch?: Partial<CharacterCustomization>
): CharacterCustomization {
  if (!patch) return base;
  const next: CharacterCustomization = { ...base };

  if (
    typeof patch.suitColorIndex === 'number' &&
    patch.suitColorIndex >= 0 &&
    patch.suitColorIndex < SUIT_COLOR_OPTIONS.length
  ) {
    next.suitColorIndex = Math.floor(patch.suitColorIndex);
  }
  if (
    patch.hairStyle &&
    HAIR_STYLE_OPTIONS.some((h) => h.id === patch.hairStyle)
  ) {
    next.hairStyle = patch.hairStyle;
  }
  if (
    patch.hairColor &&
    HAIR_COLOR_OPTIONS.some((c) => c.color === patch.hairColor)
  ) {
    next.hairColor = patch.hairColor;
  }
  if (
    patch.pattern &&
    SUIT_PATTERN_OPTIONS.some((p) => p.id === patch.pattern)
  ) {
    next.pattern = patch.pattern;
  }
  if (
    patch.barStyle &&
    BAR_STYLE_OPTIONS.some((b) => b.id === patch.barStyle)
  ) {
    next.barStyle = patch.barStyle;
  }
  return next;
}

function rankParticipants(participants: Participant[]): Participant[] {
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

interface ClientSocketMeta {
  ws: WebSocket;
  role: 'teacher' | 'student';
  participantId?: string;
}

class CompetitionStore {
  private status: RoomState['status'] = 'lobby';
  private startedAt: number | null = null;
  private durationMinutes: number | null = null;
  private endsAt: number | null = null;
  private finishedAt: number | null = null;
  private finishReason: FinishReason | null = null;
  private participants: Participant[] = [];
  private recentEvents: ClimbEvent[] = [];
  private finishCounter = 0;
  private demoAutoTimer: NodeJS.Timeout | null = null;
  private roundTimer: NodeJS.Timeout | null = null;
  private clients = new Map<WebSocket, ClientSocketMeta>();
  private savedRounds: SavedRoundRecord[] = loadLocalArchive();

  public getSavedRounds(): SavedRoundRecord[] {
    return this.savedRounds;
  }

  public deleteSavedRound(roundId: string): boolean {
    const before = this.savedRounds.length;
    this.savedRounds = this.savedRounds.filter((r) => r.id !== roundId);
    if (this.savedRounds.length !== before) {
      saveLocalArchive(this.savedRounds);
      return true;
    }
    return false;
  }

  public attachClient(ws: WebSocket) {
    this.clients.set(ws, { ws, role: 'teacher' });
    this.send(ws, { type: 'state:sync', state: this.getState() });
  }

  public detachClient(ws: WebSocket) {
    const meta = this.clients.get(ws);
    this.clients.delete(ws);

    if (meta?.participantId) {
      const stillConnected = Array.from(this.clients.values()).some(
        (c) => c.participantId === meta.participantId
      );
      if (!stillConnected) {
        const p = this.participants.find((item) => item.id === meta.participantId);
        if (p && !p.isDemo) {
          p.connected = false;
          this.broadcastState();
        }
      }
    }
  }

  public getState(): RoomState {
    return {
      status: this.status,
      maxParticipants: MAX_PARTICIPANTS,
      maxLevel: MAX_LEVEL,
      startedAt: this.startedAt,
      durationMinutes: this.durationMinutes,
      endsAt: this.endsAt,
      finishedAt: this.finishedAt,
      finishReason: this.finishReason,
      demoAutoRunning: this.demoAutoTimer !== null,
      participants: this.participants,
      recentEvents: this.recentEvents.slice(0, 20),
    };
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcast(msg: ServerMessage) {
    const payload = JSON.stringify(msg);
    for (const { ws } of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  private broadcastState() {
    this.broadcast({ type: 'state:sync', state: this.getState() });
  }

  private nextColorIndex(group?: GroupId): number {
    const paletteLen = SUIT_COLOR_OPTIONS.length;
    const scope = group
      ? this.participants.filter((p) => p.group === group)
      : this.participants;
    const used = new Set(scope.map((p) => p.colorIndex));
    for (let i = 0; i < paletteLen; i++) {
      if (!used.has(i)) return i;
    }
    return scope.length % paletteLen;
  }

  private stopDemoAutoInternal() {
    if (this.demoAutoTimer) {
      clearInterval(this.demoAutoTimer);
      this.demoAutoTimer = null;
    }
  }

  private stopRoundTimerInternal() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }

  private startRoundTimerInternal(durationMinutes: number | null) {
    this.stopRoundTimerInternal();
    if (durationMinutes && durationMinutes > 0) {
      const clamped = Math.min(90, Math.max(1, Math.round(durationMinutes)));
      this.durationMinutes = clamped;
      this.endsAt = (this.startedAt ?? Date.now()) + clamped * 60_000;
      this.roundTimer = setTimeout(() => {
        if (this.status === 'running') {
          this.finalizeCompetition('time_up');
        }
      }, clamped * 60_000);
    } else {
      this.durationMinutes = null;
      this.endsAt = null;
    }
  }

  private finalizeCompetition(reason: FinishReason) {
    if (this.status === 'finished') return;
    this.stopDemoAutoInternal();
    this.stopRoundTimerInternal();
    this.status = 'finished';
    const finishedAt = Date.now();
    this.finishedAt = finishedAt;
    this.finishReason = reason;

    const ordered = rankParticipants(this.participants);
    ordered.forEach((p, idx) => {
      p.finalRank = idx + 1;
    });

    // Persist completed round snapshot to local archive
    if (ordered.length > 0) {
      const roundId = crypto.randomUUID();
      const groupCounters: Record<string, number> = {};
      const results: SavedParticipantResult[] = ordered.map((p, idx) => {
        groupCounters[p.group] = (groupCounters[p.group] ?? 0) + 1;
        return {
          id: crypto.randomUUID(),
          roundId,
          firstName: p.firstName,
          lastName: p.lastName,
          track: p.track,
          group: p.group,
          score: p.level,
          maxScore: p.maxLevel,
          finalRank: idx + 1,
          groupRank: groupCounters[p.group],
          attempts: p.attempts,
          solvedTaskIds: [...p.solvedTaskIds],
          skippedTaskIds: [...p.skippedTaskIds],
          wrongAttemptsByTask: { ...(p.wrongAttemptsByTask ?? {}) },
          wrongAnswersLog: [...(p.wrongAnswersLog ?? [])],
          finishedAt: p.finishedAt,
          isDemo: p.isDemo,
        };
      });

      const record: SavedRoundRecord = {
        id: roundId,
        startedAt: this.startedAt,
        finishedAt,
        durationMinutes: this.durationMinutes,
        finishReason: reason,
        participantCount: ordered.length,
        maxLevel: MAX_LEVEL,
        results,
      };
      this.savedRounds.unshift(record);
      if (this.savedRounds.length > 50) {
        this.savedRounds.length = 50;
      }
      saveLocalArchive(this.savedRounds);
    }

    this.broadcastState();
  }

  private advanceParticipantFloor(participant: Participant, taskId?: string): ClimbEvent | null {
    if (participant.level >= MAX_LEVEL) return null;

    const fromLevel = participant.level;
    const toLevel = Math.min(MAX_LEVEL, fromLevel + 1);
    participant.level = toLevel;
    participant.lastClimbAt = Date.now();

    const resolvedTaskId = taskId ?? `${participant.track}-${toLevel}`;
    if (!participant.solvedTaskIds.includes(resolvedTaskId)) {
      participant.solvedTaskIds.push(resolvedTaskId);
    }
    participant.skippedTaskIds = participant.skippedTaskIds.filter(
      (id) => id !== resolvedTaskId
    );

    let finished = false;
    if (toLevel >= MAX_LEVEL && participant.finishedAt === null) {
      finished = true;
      this.finishCounter += 1;
      participant.finishedAt = Date.now();
      participant.finishPlace = this.finishCounter;
    }

    const event: ClimbEvent = {
      id: crypto.randomUUID(),
      participantId: participant.id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      track: participant.track,
      group: participant.group,
      fromLevel,
      toLevel,
      timestamp: Date.now(),
      finished,
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 30) {
      this.recentEvents.length = 30;
    }

    this.broadcast({ type: 'participant:climbed', event });

    if (
      this.participants.length > 0 &&
      this.participants.every((p) => p.level >= MAX_LEVEL)
    ) {
      // Allow a brief moment for the final summit climb animation, then show podium
      this.stopDemoAutoInternal();
      this.stopRoundTimerInternal();
      this.broadcastState();
      setTimeout(() => {
        if (
          this.status === 'running' &&
          this.participants.length > 0 &&
          this.participants.every((p) => p.level >= MAX_LEVEL)
        ) {
          this.finalizeCompetition('all_finished');
        }
      }, 1450);
    } else {
      this.broadcastState();
    }

    return event;
  }

  public handleMessage(ws: WebSocket, raw: string) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      this.send(ws, { type: 'error', message: 'Некорректный формат сообщения' });
      return;
    }

    switch (msg.type) {
      case 'client:hello': {
        const meta = this.clients.get(ws);
        if (meta) {
          meta.role = msg.role;
          if (msg.participantId) {
            const existing = this.participants.find((p) => p.id === msg.participantId);
            if (existing) {
              meta.participantId = existing.id;
              existing.connected = true;
              this.send(ws, {
                type: 'student:joined',
                participant: existing,
                tasks: getPublicTasks(existing.track),
              });
              this.broadcastState();
              return;
            }
          }
        }
        this.send(ws, { type: 'state:sync', state: this.getState() });
        break;
      }

      case 'student:join': {
        const firstName = msg.firstName.trim();
        const lastName = msg.lastName.trim();

        if (!firstName || !lastName) {
          this.send(ws, { type: 'error', message: 'Введите имя и фамилию участника.' });
          return;
        }

        if (!['cpp', 'csharp', 'python'].includes(msg.track)) {
          this.send(ws, { type: 'error', message: 'Выберите направление.' });
          return;
        }

        if (!GROUP_LIST.includes(msg.group)) {
          this.send(ws, { type: 'error', message: 'Выберите группу.' });
          return;
        }

        let participant = msg.existingId
          ? this.participants.find((p) => p.id === msg.existingId)
          : undefined;

        if (!participant) {
          participant = this.participants.find(
            (p) =>
              !p.isDemo &&
              !p.connected &&
              p.firstName.toLowerCase() === firstName.toLowerCase() &&
              p.lastName.toLowerCase() === lastName.toLowerCase() &&
              p.group === msg.group
          );
        }

        if (participant) {
          participant.firstName = firstName;
          participant.lastName = lastName;
          participant.track = msg.track;
          participant.group = msg.group;
          participant.connected = true;
          if (msg.customization) {
            participant.customization = sanitizeCustomization(
              participant.customization,
              msg.customization
            );
            participant.colorIndex = participant.customization.suitColorIndex;
          }
        } else {
          if (this.participants.length >= MAX_PARTICIPANTS) {
            this.send(ws, {
              type: 'error',
              message: `Достигнут лимит участников (${MAX_PARTICIPANTS} из ${MAX_PARTICIPANTS}).`,
            });
            return;
          }

          const colorIdx = this.nextColorIndex(msg.group);
          const customization = sanitizeCustomization(
            createDefaultCustomization(colorIdx),
            msg.customization
          );

          participant = {
            id: crypto.randomUUID(),
            firstName,
            lastName,
            track: msg.track,
            group: msg.group,
            level: 0,
            maxLevel: MAX_LEVEL,
            solvedTaskIds: [],
            skippedTaskIds: [],
            wrongAttemptsByTask: {},
            wrongAnswersLog: [],
            attempts: 0,
            connected: true,
            joinedAt: Date.now(),
            finishedAt: null,
            finishPlace: null,
            finalRank: null,
            lastClimbAt: null,
            colorIndex: customization.suitColorIndex,
            customization,
            isDemo: false,
          };
          this.participants.push(participant);
        }

        const meta = this.clients.get(ws);
        if (meta) {
          meta.role = 'student';
          meta.participantId = participant.id;
        }

        this.send(ws, {
          type: 'student:joined',
          participant,
          tasks: getPublicTasks(participant.track),
        });
        this.broadcastState();
        break;
      }

      case 'student:customize': {
        const participant = this.participants.find((p) => p.id === msg.participantId);
        if (!participant) return;
        participant.customization = sanitizeCustomization(
          participant.customization,
          msg.customization
        );
        participant.colorIndex = participant.customization.suitColorIndex;
        this.broadcastState();
        break;
      }

      case 'student:leave': {
        const idx = this.participants.findIndex((p) => p.id === msg.participantId);
        if (idx !== -1) {
          this.participants.splice(idx, 1);
        }
        const meta = this.clients.get(ws);
        if (meta && meta.participantId === msg.participantId) {
          meta.participantId = undefined;
        }
        this.broadcastState();
        break;
      }

      case 'student:skip_task': {
        if (this.status !== 'running') return;
        const participant = this.participants.find((p) => p.id === msg.participantId);
        if (!participant) return;

        const validTask = getPublicTasks(participant.track).some(
          (t) => t.id === msg.taskId
        );
        if (!validTask) return;

        if (
          !participant.solvedTaskIds.includes(msg.taskId) &&
          !participant.skippedTaskIds.includes(msg.taskId)
        ) {
          participant.skippedTaskIds.push(msg.taskId);
          this.broadcastState();
        }
        break;
      }

      case 'student:submit_answer': {
        if (this.status !== 'running') {
          this.send(ws, {
            type: 'error',
            message: 'Соревнование сейчас не активно.',
          });
          return;
        }

        const participant = this.participants.find((p) => p.id === msg.participantId);
        if (!participant) {
          this.send(ws, { type: 'error', message: 'Участник не найден в текущей сессии.' });
          return;
        }

        if (participant.level >= MAX_LEVEL) {
          this.send(ws, {
            type: 'answer:result',
            taskId: msg.taskId,
            correct: true,
            newLevel: participant.level,
            finished: true,
            message: `Все ${MAX_LEVEL} этажей уже пройдены!`,
          });
          return;
        }

        if (participant.solvedTaskIds.includes(msg.taskId)) {
          this.send(ws, {
            type: 'answer:result',
            taskId: msg.taskId,
            correct: true,
            newLevel: participant.level,
            finished: participant.level >= MAX_LEVEL,
            message: 'Эта задача уже решена! Переходите к следующей.',
          });
          return;
        }

        const result = checkTaskAnswer(participant.track, msg.taskId, msg.answer);

        if (!result.found) {
          this.send(ws, { type: 'error', message: 'Задание не найдено.' });
          return;
        }

        participant.attempts += 1;

        if (result.correct) {
          const ev = this.advanceParticipantFloor(participant, msg.taskId);
          const feedbackMsg = ev?.finished
            ? `Верно! Вершина взята — спортсмен забрался на самый верх!`
            : participant.level === 1
            ? 'Верно! Спортсмен подпрыгнул и зацепился палкой за пазы 1-го этажа!'
            : `Верно! Отличный перехват — подъём на этаж ${participant.level}!`;

          this.send(ws, {
            type: 'answer:result',
            taskId: msg.taskId,
            correct: true,
            newLevel: participant.level,
            finished: Boolean(ev?.finished),
            message: feedbackMsg,
          });
        } else {
          participant.wrongAttemptsByTask[msg.taskId] =
            (participant.wrongAttemptsByTask[msg.taskId] ?? 0) + 1;
          if (!participant.wrongAnswersLog) {
            participant.wrongAnswersLog = [];
          }
          participant.wrongAnswersLog.push({
            taskId: msg.taskId,
            answer: msg.answer.slice(0, 120),
            timestamp: Date.now(),
          });
          this.broadcastState();
          this.send(ws, {
            type: 'answer:result',
            taskId: msg.taskId,
            correct: false,
            newLevel: participant.level,
            finished: false,
            message: 'Ответ не совпал. Проверьте решение, попробуйте снова или пропустите задачу.',
          });
        }
        break;
      }

      case 'teacher:start': {
        this.status = 'running';
        this.startedAt = Date.now();
        this.finishedAt = null;
        this.finishReason = null;
        this.startRoundTimerInternal(msg.durationMinutes ?? null);

        for (const meta of this.clients.values()) {
          if (meta.participantId) {
            const p = this.participants.find((item) => item.id === meta.participantId);
            if (p) {
              this.send(meta.ws, {
                type: 'student:tasks',
                tasks: getPublicTasks(p.track),
              });
            }
          }
        }
        this.broadcastState();
        break;
      }

      case 'teacher:finish': {
        this.finalizeCompetition('teacher_stopped');
        break;
      }

      case 'teacher:reset_progress': {
        this.stopDemoAutoInternal();
        this.stopRoundTimerInternal();
        this.status = 'lobby';
        this.startedAt = null;
        this.endsAt = null;
        this.finishedAt = null;
        this.finishReason = null;
        this.finishCounter = 0;
        this.recentEvents = [];
        for (const p of this.participants) {
          p.level = 0;
          p.solvedTaskIds = [];
          p.skippedTaskIds = [];
          p.wrongAttemptsByTask = {};
          p.wrongAnswersLog = [];
          p.attempts = 0;
          p.finishedAt = null;
          p.finishPlace = null;
          p.finalRank = null;
          p.lastClimbAt = null;
        }
        this.broadcastState();
        break;
      }

      case 'teacher:clear_room': {
        this.stopDemoAutoInternal();
        this.stopRoundTimerInternal();
        this.status = 'lobby';
        this.startedAt = null;
        this.durationMinutes = null;
        this.endsAt = null;
        this.finishedAt = null;
        this.finishReason = null;
        this.finishCounter = 0;
        this.participants = [];
        this.recentEvents = [];
        for (const meta of this.clients.values()) {
          meta.participantId = undefined;
        }
        this.broadcastState();
        break;
      }

      case 'teacher:remove_participant': {
        const idx = this.participants.findIndex((p) => p.id === msg.participantId);
        if (idx !== -1) {
          this.participants.splice(idx, 1);
          for (const meta of this.clients.values()) {
            if (meta.participantId === msg.participantId) {
              meta.participantId = undefined;
            }
          }
          if (this.participants.length === 0) {
            this.stopDemoAutoInternal();
          }
          this.broadcastState();
        }
        break;
      }

      case 'teacher:seed_demo': {
        let rosterIndex = 0;
        while (this.participants.length < MAX_PARTICIPANTS && rosterIndex < DEMO_ROSTER.length) {
          const candidate = DEMO_ROSTER[rosterIndex];
          rosterIndex += 1;
          const alreadyExists = this.participants.some(
            (p) =>
              p.firstName === candidate.firstName && p.lastName === candidate.lastName
          );
          if (alreadyExists) continue;

          this.participants.push({
            id: crypto.randomUUID(),
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            track: candidate.track,
            group: candidate.group,
            level: 0,
            maxLevel: MAX_LEVEL,
            solvedTaskIds: [],
            skippedTaskIds: [],
            wrongAttemptsByTask: {},
            attempts: 0,
            connected: true,
            joinedAt: Date.now(),
            finishedAt: null,
            finishPlace: null,
            finalRank: null,
            lastClimbAt: null,
            colorIndex: candidate.customization.suitColorIndex,
            customization: { ...candidate.customization },
            isDemo: true,
          });
        }
        this.broadcastState();
        break;
      }

      case 'teacher:demo_step': {
        if (this.participants.length === 0) {
          this.send(ws, {
            type: 'error',
            message: 'Сначала подключите участников или добавьте тестовых.',
          });
          return;
        }

        if (this.status === 'lobby') {
          this.status = 'running';
          this.startedAt = Date.now();
          this.finishedAt = null;
          this.finishReason = null;
        }

        let target: Participant | undefined;
        if (msg.participantId) {
          target = this.participants.find((p) => p.id === msg.participantId);
        } else {
          const candidates = this.participants.filter(
            (p) => p.level < MAX_LEVEL && (!msg.group || p.group === msg.group)
          );
          if (candidates.length > 0) {
            target = candidates[Math.floor(Math.random() * candidates.length)];
          }
        }

        if (target && target.level < MAX_LEVEL) {
          target.attempts += 1;
          this.advanceParticipantFloor(target);
        }
        break;
      }

      case 'teacher:toggle_demo_auto': {
        if (!msg.enabled) {
          this.stopDemoAutoInternal();
          this.broadcastState();
          return;
        }

        if (this.participants.length === 0) {
          for (const candidate of DEMO_ROSTER.slice(0, MAX_PARTICIPANTS)) {
            this.participants.push({
              id: crypto.randomUUID(),
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              track: candidate.track,
              group: candidate.group,
              level: 0,
              maxLevel: MAX_LEVEL,
              solvedTaskIds: [],
              skippedTaskIds: [],
              wrongAttemptsByTask: {},
              attempts: 0,
              connected: true,
              joinedAt: Date.now(),
              finishedAt: null,
              finishPlace: null,
              finalRank: null,
              lastClimbAt: null,
              colorIndex: candidate.customization.suitColorIndex,
              customization: { ...candidate.customization },
              isDemo: true,
            });
          }
        }

        if (this.status === 'finished') {
          this.finishCounter = 0;
          this.recentEvents = [];
          this.finishedAt = null;
          this.finishReason = null;
          for (const p of this.participants) {
            p.level = 0;
            p.solvedTaskIds = [];
            p.skippedTaskIds = [];
            p.wrongAttemptsByTask = {};
            p.attempts = 0;
            p.finishedAt = null;
            p.finishPlace = null;
            p.finalRank = null;
            p.lastClimbAt = null;
          }
        }

        if (this.status !== 'running') {
          this.status = 'running';
          this.startedAt = Date.now();
        }

        this.stopDemoAutoInternal();

        const runTick = () => {
          const demoCandidates = this.participants.filter(
            (p) => p.isDemo && p.level < MAX_LEVEL
          );
          const pool =
            demoCandidates.length > 0
              ? demoCandidates
              : this.participants.filter((p) => p.level < MAX_LEVEL);

          if (pool.length === 0) {
            this.stopDemoAutoInternal();
            this.broadcastState();
            return;
          }

          const chosen = pool[Math.floor(Math.random() * pool.length)];
          chosen.attempts += 1;
          this.advanceParticipantFloor(chosen);
        };

        runTick();
        this.demoAutoTimer = setInterval(runTick, 850);
        this.broadcastState();
        break;
      }
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const store = new CompetitionStore();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/state', (_req, res) => {
    res.json(store.getState());
  });

  app.get('/api/tasks/preview', (_req, res) => {
    res.json(getTeacherPreviewTasks());
  });

  app.get('/api/results', (_req, res) => {
    res.json(store.getSavedRounds());
  });

  app.delete('/api/results/:id', (req, res) => {
    store.deleteSavedRound(req.params.id);
    res.json({ ok: true });
  });

  const httpServer = http.createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wss.on('connection', (ws) => {
    store.attachClient(ws);

    ws.on('message', (data) => {
      store.handleMessage(ws, data.toString());
    });

    ws.on('close', () => {
      store.detachClient(ws);
    });

    ws.on('error', () => {
      store.detachClient(ws);
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import React, { useEffect, useState } from 'react';
import {
  MAX_LEVEL,
  TRACK_LIST,
  createDefaultCustomization,
  type BarStyle,
  type CharacterCustomization,
  type Participant,
} from '../shared/types.ts';
import type { ActiveClimbAnimation } from '../hooks/useCompetitionSocket.ts';
import { FrontAthleteFigure } from './FrontAthleteFigure.tsx';
import ARENA_BACKDROP_IMG from '../assets/images/arena_tv_backdrop_1795083427596.jpg';

export const ATHLETE_SUITS = [
  {
    suit: '#FACC15',
    suitShade: '#CA8A04',
    trim: '#FEF9C3',
    accent: '#FDE047',
    skin: '#F2C6A0',
    skinShade: '#D99E72',
    shoe: '#F8FAFC',
    barCap: '#EF4444',
  },
  {
    suit: '#EF4444',
    suitShade: '#991B1B',
    trim: '#FECACA',
    accent: '#F87171',
    skin: '#ECC19C',
    skinShade: '#D39B6F',
    shoe: '#F8FAFC',
    barCap: '#F59E0B',
  },
  {
    suit: '#3B82F6',
    suitShade: '#1D4ED8',
    trim: '#BFDBFE',
    accent: '#60A5FA',
    skin: '#F3C8A4',
    skinShade: '#DAA176',
    shoe: '#F8FAFC',
    barCap: '#38BDF8',
  },
  {
    suit: '#10B981',
    suitShade: '#047857',
    trim: '#A7F3D0',
    accent: '#34D399',
    skin: '#F0C29A',
    skinShade: '#D79B6E',
    shoe: '#F8FAFC',
    barCap: '#FBBF24',
  },
  {
    suit: '#8B5CF6',
    suitShade: '#5B21B6',
    trim: '#DDD6FE',
    accent: '#A78BFA',
    skin: '#F5CCA8',
    skinShade: '#DCAA7E',
    shoe: '#F8FAFC',
    barCap: '#F472B6',
  },
  {
    suit: '#F97316',
    suitShade: '#C2410C',
    trim: '#FED7AA',
    accent: '#FB923C',
    skin: '#EBC09B',
    skinShade: '#D29A6E',
    shoe: '#F8FAFC',
    barCap: '#FDE047',
  },
  {
    suit: '#06B6D4',
    suitShade: '#0E7490',
    trim: '#A5F3FC',
    accent: '#22D3EE',
    skin: '#F2C7A1',
    skinShade: '#DAA276',
    shoe: '#F8FAFC',
    barCap: '#38BDF8',
  },
  {
    suit: '#EC4899',
    suitShade: '#9D174D',
    trim: '#FBCFE8',
    accent: '#F472B6',
    skin: '#F4C9A5',
    skinShade: '#DDA77C',
    shoe: '#F8FAFC',
    barCap: '#FBBF24',
  },
];

export const BAR_STYLE_PALETTES: Record<
  BarStyle,
  { shaft: string; highlight: string; grip: string; cap: string }
> = {
  classic: { shaft: '#64748B', highlight: '#F1F5F9', grip: '#0F172A', cap: '#EF4444' },
  gold: { shaft: '#D97706', highlight: '#FEF08A', grip: '#451A03', cap: '#FBBF24' },
  neon: { shaft: '#0284C7', highlight: '#BAE6FD', grip: '#082F49', cap: '#38BDF8' },
  emerald: { shaft: '#059669', highlight: '#A7F3D0', grip: '#022C22', cap: '#34D399' },
};

const TRACK_DARK_ACCENT: Record<string, string> = {
  cpp: '#38BDF8',
  csharp: '#C084FC',
  python: '#34D399',
};

const VIEW_HEIGHT = 812;
const LEFT_AXIS_W = 88;
const RIGHT_PAD = 24;
const RAIL_W = 16;
const LANE_STRIDE = 138;
const CHUTE_W = LANE_STRIDE - RAIL_W;
const MIN_SCREEN_LANES = 8;

const RAMP_TOP_Y = 114;
const FLOOR_1_Y = 616;
const FLOOR_STEP = 53;
const GROUND_Y = 724; // Standing mat clearly below Floor 1 (108px gap)
const CLIMB_DURATION_MS = 1260;

const FLOOR_NUMBERS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

function rungY(level: number): number {
  if (level <= 0) return GROUND_Y;
  return FLOOR_1_Y - (level - 1) * FLOOR_STEP;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.65;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function renderHeadGear(
  cx: number,
  headY: number,
  custom: CharacterCustomization,
  suitColor: string
) {
  switch (custom.hairStyle) {
    case 'spiky':
      return (
        <g>
          <path
            d={`
              M ${cx - 9} ${headY + 1}
              L ${cx - 12} ${headY - 6}
              L ${cx - 6} ${headY - 5}
              L ${cx - 4} ${headY - 13}
              L ${cx} ${headY - 7}
              L ${cx + 4} ${headY - 13}
              L ${cx + 6} ${headY - 5}
              L ${cx + 12} ${headY - 6}
              L ${cx + 9} ${headY + 1}
              Q ${cx} ${headY + 4} ${cx - 9} ${headY + 1}
              Z
            `}
            fill={custom.hairColor}
          />
          <path
            d={`M ${cx - 8.5} ${headY - 1} Q ${cx} ${headY - 3} ${cx + 8.5} ${headY - 1}`}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      );

    case 'ponytail':
      return (
        <g>
          <path
            d={`
              M ${cx - 8.8} ${headY + 1}
              A 9 9 0 1 1 ${cx + 8.8} ${headY + 1}
              Q ${cx} ${headY + 4} ${cx - 8.8} ${headY + 1}
              Z
            `}
            fill={custom.hairColor}
          />
          {/* Sport ponytail tie */}
          <ellipse cx={cx} cy={headY + 2} rx={3.5} ry={2.2} fill={suitColor} stroke="#FFFFFF" strokeWidth={0.8} />
          {/* Flowing ponytail down the back */}
          <path
            d={`M ${cx - 3} ${headY + 3} Q ${cx - 5} ${headY + 11} ${cx - 1} ${headY + 16} Q ${cx + 4} ${headY + 12} ${cx + 3} ${headY + 3} Z`}
            fill={custom.hairColor}
          />
        </g>
      );

    case 'cap':
      return (
        <g>
          {/* Backwards baseball cap dome */}
          <path
            d={`M ${cx - 9.2} ${headY + 1} A 9.2 9.2 0 1 1 ${cx + 9.2} ${headY + 1} Z`}
            fill={custom.hairColor}
            stroke="#0F172A"
            strokeWidth={1}
          />
          {/* Cap back strap notch */}
          <path
            d={`M ${cx - 4.5} ${headY + 1} A 4.5 3.5 0 0 1 ${cx + 4.5} ${headY + 1}`}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.6}
          />
          {/* Backwards brim pointing downward toward neck */}
          <path
            d={`M ${cx - 7.5} ${headY + 1} Q ${cx} ${headY + 8} ${cx + 7.5} ${headY + 1} Z`}
            fill={suitColor}
            stroke="#0F172A"
            strokeWidth={1}
          />
        </g>
      );

    case 'helmet':
      return (
        <g>
          <path
            d={`M ${cx - 10} ${headY + 2} A 10 10 0 1 1 ${cx + 10} ${headY + 2} Q ${cx} ${headY + 5} ${cx - 10} ${headY + 2} Z`}
            fill={custom.hairColor}
            stroke="#0F172A"
            strokeWidth={1.2}
          />
          {/* Racing center stripe on helmet */}
          <rect x={cx - 2} y={headY - 9.5} width={4} height={12} rx={1.5} fill={suitColor} />
          {/* Vent slits */}
          <line x1={cx - 6} y1={headY - 4} x2={cx - 4.5} y2={headY - 1} stroke="#0F172A" strokeWidth={1.4} strokeLinecap="round" />
          <line x1={cx + 6} y1={headY - 4} x2={cx + 4.5} y2={headY - 1} stroke="#0F172A" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );

    case 'short':
    default:
      return (
        <g>
          <path
            d={`
              M ${cx - 8.8} ${headY + 1}
              A 9 9 0 1 1 ${cx + 8.8} ${headY + 1}
              Q ${cx + 5} ${headY + 4.5} ${cx} ${headY + 3.5}
              Q ${cx - 5} ${headY + 4.5} ${cx - 8.8} ${headY + 1}
              Z
            `}
            fill={custom.hairColor}
          />
          <path
            d={`M ${cx - 8.5} ${headY - 1} Q ${cx} ${headY - 3} ${cx + 8.5} ${headY - 1}`}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      );
  }
}

export function renderSuitPattern(
  cx: number,
  shoulderY: number,
  waistY: number,
  shoulderW: number,
  pattern: CharacterCustomization['pattern'],
  trimColor: string
) {
  switch (pattern) {
    case 'lightning':
      return (
        <path
          d={`M ${cx + 2} ${shoulderY + 2} L ${cx - 5} ${shoulderY + 12} L ${cx} ${shoulderY + 12} L ${cx - 3} ${waistY} L ${cx + 6} ${shoulderY + 9} L ${cx + 1} ${shoulderY + 9} Z`}
          fill={trimColor}
          opacity={0.45}
        />
      );
    case 'star':
      return (
        <polygon
          points={`${cx},${shoulderY + 3} ${cx + 3},${shoulderY + 9} ${cx + 9},${shoulderY + 10} ${cx + 4.5},${shoulderY + 14} ${cx + 6},${shoulderY + 20} ${cx},${shoulderY + 17} ${cx - 6},${shoulderY + 20} ${cx - 4.5},${shoulderY + 14} ${cx - 9},${shoulderY + 10} ${cx - 3},${shoulderY + 9}`}
          fill={trimColor}
          opacity={0.4}
        />
      );
    case 'chevron':
      return (
        <g opacity={0.75} fill="none" stroke={trimColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${cx - 9} ${shoulderY + 6} L ${cx} ${shoulderY + 12} L ${cx + 9} ${shoulderY + 6}`} />
          <path d={`M ${cx - 8} ${shoulderY + 13} L ${cx} ${shoulderY + 19} L ${cx + 8} ${shoulderY + 13}`} />
        </g>
      );
    case 'stripes':
    default:
      return (
        <g opacity={0.85} stroke={trimColor} strokeWidth={2} strokeLinecap="round">
          <path d={`M ${cx - shoulderW + 2} ${shoulderY + 2} L ${cx - 9.5} ${waistY}`} />
          <path d={`M ${cx + shoulderW - 2} ${shoulderY + 2} L ${cx + 9.5} ${waistY}`} />
        </g>
      );
  }
}

interface AthleteClimberProps {
  participant: Participant;
  laneIndex: number;
  chuteX: number;
  climb?: ActiveClimbAnimation;
  now: number;
  isHighlighted: boolean;
  dimmed: boolean;
  canQuickStep: boolean;
  onQuickStep?: (id: string) => void;
}

const AthleteClimberLane: React.FC<AthleteClimberProps> = ({
  participant,
  laneIndex,
  chuteX,
  climb,
  now,
  isHighlighted,
  dimmed,
  canQuickStep,
  onQuickStep,
}) => {
  const custom =
    participant.customization ?? createDefaultCustomization(participant.colorIndex);
  const suit = ATHLETE_SUITS[custom.suitColorIndex % ATHLETE_SUITS.length];
  const barPalette = BAR_STYLE_PALETTES[custom.barStyle] ?? BAR_STYLE_PALETTES.classic;
  const trackMeta = TRACK_LIST.find((t) => t.id === participant.track);
  const trackColor = TRACK_DARK_ACCENT[participant.track] ?? '#94A3B8';

  const cx = chuteX + CHUTE_W / 2;
  const leftNotchX = chuteX - RAIL_W * 0.5;
  const rightNotchX = chuteX + CHUTE_W + RAIL_W * 0.5;

  let rawT = 1;
  let fromLvl = participant.level;
  let toLvl = participant.level;
  let isAnimating = false;

  if (climb) {
    const elapsed = Math.max(0, now - climb.startedAt);
    if (elapsed < CLIMB_DURATION_MS) {
      rawT = elapsed / CLIMB_DURATION_MS;
      fromLvl = climb.fromLevel;
      toLvl = climb.toLevel;
      isAnimating = true;
    }
  }

  let barY = FLOOR_1_Y;
  let barHalfSpan = (rightNotchX - leftNotchX) / 2;
  let shoulderY = GROUND_Y - 60;
  let footY = GROUND_Y;
  let kneeY = GROUND_Y - 20;
  let kneeSpread = 9.5;
  let footSpread = 8.5;
  let barLiftDepth = 0;
  let barTilt = 0;
  let sparkActive = false;
  let sparkT = 0;
  let activeNotchLevel: number | null = null;
  let showSpeedLines = false;
  let showJumpBurst = false;
  let jumpBurstT = 0;
  let isStandingPose = false;

  const isFinished = participant.level >= MAX_LEVEL && (!isAnimating || rawT >= 0.78);

  if (isAnimating && fromLvl === 0 && toLvl >= 1) {
    // FLOOR 0 -> FLOOR 1: STAND -> CROUCH -> JUMP -> HOOK INTO FLOOR 1!
    const targetBarY = rungY(toLvl);
    const fullHalfSpan = (rightNotchX - leftNotchX) / 2;
    const carryHalfSpan = fullHalfSpan - 7;
    const standShoulderY = GROUND_Y - 60;
    const standKneeY = GROUND_Y - 20;
    const standBarY = GROUND_Y - 42;

    if (rawT < 0.22) {
      const p = easeInOutQuad(rawT / 0.22);
      isStandingPose = true;
      footY = GROUND_Y;
      shoulderY = lerp(standShoulderY, standShoulderY + 16, p);
      kneeY = lerp(standKneeY, standKneeY + 5, p);
      kneeSpread = lerp(9.5, 14, p);
      footSpread = lerp(8.5, 10, p);
      barY = lerp(standBarY, standBarY + 7, p);
      barHalfSpan = carryHalfSpan;
    } else if (rawT < 0.56) {
      const p = easeOutCubic((rawT - 0.22) / 0.34);
      showJumpBurst = rawT < 0.44;
      jumpBurstT = Math.min(1, (rawT - 0.22) / 0.22);
      showSpeedLines = true;

      barY = lerp(standBarY + 7, targetBarY - 6, p);
      barHalfSpan = lerp(carryHalfSpan, fullHalfSpan, Math.min(1, p * 1.4));
      barLiftDepth = Math.sin(p * Math.PI) * 10;
      barTilt = Math.sin(p * Math.PI * 2) * 1.6;

      shoulderY = lerp(standShoulderY + 16, targetBarY + 24, p);
      footY = lerp(GROUND_Y, targetBarY + 76, p);
      kneeY = lerp(standKneeY + 5, targetBarY + 58, p);
      kneeSpread = lerp(14, 12, p);
      footSpread = lerp(10, 8, p);
    } else if (rawT < 0.74) {
      const p = easeOutCubic((rawT - 0.56) / 0.18);
      barY = lerp(targetBarY - 6, targetBarY + 2, p);
      barHalfSpan = fullHalfSpan;
      barLiftDepth = lerp(2, 0, p);

      shoulderY = lerp(targetBarY + 24, targetBarY + 17, p);
      kneeY = lerp(targetBarY + 58, targetBarY + 54, p);
      footY = lerp(targetBarY + 76, targetBarY + 70, p);
      kneeSpread = lerp(12, 13, p);
      footSpread = 8.5;

      sparkActive = true;
      sparkT = (rawT - 0.56) / 0.34;
      activeNotchLevel = toLvl;
    } else {
      const p = (rawT - 0.74) / 0.26;
      const spring = easeOutBack(p);
      barY = lerp(targetBarY + 2, targetBarY, Math.min(1, p * 2));
      barHalfSpan = fullHalfSpan;

      shoulderY = lerp(targetBarY + 17, targetBarY + 20, spring);
      const hipBase = shoulderY + 24;
      kneeY = hipBase + 15;
      footY = hipBase + 29;
      kneeSpread = lerp(13, 10, easeOutCubic(p));
      footSpread = 8.5;

      if (rawT < 0.88) {
        sparkActive = true;
        sparkT = Math.min(1, (rawT - 0.56) / 0.34);
        activeNotchLevel = toLvl;
      }
    }
  } else if (isAnimating && fromLvl >= 1 && !isFinished) {
    // SALMON LADDER RE-GRIP: FLOORS 1 -> 2 -> ... -> 10
    const startBarY = rungY(fromLvl);
    const endBarY = rungY(toLvl);
    barHalfSpan = (rightNotchX - leftNotchX) / 2;

    if (rawT < 0.28) {
      const p = easeInOutQuad(rawT / 0.28);
      barY = startBarY;
      const bodyOffset = lerp(20, 5, p);
      shoulderY = barY + bodyOffset;
      const hipBase = shoulderY + 24;
      const tuck = lerp(0, 12, p);
      kneeY = hipBase + 15 - tuck * 0.65;
      footY = hipBase + 29 - tuck * 1.1;
      kneeSpread = lerp(10, 15, p);
      footSpread = lerp(8.5, 10, p);
    } else if (rawT < 0.56) {
      const p = easeOutCubic((rawT - 0.28) / 0.28);
      barY = lerp(startBarY, endBarY - 5, p);
      barLiftDepth = Math.sin(p * Math.PI) * 10;
      barTilt = Math.sin(p * Math.PI * 2) * 1.5;
      showSpeedLines = true;

      const bodyOffset = lerp(5, 25, p * 0.78);
      shoulderY = barY + bodyOffset;
      const hipBase = shoulderY + 24;
      const tuck = lerp(12, 15, p);
      kneeY = hipBase + 15 - tuck * 0.65;
      footY = hipBase + 29 - tuck * 1.1;
      kneeSpread = 14.5;
      footSpread = 9.5;
    } else if (rawT < 0.74) {
      const p = easeOutCubic((rawT - 0.56) / 0.18);
      barY = lerp(endBarY - 5, endBarY + 2, p);
      barLiftDepth = lerp(2, 0, p);

      const bodyOffset = lerp(21, 16, p);
      shoulderY = barY + bodyOffset;
      const hipBase = shoulderY + 24;
      const tuck = lerp(15, 7, p);
      kneeY = hipBase + 15 - tuck * 0.65;
      footY = hipBase + 29 - tuck * 1.1;
      kneeSpread = lerp(14.5, 12, p);
      footSpread = 9;

      sparkActive = true;
      sparkT = (rawT - 0.56) / 0.34;
      activeNotchLevel = toLvl;
    } else {
      const p = (rawT - 0.74) / 0.26;
      const spring = easeOutBack(p);
      barY = lerp(endBarY + 2, endBarY, Math.min(1, p * 2));

      const bodyOffset = lerp(16, 20, spring);
      shoulderY = barY + bodyOffset;
      const hipBase = shoulderY + 24;
      const tuck = lerp(7, 0, easeOutCubic(p));
      kneeY = hipBase + 15 - tuck * 0.65;
      footY = hipBase + 29 - tuck * 1.1;
      kneeSpread = lerp(12, 10, easeOutCubic(p));
      footSpread = 8.5;

      if (rawT < 0.88) {
        sparkActive = true;
        sparkT = Math.min(1, (rawT - 0.56) / 0.34);
        activeNotchLevel = toLvl;
      }
    }
  } else if (participant.level === 0) {
    // STANDING ON START MAT HOLDING THE BAR LOW
    isStandingPose = true;
    footY = GROUND_Y;
    shoulderY = GROUND_Y - 60;
    kneeY = GROUND_Y - 20;
    kneeSpread = 9.5;
    footSpread = 8.5;
    barY = GROUND_Y - 42;
    barHalfSpan = (rightNotchX - leftNotchX) / 2 - 7;
  } else if (!isFinished) {
    // HANGING ON FLOORS 1..9
    barY = rungY(participant.level);
    barHalfSpan = (rightNotchX - leftNotchX) / 2;
    shoulderY = barY + 20;
    const hipBase = shoulderY + 24;
    kneeY = hipBase + 15;
    footY = hipBase + 29;
    kneeSpread = 10;
    footSpread = 8.5;
  }

  const headY = shoulderY - 8.5;
  const waistY = shoulderY + 19;
  const hipY = waistY + 5;
  const shoulderW = 13.5;

  const barLeftX = cx - barHalfSpan;
  const barRightX = cx + barHalfSpan;
  const handOffsetX = isStandingPose ? 23 : 26;
  const leftHandX = cx - handOffsetX;
  const rightHandX = cx + handOffsetX;
  const leftHandY = barY - barTilt;
  const rightHandY = barY + barTilt;

  let leftElbowX: number;
  let rightElbowX: number;
  let elbowY: number;

  if (barY > shoulderY) {
    leftElbowX = cx - shoulderW - 8;
    rightElbowX = cx + shoulderW + 8;
    elbowY = (shoulderY + barY) / 2 + 2;
  } else {
    const pullRatio = Math.max(0, Math.min(1, (22 - (shoulderY - barY)) / 16));
    const elbowFlare = 5.5 + pullRatio * 11;
    leftElbowX = cx - shoulderW - elbowFlare;
    rightElbowX = cx + shoulderW + elbowFlare;
    elbowY = (shoulderY + barY) / 2 + pullRatio * 6;
  }

  const leftHipX = cx - 6.5;
  const rightHipX = cx + 6.5;
  const leftKneeX = cx - kneeSpread;
  const rightKneeX = cx + kneeSpread;
  const leftFootX = cx - footSpread;
  const rightFootX = cx + footSpread;

  const climbedTopY = participant.level > 0 ? rungY(participant.level) : GROUND_Y;

  return (
    <g
      className={canQuickStep && participant.level < MAX_LEVEL ? 'cursor-pointer' : ''}
      opacity={dimmed ? 0.22 : 1}
      onClick={() => {
        if (canQuickStep && onQuickStep && participant.level < MAX_LEVEL) {
          onQuickStep(participant.id);
        }
      }}
    >
      {/* Chute background */}
      <rect
        x={chuteX}
        y={RAMP_TOP_Y}
        width={CHUTE_W}
        height={GROUND_Y - RAMP_TOP_Y}
        fill={isHighlighted ? '#172554' : laneIndex % 2 === 0 ? '#11192E' : '#0E1528'}
      />

      {/* Climbed trail tint */}
      {participant.level > 0 && (
        <rect
          x={chuteX + 2}
          y={climbedTopY}
          width={CHUTE_W - 4}
          height={GROUND_Y - climbedTopY}
          fill={suit.suit}
          fillOpacity={isHighlighted ? 0.2 : 0.11}
        />
      )}

      {/* Horizontal floor guidelines & floor numbers 1..10 */}
      {FLOOR_NUMBERS.map((lvl) => {
        const y = rungY(lvl);
        const reached = participant.level >= lvl;
        const isNextTarget = participant.level + 1 === lvl;
        return (
          <g key={lvl}>
            <line
              x1={chuteX + 6}
              y1={y}
              x2={chuteX + CHUTE_W - 6}
              y2={y}
              stroke={
                reached
                  ? suit.suit
                  : isNextTarget
                  ? '#38BDF8'
                  : '#23314F'
              }
              strokeOpacity={reached ? 0.6 : isNextTarget ? 0.55 : 0.75}
              strokeWidth={lvl === MAX_LEVEL ? 2 : isNextTarget ? 1.5 : 1}
              strokeDasharray={lvl === MAX_LEVEL ? undefined : '4 4'}
            />
            <text
              x={chuteX + CHUTE_W - 7}
              y={y - 4}
              textAnchor="end"
              fontSize="9.5"
              fontWeight={700}
              fontFamily="var(--font-mono)"
              fill={reached ? suit.accent : isNextTarget ? '#7DD3FC' : '#334155'}
            >
              {lvl}
            </text>
          </g>
        );
      })}

      {/* Starting Mat Pad */}
      <rect
        x={chuteX + 2}
        y={GROUND_Y - 12}
        width={CHUTE_W - 4}
        height={12}
        fill="#1E293B"
      />
      <line
        x1={chuteX + 4}
        y1={GROUND_Y - 12}
        x2={chuteX + CHUTE_W - 4}
        y2={GROUND_Y - 12}
        stroke="#334155"
        strokeWidth={1.5}
      />

      {/* Highlighted frame for active student */}
      {isHighlighted && (
        <rect
          x={chuteX + 1}
          y={RAMP_TOP_Y + 1}
          width={CHUTE_W - 2}
          height={GROUND_Y - RAMP_TOP_Y - 2}
          fill="none"
          stroke="#38BDF8"
          strokeWidth={2}
        />
      )}

      {/* Jump launch burst at starting mat */}
      {showJumpBurst && (
        <g transform={`translate(${cx}, ${GROUND_Y - 2})`} opacity={1 - jumpBurstT}>
          <ellipse
            cx={0}
            cy={0}
            rx={11 + jumpBurstT * 22}
            ry={3 + jumpBurstT * 3.5}
            fill="none"
            stroke={suit.accent}
            strokeWidth={2}
          />
          <line
            x1={-14 - jumpBurstT * 9}
            y1={-4}
            x2={-22 - jumpBurstT * 14}
            y2={-11 - jumpBurstT * 7}
            stroke={suit.accent}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={14 + jumpBurstT * 9}
            y1={-4}
            x2={22 + jumpBurstT * 14}
            y2={-11 - jumpBurstT * 7}
            stroke={suit.accent}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Speed lines during leap/throw */}
      {showSpeedLines && (
        <g opacity={0.65}>
          <line
            x1={cx - 28}
            y1={barY + 14}
            x2={cx - 28}
            y2={barY + 42}
            stroke={suit.accent}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={cx + 28}
            y1={barY + 14}
            x2={cx + 28}
            y2={barY + 42}
            stroke={suit.accent}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* FINISHED SUMMIT POSE: Athlete climbs UP onto top deck and stands FACING US! */}
      {isFinished ? (
        <g>
          {/* Resting bar badge glow on top of Finish arch */}
          <FrontAthleteFigure
            customization={custom}
            colorIndex={participant.colorIndex}
            laneNumber={laneIndex + 1}
            pose="bar_overhead"
            scale={0.86}
            x={cx}
            y={RAMP_TOP_Y - 7}
          />
          {participant.finishPlace !== null && (
            <g
              transform={`translate(${cx}, ${20})`}
              className="animate-victory-pulse"
            >
              <rect
                x={-35}
                y={-11}
                width={70}
                height={20}
                rx={6}
                fill={
                  participant.finishPlace === 1
                    ? '#F59E0B'
                    : participant.finishPlace === 2
                    ? '#94A3B8'
                    : participant.finishPlace === 3
                    ? '#D97706'
                    : '#2563EB'
                }
              />
              <text
                x={0}
                y={3}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight={700}
                fill="#0F172A"
                fontFamily="var(--font-display)"
              >
                {participant.finishPlace} место
              </text>
            </g>
          )}
        </g>
      ) : (
        <>
          {/* Contact shadow */}
          {isStandingPose ? (
            <ellipse cx={cx} cy={GROUND_Y + 1} rx={17} ry={3.8} fill="#020617" opacity={0.65} />
          ) : (
            <g
              transform={`translate(${3.5 + barLiftDepth * 0.45}, ${6 + barLiftDepth * 0.55})`}
              opacity={0.32}
            >
              <line
                x1={barLeftX + 3}
                y1={barY}
                x2={barRightX - 3}
                y2={barY}
                stroke="#020617"
                strokeWidth={5.5}
                strokeLinecap="round"
              />
              <ellipse cx={cx} cy={shoulderY + 12} rx={13} ry={19} fill="#020617" />
            </g>
          )}

          {/* Horizontal Bar when climbing (behind hands/above head) */}
          {!isStandingPose && (
            <g>
              <line
                x1={barLeftX}
                y1={leftHandY}
                x2={barRightX}
                y2={rightHandY}
                stroke={barPalette.shaft}
                strokeWidth={6}
                strokeLinecap="round"
              />
              <line
                x1={barLeftX + 2}
                y1={leftHandY - 1.4}
                x2={barRightX - 2}
                y2={rightHandY - 1.4}
                stroke={barPalette.highlight}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
              <line
                x1={leftHandX - 5}
                y1={leftHandY}
                x2={rightHandX + 5}
                y2={rightHandY}
                stroke={barPalette.grip}
                strokeWidth={7}
                strokeLinecap="round"
              />
              <circle
                cx={barLeftX}
                cy={leftHandY}
                r={4.2}
                fill={activeNotchLevel !== null ? '#FBBF24' : barPalette.cap}
                stroke="#020617"
                strokeWidth={1.2}
              />
              <circle
                cx={barRightX}
                cy={rightHandY}
                r={4.2}
                fill={activeNotchLevel !== null ? '#FBBF24' : barPalette.cap}
                stroke="#020617"
                strokeWidth={1.2}
              />
            </g>
          )}

          {/* ILLUSTRATED CUSTOMIZABLE ATHLETE (Rear view while standing or climbing) */}
          <g>
            {/* Legs */}
            <path
              d={`M ${leftHipX} ${hipY} Q ${leftKneeX} ${kneeY} ${leftFootX} ${footY - 3}`}
              fill="none"
              stroke={suit.suitShade}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <path
              d={`M ${rightHipX} ${hipY} Q ${rightKneeX} ${kneeY} ${rightFootX} ${footY - 3}`}
              fill="none"
              stroke={suit.suitShade}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <path
              d={`M ${leftHipX + 1} ${hipY} Q ${leftKneeX + 1} ${kneeY} ${leftFootX + 1} ${footY - 4}`}
              fill="none"
              stroke={suit.suit}
              strokeWidth={5.5}
              strokeLinecap="round"
            />
            <path
              d={`M ${rightHipX - 1} ${hipY} Q ${rightKneeX - 1} ${kneeY} ${rightFootX - 1} ${footY - 4}`}
              fill="none"
              stroke={suit.suit}
              strokeWidth={5.5}
              strokeLinecap="round"
            />

            {/* Sneakers */}
            <g transform={`translate(${leftFootX}, ${footY - 1})`}>
              <ellipse
                cx={0}
                cy={0}
                rx={5}
                ry={isStandingPose ? 3.8 : 5.8}
                fill={suit.shoe}
                stroke="#0F172A"
                strokeWidth={1.1}
              />
              <ellipse cx={0} cy={0.8} rx={2.6} ry={2} fill={suit.suit} />
            </g>
            <g transform={`translate(${rightFootX}, ${footY - 1})`}>
              <ellipse
                cx={0}
                cy={0}
                rx={5}
                ry={isStandingPose ? 3.8 : 5.8}
                fill={suit.shoe}
                stroke="#0F172A"
                strokeWidth={1.1}
              />
              <ellipse cx={0} cy={0.8} rx={2.6} ry={2} fill={suit.suit} />
            </g>

            {/* Horizontal Bar when standing on start mat */}
            {isStandingPose && (
              <g>
                <line
                  x1={barLeftX}
                  y1={leftHandY}
                  x2={barRightX}
                  y2={rightHandY}
                  stroke={barPalette.shaft}
                  strokeWidth={5.5}
                  strokeLinecap="round"
                />
                <line
                  x1={barLeftX + 2}
                  y1={leftHandY - 1.2}
                  x2={barRightX - 2}
                  y2={rightHandY - 1.2}
                  stroke={barPalette.highlight}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
                <line
                  x1={leftHandX - 4}
                  y1={leftHandY}
                  x2={rightHandX + 4}
                  y2={rightHandY}
                  stroke={barPalette.grip}
                  strokeWidth={6.5}
                  strokeLinecap="round"
                />
                <circle cx={barLeftX} cy={leftHandY} r={3.8} fill={barPalette.cap} stroke="#020617" strokeWidth={1.1} />
                <circle cx={barRightX} cy={rightHandY} r={3.8} fill={barPalette.cap} stroke="#020617" strokeWidth={1.1} />
              </g>
            )}

            {/* Arms */}
            <path
              d={`M ${cx - shoulderW} ${shoulderY + 2.5} Q ${leftElbowX} ${elbowY} ${leftHandX} ${leftHandY + 1}`}
              fill="none"
              stroke={suit.skinShade}
              strokeWidth={7.8}
              strokeLinecap="round"
            />
            <path
              d={`M ${cx - shoulderW} ${shoulderY + 1.5} Q ${leftElbowX + 1} ${elbowY - 1} ${leftHandX} ${leftHandY + 1}`}
              fill="none"
              stroke={suit.skin}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d={`M ${cx + shoulderW} ${shoulderY + 2.5} Q ${rightElbowX} ${elbowY} ${rightHandX} ${rightHandY + 1}`}
              fill="none"
              stroke={suit.skinShade}
              strokeWidth={7.8}
              strokeLinecap="round"
            />
            <path
              d={`M ${cx + shoulderW} ${shoulderY + 1.5} Q ${rightElbowX - 1} ${elbowY - 1} ${rightHandX} ${rightHandY + 1}`}
              fill="none"
              stroke={suit.skin}
              strokeWidth={5}
              strokeLinecap="round"
            />

            {/* Sleeves */}
            <circle cx={cx - shoulderW} cy={shoulderY + 2.5} r={5.6} fill={suit.suit} stroke={suit.suitShade} strokeWidth={1.1} />
            <circle cx={cx + shoulderW} cy={shoulderY + 2.5} r={5.6} fill={suit.suit} stroke={suit.suitShade} strokeWidth={1.1} />

            {/* Hands */}
            <rect
              x={leftHandX - 4}
              y={leftHandY - 4}
              width={8}
              height={7.5}
              rx={2.8}
              fill={suit.skin}
              stroke="#0F172A"
              strokeWidth={1.1}
            />
            <rect
              x={rightHandX - 4}
              y={rightHandY - 4}
              width={8}
              height={7.5}
              rx={2.8}
              fill={suit.skin}
              stroke="#0F172A"
              strokeWidth={1.1}
            />

            {/* Torso */}
            <path
              d={`
                M ${cx - shoulderW} ${shoulderY}
                Q ${cx} ${shoulderY - 2.5} ${cx + shoulderW} ${shoulderY}
                L ${cx + 10.5} ${waistY}
                Q ${cx + 11} ${hipY + 3.5} ${cx} ${hipY + 4.5}
                Q ${cx - 11} ${hipY + 3.5} ${cx - 10.5} ${waistY}
                Z
              `}
              fill={suit.suit}
              stroke={suit.suitShade}
              strokeWidth={1.4}
            />

            {/* Custom Back Pattern */}
            {renderSuitPattern(cx, shoulderY, waistY, shoulderW, custom.pattern, suit.trim)}

            {/* Lane Number */}
            <text
              x={cx}
              y={shoulderY + 15.5}
              textAnchor="middle"
              fontSize="12"
              fontWeight={800}
              fontFamily="var(--font-display)"
              fill="#FFFFFF"
              stroke={suit.suitShade}
              strokeWidth={0.6}
            >
              {laneIndex + 1}
            </text>

            {/* Neck & Head */}
            <rect x={cx - 3.5} y={shoulderY - 4.5} width={7} height={5.5} rx={1.8} fill={suit.skinShade} />
            <circle cx={cx - 8.5} cy={headY + 1} r={2} fill={suit.skin} />
            <circle cx={cx + 8.5} cy={headY + 1} r={2} fill={suit.skin} />
            <circle cx={cx} cy={headY} r={8.8} fill={suit.skin} stroke="#0F172A" strokeWidth={1.1} />

            {/* Custom Hair / Cap / Helmet */}
            {renderHeadGear(cx, headY, custom, suit.suit)}
          </g>
        </>
      )}

      {/* Twin Impact Sparks on both rails */}
      {sparkActive && (
        <>
          {[leftNotchX, rightNotchX].map((sx, idx) => (
            <g key={idx} transform={`translate(${sx}, ${rungY(toLvl)})`}>
              <circle
                cx={0}
                cy={0}
                r={5 + sparkT * 14}
                fill="none"
                stroke="#FBBF24"
                strokeWidth={2.5 * (1 - sparkT * 0.6)}
                opacity={1 - sparkT}
              />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r1 = 4 + sparkT * 4;
                const r2 = 10 + sparkT * 14;
                return (
                  <line
                    key={deg}
                    x1={Math.cos(rad) * r1}
                    y1={Math.sin(rad) * r1}
                    x2={Math.cos(rad) * r2}
                    y2={Math.sin(rad) * r2}
                    stroke="#FDE047"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={1 - sparkT}
                  />
                );
              })}
            </g>
          ))}
        </>
      )}

      {/* Bottom Nameplate */}
      <g transform={`translate(${cx}, ${GROUND_Y + 28})`}>
        <text
          x={0}
          y={0}
          textAnchor="middle"
          fontSize="13"
          fontWeight={700}
          fill="#F8FAFC"
          fontFamily="var(--font-sans)"
        >
          {participant.firstName.slice(0, 10)}{' '}
          {participant.lastName ? `${participant.lastName[0]}.` : ''}
        </text>
        <text
          x={0}
          y={18}
          textAnchor="middle"
          fontSize="11"
          fontWeight={600}
          fill={trackColor}
          fontFamily="var(--font-mono)"
        >
          {trackMeta?.shortLabel} · {participant.group.replace('Группа ', 'Гр.')}
        </text>
        <text
          x={0}
          y={35}
          textAnchor="middle"
          fontSize="11"
          fontWeight={600}
          fill={participant.level === 0 ? '#94A3B8' : suit.accent}
          fontFamily="var(--font-mono)"
        >
          {participant.level === 0 ? 'На старте' : `Этаж ${participant.level}/${MAX_LEVEL}`}
        </text>
        {!participant.connected && !participant.isDemo && (
          <text
            x={0}
            y={50}
            textAnchor="middle"
            fontSize="10"
            fill="#F87171"
            fontFamily="var(--font-sans)"
          >
            отключён
          </text>
        )}
      </g>
    </g>
  );
};

interface ClimbingArenaProps {
  participants: Participant[];
  activeClimbs: Record<string, ActiveClimbAnimation>;
  highlightParticipantId?: string | null;
  screenTitle?: string;
  screenSubtitle?: string;
  screenAccent?: string;
  canQuickStep?: boolean;
  onQuickStep?: (participantId: string) => void;
  compact?: boolean;
}

export const ClimbingArena: React.FC<ClimbingArenaProps> = ({
  participants,
  activeClimbs,
  highlightParticipantId = null,
  screenTitle,
  screenSubtitle,
  screenAccent = '#38BDF8',
  canQuickStep = false,
  onQuickStep,
  compact = false,
}) => {
  const [now, setNow] = useState(() => Date.now());
  const [backdropFailed, setBackdropFailed] = useState(false);
  const hasActiveClimb = Object.keys(activeClimbs).length > 0;

  useEffect(() => {
    if (!hasActiveClimb) return;
    let rafId = 0;
    const tick = () => {
      setNow(Date.now());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hasActiveClimb]);

  const laneCount = Math.max(MIN_SCREEN_LANES, participants.length);
  const chutesTotalW = laneCount * LANE_STRIDE;
  const viewWidth = LEFT_AXIS_W + chutesTotalW + RAIL_W + RIGHT_PAD;
  const slots = Array.from({ length: laneCount }, (_, idx) => participants[idx] ?? null);

  return (
    <div className="w-full overflow-hidden bg-[#0C1324] border border-slate-800 rounded-xl shadow-lg">
      {screenTitle && (
        <div
          className="px-4 sm:px-5 py-2.5 bg-[#0D1526] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2"
          style={{ borderTop: `2px solid ${screenAccent}` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: screenAccent }}
              aria-hidden="true"
            />
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
              {screenTitle}
            </span>
          </div>
          {screenSubtitle && (
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {screenSubtitle}
            </span>
          )}
        </div>
      )}

      <div className="w-full overflow-hidden">
        <div className="relative w-full">
          {!backdropFailed && (
            <div
              className="absolute inset-x-0 top-0 h-28 overflow-hidden pointer-events-none"
              aria-hidden="true"
            >
              <img
                src={ARENA_BACKDROP_IMG}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setBackdropFailed(true)}
                className="w-full h-full object-cover object-center opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/30 via-[#0C1324]/75 to-[#0C1324]" />
            </div>
          )}

          <svg
            viewBox={`0 0 ${viewWidth} ${VIEW_HEIGHT}`}
            className="relative w-full h-auto block select-none"
            role="img"
            aria-label={
              screenTitle
                ? `${screenTitle}: вертикальные дорожки на ${MAX_LEVEL} этажей`
                : `Арена соревнований с вертикальными дорожками на ${MAX_LEVEL} этажей`
            }
          >
            <defs>
              <linearGradient id="notchedRailGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="35%" stopColor="#2563EB" />
                <stop offset="65%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#172554" />
              </linearGradient>

              <linearGradient id="notchPocketGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#020617" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>

              <linearGradient id="finishBannerGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Top Finish Arch */}
            <rect
              x={LEFT_AXIS_W}
              y={RAMP_TOP_Y - 6}
              width={chutesTotalW + RAIL_W}
              height={8}
              rx={3}
              fill="url(#finishBannerGrad)"
            />

          {/* Left Elevation Ruler Labels (СТАРТ + ЭТАЖ 1..10) */}
          {[0, ...FLOOR_NUMBERS].map((lvl) => {
            const y = rungY(lvl);
            const isTop = lvl === MAX_LEVEL;
            const isStart = lvl === 0;
            return (
              <g key={lvl}>
                <text
                  x={LEFT_AXIS_W - 12}
                  y={isStart ? y - 4 : y + 4}
                  textAnchor="end"
                  fontSize={isTop ? '11' : '10.5'}
                  fontWeight={isTop || isStart ? 700 : 600}
                  fill={isTop ? '#FBBF24' : isStart ? '#CBD5E1' : '#94A3B8'}
                  fontFamily="var(--font-mono)"
                >
                  {isStart ? 'СТАРТ' : isTop ? 'ФИНИШ 10' : `ЭТАЖ ${lvl}`}
                </text>
                <line
                  x1={LEFT_AXIS_W - 7}
                  y1={y}
                  x2={LEFT_AXIS_W}
                  y2={y}
                  stroke={isTop ? '#FBBF24' : isStart ? '#64748B' : '#475569'}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

          {/* Vertical Stepped Notched Rails */}
          {Array.from({ length: laneCount + 1 }, (_, railIdx) => {
            const rx = LEFT_AXIS_W + railIdx * LANE_STRIDE;
            return (
              <g key={`rail-${railIdx}`}>
                <rect
                  x={rx}
                  y={RAMP_TOP_Y}
                  width={RAIL_W}
                  height={GROUND_Y - RAMP_TOP_Y}
                  fill="url(#notchedRailGrad)"
                />
                {FLOOR_NUMBERS.map((lvl) => {
                  const y = rungY(lvl);
                  return (
                    <g key={lvl}>
                      <rect
                        x={rx + 1.5}
                        y={y - 4.5}
                        width={RAIL_W - 3}
                        height={9}
                        rx={2}
                        fill="url(#notchPocketGrad)"
                      />
                      <rect
                        x={rx + 1.5}
                        y={y + 2.5}
                        width={RAIL_W - 3}
                        height={3}
                        rx={1}
                        fill={lvl === MAX_LEVEL ? '#FBBF24' : '#60A5FA'}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* 8 Chutes */}
          {slots.map((participant, idx) => {
            const chuteX = LEFT_AXIS_W + idx * LANE_STRIDE + RAIL_W;
            const cx = chuteX + CHUTE_W / 2;

            if (!participant) {
              return (
                <g key={`empty-${idx}`}>
                  <rect
                    x={chuteX}
                    y={RAMP_TOP_Y}
                    width={CHUTE_W}
                    height={GROUND_Y - RAMP_TOP_Y}
                    fill={idx % 2 === 0 ? '#11192E' : '#0E1528'}
                  />
                  {FLOOR_NUMBERS.map((lvl) => (
                    <line
                      key={lvl}
                      x1={chuteX + 8}
                      y1={rungY(lvl)}
                      x2={chuteX + CHUTE_W - 8}
                      y2={rungY(lvl)}
                      stroke="#1E293B"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ))}
                  <rect
                    x={chuteX + 2}
                    y={GROUND_Y - 12}
                    width={CHUTE_W - 4}
                    height={12}
                    fill="#162036"
                  />
                  <text
                    x={cx}
                    y={GROUND_Y + 28}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight={600}
                    fill="#64748B"
                    fontFamily="var(--font-sans)"
                  >
                    Дорожка {idx + 1}
                  </text>
                  <text
                    x={cx}
                    y={GROUND_Y + 46}
                    textAnchor="middle"
                    fontSize="10.5"
                    fill="#475569"
                    fontFamily="var(--font-sans)"
                  >
                    свободно
                  </text>
                </g>
              );
            }

            const isHighlighted = highlightParticipantId === participant.id;

            return (
              <AthleteClimberLane
                key={participant.id}
                participant={participant}
                laneIndex={idx}
                chuteX={chuteX}
                climb={activeClimbs[participant.id]}
                now={now}
                isHighlighted={isHighlighted}
                dimmed={false}
                canQuickStep={canQuickStep}
                onQuickStep={onQuickStep}
              />
            );
          })}

          {/* Ground Start Beam */}
          <rect
            x={LEFT_AXIS_W}
            y={GROUND_Y}
            width={chutesTotalW + RAIL_W}
            height={6}
            rx={2}
            fill="#334155"
          />
          </svg>
        </div>
      </div>
    </div>
  );
};

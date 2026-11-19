import React from 'react';
import {
  createDefaultCustomization,
  type CharacterCustomization,
} from '../shared/types.ts';
import {
  ATHLETE_SUITS,
  BAR_STYLE_PALETTES,
  renderSuitPattern,
} from './ClimbingArena.tsx';

interface FrontAthleteFigureProps {
  customization?: CharacterCustomization;
  colorIndex: number;
  laneNumber: number;
  pose?: 'bar_overhead' | 'arms_up' | 'cheer';
  scale?: number;
  x?: number;
  y?: number;
}

/**
 * Front-facing smiling victory athlete SVG group anchored at feet bottom-center (0, 0).
 * Used both at the Floor 10 summit of ClimbingArena and on the 1-2-3 Championship Podium!
 */
export const FrontAthleteFigure: React.FC<FrontAthleteFigureProps> = ({
  customization,
  colorIndex,
  laneNumber,
  pose = 'bar_overhead',
  scale = 1,
  x = 0,
  y = 0,
}) => {
  const custom = customization ?? createDefaultCustomization(colorIndex);
  const suit = ATHLETE_SUITS[custom.suitColorIndex % ATHLETE_SUITS.length];
  const barPalette =
    BAR_STYLE_PALETTES[custom.barStyle] ?? BAR_STYLE_PALETTES.classic;

  // Local coordinates with feet resting on y = 0
  const footY = 0;
  const kneeY = -16;
  const hipY = -31;
  const waistY = -36;
  const shoulderY = -54;
  const headY = -65;
  const shoulderW = 13.5;

  const isHoldingBar = pose === 'bar_overhead';
  const barY = -80;

  // Hands coordinates based on celebration pose
  const leftHandX = isHoldingBar ? -24 : pose === 'arms_up' ? -22 : -20;
  const rightHandX = isHoldingBar ? 24 : pose === 'arms_up' ? 22 : 20;
  const leftHandY = isHoldingBar ? barY : pose === 'arms_up' ? -76 : -73;
  const rightHandY = isHoldingBar ? barY : pose === 'arms_up' ? -76 : -62;

  const leftElbowX = isHoldingBar ? -21 : -20;
  const rightElbowX = isHoldingBar ? 21 : pose === 'cheer' ? 19 : 20;
  const leftElbowY = -64;
  const rightElbowY = pose === 'cheer' ? -54 : -64;

  const renderFrontHair = () => {
    switch (custom.hairStyle) {
      case 'spiky':
        return (
          <g>
            <path
              d={`
                M -9.2 ${headY - 2}
                L -12.5 ${headY - 9}
                L -6.5 ${headY - 8}
                L -4 ${headY - 16}
                L 0 ${headY - 10}
                L 4 ${headY - 16}
                L 6.5 ${headY - 8}
                L 12.5 ${headY - 9}
                L 9.2 ${headY - 2}
                Q 0 ${headY - 5} -9.2 ${headY - 2}
                Z
              `}
              fill={custom.hairColor}
            />
            <path
              d={`M -8.8 ${headY - 3} Q 0 ${headY - 5} 8.8 ${headY - 3}`}
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
            {/* Ponytail peeking playfully to the side behind the head */}
            <path
              d={`M 7 ${headY - 4} Q 15 ${headY - 3} 14 ${headY + 7} Q 10 ${headY + 4} 8 ${headY + 1} Z`}
              fill={custom.hairColor}
            />
            <circle cx={9} cy={headY - 2} r={2.2} fill={suit.suit} stroke="#FFFFFF" strokeWidth={0.8} />
            {/* Front fringe */}
            <path
              d={`M -9.2 ${headY - 1} A 9.2 9.2 0 0 1 9.2 ${headY - 1} Q 3 ${headY - 6} -3 ${headY - 4} Q -7 ${headY - 4} -9.2 ${headY - 1} Z`}
              fill={custom.hairColor}
            />
          </g>
        );

      case 'cap':
        return (
          <g>
            <path
              d={`M -9.5 ${headY - 2} A 9.5 9.5 0 0 1 9.5 ${headY - 2} Z`}
              fill={custom.hairColor}
              stroke="#0F172A"
              strokeWidth={1}
            />
            {/* Front baseball cap visor */}
            <path
              d={`M -10.5 ${headY - 2} Q 0 ${headY - 6} 10.5 ${headY - 2} Q 0 ${headY - 0.5} -10.5 ${headY - 2} Z`}
              fill={suit.suit}
              stroke="#0F172A"
              strokeWidth={1}
            />
          </g>
        );

      case 'helmet':
        return (
          <g>
            <path
              d={`M -10.2 ${headY - 1} A 10.2 10.2 0 0 1 10.2 ${headY - 1} Q 0 ${headY - 5} -10.2 ${headY - 1} Z`}
              fill={custom.hairColor}
              stroke="#0F172A"
              strokeWidth={1.1}
            />
            <rect x={-2} y={headY - 11} width={4} height={8} rx={1.5} fill={suit.suit} />
          </g>
        );

      case 'short':
      default:
        return (
          <g>
            <path
              d={`M -9.2 ${headY - 1} A 9.2 9.2 0 0 1 9.2 ${headY - 1} Q 4 ${headY - 6} 0 ${headY - 4.5} Q -4 ${headY - 6} -9.2 ${headY - 1} Z`}
              fill={custom.hairColor}
            />
            <path
              d={`M -8.8 ${headY - 2.5} Q 0 ${headY - 4.5} 8.8 ${headY - 2.5}`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        );
    }
  };

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Ground shadow */}
      <ellipse cx={0} cy={1} rx={17} ry={3.8} fill="#020617" opacity={0.55} />

      {/* Victory bar held high overhead */}
      {isHoldingBar && (
        <g>
          <line
            x1={-40}
            y1={barY}
            x2={40}
            y2={barY}
            stroke={barPalette.shaft}
            strokeWidth={5.5}
            strokeLinecap="round"
          />
          <line
            x1={-38}
            y1={barY - 1.3}
            x2={38}
            y2={barY - 1.3}
            stroke={barPalette.highlight}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            x1={leftHandX - 4}
            y1={barY}
            x2={rightHandX + 4}
            y2={barY}
            stroke={barPalette.grip}
            strokeWidth={6.5}
            strokeLinecap="round"
          />
          <circle cx={-40} cy={barY} r={4} fill={barPalette.cap} stroke="#020617" strokeWidth={1.1} />
          <circle cx={40} cy={barY} r={4} fill={barPalette.cap} stroke="#020617" strokeWidth={1.1} />
        </g>
      )}

      {/* Legs standing proudly */}
      <path
        d={`M -6.5 ${hipY} Q -9 ${kneeY} -8.5 ${footY - 3}`}
        fill="none"
        stroke={suit.suitShade}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <path
        d={`M 6.5 ${hipY} Q 9 ${kneeY} 8.5 ${footY - 3}`}
        fill="none"
        stroke={suit.suitShade}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <path
        d={`M -5.5 ${hipY} Q -8 ${kneeY} -7.5 ${footY - 4}`}
        fill="none"
        stroke={suit.suit}
        strokeWidth={5.5}
        strokeLinecap="round"
      />
      <path
        d={`M 5.5 ${hipY} Q 8 ${kneeY} 7.5 ${footY - 4}`}
        fill="none"
        stroke={suit.suit}
        strokeWidth={5.5}
        strokeLinecap="round"
      />

      {/* Front-facing Sport Sneakers */}
      <g transform={`translate(-9, ${footY - 1.5})`}>
        <ellipse cx={0} cy={0} rx={5.8} ry={3.8} fill={suit.shoe} stroke="#0F172A" strokeWidth={1.1} />
        <line x1={-3} y1={-0.8} x2={3} y2={-0.8} stroke={suit.suit} strokeWidth={2} strokeLinecap="round" />
      </g>
      <g transform={`translate(9, ${footY - 1.5})`}>
        <ellipse cx={0} cy={0} rx={5.8} ry={3.8} fill={suit.shoe} stroke="#0F172A" strokeWidth={1.1} />
        <line x1={-3} y1={-0.8} x2={3} y2={-0.8} stroke={suit.suit} strokeWidth={2} strokeLinecap="round" />
      </g>

      {/* Raised Victory Arms */}
      <path
        d={`M ${-shoulderW} ${shoulderY + 2} Q ${leftElbowX} ${leftElbowY} ${leftHandX} ${leftHandY}`}
        fill="none"
        stroke={suit.skinShade}
        strokeWidth={7.8}
        strokeLinecap="round"
      />
      <path
        d={`M ${-shoulderW} ${shoulderY + 1} Q ${leftElbowX + 1} ${leftElbowY - 1} ${leftHandX} ${leftHandY}`}
        fill="none"
        stroke={suit.skin}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d={`M ${shoulderW} ${shoulderY + 2} Q ${rightElbowX} ${rightElbowY} ${rightHandX} ${rightHandY}`}
        fill="none"
        stroke={suit.skinShade}
        strokeWidth={7.8}
        strokeLinecap="round"
      />
      <path
        d={`M ${shoulderW} ${shoulderY + 1} Q ${rightElbowX - 1} ${rightElbowY - 1} ${rightHandX} ${rightHandY}`}
        fill="none"
        stroke={suit.skin}
        strokeWidth={5}
        strokeLinecap="round"
      />

      {/* Sleeves */}
      <circle cx={-shoulderW} cy={shoulderY + 2} r={5.6} fill={suit.suit} stroke={suit.suitShade} strokeWidth={1.1} />
      <circle cx={shoulderW} cy={shoulderY + 2} r={5.6} fill={suit.suit} stroke={suit.suitShade} strokeWidth={1.1} />

      {/* Hands */}
      <circle cx={leftHandX} cy={leftHandY} r={4.2} fill={suit.skin} stroke="#0F172A" strokeWidth={1.1} />
      <circle cx={rightHandX} cy={rightHandY} r={4.2} fill={suit.skin} stroke="#0F172A" strokeWidth={1.1} />

      {/* Front Racing Torso */}
      <path
        d={`
          M ${-shoulderW} ${shoulderY}
          Q 0 ${shoulderY - 2.5} ${shoulderW} ${shoulderY}
          L 10.5 ${waistY}
          Q 11 ${hipY + 3.5} 0 ${hipY + 4.5}
          Q -11 ${hipY + 3.5} -10.5 ${waistY}
          Z
        `}
        fill={suit.suit}
        stroke={suit.suitShade}
        strokeWidth={1.4}
      />

      {/* Front Chest Pattern & Number */}
      {renderSuitPattern(0, shoulderY, waistY, shoulderW, custom.pattern, suit.trim)}
      <text
        x={0}
        y={shoulderY + 15.5}
        textAnchor="middle"
        fontSize="11.5"
        fontWeight={800}
        fontFamily="var(--font-display)"
        fill="#FFFFFF"
        stroke={suit.suitShade}
        strokeWidth={0.6}
      >
        {laneNumber}
      </text>

      {/* Neck & Ears */}
      <rect x={-3.5} y={shoulderY - 4.5} width={7} height={5.5} rx={1.8} fill={suit.skinShade} />
      <circle cx={-9} cy={headY + 1} r={2.2} fill={suit.skin} />
      <circle cx={9} cy={headY + 1} r={2.2} fill={suit.skin} />

      {/* Smiling Front Face */}
      <circle cx={0} cy={headY} r={9.2} fill={suit.skin} stroke="#0F172A" strokeWidth={1.1} />
      {/* Eyes with tiny shine */}
      <circle cx={-3.2} cy={headY - 0.3} r={1.4} fill="#0F172A" />
      <circle cx={3.2} cy={headY - 0.3} r={1.4} fill="#0F172A" />
      <circle cx={-2.7} cy={headY - 0.8} r={0.45} fill="#FFFFFF" />
      <circle cx={3.7} cy={headY - 0.8} r={0.45} fill="#FFFFFF" />
      {/* Subtle rosy cheeks */}
      <ellipse cx={-5.3} cy={headY + 2} rx={1.6} ry={0.9} fill="#FB7185" opacity={0.45} />
      <ellipse cx={5.3} cy={headY + 2} rx={1.6} ry={0.9} fill="#FB7185" opacity={0.45} />
      {/* Big Happy Victory Smile */}
      <path
        d={`M -3.8 ${headY + 2.6} Q 0 ${headY + 6.4} 3.8 ${headY + 2.6}`}
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* Front Hair / Cap / Helmet */}
      {renderFrontHair()}
    </g>
  );
};

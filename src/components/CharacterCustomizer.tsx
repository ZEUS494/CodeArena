import React from 'react';
import { Shuffle } from 'lucide-react';
import {
  BAR_STYLE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  SUIT_COLOR_OPTIONS,
  SUIT_PATTERN_OPTIONS,
  type CharacterCustomization,
} from '../shared/types.ts';
import {
  ATHLETE_SUITS,
  BAR_STYLE_PALETTES,
  renderHeadGear,
  renderSuitPattern,
} from './ClimbingArena.tsx';

interface CharacterCustomizerProps {
  customization: CharacterCustomization;
  laneNumber: number;
  playerName: string;
  onChange: (patch: Partial<CharacterCustomization>) => void;
}

export const CharacterCustomizer: React.FC<CharacterCustomizerProps> = ({
  customization,
  laneNumber,
  playerName,
  onChange,
}) => {
  const suit =
    ATHLETE_SUITS[customization.suitColorIndex % ATHLETE_SUITS.length];
  const barPalette =
    BAR_STYLE_PALETTES[customization.barStyle] ?? BAR_STYLE_PALETTES.classic;

  const handleRandomize = () => {
    const suitColorIndex = Math.floor(Math.random() * SUIT_COLOR_OPTIONS.length);
    const hairStyle =
      HAIR_STYLE_OPTIONS[Math.floor(Math.random() * HAIR_STYLE_OPTIONS.length)].id;
    const hairColor =
      HAIR_COLOR_OPTIONS[Math.floor(Math.random() * HAIR_COLOR_OPTIONS.length)].color;
    const pattern =
      SUIT_PATTERN_OPTIONS[Math.floor(Math.random() * SUIT_PATTERN_OPTIONS.length)].id;
    const barStyle =
      BAR_STYLE_OPTIONS[Math.floor(Math.random() * BAR_STYLE_OPTIONS.length)].id;

    onChange({ suitColorIndex, hairStyle, hairColor, pattern, barStyle });
  };

  // Preview coordinates (enlarged standing athlete holding bar)
  const cx = 90;
  const shoulderY = 66;
  const headY = shoulderY - 8.5;
  const waistY = shoulderY + 19;
  const hipY = waistY + 5;
  const shoulderW = 13.5;
  const kneeY = 106;
  const footY = 126;
  const barY = 84;
  const leftHandX = cx - 23;
  const rightHandX = cx + 23;

  return (
    <section
      aria-label="Настройка персонажа"
      className="bg-[#121B2F] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            Настройка персонажа перед стартом
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Пока ждём остальных, выберите стиль спортсмена — изменения сразу видны на общей арене.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRandomize}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5 text-amber-400" />
          Случайный образ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Live Close-up Character Preview */}
        <div className="lg:col-span-4 bg-[#0B1120] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 180 154"
            className="w-44 h-auto select-none"
            role="img"
            aria-label={`Предпросмотр персонажа ${playerName}`}
          >
            {/* Subtle mini stadium chute background */}
            <rect x={28} y={8} width={124} height={124} rx={8} fill="#11192E" stroke="#1E293B" />
            <rect x={20} y={8} width={8} height={124} rx={2} fill="#2563EB" />
            <rect x={152} y={8} width={8} height={124} rx={2} fill="#2563EB" />
            {/* Elevated Floor 1 teaser notch above head */}
            <line x1={32} y1={28} x2={148} y2={28} stroke="#38BDF8" strokeOpacity={0.45} strokeDasharray="4 4" />
            <rect x={21} y={24} width={6} height={8} rx={1.5} fill="#0F172A" />
            <rect x={153} y={24} width={6} height={8} rx={1.5} fill="#0F172A" />
            {/* Start mat */}
            <rect x={28} y={120} width={124} height={12} fill="#1E293B" />
            <ellipse cx={cx} cy={footY + 2} rx={22} ry={4.5} fill="#020617" opacity={0.7} />

            {/* Athlete standing preview */}
            <g>
              {/* Legs */}
              <path d={`M ${cx - 6.5} ${hipY} Q ${cx - 9.5} ${kneeY} ${cx - 8.5} ${footY - 3}`} fill="none" stroke={suit.suitShade} strokeWidth={9} strokeLinecap="round" />
              <path d={`M ${cx + 6.5} ${hipY} Q ${cx + 9.5} ${kneeY} ${cx + 8.5} ${footY - 3}`} fill="none" stroke={suit.suitShade} strokeWidth={9} strokeLinecap="round" />
              <path d={`M ${cx - 5.5} ${hipY} Q ${cx - 8.5} ${kneeY} ${cx - 7.5} ${footY - 4}`} fill="none" stroke={suit.suit} strokeWidth={5.5} strokeLinecap="round" />
              <path d={`M ${cx + 5.5} ${hipY} Q ${cx + 8.5} ${kneeY} ${cx + 7.5} ${footY - 4}`} fill="none" stroke={suit.suit} strokeWidth={5.5} strokeLinecap="round" />

              {/* Sneakers */}
              <g transform={`translate(${cx - 8.5}, ${footY - 1})`}>
                <ellipse cx={0} cy={0} rx={5.2} ry={4} fill={suit.shoe} stroke="#0F172A" strokeWidth={1.1} />
                <ellipse cx={0} cy={0.8} rx={2.8} ry={2} fill={suit.suit} />
              </g>
              <g transform={`translate(${cx + 8.5}, ${footY - 1})`}>
                <ellipse cx={0} cy={0} rx={5.2} ry={4} fill={suit.shoe} stroke="#0F172A" strokeWidth={1.1} />
                <ellipse cx={0} cy={0.8} rx={2.8} ry={2} fill={suit.suit} />
              </g>

              {/* Horizontal Bar held at start */}
              <line x1={cx - 46} y1={barY} x2={cx + 46} y2={barY} stroke={barPalette.shaft} strokeWidth={5.5} strokeLinecap="round" />
              <line x1={cx - 44} y1={barY - 1.3} x2={cx + 44} y2={barY - 1.3} stroke={barPalette.highlight} strokeWidth={1.4} strokeLinecap="round" />
              <line x1={leftHandX - 4} y1={barY} x2={rightHandX + 4} y2={barY} stroke={barPalette.grip} strokeWidth={6.5} strokeLinecap="round" />
              <circle cx={cx - 46} cy={barY} r={4} fill={barPalette.cap} stroke="#020617" strokeWidth={1.1} />
              <circle cx={cx + 46} cy={barY} r={4} fill={barPalette.cap} stroke="#020617" strokeWidth={1.1} />

              {/* Arms */}
              <path d={`M ${cx - shoulderW} ${shoulderY + 2.5} Q ${cx - shoulderW - 8} ${(shoulderY + barY) / 2 + 2} ${leftHandX} ${barY + 1}`} fill="none" stroke={suit.skinShade} strokeWidth={7.8} strokeLinecap="round" />
              <path d={`M ${cx - shoulderW} ${shoulderY + 1.5} Q ${cx - shoulderW - 7} ${(shoulderY + barY) / 2 + 1} ${leftHandX} ${barY + 1}`} fill="none" stroke={suit.skin} strokeWidth={5} strokeLinecap="round" />
              <path d={`M ${cx + shoulderW} ${shoulderY + 2.5} Q ${cx + shoulderW + 8} ${(shoulderY + barY) / 2 + 2} ${rightHandX} ${barY + 1}`} fill="none" stroke={suit.skinShade} strokeWidth={7.8} strokeLinecap="round" />
              <path d={`M ${cx + shoulderW} ${shoulderY + 1.5} Q ${cx + shoulderW + 7} ${(shoulderY + barY) / 2 + 1} ${rightHandX} ${barY + 1}`} fill="none" stroke={suit.skin} strokeWidth={5} strokeLinecap="round" />

              {/* Sleeves & Hands */}
              <circle cx={cx - shoulderW} cy={shoulderY + 2.5} r={5.6} fill={suit.suit} stroke={suit.suitShade} strokeWidth={1.1} />
              <circle cx={cx + shoulderW} cy={shoulderY + 2.5} r={5.6} fill={suit.suit} stroke={suit.suitShade} strokeWidth={1.1} />
              <rect x={leftHandX - 4} y={barY - 4} width={8} height={7.5} rx={2.8} fill={suit.skin} stroke="#0F172A" strokeWidth={1.1} />
              <rect x={rightHandX - 4} y={barY - 4} width={8} height={7.5} rx={2.8} fill={suit.skin} stroke="#0F172A" strokeWidth={1.1} />

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
              {renderSuitPattern(cx, shoulderY, waistY, shoulderW, customization.pattern, suit.trim)}
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
                {laneNumber}
              </text>

              {/* Head */}
              <rect x={cx - 3.5} y={shoulderY - 4.5} width={7} height={5.5} rx={1.8} fill={suit.skinShade} />
              <circle cx={cx - 8.5} cy={headY + 1} r={2} fill={suit.skin} />
              <circle cx={cx + 8.5} cy={headY + 1} r={2} fill={suit.skin} />
              <circle cx={cx} cy={headY} r={8.8} fill={suit.skin} stroke="#0F172A" strokeWidth={1.1} />
              {renderHeadGear(cx, headY, customization, suit.suit)}
            </g>

            <text
              x={cx}
              y={146}
              textAnchor="middle"
              fontSize="11"
              fontWeight={600}
              fill="#CBD5E1"
              fontFamily="var(--font-sans)"
            >
              {playerName}
            </text>
          </svg>
        </div>

        {/* Customization Controls */}
        <div className="lg:col-span-8 space-y-4">
          {/* Suit Color */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-300">
              Цвет костюма
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {SUIT_COLOR_OPTIONS.map((opt) => {
                const active = customization.suitColorIndex === opt.index;
                return (
                  <button
                    key={opt.index}
                    type="button"
                    onClick={() => onChange({ suitColorIndex: opt.index })}
                    aria-label={`Цвет костюма: ${opt.label}`}
                    title={opt.label}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-transform cursor-pointer ${
                      active
                        ? 'border-white scale-105'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                    style={{ backgroundColor: opt.swatch }}
                  >
                    {active && (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-950/80" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hair / Headgear Style + Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-300">
                Причёска / головной убор
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_STYLE_OPTIONS.map((opt) => {
                  const active = customization.hairStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ hairStyle: opt.id })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#2563EB] text-white border-sky-400'
                          : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-300">
                Цвет волос / шлема
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {HAIR_COLOR_OPTIONS.map((opt) => {
                  const active = customization.hairColor === opt.color;
                  return (
                    <button
                      key={opt.color}
                      type="button"
                      onClick={() => onChange({ hairColor: opt.color })}
                      aria-label={`Цвет: ${opt.label}`}
                      title={opt.label}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform cursor-pointer ${
                        active
                          ? 'border-white scale-105'
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: opt.color }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pattern + Bar Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-300">
                Узор на спине
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUIT_PATTERN_OPTIONS.map((opt) => {
                  const active = customization.pattern === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ pattern: opt.id })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#2563EB] text-white border-sky-400'
                          : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-300">
                Стиль перекладины (палки)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BAR_STYLE_OPTIONS.map((opt) => {
                  const active = customization.barStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ barStyle: opt.id })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#2563EB] text-white border-sky-400'
                          : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

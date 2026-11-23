import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { ProgressMap } from '../types/game';

interface TitleScreenProps {
  progress: ProgressMap;
  hasContinue: boolean;
  continueLevelNumber: number;
  muted: boolean;
  onToggleMute: () => void;
  onStart: () => void;
  onSelectLevel: () => void;
  onOpenSandbox: () => void;
}

const BACKDROP_SRC = '/src/assets/images/title_rover_backdrop_1795469166824.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  hasContinue,
  continueLevelNumber,
  muted,
  onToggleMute,
  onStart,
  onSelectLevel,
  onOpenSandbox,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const campaignLevels = LEVELS.filter((l) => !l.isSandbox);
  const totalStars = campaignLevels.reduce(
    (sum, lvl) => sum + (progress[lvl.id]?.stars ?? 0),
    0
  );
  const maxStars = campaignLevels.length * 3;
  const completedCount = campaignLevels.filter(
    (lvl) => (progress[lvl.id]?.stars ?? 0) > 0
  ).length;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0B111B] select-none flex flex-col justify-between">
      {/* Backdrop Key Art */}
      {!imgFailed ? (
        <img
          src={BACKDROP_SRC}
          alt="Aurora autonomous exploration rover on a blueprint mesa"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(245,158,11,0.16),transparent_45%),linear-gradient(135deg,#0B111B_0%,#152236_100%)]"
        />
      )}

      {/* Calm Left-Aligned Contrast Scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#0B111B] via-[#0B111B]/85 to-[#0B111B]/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0B111B]/90 via-transparent to-[#0B111B]/40"
      />

      {/* Minimal Top Corner Mute Affordance */}
      <div className="relative z-10 flex items-center justify-end px-8 pt-6">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-[#131C2B]/80 border border-slate-700/70 rounded-lg hover:text-white hover:border-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 whitespace-nowrap shrink-0"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{muted ? 'Sound Off' : 'Sound On'}</span>
        </button>
      </div>

      {/* Main Left-Side Lockup over Calm Negative Space */}
      <main className="relative z-10 max-w-2xl px-8 md:px-16 my-auto">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="flex items-center gap-4 mb-5">
          <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect
              x="2"
              y="2"
              width="48"
              height="48"
              rx="12"
              fill="#152033"
              stroke="#F59E0B"
              strokeWidth="2"
            />
            <path
              d="M15 35V17H26.5C30.6421 17 34 20.134 34 24C34 27.866 30.6421 31 26.5 31H21V35H15Z"
              fill="#F8FAFC"
            />
            <circle cx="26" cy="24" r="3" fill="#F59E0B" />
            <path
              d="M35 16L39 20L35 24"
              stroke="#10B981"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-white">
              PyTrail
            </h1>
          </div>
        </div>

        <p className="text-lg md:text-xl text-slate-200 leading-relaxed max-w-lg mb-4 text-balance">
          Learn real Python by programming Aurora through blueprint logic puzzles,
          loops, sensors, and patrol gauntlets.
        </p>

        {/* Unboxed Progress Metadata with Typographic Separators */}
        <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-400 tabular-nums mb-8">
          <span>{campaignLevels.length} Missions</span>
          <span aria-hidden="true">·</span>
          <span>
            {completedCount}/{campaignLevels.length} Cleared
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-300 font-medium">
            {totalStars}/{maxStars} Stars
          </span>
        </div>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={onStart}
            className="px-7 py-3.5 text-base font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 active:translate-y-px transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B111B] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {hasContinue
              ? `Continue Mission ${continueLevelNumber}`
              : 'Start Mission 1'}
          </button>

          <button
            type="button"
            onClick={onSelectLevel}
            className="px-5 py-3.5 text-sm font-medium text-slate-100 bg-[#152033]/90 border border-slate-700 rounded-lg hover:bg-[#1C2A42] hover:border-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Select Mission
          </button>

          <button
            type="button"
            onClick={onOpenSandbox}
            className="px-4 py-3.5 text-sm font-medium text-slate-300 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Open Free Sandbox
          </button>
        </div>
      </main>

      {/* Single Flat Control-Hint Line */}
      <footer className="relative z-10 px-8 md:px-16 pb-6">
        <p className="text-xs font-mono text-slate-400 tracking-wide">
          Enter Start · Ctrl+Enter Run Python · F10 Step Line · R Reset · Esc Pause
        </p>
      </footer>
    </div>
  );
};

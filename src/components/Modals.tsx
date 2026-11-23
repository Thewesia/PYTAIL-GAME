import React from 'react';
import { Star, Volume2, VolumeX, X } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { LevelDef, ProgressMap } from '../types/game';

interface VictoryModalProps {
  level: LevelDef;
  stars: number;
  linesUsed: number;
  stepsTaken: number;
  hasNextLevel: boolean;
  onReplay: () => void;
  onNextLevel: () => void;
  onLevelSelect: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  stars,
  linesUsed,
  stepsTaken,
  hasNextLevel,
  onReplay,
  onNextLevel,
  onLevelSelect,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md bg-[#121B2B] border border-slate-700/80 rounded-xl p-6 shadow-2xl">
        <p className="text-xs font-medium text-emerald-400 mb-1">
          {level.chapter} · Mission {level.number} Complete
        </p>
        <h2
          id="victory-title"
          className="font-display text-2xl font-bold text-white mb-4"
        >
          {level.title}
        </h2>

        {/* Star Rating Display */}
        <div className="flex items-center justify-center gap-3 py-4 mb-5 bg-[#0D1420] border border-slate-800 rounded-lg">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={`w-9 h-9 transition-transform ${
                n <= stars
                  ? 'text-amber-400 fill-amber-400 scale-105'
                  : 'text-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5 text-center tabular-nums">
          <div className="bg-[#0D1420] border border-slate-800/90 rounded-lg py-2.5 px-2">
            <div className="text-xs text-slate-400 mb-0.5">Code Lines</div>
            <div className="font-mono text-lg font-semibold text-white">
              {linesUsed}
            </div>
          </div>
          <div className="bg-[#0D1420] border border-slate-800/90 rounded-lg py-2.5 px-2">
            <div className="text-xs text-slate-400 mb-0.5">Par Target</div>
            <div className="font-mono text-lg font-semibold text-amber-300">
              {level.parLines}
            </div>
          </div>
          <div className="bg-[#0D1420] border border-slate-800/90 rounded-lg py-2.5 px-2">
            <div className="text-xs text-slate-400 mb-0.5">Rover Steps</div>
            <div className="font-mono text-lg font-semibold text-emerald-300">
              {stepsTaken}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          {linesUsed <= level.parLines
            ? `Clean solution! You mastered ${level.concept} within the ${level.parLines}-line par target.`
            : `Solved! Try trimming your code to ${level.parLines} lines or fewer to earn all 3 stars.`}
        </p>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={onLevelSelect}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            All Missions
          </button>
          {hasNextLevel && (
            <button
              type="button"
              onClick={onNextLevel}
              className="flex-1 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Next Mission
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  level: LevelDef;
  muted: boolean;
  onToggleMute: () => void;
  onResume: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  level,
  muted,
  onToggleMute,
  onResume,
  onRestart,
  onLevelSelect,
  onReturnTitle,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-sm bg-[#121B2B] border border-slate-700/80 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">
            Mission {level.number} · {level.title}
          </span>
          <button
            type="button"
            onClick={onResume}
            aria-label="Close pause menu"
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2
          id="pause-title"
          className="font-display text-2xl font-bold text-white mb-5"
        >
          Game Paused
        </h2>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 text-sm font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 text-sm font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Reset Rover Position
          </button>
          <button
            type="button"
            onClick={onLevelSelect}
            className="w-full py-2.5 px-4 text-sm font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Select Mission
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="w-full py-2.5 px-4 text-sm font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{muted ? 'Unmute Sound' : 'Mute Sound'}</span>
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 px-4 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer mt-1"
          >
            Exit to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};

interface LevelSelectModalProps {
  currentLevelId: string;
  progress: ProgressMap;
  onSelect: (levelId: string) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  progress,
  onSelect,
  onClose,
}) => {
  // Group by chapter
  const chapters: { name: string; levels: LevelDef[] }[] = [];
  for (const lvl of LEVELS) {
    let group = chapters.find((c) => c.name === lvl.chapter);
    if (!group) {
      group = { name: lvl.chapter, levels: [] };
      chapters.push(group);
    }
    group.levels.push(lvl);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-select-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-3xl max-h-[86vh] flex flex-col bg-[#121B2B] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2
              id="level-select-title"
              className="font-display text-xl font-bold text-white"
            >
              Select Mission
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose any Python training mission or jump straight into the Free Lab
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission selector"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pytrail-scroll p-6 space-y-6">
          {chapters.map((ch) => (
            <section key={ch.name}>
              <h3 className="text-xs font-semibold text-slate-400 mb-3">
                {ch.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ch.levels.map((lvl) => {
                  const stars = progress[lvl.id]?.stars ?? 0;
                  const isCurrent = lvl.id === currentLevelId;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => onSelect(lvl.id)}
                      className={`text-left p-4 rounded-lg border transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#19263B] border-amber-400/70'
                          : 'bg-[#0D1420] border-slate-800 hover:border-slate-600 hover:bg-[#141E30]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400 tabular-nums mb-0.5">
                          {lvl.isSandbox ? 'Sandbox' : `Mission ${lvl.number}`} · {lvl.concept}
                        </div>
                        <div className="font-display text-base font-semibold text-white truncate">
                          {lvl.title}
                        </div>
                      </div>

                      {!lvl.isSandbox && (
                        <div
                          className="flex items-center gap-0.5 shrink-0 pt-1"
                          aria-label={`${stars} of 3 stars`}
                        >
                          {[1, 2, 3].map((n) => (
                            <Star
                              key={n}
                              className={`w-4 h-4 ${
                                n <= stars
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Star,
  Terminal,
  Variable,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LEVELS } from './data/levels';
import { countCodeLines, createPythonRunner, StepSnapshot } from './engine/pythonEngine';
import { createInitialWorld } from './engine/worldSim';
import {
  ConsoleLine,
  ExecutionStatus,
  GameScreenState,
  LevelDef,
  ProgressMap,
  VariableEntry,
  WorldState,
} from './types/game';
import { sound } from './utils/sound';
import { ArenaCanvas } from './components/ArenaCanvas';
import { CodeEditor } from './components/CodeEditor';
import { TitleScreen } from './components/TitleScreen';
import { LevelSelectModal, PauseModal, VictoryModal } from './components/Modals';

const STORAGE_KEY = 'pytrail_progress_v1';

const DIR_LABELS = ['North', 'East', 'South', 'West'] as const;

function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressMap;
  } catch {
    // ignore storage errors
  }
  return {};
}

function saveProgress(p: ProgressMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore storage errors
  }
}

export default function App() {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());
  const [screen, setScreen] = useState<GameScreenState>('TITLE_MENU');
  const [previousScreen, setPreviousScreen] = useState<'TITLE_MENU' | 'PLAYING'>('TITLE_MENU');
  const [currentLevelId, setCurrentLevelId] = useState<string>(() => {
    const saved = loadProgress();
    const firstUnfinished = LEVELS.find(
      (l) => !l.isSandbox && (saved[l.id]?.stars ?? 0) === 0
    );
    return firstUnfinished ? firstUnfinished.id : LEVELS[0].id;
  });

  const currentLevel: LevelDef = useMemo(
    () => LEVELS.find((l) => l.id === currentLevelId) || LEVELS[0],
    [currentLevelId]
  );

  const [code, setCode] = useState<string>(() => {
    const saved = loadProgress()[currentLevel.id]?.savedCode;
    return saved ?? currentLevel.starterCode;
  });

  const [world, setWorld] = useState<WorldState>(() => createInitialWorld(currentLevel));
  const [execStatus, setExecStatus] = useState<ExecutionStatus>('IDLE');
  const [activeLine, setActiveLine] = useState<number>(0);
  const [errorLine, setErrorLine] = useState<number | undefined>(undefined);
  const [variables, setVariables] = useState<VariableEntry[]>([]);
  const [logs, setLogs] = useState<ConsoleLine[]>([]);
  const [lastEvent, setLastEvent] = useState<string | undefined>(undefined);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [muted, setMuted] = useState<boolean>(() => sound.isMuted());
  const [inspectorTab, setInspectorTab] = useState<'variables' | 'console' | 'docs'>('variables');
  const [hintIndex, setHintIndex] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [victoryInfo, setVictoryInfo] = useState<{
    stars: number;
    linesUsed: number;
    stepsTaken: number;
  } | null>(null);

  const runnerRef = useRef<Generator<StepSnapshot, void, void> | null>(null);
  const runTimerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
  }, []);

  const resetExecution = useCallback(
    (lvl: LevelDef = currentLevel) => {
      stopTimer();
      runnerRef.current = null;
      setWorld(createInitialWorld(lvl));
      setExecStatus('IDLE');
      setActiveLine(0);
      setErrorLine(undefined);
      setVariables([]);
      setLogs([]);
      setLastEvent(undefined);
    },
    [currentLevel, stopTimer]
  );

  const switchLevel = useCallback(
    (levelId: string) => {
      const target = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
      stopTimer();
      runnerRef.current = null;
      setCurrentLevelId(target.id);
      const saved = progress[target.id]?.savedCode;
      setCode(saved ?? target.starterCode);
      setWorld(createInitialWorld(target));
      setExecStatus('IDLE');
      setActiveLine(0);
      setErrorLine(undefined);
      setVariables([]);
      setLogs([]);
      setLastEvent(undefined);
      setHintIndex(0);
      setShowHint(false);
      setVictoryInfo(null);
      setScreen('PLAYING');
    },
    [progress, stopTimer]
  );

  // Persist code edits per level
  const handleCodeChange = useCallback(
    (nextCode: string) => {
      setCode(nextCode);
      setProgress((prev) => {
        const updated: ProgressMap = {
          ...prev,
          [currentLevel.id]: {
            stars: prev[currentLevel.id]?.stars ?? 0,
            bestLines: prev[currentLevel.id]?.bestLines,
            savedCode: nextCode,
          },
        };
        saveProgress(updated);
        return updated;
      });
      if (execStatus === 'ERROR' || execStatus === 'COMPLETED') {
        setErrorLine(undefined);
      }
    },
    [currentLevel.id, execStatus]
  );

  const playEventAudio = useCallback((ev?: string) => {
    switch (ev) {
      case 'move':
        sound.playMove();
        break;
      case 'turn':
        sound.playTurn();
        break;
      case 'collect':
        sound.playCollect();
        break;
      case 'switch':
        sound.playSwitch();
        break;
      case 'bump':
      case 'crash':
        sound.playBump();
        break;
      default:
        sound.playStepTick();
    }
  }, []);

  const handleVictory = useCallback(
    (snap: StepSnapshot) => {
      stopTimer();
      runnerRef.current = null;
      setExecStatus('COMPLETED');
      sound.playVictory();

      const linesUsed = countCodeLines(code);
      let stars = 1;
      if (linesUsed <= currentLevel.parLines) {
        stars = 3;
      } else if (linesUsed <= currentLevel.parLines + 3) {
        stars = 2;
      }

      setProgress((prev) => {
        const prevEntry = prev[currentLevel.id];
        const bestStars = Math.max(prevEntry?.stars ?? 0, stars);
        const bestLines =
          prevEntry?.bestLines !== undefined
            ? Math.min(prevEntry.bestLines, linesUsed)
            : linesUsed;
        const updated: ProgressMap = {
          ...prev,
          [currentLevel.id]: {
            stars: bestStars,
            bestLines,
            savedCode: code,
          },
        };
        saveProgress(updated);
        return updated;
      });

      setVictoryInfo({
        stars,
        linesUsed,
        stepsTaken: snap.world.steps,
      });
      setScreen('VICTORY');
    },
    [code, currentLevel.id, currentLevel.parLines, stopTimer]
  );

  const applySnapshot = useCallback(
    (snap: StepSnapshot): boolean => {
      setWorld(snap.world);
      setActiveLine(snap.activeLine);
      setVariables(snap.variables);
      setLogs(snap.logs);
      setLastEvent(snap.event);

      if (snap.error) {
        stopTimer();
        runnerRef.current = null;
        setErrorLine(snap.error.line);
        setExecStatus('ERROR');
        setInspectorTab('console');
        if (snap.event !== 'bump' && snap.event !== 'crash') {
          sound.playError();
        } else {
          sound.playBump();
        }
        return false;
      }

      playEventAudio(snap.event);

      if (snap.won) {
        handleVictory(snap);
        return false;
      }

      if (snap.finished) {
        stopTimer();
        runnerRef.current = null;
        setExecStatus('COMPLETED');
        if (!currentLevel.isSandbox) {
          setInspectorTab('console');
        }
        return false;
      }

      return true;
    },
    [currentLevel.isSandbox, handleVictory, playEventAudio, stopTimer]
  );

  const stepDelayMs = useMemo(() => {
    if (speed === 4) return 75;
    if (speed === 2) return 160;
    return 310;
  }, [speed]);

  const stepDelayRef = useRef(stepDelayMs);
  stepDelayRef.current = stepDelayMs;

  const applySnapshotRef = useRef(applySnapshot);
  applySnapshotRef.current = applySnapshot;

  const scheduleNextRunTick = useCallback(() => {
    stopTimer();
    runTimerRef.current = window.setTimeout(() => {
      if (!runnerRef.current) return;
      const nxt = runnerRef.current.next();
      if (nxt.done) {
        runnerRef.current = null;
        setExecStatus((s) => (s === 'RUNNING' ? 'COMPLETED' : s));
        return;
      }
      const shouldContinue = applySnapshotRef.current(nxt.value);
      if (shouldContinue) {
        scheduleNextRunTick();
      }
    }, stepDelayRef.current);
  }, [stopTimer]);

  const handleRun = useCallback(() => {
    if (execStatus === 'RUNNING') {
      stopTimer();
      setExecStatus('PAUSED_STEP');
      return;
    }

    if (execStatus === 'PAUSED_STEP' && runnerRef.current) {
      setExecStatus('RUNNING');
      scheduleNextRunTick();
      return;
    }

    // Fresh start
    stopTimer();
    setWorld(createInitialWorld(currentLevel));
    setErrorLine(undefined);
    setActiveLine(0);
    setLogs([]);
    setVariables([]);
    runnerRef.current = createPythonRunner(code, currentLevel);
    setExecStatus('RUNNING');

    // Execute first step immediately for crisp zero-latency response
    const first = runnerRef.current.next();
    if (!first.done) {
      const shouldContinue = applySnapshot(first.value);
      if (shouldContinue) {
        scheduleNextRunTick();
      }
    }
  }, [
    applySnapshot,
    code,
    currentLevel,
    execStatus,
    scheduleNextRunTick,
    stopTimer,
  ]);

  const handleStep = useCallback(() => {
    stopTimer();
    if (
      execStatus === 'IDLE' ||
      execStatus === 'COMPLETED' ||
      execStatus === 'ERROR' ||
      !runnerRef.current
    ) {
      setWorld(createInitialWorld(currentLevel));
      setErrorLine(undefined);
      setLogs([]);
      setVariables([]);
      runnerRef.current = createPythonRunner(code, currentLevel);
    }

    setExecStatus('PAUSED_STEP');
    const nxt = runnerRef.current.next();
    if (nxt.done) {
      runnerRef.current = null;
      setExecStatus('COMPLETED');
      return;
    }
    applySnapshot(nxt.value);
  }, [applySnapshot, code, currentLevel, execStatus, stopTimer]);

  const handleToggleMute = useCallback(() => {
    const next = sound.toggleMute();
    setMuted(next);
  }, []);

  const handleResetStarterCode = useCallback(() => {
    resetExecution(currentLevel);
    handleCodeChange(currentLevel.starterCode);
  }, [currentLevel, handleCodeChange, resetExecution]);

  const handleInsertSnippet = useCallback(
    (snippet: string) => {
      const trimmed = code.endsWith('\n') || code.length === 0 ? code : code + '\n';
      handleCodeChange(trimmed + snippet + '\n');
    },
    [code, handleCodeChange]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen === 'TITLE_MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setScreen('PLAYING');
        }
        return;
      }

      if (screen === 'LEVEL_SELECT') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setScreen(previousScreen);
        }
        return;
      }

      if (screen === 'PAUSED') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setScreen('PLAYING');
        }
        return;
      }

      if (screen === 'VICTORY') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setScreen('PLAYING');
        }
        return;
      }

      if (screen === 'PLAYING') {
        if (e.key === 'Escape') {
          e.preventDefault();
          stopTimer();
          if (execStatus === 'RUNNING') setExecStatus('PAUSED_STEP');
          setScreen('PAUSED');
          return;
        }
        if (e.key === 'F10') {
          e.preventDefault();
          handleStep();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleRun();
          return;
        }
        // Only trigger R reset when not typing in textarea
        const target = e.target as HTMLElement | null;
        const isTyping =
          target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT';
        if (!isTyping && (e.key === 'r' || e.key === 'R')) {
          e.preventDefault();
          resetExecution(currentLevel);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentLevel,
    execStatus,
    handleRun,
    handleStep,
    previousScreen,
    resetExecution,
    screen,
    stopTimer,
  ]);

  // Cleanup timer on unmount
  useEffect(() => () => stopTimer(), [stopTimer]);

  const campaignLevels = useMemo(() => LEVELS.filter((l) => !l.isSandbox), []);
  const totalStars = useMemo(
    () =>
      campaignLevels.reduce(
        (sum, lvl) => sum + (progress[lvl.id]?.stars ?? 0),
        0
      ),
    [campaignLevels, progress]
  );
  const maxStars = campaignLevels.length * 3;
  const hasContinue = useMemo(
    () => campaignLevels.some((l) => (progress[l.id]?.stars ?? 0) > 0),
    [campaignLevels, progress]
  );

  const currentIdx = LEVELS.findIndex((l) => l.id === currentLevel.id);
  const nextCampaignLevel =
    currentIdx >= 0 && currentIdx + 1 < LEVELS.length
      ? LEVELS[currentIdx + 1]
      : null;

  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        progress={progress}
        hasContinue={hasContinue}
        continueLevelNumber={currentLevel.number}
        muted={muted}
        onToggleMute={handleToggleMute}
        onStart={() => setScreen('PLAYING')}
        onSelectLevel={() => {
          setPreviousScreen('TITLE_MENU');
          setScreen('LEVEL_SELECT');
        }}
        onOpenSandbox={() => switchLevel('sandbox')}
      />
    );
  }

  const linesCount = countCodeLines(code);
  const remainingGems = Math.max(
    0,
    currentLevel.gems.length - world.collectedGems.length
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B111B] text-slate-100">
      {/* Compact Game HUD Header */}
      <header className="h-12 shrink-0 px-4 border-b border-slate-800/90 bg-[#0F1724] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              stopTimer();
              setScreen('TITLE_MENU');
            }}
            className="flex items-center gap-2 text-slate-100 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
            title="Return to Title Screen"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="2"
                width="48"
                height="48"
                rx="12"
                fill="#152033"
                stroke="#F59E0B"
                strokeWidth="2.5"
              />
              <path
                d="M15 35V17H26.5C30.6421 17 34 20.134 34 24C34 27.866 30.6421 31 26.5 31H21V35H15Z"
                fill="#F8FAFC"
              />
              <circle cx="26" cy="24" r="3" fill="#F59E0B" />
            </svg>
            <span className="font-display font-bold text-base tracking-tight whitespace-nowrap">
              PyTrail
            </span>
          </button>

          <span className="text-slate-700 select-none" aria-hidden="true">
            /
          </span>

          <button
            type="button"
            onClick={() => {
              setPreviousScreen('PLAYING');
              setScreen('LEVEL_SELECT');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#162133] border border-slate-800 hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors cursor-pointer min-w-0"
          >
            <span className="truncate">
              {currentLevel.isSandbox
                ? 'Free Lab · Sandbox Arena'
                : `Mission ${currentLevel.number} · ${currentLevel.title}`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 tabular-nums whitespace-nowrap">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>
              {totalStars}/{maxStars}
            </span>
          </div>

          {/* Speed Segmented Control */}
          <div
            role="group"
            aria-label="Simulation speed"
            className="flex items-center p-0.5 bg-[#0A1019] border border-slate-800 rounded-md"
          >
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 text-xs font-mono tabular-nums rounded transition-colors cursor-pointer whitespace-nowrap ${
                  speed === s
                    ? 'bg-slate-700 text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (!showHint) {
                setShowHint(true);
              } else if (hintIndex + 1 < currentLevel.hints.length) {
                setHintIndex((i) => i + 1);
              } else {
                setShowHint(false);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showHint
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#162133] border-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Hint</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="p-1.5 rounded-md bg-[#162133] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer shrink-0"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              stopTimer();
              if (execStatus === 'RUNNING') setExecStatus('PAUSED_STEP');
              setScreen('PAUSED');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-[#162133] border border-slate-800 rounded-md hover:text-white hover:border-slate-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pause</span>
          </button>
        </div>
      </header>

      {/* Main Split Arena & Code Cockpit */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left/Center Playfield (56%) */}
        <section className="relative flex-1 lg:w-[56%] min-h-[280px] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/90 bg-[#0B111B]">
          {/* Isolated 60fps Canvas */}
          <div className="relative flex-1 min-h-0">
            <ArenaCanvas
              level={currentLevel}
              world={world}
              lastEvent={lastEvent}
            />

            {/* Low-Occlusion Perimeter HUD Overlays (pointer-events: none, no backdrop-filter) */}
            <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between gap-3">
              <div className="px-2.5 py-1 rounded-md bg-[#0F1826]/95 border border-slate-800 text-xs font-mono text-slate-300 tabular-nums">
                Pos ({world.roverX}, {world.roverY}) · Facing {DIR_LABELS[world.roverDir]}
              </div>

              <div className="px-2.5 py-1 rounded-md bg-[#0F1826]/95 border border-slate-800 text-xs font-mono text-slate-300 tabular-nums flex items-center gap-3">
                <span>
                  Crystals{' '}
                  <strong className={remainingGems === 0 ? 'text-emerald-400' : 'text-amber-300'}>
                    {world.collectedGems.length}/{currentLevel.gems.length}
                  </strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>Steps {world.steps}</span>
                {currentLevel.maxEnergy && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span
                      className={
                        world.energyLeft <= 5 ? 'text-red-400' : 'text-slate-200'
                      }
                    >
                      Energy {world.energyLeft}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Crash / Hint Banner & Mission Objective Footer inside Playfield */}
          <div className="shrink-0 border-t border-slate-800/90 bg-[#0F1724] px-4 py-3 space-y-2">
            {world.crashed && world.crashReason && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-red-500/12 border border-red-500/40 text-xs text-red-200">
                <span>{world.crashReason}</span>
                <button
                  type="button"
                  onClick={() => resetExecution(currentLevel)}
                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-100 font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Reset Rover
                </button>
              </div>
            )}

            {showHint && currentLevel.hints.length > 0 && (
              <div className="flex items-start justify-between gap-3 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 leading-relaxed">
                <div>
                  <span className="font-semibold text-amber-300 mr-1.5">
                    Hint {hintIndex + 1}/{currentLevel.hints.length}:
                  </span>
                  {currentLevel.hints[hintIndex]}
                </div>
                {currentLevel.hints.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setHintIndex((i) => (i + 1) % currentLevel.hints.length)
                    }
                    className="text-amber-300 hover:text-amber-200 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Next Hint
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="min-w-0">
                <div className="text-xs text-slate-400">
                  {currentLevel.chapter} · {currentLevel.concept}
                </div>
                <p className="text-sm text-slate-100 font-medium leading-snug">
                  {currentLevel.objective}
                </p>
              </div>
              {!currentLevel.isSandbox && (
                <div className="text-xs font-mono text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                  Lines {linesCount}/{currentLevel.parLines} par
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentLevel.briefing}
            </p>
          </div>
        </section>

        {/* Right Code Cockpit (44%) */}
        <section className="lg:w-[44%] lg:min-w-[430px] h-[52vh] lg:h-auto min-h-0 flex flex-col bg-[#111927]">
          {/* Action Toolbar */}
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 bg-[#131C2B]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRun}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  execStatus === 'RUNNING'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50 hover:bg-amber-500/30'
                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                }`}
              >
                {execStatus === 'RUNNING' ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{execStatus === 'PAUSED_STEP' ? 'Continue' : 'Run'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStep}
                title="Step one line / action (F10)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Step</span>
              </button>

              <button
                type="button"
                onClick={() => resetExecution(currentLevel)}
                title="Reset rover position (R)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/70 border border-slate-700/80 rounded-md hover:text-white hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetStarterCode}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Restore Starter
            </button>
          </div>

          {/* Quick-Insert Command Snippets */}
          <div className="shrink-0 px-4 py-2 border-b border-slate-800/80 bg-[#0F1724] flex items-center gap-1.5 overflow-x-auto pytrail-scroll">
            <span className="text-[11px] text-slate-500 mr-1 whitespace-nowrap shrink-0">
              Insert:
            </span>
            {currentLevel.snippets.map((sn) => (
              <button
                key={sn.label}
                type="button"
                onClick={() => handleInsertSnippet(sn.insert)}
                className="px-2 py-1 text-xs font-mono text-sky-300 bg-[#162235] border border-slate-800 rounded hover:border-sky-500/50 hover:text-sky-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {sn.label}
              </button>
            ))}
          </div>

          {/* Python Code Editor */}
          <div className="flex-1 min-h-[160px] p-3 flex flex-col">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              activeLine={activeLine}
              errorLine={errorLine}
              disabled={execStatus === 'RUNNING'}
              onRunShortcut={handleRun}
            />
          </div>

          {/* Inspector & Console Panel */}
          <div className="h-48 shrink-0 border-t border-slate-800 bg-[#0D1420] flex flex-col">
            <div className="shrink-0 px-3 pt-2 border-b border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === 'variables'}
                  onClick={() => setInspectorTab('variables')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    inspectorTab === 'variables'
                      ? 'border-amber-400 text-white bg-[#131C2B]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Variable className="w-3.5 h-3.5" />
                  <span>Variables</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === 'console'}
                  onClick={() => setInspectorTab('console')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    inspectorTab === 'console'
                      ? 'border-amber-400 text-white bg-[#131C2B]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console</span>
                  {logs.length > 0 && (
                    <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                      ({logs.length})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === 'docs'}
                  onClick={() => setInspectorTab('docs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    inspectorTab === 'docs'
                      ? 'border-amber-400 text-white bg-[#131C2B]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Python Guide</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-500 tabular-nums whitespace-nowrap">
                {activeLine > 0 ? `Line ${activeLine}` : 'Ready'}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pytrail-scroll p-3 text-xs">
              {inspectorTab === 'variables' && (
                <>
                  {variables.length === 0 ? (
                    <p className="text-slate-500 leading-relaxed">
                      Press <strong className="text-slate-300">Run</strong> or{' '}
                      <strong className="text-slate-300">Step (F10)</strong> to watch
                      Python variables update live as each line runs.
                    </p>
                  ) : (
                    <table className="w-full font-mono text-left border-collapse tabular-nums">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800/80">
                          <th className="py-1 pr-3 font-medium">Name</th>
                          <th className="py-1 pr-3 font-medium">Value</th>
                          <th className="py-1 pr-3 font-medium">Type</th>
                          <th className="py-1 font-medium">Scope</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variables.map((v) => (
                          <tr
                            key={`${v.scope}-${v.name}`}
                            className="border-b border-slate-800/40"
                          >
                            <td className="py-1.5 pr-3 text-sky-300">{v.name}</td>
                            <td className="py-1.5 pr-3 text-amber-300">{v.value}</td>
                            <td className="py-1.5 pr-3 text-slate-400">{v.type}</td>
                            <td className="py-1.5 text-slate-500">{v.scope}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {inspectorTab === 'console' && (
                <div className="font-mono space-y-1.5">
                  {logs.length === 0 ? (
                    <p className="font-sans text-slate-500">
                      Output from print() and Python error messages will appear here.
                    </p>
                  ) : (
                    logs.map((entry) => (
                      <div
                        key={entry.id}
                        className={`leading-relaxed ${
                          entry.kind === 'error'
                            ? 'text-red-300'
                            : entry.kind === 'success'
                            ? 'text-emerald-300'
                            : entry.kind === 'info'
                            ? 'text-slate-400'
                            : 'text-slate-100'
                        }`}
                      >
                        {entry.line !== undefined && (
                          <span className="text-slate-500 mr-2 tabular-nums">
                            [L{entry.line}]
                          </span>
                        )}
                        <span>{entry.text}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {inspectorTab === 'docs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                  <div>
                    <div className="font-semibold text-slate-200 mb-1">
                      Rover Actions
                    </div>
                    <ul className="font-mono text-slate-400 space-y-0.5">
                      <li>
                        <span className="text-sky-300">move(n=1)</span> · forward n tiles
                      </li>
                      <li>
                        <span className="text-sky-300">turn_left()</span> /{' '}
                        <span className="text-sky-300">turn_right()</span>
                      </li>
                      <li>
                        <span className="text-sky-300">collect()</span> · grab crystal
                      </li>
                      <li>
                        <span className="text-sky-300">wait(n=1)</span> · pause 1 tick
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200 mb-1">
                      Sensors & Python
                    </div>
                    <ul className="font-mono text-slate-400 space-y-0.5">
                      <li>
                        <span className="text-sky-300">wall_ahead()</span>,{' '}
                        <span className="text-sky-300">wall_left()</span>,{' '}
                        <span className="text-sky-300">wall_right()</span>
                      </li>
                      <li>
                        <span className="text-sky-300">hazard_ahead()</span>,{' '}
                        <span className="text-sky-300">gem_here()</span>,{' '}
                        <span className="text-sky-300">at_goal()</span>
                      </li>
                      <li>
                        <span className="text-amber-300">for</span> i{' '}
                        <span className="text-amber-300">in</span> range(n): ·{' '}
                        <span className="text-amber-300">while</span> ·{' '}
                        <span className="text-amber-300">if</span> /{' '}
                        <span className="text-amber-300">def</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Game Shell Modals */}
      {screen === 'PAUSED' && (
        <PauseModal
          level={currentLevel}
          muted={muted}
          onToggleMute={handleToggleMute}
          onResume={() => setScreen('PLAYING')}
          onRestart={() => {
            resetExecution(currentLevel);
            setScreen('PLAYING');
          }}
          onLevelSelect={() => {
            setPreviousScreen('PLAYING');
            setScreen('LEVEL_SELECT');
          }}
          onReturnTitle={() => {
            stopTimer();
            setScreen('TITLE_MENU');
          }}
        />
      )}

      {screen === 'VICTORY' && victoryInfo && (
        <VictoryModal
          level={currentLevel}
          stars={victoryInfo.stars}
          linesUsed={victoryInfo.linesUsed}
          stepsTaken={victoryInfo.stepsTaken}
          hasNextLevel={Boolean(nextCampaignLevel)}
          onReplay={() => {
            resetExecution(currentLevel);
            setVictoryInfo(null);
            setScreen('PLAYING');
          }}
          onNextLevel={() => {
            if (nextCampaignLevel) {
              switchLevel(nextCampaignLevel.id);
            }
          }}
          onLevelSelect={() => {
            setPreviousScreen('PLAYING');
            setScreen('LEVEL_SELECT');
          }}
        />
      )}

      {screen === 'LEVEL_SELECT' && (
        <LevelSelectModal
          currentLevelId={currentLevel.id}
          progress={progress}
          onSelect={(id) => switchLevel(id)}
          onClose={() => setScreen(previousScreen)}
        />
      )}
    </div>
  );
}

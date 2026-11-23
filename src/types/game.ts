export type GameScreenState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'LEVEL_SELECT';

export type Direction = 0 | 1 | 2 | 3; // 0: North (-y), 1: East (+x), 2: South (+y), 3: West (-x)

export interface Point {
  x: number;
  y: number;
}

export interface GateDef {
  id: string;
  x: number;
  y: number;
  switchPos: Point;
}

export interface DroneDef {
  id: string;
  path: Point[];
  startIndex?: number;
}

export interface LevelDef {
  id: string;
  number: number;
  chapter: string;
  title: string;
  concept: string;
  objective: string;
  briefing: string;
  gridWidth: number;
  gridHeight: number;
  start: { x: number; y: number; dir: Direction };
  goal: Point;
  walls: Point[];
  gems: Point[];
  hazards: Point[];
  gates?: GateDef[];
  drones?: DroneDef[];
  maxEnergy?: number;
  parLines: number;
  starterCode: string;
  hints: string[];
  snippets: { label: string; insert: string }[];
  isSandbox?: boolean;
}

export interface RuntimeDrone {
  id: string;
  path: Point[];
  index: number;
  dir: 1 | -1;
  x: number;
  y: number;
}

export interface WorldState {
  roverX: number;
  roverY: number;
  roverDir: Direction;
  collectedGems: string[]; // "x,y" keys
  activatedSwitches: string[]; // "x,y" keys
  openGates: string[]; // gate IDs
  drones: RuntimeDrone[];
  steps: number;
  energyLeft: number;
  bumped: boolean;
  crashed: boolean;
  crashReason?: string;
  atGoal: boolean;
  tick: number;
}

export interface VariableEntry {
  name: string;
  value: string;
  type: string;
  scope: 'local' | 'global';
}

export interface ConsoleLine {
  id: string;
  kind: 'print' | 'info' | 'error' | 'success';
  text: string;
  line?: number;
}

export type ExecutionStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED_STEP'
  | 'COMPLETED'
  | 'ERROR';

export interface LevelProgress {
  stars: number; // 0-3
  bestLines?: number;
  savedCode?: string;
}

export type ProgressMap = Record<string, LevelProgress>;

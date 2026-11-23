import { Direction, LevelDef, Point, RuntimeDrone, WorldState } from '../types/game';

export const ptKey = (x: number, y: number): string => `${x},${y}`;

export const dirDelta = (dir: Direction): Point => {
  switch (dir) {
    case 0:
      return { x: 0, y: -1 };
    case 1:
      return { x: 1, y: 0 };
    case 2:
      return { x: 0, y: 1 };
    case 3:
      return { x: -1, y: 0 };
  }
};

export function createInitialWorld(level: LevelDef): WorldState {
  const drones: RuntimeDrone[] = (level.drones || []).map((d) => {
    const idx = d.startIndex ?? 0;
    const p = d.path[idx] || { x: 0, y: 0 };
    return {
      id: d.id,
      path: d.path,
      index: idx,
      dir: 1,
      x: p.x,
      y: p.y,
    };
  });

  const startAtGoal =
    level.start.x === level.goal.x && level.start.y === level.goal.y;

  return {
    roverX: level.start.x,
    roverY: level.start.y,
    roverDir: level.start.dir,
    collectedGems: [],
    activatedSwitches: [],
    openGates: [],
    drones,
    steps: 0,
    energyLeft: level.maxEnergy ?? 99,
    bumped: false,
    crashed: false,
    atGoal: startAtGoal,
    tick: 0,
  };
}

export function cloneWorld(w: WorldState): WorldState {
  return {
    ...w,
    collectedGems: [...w.collectedGems],
    activatedSwitches: [...w.activatedSwitches],
    openGates: [...w.openGates],
    drones: w.drones.map((d) => ({ ...d })),
  };
}

export function isWallOrClosedGate(
  x: number,
  y: number,
  world: WorldState,
  level: LevelDef
): boolean {
  if (x < 0 || y < 0 || x >= level.gridWidth || y >= level.gridHeight) {
    return true;
  }
  if (level.walls.some((w) => w.x === x && w.y === y)) {
    return true;
  }
  if (level.gates) {
    for (const gate of level.gates) {
      if (gate.x === x && gate.y === y && !world.openGates.includes(gate.id)) {
        return true;
      }
    }
  }
  return false;
}

export function isHazardAt(
  x: number,
  y: number,
  world: WorldState,
  level: LevelDef
): boolean {
  if (level.hazards.some((h) => h.x === x && h.y === y)) {
    return true;
  }
  if (world.drones.some((d) => d.x === x && d.y === y)) {
    return true;
  }
  return false;
}

function advanceDrones(world: WorldState) {
  for (const d of world.drones) {
    if (d.path.length <= 1) continue;
    let nextIdx = d.index + d.dir;
    if (nextIdx >= d.path.length) {
      d.dir = -1;
      nextIdx = d.index - 1;
    } else if (nextIdx < 0) {
      d.dir = 1;
      nextIdx = d.index + 1;
    }
    d.index = nextIdx;
    d.x = d.path[nextIdx].x;
    d.y = d.path[nextIdx].y;
  }
}

function checkSwitchAndGoal(world: WorldState, level: LevelDef): boolean {
  let switchTriggered = false;
  if (level.gates) {
    for (const gate of level.gates) {
      if (gate.switchPos.x === world.roverX && gate.switchPos.y === world.roverY) {
        const key = ptKey(gate.switchPos.x, gate.switchPos.y);
        if (!world.activatedSwitches.includes(key)) {
          world.activatedSwitches.push(key);
          world.openGates.push(gate.id);
          switchTriggered = true;
        }
      }
    }
  }
  world.atGoal =
    world.roverX === level.goal.x && world.roverY === level.goal.y;
  return switchTriggered;
}

export type ActionOutcome = {
  world: WorldState;
  event: 'move' | 'turn' | 'collect' | 'switch' | 'wait' | 'bump' | 'crash';
  message?: string;
};

export function performMove(world: WorldState, level: LevelDef): ActionOutcome {
  const next = cloneWorld(world);
  next.bumped = false;
  if (next.energyLeft <= 0) {
    next.crashed = true;
    next.crashReason = 'Battery depleted! Use fewer steps or tighter loops.';
    return { world: next, event: 'crash', message: next.crashReason };
  }

  const delta = dirDelta(next.roverDir);
  const tx = next.roverX + delta.x;
  const ty = next.roverY + delta.y;

  if (isWallOrClosedGate(tx, ty, next, level)) {
    next.bumped = true;
    next.crashed = true;
    next.crashReason = `Collision at (${tx}, ${ty}): obstacle or closed gate ahead.`;
    return { world: next, event: 'bump', message: next.crashReason };
  }

  next.roverX = tx;
  next.roverY = ty;
  next.steps += 1;
  next.tick += 1;
  next.energyLeft = Math.max(0, next.energyLeft - 1);

  // Check static hazard before drone step, and drone collision after drone step
  if (level.hazards.some((h) => h.x === tx && h.y === ty)) {
    next.crashed = true;
    next.crashReason = `Thermal hazard triggered at (${tx}, ${ty})!`;
    return { world: next, event: 'crash', message: next.crashReason };
  }

  // Also check if walked directly into current drone tile before it moves
  const droneBefore = next.drones.some((d) => d.x === tx && d.y === ty);
  advanceDrones(next);
  const droneAfter = next.drones.some((d) => d.x === tx && d.y === ty);

  if (droneBefore || droneAfter) {
    next.crashed = true;
    next.crashReason = `Intercepted by sentry drone at (${tx}, ${ty})! Use wait() to time crossings.`;
    return { world: next, event: 'crash', message: next.crashReason };
  }

  const switched = checkSwitchAndGoal(next, level);
  return {
    world: next,
    event: switched ? 'switch' : 'move',
    message: switched ? 'Power switch activated — laser gate opened!' : undefined,
  };
}

export function performTurn(
  world: WorldState,
  _level: LevelDef,
  deltaDir: -1 | 1
): ActionOutcome {
  const next = cloneWorld(world);
  next.bumped = false;
  if (next.energyLeft <= 0) {
    next.crashed = true;
    next.crashReason = 'Battery depleted!';
    return { world: next, event: 'crash', message: next.crashReason };
  }
  next.roverDir = (((next.roverDir + deltaDir) % 4 + 4) % 4) as Direction;
  next.steps += 1;
  next.energyLeft = Math.max(0, next.energyLeft - 1);
  return { world: next, event: 'turn' };
}

export function performCollect(world: WorldState, level: LevelDef): ActionOutcome {
  const next = cloneWorld(world);
  next.bumped = false;
  const key = ptKey(next.roverX, next.roverY);
  const hasGem = level.gems.some((g) => g.x === next.roverX && g.y === next.roverY);

  if (hasGem && !next.collectedGems.includes(key)) {
    next.collectedGems.push(key);
    next.steps += 1;
    return { world: next, event: 'collect', message: 'Collected energy crystal.' };
  }
  return { world: next, event: 'wait', message: 'No crystal on this tile.' };
}

export function performWait(world: WorldState, level: LevelDef): ActionOutcome {
  const next = cloneWorld(world);
  next.bumped = false;
  if (next.energyLeft <= 0) {
    next.crashed = true;
    next.crashReason = 'Battery depleted!';
    return { world: next, event: 'crash', message: next.crashReason };
  }
  next.steps += 1;
  next.tick += 1;
  next.energyLeft = Math.max(0, next.energyLeft - 1);
  advanceDrones(next);

  if (next.drones.some((d) => d.x === next.roverX && d.y === next.roverY)) {
    next.crashed = true;
    next.crashReason = `Sentry drone collided with Aurora at (${next.roverX}, ${next.roverY})!`;
    return { world: next, event: 'crash', message: next.crashReason };
  }
  checkSwitchAndGoal(next, level);
  return { world: next, event: 'wait' };
}

export function checkWinCondition(world: WorldState, level: LevelDef): boolean {
  if (level.isSandbox) return false;
  if (world.crashed) return false;
  const allGems = level.gems.every((g) =>
    world.collectedGems.includes(ptKey(g.x, g.y))
  );
  return world.atGoal && allGems;
}

export function sensorWallInRelDir(
  world: WorldState,
  level: LevelDef,
  offset: -1 | 0 | 1
): boolean {
  const d = (((world.roverDir + offset) % 4 + 4) % 4) as Direction;
  const delta = dirDelta(d);
  return isWallOrClosedGate(
    world.roverX + delta.x,
    world.roverY + delta.y,
    world,
    level
  );
}

export function sensorHazardAhead(world: WorldState, level: LevelDef): boolean {
  const delta = dirDelta(world.roverDir);
  const tx = world.roverX + delta.x;
  const ty = world.roverY + delta.y;
  if (level.hazards.some((h) => h.x === tx && h.y === ty)) return true;
  if (world.drones.some((d) => d.x === tx && d.y === ty)) return true;
  return false;
}

export function sensorGemHere(world: WorldState, level: LevelDef): boolean {
  const key = ptKey(world.roverX, world.roverY);
  return (
    level.gems.some((g) => g.x === world.roverX && g.y === world.roverY) &&
    !world.collectedGems.includes(key)
  );
}

export function sensorSwitchHere(world: WorldState, level: LevelDef): boolean {
  if (!level.gates) return false;
  const key = ptKey(world.roverX, world.roverY);
  return (
    level.gates.some(
      (g) => g.switchPos.x === world.roverX && g.switchPos.y === world.roverY
    ) && !world.activatedSwitches.includes(key)
  );
}

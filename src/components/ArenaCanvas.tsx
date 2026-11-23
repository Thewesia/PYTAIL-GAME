import React, { useEffect, useRef } from 'react';
import { LevelDef, WorldState } from '../types/game';
import { ptKey } from '../engine/worldSim';

interface ArenaCanvasProps {
  level: LevelDef;
  world: WorldState;
  lastEvent?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

function dirToAngle(dir: number): number {
  // 0: North (-PI/2), 1: East (0), 2: South (PI/2), 3: West (PI)
  return (dir - 1) * (Math.PI / 2);
}

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  level,
  world,
  lastEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const levelRef = useRef(level);
  const worldRef = useRef(world);

  const animRef = useRef({
    roverX: world.roverX,
    roverY: world.roverY,
    roverAngle: dirToAngle(world.roverDir),
    drones: world.drones.map((d) => ({ id: d.id, x: d.x, y: d.y })),
    squash: 0,
    shake: 0,
    hitFlash: 0,
    hitstop: 0,
    particles: [] as Particle[],
    treadTrail: [] as { x: number; y: number; alpha: number }[],
    prevCollectedCount: world.collectedGems.length,
    prevSwitchCount: world.activatedSwitches.length,
    prevCrashed: world.crashed,
    prevAtGoal: world.atGoal,
    prevLevelId: level.id,
  });

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const prevWorld = worldRef.current;
    worldRef.current = world;
    const anim = animRef.current;

    if (anim.prevLevelId !== level.id || (world.steps === 0 && prevWorld.steps > 0)) {
      anim.roverX = world.roverX;
      anim.roverY = world.roverY;
      anim.roverAngle = dirToAngle(world.roverDir);
      anim.drones = world.drones.map((d) => ({ id: d.id, x: d.x, y: d.y }));
      anim.squash = 0;
      anim.shake = 0;
      anim.hitFlash = 0;
      anim.hitstop = 0;
      anim.particles = [];
      anim.treadTrail = [];
      anim.prevCollectedCount = world.collectedGems.length;
      anim.prevSwitchCount = world.activatedSwitches.length;
      anim.prevCrashed = world.crashed;
      anim.prevAtGoal = world.atGoal;
      anim.prevLevelId = level.id;
      return;
    }

    // Tread mark when moving
    if (prevWorld.roverX !== world.roverX || prevWorld.roverY !== world.roverY) {
      anim.treadTrail.push({ x: prevWorld.roverX, y: prevWorld.roverY, alpha: 0.45 });
      if (anim.treadTrail.length > 24) anim.treadTrail.shift();
      anim.squash = 0.14;
    }

    // Spawn particles on gem pickup
    if (world.collectedGems.length > anim.prevCollectedCount) {
      for (let i = 0; i < 16; i++) {
        const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
        const spd = 1.4 + Math.random() * 2.4;
        anim.particles.push({
          x: world.roverX + 0.5,
          y: world.roverY + 0.5,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.55 + Math.random() * 0.25,
          maxLife: 0.8,
          size: 3 + Math.random() * 3,
          color: i % 2 === 0 ? '#FBBF24' : '#FDE68A',
        });
      }
      anim.squash = 0.22;
    }
    anim.prevCollectedCount = world.collectedGems.length;

    // Spawn particles on switch activation
    if (world.activatedSwitches.length > anim.prevSwitchCount) {
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 1.6 + Math.random() * 1.8;
        anim.particles.push({
          x: world.roverX + 0.5,
          y: world.roverY + 0.5,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.5,
          maxLife: 0.5,
          size: 3,
          color: '#38BDF8',
        });
      }
    }
    anim.prevSwitchCount = world.activatedSwitches.length;

    // Collision / Crash impact feedback
    if (world.crashed && !anim.prevCrashed) {
      anim.shake = 10;
      anim.hitFlash = 1;
      anim.hitstop = 0.055; // 55ms impact freeze
      anim.squash = -0.25;
      for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 3.2;
        anim.particles.push({
          x: world.roverX + 0.5,
          y: world.roverY + 0.5,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.7,
          size: 3 + Math.random() * 3,
          color: i % 2 === 0 ? '#EF4444' : '#F59E0B',
        });
      }
    }
    anim.prevCrashed = world.crashed;

    // Goal celebration burst
    if (world.atGoal && !anim.prevAtGoal && !world.crashed) {
      for (let i = 0; i < 20; i++) {
        const ang = (Math.PI * 2 * i) / 20;
        const spd = 1.5 + Math.random() * 2.5;
        anim.particles.push({
          x: world.roverX + 0.5,
          y: world.roverY + 0.5,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.65,
          maxLife: 0.65,
          size: 3.5,
          color: i % 2 === 0 ? '#10B981' : '#6EE7B7',
        });
      }
    }
    anim.prevAtGoal = world.atGoal;
  }, [world, level.id, lastEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const lvl = levelRef.current;
      const w = worldRef.current;
      const anim = animRef.current;

      if (anim.hitstop > 0) {
        anim.hitstop = Math.max(0, anim.hitstop - dt);
      } else {
        const smooth = 1 - Math.exp(-16 * dt);
        anim.roverX = lerp(anim.roverX, w.roverX, smooth);
        anim.roverY = lerp(anim.roverY, w.roverY, smooth);
        anim.roverAngle = lerpAngle(
          anim.roverAngle,
          dirToAngle(w.roverDir),
          1 - Math.exp(-18 * dt)
        );

        // Sync drones
        if (anim.drones.length !== w.drones.length) {
          anim.drones = w.drones.map((d) => ({ id: d.id, x: d.x, y: d.y }));
        } else {
          for (let i = 0; i < w.drones.length; i++) {
            anim.drones[i].x = lerp(anim.drones[i].x, w.drones[i].x, smooth);
            anim.drones[i].y = lerp(anim.drones[i].y, w.drones[i].y, smooth);
          }
        }

        anim.squash = lerp(anim.squash, 0, 1 - Math.exp(-12 * dt));
        anim.hitFlash = Math.max(0, anim.hitFlash - dt * 3.2);
        anim.shake = Math.max(0, anim.shake - dt * 28);

        for (let i = anim.treadTrail.length - 1; i >= 0; i--) {
          anim.treadTrail[i].alpha -= dt * 0.25;
          if (anim.treadTrail[i].alpha <= 0) anim.treadTrail.splice(i, 1);
        }

        for (let i = anim.particles.length - 1; i >= 0; i--) {
          const p = anim.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.life -= dt;
          if (p.life <= 0) anim.particles.splice(i, 1);
        }
      }

      // --- Render ---
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Subtle radial slate vignette background
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, '#131D2E');
      bgGrad.addColorStop(1, '#0B111B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Compute square tile size & centered grid origin
      const padX = 56;
      const padTop = 58;
      const padBottom = 68;
      const availW = Math.max(120, width - padX * 2);
      const availH = Math.max(120, height - padTop - padBottom);
      const tileSize = Math.floor(
        Math.min(availW / lvl.gridWidth, availH / lvl.gridHeight, 76)
      );
      const boardW = tileSize * lvl.gridWidth;
      const boardH = tileSize * lvl.gridHeight;

      const shakeX = anim.shake > 0 ? (Math.random() - 0.5) * anim.shake : 0;
      const shakeY = anim.shake > 0 ? (Math.random() - 0.5) * anim.shake : 0;
      const originX = Math.floor((width - boardW) / 2 + shakeX);
      const originY = Math.floor(padTop + (availH - boardH) / 2 + shakeY);

      // Board subtle outer blueprint frame
      ctx.fillStyle = '#0F1826';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      roundRect(ctx, originX - 8, originY - 8, boardW + 16, boardH + 16, 12);
      ctx.fill();
      ctx.stroke();

      // Coordinate axis labels (teaches (x, y) coordinates!)
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let x = 0; x < lvl.gridWidth; x++) {
        ctx.fillText(
          String(x),
          originX + x * tileSize + tileSize / 2,
          originY - 20
        );
      }
      ctx.textAlign = 'right';
      for (let y = 0; y < lvl.gridHeight; y++) {
        ctx.fillText(
          String(y),
          originX - 18,
          originY + y * tileSize + tileSize / 2
        );
      }

      const timeSec = now / 1000;

      // Draw grid tiles
      for (let y = 0; y < lvl.gridHeight; y++) {
        for (let x = 0; x < lvl.gridWidth; x++) {
          const tx = originX + x * tileSize;
          const ty = originY + y * tileSize;
          const inset = 2;
          const isEven = (x + y) % 2 === 0;

          ctx.fillStyle = isEven ? '#162235' : '#131E2F';
          roundRect(
            ctx,
            tx + inset,
            ty + inset,
            tileSize - inset * 2,
            tileSize - inset * 2,
            6
          );
          ctx.fill();

          ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw Tread Trail
      for (const tr of anim.treadTrail) {
        const cx = originX + (tr.x + 0.5) * tileSize;
        const cy = originY + (tr.y + 0.5) * tileSize;
        ctx.fillStyle = `rgba(245, 158, 11, ${tr.alpha * 0.28})`;
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Power Conduits (switch -> gate)
      if (lvl.gates) {
        for (const gate of lvl.gates) {
          const sx = originX + (gate.switchPos.x + 0.5) * tileSize;
          const sy = originY + (gate.switchPos.y + 0.5) * tileSize;
          const gx = originX + (gate.x + 0.5) * tileSize;
          const gy = originY + (gate.y + 0.5) * tileSize;
          const isOpen = w.openGates.includes(gate.id);

          ctx.save();
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -timeSec * 18;
          ctx.strokeStyle = isOpen
            ? 'rgba(16, 185, 129, 0.45)'
            : 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(gx, gy);
          ctx.stroke();
          ctx.restore();

          // Switch plate
          const swActive = w.activatedSwitches.includes(
            ptKey(gate.switchPos.x, gate.switchPos.y)
          );
          const swSize = tileSize * 0.52;
          ctx.fillStyle = swActive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.16)';
          ctx.strokeStyle = swActive ? '#10B981' : '#38BDF8';
          ctx.lineWidth = 2;
          roundRect(ctx, sx - swSize / 2, sy - swSize / 2, swSize, swSize, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = swActive ? '#34D399' : '#7DD3FC';
          ctx.beginPath();
          ctx.arc(sx, sy, tileSize * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Thermal Hazards
      for (const h of lvl.hazards) {
        const hx = originX + h.x * tileSize;
        const hy = originY + h.y * tileSize;
        const pad = tileSize * 0.14;
        const pulse = 0.65 + 0.35 * Math.sin(timeSec * 4 + h.x);

        ctx.fillStyle = `rgba(239, 68, 68, ${0.14 + pulse * 0.1})`;
        roundRect(
          ctx,
          hx + pad,
          hy + pad,
          tileSize - pad * 2,
          tileSize - pad * 2,
          6
        );
        ctx.fill();

        ctx.strokeStyle = `rgba(239, 68, 68, ${0.65 + pulse * 0.25})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Caution X mark
        const cx = hx + tileSize / 2;
        const cy = hy + tileSize / 2;
        const r = tileSize * 0.16;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx - r, cy + r);
        ctx.stroke();
      }

      // Draw Goal Beacon
      {
        const gx = originX + (lvl.goal.x + 0.5) * tileSize;
        const gy = originY + (lvl.goal.y + 0.5) * tileSize;
        const pulse = (timeSec * 0.9) % 1;

        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.beginPath();
        ctx.arc(gx, gy, tileSize * 0.34, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(16, 185, 129, ${1 - pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gx, gy, tileSize * (0.2 + pulse * 0.22), 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(gx, gy, tileSize * 0.22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(gx, gy, tileSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Walls
      for (const wall of lvl.walls) {
        const wx = originX + wall.x * tileSize;
        const wy = originY + wall.y * tileSize;
        const p = 3;
        const s = tileSize - p * 2;

        // Base shadow
        ctx.fillStyle = '#090E17';
        roundRect(ctx, wx + p, wy + p + 2, s, s, 6);
        ctx.fill();

        // Top block face
        ctx.fillStyle = '#273549';
        roundRect(ctx, wx + p, wy + p, s, s - 2, 6);
        ctx.fill();

        ctx.strokeStyle = '#3B4E6B';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Subtle inner bevel line
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        roundRect(ctx, wx + p + 4, wy + p + 4, s - 8, s - 10, 3);
        ctx.stroke();
      }

      // Draw Laser Gates
      if (lvl.gates) {
        for (const gate of lvl.gates) {
          const isOpen = w.openGates.includes(gate.id);
          const gx = originX + gate.x * tileSize;
          const gy = originY + gate.y * tileSize;
          const cy = gy + tileSize / 2;

          // Gate emitters top/bottom
          ctx.fillStyle = isOpen ? '#10B981' : '#EF4444';
          ctx.fillRect(gx + tileSize * 0.4, gy + 3, tileSize * 0.2, 5);
          ctx.fillRect(gx + tileSize * 0.4, gy + tileSize - 8, tileSize * 0.2, 5);

          if (!isOpen) {
            const flicker = 0.7 + 0.3 * Math.sin(timeSec * 14);
            ctx.strokeStyle = `rgba(239, 68, 68, ${flicker})`;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(gx + tileSize * 0.5, gy + 8);
            ctx.lineTo(gx + tileSize * 0.5, gy + tileSize - 8);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(254, 202, 202, 0.85)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(gx + tileSize * 0.5, gy + 8);
            ctx.lineTo(gx + tileSize * 0.5, gy + tileSize - 8);
            ctx.stroke();
          } else {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(gx + tileSize * 0.5, gy + 8);
            ctx.lineTo(gx + tileSize * 0.5, cy * 2 - gy - 8);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Draw Energy Crystals (Gems)
      for (const gem of lvl.gems) {
        if (w.collectedGems.includes(ptKey(gem.x, gem.y))) continue;
        const cx = originX + (gem.x + 0.5) * tileSize;
        const bob = Math.sin(timeSec * 3.2 + gem.x) * (tileSize * 0.04);
        const cy = originY + (gem.y + 0.5) * tileSize + bob;
        const r = tileSize * 0.24;

        ctx.save();
        ctx.translate(cx, cy);

        // Soft aura
        ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // Faceted diamond crystal
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.78, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.78, 0);
        ctx.closePath();
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.strokeStyle = '#FDE68A';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight facet
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.78, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(254, 243, 199, 0.45)';
        ctx.fill();

        ctx.restore();
      }

      // Draw Patrol Drones
      for (let i = 0; i < anim.drones.length; i++) {
        const d = anim.drones[i];
        const runtimeD = w.drones[i];
        const dx = originX + (d.x + 0.5) * tileSize;
        const dy = originY + (d.y + 0.5) * tileSize;

        // Draw faint patrol rail
        if (runtimeD && runtimeD.path.length > 1) {
          ctx.save();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.18)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          runtimeD.path.forEach((pt, idx) => {
            const px = originX + (pt.x + 0.5) * tileSize;
            const py = originY + (pt.y + 0.5) * tileSize;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(dx, dy);
        const dr = tileSize * 0.27;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, dr * 1.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, dr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Scanner eye
        ctx.fillStyle = '#FCA5A5';
        ctx.beginPath();
        ctx.arc(0, 0, dr * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Aurora Rover
      {
        const rx = originX + (anim.roverX + 0.5) * tileSize;
        const ry = originY + (anim.roverY + 0.5) * tileSize;
        const s = tileSize * 0.34;

        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(anim.roverAngle);

        const sx = 1 + anim.squash * 0.28;
        const sy = 1 - anim.squash * 0.22;
        ctx.scale(sx, sy);

        // Directional sensor cone ahead
        const beamGrad = ctx.createLinearGradient(s * 0.5, 0, s * 2.2, 0);
        beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
        beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(s * 0.4, -s * 0.22);
        ctx.lineTo(s * 2.1, -s * 0.72);
        ctx.lineTo(s * 2.1, s * 0.72);
        ctx.lineTo(s * 0.4, s * 0.22);
        ctx.closePath();
        ctx.fill();

        // Treads
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        roundRect(ctx, -s * 0.86, -s * 0.88, s * 1.72, s * 0.38, 4);
        ctx.fill();
        ctx.stroke();
        roundRect(ctx, -s * 0.86, s * 0.5, s * 1.72, s * 0.38, 4);
        ctx.fill();
        ctx.stroke();

        // Main rover chassis
        ctx.fillStyle = anim.hitFlash > 0.2 ? '#EF4444' : '#334155';
        ctx.strokeStyle = w.crashed ? '#F87171' : '#94A3B8';
        ctx.lineWidth = 1.8;
        roundRect(ctx, -s * 0.72, -s * 0.64, s * 1.44, s * 1.28, 6);
        ctx.fill();
        ctx.stroke();

        // Amber optical visor (front / +x direction)
        ctx.fillStyle = w.crashed ? '#FCA5A5' : '#F59E0B';
        roundRect(ctx, s * 0.28, -s * 0.42, s * 0.36, s * 0.84, 3);
        ctx.fill();

        // Status core dot
        ctx.fillStyle = w.atGoal ? '#10B981' : w.crashed ? '#EF4444' : '#FBBF24';
        ctx.beginPath();
        ctx.arc(-s * 0.18, 0, s * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Particles
      for (const p of anim.particles) {
        const px = originX + p.x * tileSize;
        const py = originY + p.y * tileSize;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

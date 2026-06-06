import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TILE_SIZE, TILE_COLORS, TILE_ICONS, getTile, isTileWalkable, getInteractableAt, Interactable,
} from "./world";
import { PlayerEntity, MonsterEntity, NpcEntity, createMonsters, NPCS, Direction } from "./entities";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FloatText {
  id: number;
  x: number; y: number;
  text: string;
  color: string;
  created: number;
  scale?: number;
  wobble?: boolean;
}

interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;        // 0–1
  maxLife: number;
  color: string;
  size: number;
  shape: "circle" | "star" | "spark" | "ring" | "square";
  gravity?: number;
  rotation?: number;
  rotSpeed?: number;
  glow?: boolean;
}

interface SkillEffect {
  id: number;
  type: string;          // "fireball" | "ice_spike" | "thunder" | "slash" | "shield_bash" | "arrow_shot" | "multi_shot" | "poison_arrow" | "hit" | "enemy_hit"
  x: number; y: number;
  tx?: number; ty?: number;  // target position (for projectiles)
  progress: number;      // 0–1
  duration: number;      // ms
  created: number;
  data?: Record<string, unknown>;
}

interface CombatReward {
  exp: number;
  gold: number;
  itemName?: string;
}

export interface CombatResult {
  monsterUid: string;
  reward: CombatReward;
  questMonsterId: string;
}

interface Skill {
  id: string; name: string; icon: string; mpCost: number; damage: number;
}

interface Props {
  playerName: string;
  playerClass: string;
  playerLevel: number;
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  playerAttack: number;
  playerDefense: number;
  skills: Skill[];
  inventory: { id: string; name: string; type: string; icon: string; effect?: { hp?: number; mp?: number }; quantity: number }[];
  onInteract: (type: Interactable["type"]) => void;
  onPlayerDamaged: (dmg: number) => void;
  onPlayerDied: () => void;
  onMpUsed: (mp: number) => void;
  onItemUsed: (itemId: string) => void;
  onMonsterKilled: (result: CombatResult) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const VIEWPORT_W = 15;
const VIEWPORT_H = 13;
const MOVE_COOLDOWN = 130;
const ATTACK_RANGE = TILE_SIZE * 1.8;
const AGGRO_RANGE = TILE_SIZE * 4;
const PLAYER_ATTACK_COOLDOWN = 700;
const ENEMY_ATTACK_INTERVAL = 1600;

const CLASS_COLORS: Record<string, string> = { warrior: "#e74c3c", mage: "#9b59b6", archer: "#27ae60" };
const CLASS_ICONS: Record<string, string> = { warrior: "⚔️", mage: "🔮", archer: "🏹" };

let floatId = 0;
let particleId = 0;
let effectId = 0;

// ─── Particle helpers ─────────────────────────────────────────────────────────
function burst(
  particles: Particle[],
  x: number, y: number,
  count: number,
  color: string,
  opts: Partial<Particle> & { spread?: number; speed?: number } = {}
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = (opts.speed ?? 2) * (0.6 + Math.random() * 0.8);
    particles.push({
      id: particleId++,
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1,
      maxLife: opts.maxLife ?? 0.7 + Math.random() * 0.5,
      color: opts.color ?? color,
      size: opts.size ?? 3 + Math.random() * 3,
      shape: opts.shape ?? "circle",
      gravity: opts.gravity ?? 0,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      glow: opts.glow,
    });
  }
}

function sparks(particles: Particle[], x: number, y: number, color: string, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 4;
    particles.push({
      id: particleId++, x, y,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
      life: 1, maxLife: 0.3 + Math.random() * 0.3,
      color, size: 1.5 + Math.random() * 2, shape: "spark",
      gravity: 0.12, rotation: angle, rotSpeed: 0,
    });
  }
}

function ringBurst(particles: Particle[], x: number, y: number, color: string) {
  particles.push({
    id: particleId++, x, y, vx: 0, vy: 0,
    life: 1, maxLife: 0.5,
    color, size: 20, shape: "ring",
    gravity: 0, rotation: 0, rotSpeed: 0,
  });
}

// ─── Skill effect spawner ─────────────────────────────────────────────────────
function spawnSkillEffect(
  effects: SkillEffect[],
  particles: Particle[],
  skillId: string,
  px: number, py: number,
  tx: number, ty: number
) {
  const id = effectId++;
  const now = performance.now();

  switch (skillId) {
    // ── WARRIOR ──────────────────────────────────────────────────
    case "slash": {
      effects.push({ id, type: "slash", x: tx, y: ty, progress: 0, duration: 350, created: now });
      burst(particles, tx, ty, 12, "#ff6622", { speed: 3, size: 4, shape: "spark", glow: true });
      sparks(particles, tx, ty, "#ffaa44", 10);
      ringBurst(particles, tx, ty, "#ff442233");
      break;
    }
    case "shield_bash": {
      effects.push({ id, type: "shield_bash", x: tx, y: ty, progress: 0, duration: 400, created: now });
      burst(particles, tx, ty, 16, "#aaddff", { speed: 2.5, shape: "square", size: 5, glow: true });
      burst(particles, tx, ty, 8, "#ffffff", { speed: 4, shape: "spark" });
      break;
    }
    case "battle_cry": {
      effects.push({ id, type: "battle_cry", x: px, y: py, progress: 0, duration: 800, created: now });
      burst(particles, px, py, 20, "#ffcc00", { speed: 2, shape: "star", size: 6, glow: true, maxLife: 1 });
      burst(particles, px, py, 15, "#ff8800", { speed: 3.5, shape: "spark" });
      break;
    }
    // ── MAGE ─────────────────────────────────────────────────────
    case "fireball": {
      effects.push({ id, type: "fireball", x: px, y: py, tx, ty, progress: 0, duration: 300, created: now });
      // explosion spawned on arrival (handled in draw loop via progress)
      break;
    }
    case "ice_spike": {
      effects.push({ id, type: "ice_spike", x: tx, y: ty, progress: 0, duration: 500, created: now });
      burst(particles, tx, ty, 14, "#88eeff", { speed: 2.5, shape: "square", size: 4, glow: true });
      burst(particles, tx, ty, 8, "#ffffff", { speed: 4, shape: "spark", maxLife: 0.4 });
      sparks(particles, tx, ty, "#aaddff", 12);
      break;
    }
    case "thunder": {
      effects.push({ id, type: "thunder", x: tx, y: ty, progress: 0, duration: 600, created: now });
      burst(particles, tx, ty, 24, "#ffff44", { speed: 5, shape: "spark", glow: true, maxLife: 0.5 });
      burst(particles, tx, ty, 16, "#88aaff", { speed: 3, shape: "circle", glow: true });
      ringBurst(particles, tx, ty, "#ffff4488");
      ringBurst(particles, tx, ty, "#ffff4444");
      break;
    }
    // ── ARCHER ───────────────────────────────────────────────────
    case "arrow_shot": {
      effects.push({ id, type: "arrow_shot", x: px, y: py, tx, ty, progress: 0, duration: 200, created: now });
      break;
    }
    case "multi_shot": {
      for (let i = -1; i <= 1; i++) {
        const offX = ty !== py ? i * 12 : 0;
        const offY = tx !== px ? i * 12 : 0;
        effects.push({ id: effectId++, type: "arrow_shot", x: px, y: py, tx: tx + offX, ty: ty + offY, progress: 0, duration: 200 + Math.abs(i) * 40, created: now });
      }
      burst(particles, tx, ty, 10, "#44ff88", { speed: 3, shape: "spark", glow: true });
      break;
    }
    case "poison_arrow": {
      effects.push({ id, type: "poison_arrow", x: px, y: py, tx, ty, progress: 0, duration: 250, created: now });
      // Poison cloud on hit
      effects.push({ id: effectId++, type: "poison_cloud", x: tx, y: ty, progress: 0, duration: 800, created: now + 250 });
      burst(particles, tx, ty, 12, "#88ff44", { speed: 2, shape: "circle", size: 5, glow: true, maxLife: 1.2 });
      break;
    }
    // ── GENERIC HIT ──────────────────────────────────────────────
    default: {
      effects.push({ id, type: "hit", x: tx, y: ty, progress: 0, duration: 250, created: now });
      burst(particles, tx, ty, 8, "#ffe066", { speed: 2.5, shape: "spark" });
      break;
    }
  }
}

// ─── Canvas draw helpers for skill effects ────────────────────────────────────
function drawSkillEffect(ctx: CanvasRenderingContext2D, ef: SkillEffect, camX: number, camY: number, now: number) {
  const t = ef.progress; // 0–1
  const sx = (ef.x / TILE_SIZE - camX) * TILE_SIZE + TILE_SIZE / 2;
  const sy = (ef.y / TILE_SIZE - camY) * TILE_SIZE + TILE_SIZE / 2;
  const txs = ef.tx !== undefined ? (ef.tx / TILE_SIZE - camX) * TILE_SIZE + TILE_SIZE / 2 : sx;
  const tys = ef.ty !== undefined ? (ef.ty / TILE_SIZE - camY) * TILE_SIZE + TILE_SIZE / 2 : sy;

  ctx.save();

  switch (ef.type) {
    case "slash": {
      // 3 arc slashes radiating outward
      const alpha = t < 0.5 ? t * 2 : (1 - t) * 2;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 4 + (i * Math.PI / 8) + t * Math.PI * 0.5;
        const r = 12 + t * 20;
        ctx.strokeStyle = i === 1 ? "#ff6622" : "#ffaa44";
        ctx.lineWidth = (3 - i) * 2.5 * (1 - t * 0.5);
        ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sx, sy, r, ang - 0.6, ang + 0.6);
        ctx.stroke();
      }
      // Cross flash
      if (t < 0.3) {
        ctx.globalAlpha = (0.3 - t) / 0.3;
        ctx.fillStyle = "#ffaa44";
        ctx.shadowBlur = 20; ctx.shadowColor = "#ff6600";
        ctx.fillRect(sx - 2, sy - 18 * (1 - t), 4, 36 * (1 - t));
        ctx.fillRect(sx - 18 * (1 - t), sy - 2, 36 * (1 - t), 4);
      }
      break;
    }
    case "shield_bash": {
      const alpha = t < 0.5 ? 1 : (1 - t) * 2;
      ctx.globalAlpha = alpha;
      // Shockwave ring
      const r2 = t * 35;
      ctx.strokeStyle = "#aaddff";
      ctx.lineWidth = (1 - t) * 8;
      ctx.shadowColor = "#55aaff"; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(sx, sy, r2, 0, Math.PI * 2); ctx.stroke();
      // Star burst
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.5;
        const inner = 8; const outer = 8 + t * 22;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * inner, sy + Math.sin(a) * inner);
        ctx.lineTo(sx + Math.cos(a) * outer, sy + Math.sin(a) * outer);
        ctx.stroke();
      }
      break;
    }
    case "battle_cry": {
      // Expanding golden rings
      const alpha2 = (1 - t);
      for (let ring = 0; ring < 3; ring++) {
        const rt = Math.max(0, t - ring * 0.15);
        const r3 = rt * 50;
        ctx.globalAlpha = (1 - rt) * alpha2 * 0.7;
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 3 - ring;
        ctx.shadowColor = "#ff8800"; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(sx, sy, r3, 0, Math.PI * 2); ctx.stroke();
      }
      // ⚔️ flash
      if (t < 0.4) {
        ctx.globalAlpha = (0.4 - t) / 0.4;
        ctx.font = `${20 + t * 20}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⚔️", sx, sy - t * 20);
      }
      break;
    }
    case "fireball": {
      // Projectile
      const bx = sx + (txs - sx) * t;
      const by = sy + (tys - sy) * t;
      // Trail
      for (let i = 1; i <= 5; i++) {
        const trail = t - i * 0.06;
        if (trail < 0) continue;
        const tx2 = sx + (txs - sx) * trail;
        const ty2 = sy + (tys - sy) * trail;
        ctx.globalAlpha = (1 - i / 5) * 0.5;
        ctx.fillStyle = i < 3 ? "#ff4400" : "#ff8800";
        ctx.shadowColor = "#ff6600"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(tx2, ty2, 10 - i * 1.5, 0, Math.PI * 2); ctx.fill();
      }
      // Ball
      ctx.globalAlpha = 1;
      const gr = ctx.createRadialGradient(bx, by, 2, bx, by, 14);
      gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.3, "#ffee00"); gr.addColorStop(1, "#ff2200");
      ctx.fillStyle = gr;
      ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill();
      // Explosion when near end
      if (t > 0.85) {
        const exp = (t - 0.85) / 0.15;
        ctx.globalAlpha = 1 - exp;
        ctx.fillStyle = "#ff6600";
        ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(txs, tys, exp * 32, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffee00";
        ctx.beginPath(); ctx.arc(txs, tys, exp * 18, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case "ice_spike": {
      // Crystalline shatter
      const alpha3 = t < 0.4 ? 1 : (1 - t) * (1 / 0.6);
      ctx.globalAlpha = alpha3;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const len = t < 0.3 ? t / 0.3 * 20 : (1 - (t - 0.3) / 0.7) * 20;
        const w = (1 - t) * 4;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a);
        ctx.fillStyle = i % 2 === 0 ? "#88eeff" : "#aaffff";
        ctx.shadowColor = "#44ccff"; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -w); ctx.lineTo(len, 0); ctx.lineTo(0, w); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // Freeze ring
      ctx.strokeStyle = "#88eeff";
      ctx.lineWidth = (1 - t) * 3;
      ctx.shadowColor = "#44ccff"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(sx, sy, t * 24, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "thunder": {
      // Lightning bolt from sky
      if (t < 0.5) {
        const lightning = t / 0.5;
        ctx.globalAlpha = 1 - (t / 0.5) * 0.3;
        ctx.strokeStyle = "#ffff44";
        ctx.lineWidth = 3 * (1 - t);
        ctx.shadowColor = "#aaccff"; ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 60);
        let lx = sx, ly = sy - 60;
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          const ny2 = sy - 60 + (60 + 10) * (i / steps) * lightning;
          const nx2 = sx + (Math.random() - 0.5) * 18;
          ctx.lineTo(nx2, ny2);
          lx = nx2; ly = ny2;
        }
        ctx.lineTo(sx, sy + 10);
        ctx.stroke();
        // Core white bolt
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
      // Impact flash
      const impAlpha = t < 0.3 ? 1 : t < 0.7 ? 1 - (t - 0.3) / 0.4 : 0;
      ctx.globalAlpha = impAlpha * 0.9;
      const impR = (t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.4) * 36;
      const impGr = ctx.createRadialGradient(sx, sy, 0, sx, sy, impR);
      impGr.addColorStop(0, "#ffffff"); impGr.addColorStop(0.4, "#aaccff88"); impGr.addColorStop(1, "transparent");
      ctx.fillStyle = impGr;
      ctx.shadowColor = "#aaddff"; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(sx, sy, impR, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "arrow_shot":
    case "poison_arrow": {
      // Arrow projectile
      const ax = sx + (txs - sx) * t;
      const ay = sy + (tys - sy) * t;
      const angle2 = Math.atan2(tys - sy, txs - sx);
      ctx.globalAlpha = t < 0.9 ? 1 : (1 - t) / 0.1;
      ctx.translate(ax, ay);
      ctx.rotate(angle2);
      // Trail
      ctx.globalAlpha *= 0.4;
      ctx.fillStyle = ef.type === "poison_arrow" ? "#88ff44" : "#c8a060";
      ctx.fillRect(-15, -1.5, 14, 3);
      ctx.globalAlpha = t < 0.9 ? 1 : (1 - t) / 0.1;
      // Arrow head
      ctx.fillStyle = ef.type === "poison_arrow" ? "#aaff66" : "#e8c88a";
      ctx.shadowColor = ef.type === "poison_arrow" ? "#44ff44" : "#ffcc44";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath();
      ctx.fill();
      break;
    }
    case "poison_cloud": {
      const alpha4 = t < 0.3 ? t / 0.3 : t < 0.7 ? 1 : (1 - t) / 0.3;
      ctx.globalAlpha = alpha4 * 0.7;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 1.5;
        const r4 = 12 + Math.sin(t * Math.PI * 3 + i) * 4;
        ctx.fillStyle = i % 2 === 0 ? "#44cc22" : "#88ff44";
        ctx.shadowColor = "#22ff00"; ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(sx + Math.cos(a) * 8, sy + Math.sin(a) * 6, r4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Poison ☠ icon
      if (t > 0.1 && t < 0.7) {
        ctx.globalAlpha = alpha4 * 0.8;
        ctx.font = "14px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("☠️", sx, sy - 5);
      }
      break;
    }
    case "hit": {
      // Generic hit cross burst
      const ha = t < 0.5 ? t * 2 : (1 - t) * 2;
      ctx.globalAlpha = ha;
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 3 * (1 - t);
      ctx.shadowColor = "#ffaa00"; ctx.shadowBlur = 10;
      for (let i = 0; i < 4; i++) {
        const a3 = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const len2 = t * 14;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a3) * 4, sy + Math.sin(a3) * 4);
        ctx.lineTo(sx + Math.cos(a3) * len2, sy + Math.sin(a3) * len2);
        ctx.stroke();
      }
      break;
    }
    case "enemy_hit": {
      // Red impact
      const ea = t < 0.5 ? t * 2 : (1 - t) * 2;
      ctx.globalAlpha = ea;
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 2.5 * (1 - t * 0.5);
      ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 12;
      const er = t * 22;
      ctx.beginPath(); ctx.arc(sx, sy, er, 0, Math.PI * 2); ctx.stroke();
      // Impact lines
      for (let i = 0; i < 6; i++) {
        const a4 = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a4) * 6, sy + Math.sin(a4) * 6);
        ctx.lineTo(sx + Math.cos(a4) * (6 + t * 16), sy + Math.sin(a4) * (6 + t * 16));
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, camX: number, camY: number) {
  const age = 1 - p.life;
  const alpha = p.life;
  const px = (p.x / TILE_SIZE - camX) * TILE_SIZE + TILE_SIZE / 2;
  const py = (p.y / TILE_SIZE - camY) * TILE_SIZE + TILE_SIZE / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 10; }

  switch (p.shape) {
    case "circle": {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, p.size * (0.5 + p.life * 0.5)), 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "square": {
      ctx.translate(px, py);
      ctx.rotate(p.rotation! + age * (p.rotSpeed! * 10));
      ctx.fillStyle = p.color;
      const sz = p.size * p.life;
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      break;
    }
    case "star": {
      ctx.translate(px, py);
      ctx.rotate(p.rotation! + age * 3);
      ctx.fillStyle = p.color;
      const r1 = p.size * p.life;
      const r2 = r1 * 0.4;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const b = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(b) * r2, Math.sin(b) * r2);
      }
      ctx.closePath(); ctx.fill();
      break;
    }
    case "spark": {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.5 * p.life;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px - p.vx * 4 * p.life, py - p.vy * 4 * p.life);
      ctx.lineTo(px, py);
      ctx.stroke();
      break;
    }
    case "ring": {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = (1 - age) * 4;
      ctx.beginPath(); ctx.arc(px, py, p.size * (1 + age * 2), 0, Math.PI * 2); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GameCanvas({
  playerName, playerClass, playerLevel, playerHp, playerMaxHp,
  playerMp, playerMaxMp, playerAttack, playerDefense,
  skills, inventory,
  onInteract, onPlayerDamaged, onPlayerDied, onMpUsed, onItemUsed, onMonsterKilled,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const s = useRef({
    player: { x: 30 * TILE_SIZE, y: 20 * TILE_SIZE, dir: "down" as Direction, animFrame: 0 },
    monsters: createMonsters(),
    keys: new Set<string>(),
    moveCooldown: 0,
    attackCooldown: 0,
    enemyAttackTimers: new Map<string, number>(),
    interactable: null as Interactable | null,
    floats: [] as FloatText[],
    particles: [] as Particle[],
    effects: [] as SkillEffect[],
    frame: 0,
    shakeAmt: 0,      // screen shake magnitude
    shakeDecay: 0.85, // per-frame multiplier
    hp: playerHp,
    mp: playerMp,
    attack: playerAttack,
    defense: playerDefense,
    skills,
    inventory,
  });
  const rafRef = useRef(0);

  useEffect(() => { s.current.hp = playerHp; }, [playerHp]);
  useEffect(() => { s.current.mp = playerMp; }, [playerMp]);
  useEffect(() => { s.current.attack = playerAttack; }, [playerAttack]);
  useEffect(() => { s.current.defense = playerDefense; }, [playerDefense]);
  useEffect(() => { s.current.skills = skills; }, [skills]);
  useEffect(() => { s.current.inventory = inventory; }, [inventory]);

  const [combatTarget, setCombatTarget] = useState<MonsterEntity | null>(null);
  const [atkCooldownPct, setAtkCooldownPct] = useState(0);
  const [skillCooldownPct, setSkillCooldownPct] = useState<Record<string, number>>({});

  const calcDmg = (atk: number, def: number, multi = 1) =>
    Math.max(1, Math.floor((atk * multi - def * 0.5) * (0.85 + Math.random() * 0.3)));

  const spawnFloat = useCallback((worldX: number, worldY: number, text: string, color: string, opts?: { scale?: number; wobble?: boolean }) => {
    s.current.floats.push({ id: floatId++, x: worldX, y: worldY - TILE_SIZE * 0.5, text, color, created: performance.now(), ...opts });
  }, []);

  const triggerShake = useCallback((amt: number) => {
    s.current.shakeAmt = Math.max(s.current.shakeAmt, amt);
  }, []);

  const killMonster = useCallback((m: MonsterEntity) => {
    m.alive = false;
    m.respawnTimer = 600;
    // Death burst
    burst(s.current.particles, m.x, m.y, 20, "#ff4444", { speed: 3, shape: "spark", glow: true });
    burst(s.current.particles, m.x, m.y, 12, "#ffaa44", { speed: 2, shape: "star", size: 5 });
    ringBurst(s.current.particles, m.x, m.y, "#ff222266");
    onMonsterKilled({ monsterUid: m.uid, reward: { exp: m.expReward, gold: m.goldReward }, questMonsterId: m.id });
  }, [onMonsterKilled]);

  const doAttack = useCallback((skillIndex?: number) => {
    const cur = s.current;
    if (cur.attackCooldown > 0) return;
    const player = cur.player;
    let closest: MonsterEntity | null = null;
    let closestDist = ATTACK_RANGE;
    for (const m of cur.monsters) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < closestDist) { closestDist = d; closest = m; }
    }

    let atkMulti = 1;
    let mpCost = 0;
    let skillDmgBonus = 0;
    let skillId = "hit";

    if (skillIndex !== undefined) {
      const sk = cur.skills[skillIndex];
      if (!sk || cur.mp < sk.mpCost) return;
      mpCost = sk.mpCost;
      skillDmgBonus = sk.damage;
      skillId = sk.id;
      onMpUsed(mpCost);
    }

    // Spawn visual effect even if no target (battle cry, aoe)
    const tx = closest ? closest.x : player.x;
    const ty = closest ? closest.y : player.y;
    spawnSkillEffect(cur.effects, cur.particles, skillId, player.x, player.y, tx, ty);

    if (!closest) { cur.attackCooldown = PLAYER_ATTACK_COOLDOWN; return; }

    const dmg = calcDmg(cur.attack + skillDmgBonus, closest.defense, atkMulti);
    closest.hp = Math.max(0, closest.hp - dmg);

    const isBig = dmg > 50;
    spawnFloat(closest.x, closest.y, skillIndex !== undefined ? `${dmg}` : `-${dmg}`,
      skillIndex !== undefined ? "#c8a8ff" : "#ffe066",
      { scale: isBig ? 1.4 : 1, wobble: isBig });
    triggerShake(isBig ? 4 : 2);

    cur.attackCooldown = PLAYER_ATTACK_COOLDOWN;

    if (closest.hp <= 0) {
      spawnFloat(closest.x, closest.y - 20, "💀 KO!", "#ff6666", { scale: 1.5, wobble: true });
      triggerShake(6);
      killMonster(closest);
    }
  }, [onMpUsed, spawnFloat, killMonster, triggerShake]);

  const doUseItem = useCallback((itemId: string) => {
    const item = s.current.inventory.find(i => i.id === itemId);
    if (!item || item.quantity <= 0) return;
    onItemUsed(itemId);
    // Heal particles
    const { x, y } = s.current.player;
    burst(s.current.particles, x, y, 14, "#44ff88", { speed: 2, shape: "star", glow: true, maxLife: 0.8 });
    burst(s.current.particles, x, y, 8, "#88ffcc", { speed: 1.5, shape: "circle", gravity: -0.1 });
    spawnFloat(x, y, `💚 +${item.effect?.hp ?? item.effect?.mp ?? "?"}`, "#7fff7f", { scale: 1.3 });
  }, [onItemUsed, spawnFloat]);

  // ─── Game loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    let lastTime = performance.now();

    const update = (dt: number) => {
      const cur = s.current;
      cur.frame++;

      if (cur.moveCooldown > 0) cur.moveCooldown -= dt;
      if (cur.attackCooldown > 0) cur.attackCooldown -= dt;

      // Screen shake decay
      cur.shakeAmt *= cur.shakeDecay;
      if (cur.shakeAmt < 0.1) cur.shakeAmt = 0;

      if (cur.moveCooldown <= 0) {
        let dx = 0, dy = 0;
        if (cur.keys.has("ArrowUp") || cur.keys.has("w") || cur.keys.has("W")) dy = -1;
        else if (cur.keys.has("ArrowDown") || cur.keys.has("s") || cur.keys.has("S")) dy = 1;
        else if (cur.keys.has("ArrowLeft") || cur.keys.has("a") || cur.keys.has("A")) dx = -1;
        else if (cur.keys.has("ArrowRight") || cur.keys.has("d") || cur.keys.has("D")) dx = 1;

        if (dx !== 0 || dy !== 0) {
          const nx = Math.floor(cur.player.x / TILE_SIZE + dx) * TILE_SIZE;
          const ny = Math.floor(cur.player.y / TILE_SIZE + dy) * TILE_SIZE;
          if (isTileWalkable(Math.floor(nx / TILE_SIZE), Math.floor(ny / TILE_SIZE))) {
            cur.player.x = nx; cur.player.y = ny;
            cur.player.dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
            cur.moveCooldown = MOVE_COOLDOWN;
            // Step dust
            if (cur.frame % 3 === 0) {
              sparks(cur.particles, cur.player.x, cur.player.y + TILE_SIZE * 0.4, "#88664433", 3);
            }
          }
        }
      }

      const ptx = Math.floor(cur.player.x / TILE_SIZE);
      const pty = Math.floor(cur.player.y / TILE_SIZE);
      cur.interactable = getInteractableAt(ptx, pty);

      let nearestTarget: MonsterEntity | null = null;
      let nearestDist = ATTACK_RANGE;

      for (const m of cur.monsters) {
        if (!m.alive) {
          if (m.respawnTimer > 0) {
            m.respawnTimer -= dt;
            if (m.respawnTimer <= 0) { m.alive = true; m.hp = m.maxHp; m.x = m.respawnX; m.y = m.respawnY; }
          }
          continue;
        }

        const pdx = cur.player.x - m.x;
        const pdy = cur.player.y - m.y;
        const dist = Math.hypot(pdx, pdy);
        m.aggro = dist < AGGRO_RANGE;

        if (dist < nearestDist) { nearestDist = dist; nearestTarget = m; }

        m.moveTimer -= dt;
        if (m.moveTimer <= 0) {
          m.moveTimer = m.moveInterval;
          if (m.aggro) {
            const steps = [[-1,0],[1,0],[0,-1],[0,1]];
            const best = [...steps].sort((a, b) => {
              const da = (m.x + a[0]*TILE_SIZE - cur.player.x)**2 + (m.y + a[1]*TILE_SIZE - cur.player.y)**2;
              const db = (m.x + b[0]*TILE_SIZE - cur.player.x)**2 + (m.y + b[1]*TILE_SIZE - cur.player.y)**2;
              return da - db;
            })[0];
            const nx = m.x + best[0]*TILE_SIZE, ny = m.y + best[1]*TILE_SIZE;
            if (isTileWalkable(Math.floor(nx/TILE_SIZE), Math.floor(ny/TILE_SIZE))) { m.x = nx; m.y = ny; }
          } else {
            const dirs = [[-1,0],[1,0],[0,-1],[0,1],[0,0],[0,0]];
            const [ddx, ddy] = dirs[Math.floor(Math.random()*dirs.length)];
            const nx = m.x + ddx*TILE_SIZE, ny = m.y + ddy*TILE_SIZE;
            const ox = Math.floor(m.respawnX/TILE_SIZE), oy = Math.floor(m.respawnY/TILE_SIZE);
            if (isTileWalkable(Math.floor(nx/TILE_SIZE), Math.floor(ny/TILE_SIZE)) && Math.abs(Math.floor(nx/TILE_SIZE)-ox)<6 && Math.abs(Math.floor(ny/TILE_SIZE)-oy)<6) {
              m.x = nx; m.y = ny;
            }
          }
        }

        if (dist < TILE_SIZE * 1.2 && cur.hp > 0) {
          let timer = cur.enemyAttackTimers.get(m.uid) ?? 0;
          timer -= dt;
          if (timer <= 0) {
            const dmg = calcDmg(m.attack, cur.defense);
            cur.enemyAttackTimers.set(m.uid, ENEMY_ATTACK_INTERVAL);
            // Enemy hit effect on player
            s.current.effects.push({ id: effectId++, type: "enemy_hit", x: cur.player.x, y: cur.player.y, progress: 0, duration: 300, created: performance.now() });
            burst(cur.particles, cur.player.x, cur.player.y, 8, "#ff3333", { speed: 2.5, shape: "spark", glow: true });
            spawnFloat(cur.player.x, cur.player.y, `💢 -${dmg}`, "#ff6666", { scale: 1.2 });
            triggerShake(5);
            onPlayerDamaged(dmg);
            if (cur.hp - dmg <= 0) onPlayerDied();
          } else {
            cur.enemyAttackTimers.set(m.uid, timer);
          }
        }
      }

      // Update particles
      const dtSec = dt / 1000;
      for (const p of cur.particles) {
        p.x += p.vx * dtSec * 60 / TILE_SIZE;
        p.y += p.vy * dtSec * 60 / TILE_SIZE;
        if (p.gravity) { p.vy += p.gravity * dtSec * 60; }
        p.vx *= 0.95; p.vy *= 0.95;
        p.life -= dtSec / p.maxLife;
      }
      cur.particles = cur.particles.filter(p => p.life > 0);

      // Update skill effects
      const now = performance.now();
      for (const ef of cur.effects) {
        ef.progress = Math.min(1, (now - ef.created) / ef.duration);
        // Fireball: spawn explosion particles at arrival
        if (ef.type === "fireball" && ef.progress > 0.9 && !(ef.data as any)?._exploded) {
          (ef.data as any) = { _exploded: true };
          const tx2 = ef.tx ?? ef.x; const ty2 = ef.ty ?? ef.y;
          burst(cur.particles, tx2, ty2, 20, "#ff4400", { speed: 4, shape: "spark", glow: true });
          burst(cur.particles, tx2, ty2, 12, "#ffee00", { speed: 2.5, shape: "circle", glow: true });
          ringBurst(cur.particles, tx2, ty2, "#ff440066");
          triggerShake(5);
        }
      }
      cur.effects = cur.effects.filter(ef => now - ef.created < ef.duration + 100);

      if (cur.frame % 4 === 0) {
        setCombatTarget(nearestTarget ? { ...nearestTarget } : null);
        setAtkCooldownPct(Math.max(0, cur.attackCooldown / PLAYER_ATTACK_COOLDOWN));
        const sc: Record<string, number> = {};
        for (const sk of cur.skills) sc[sk.id] = Math.max(0, cur.attackCooldown / PLAYER_ATTACK_COOLDOWN);
        setSkillCooldownPct(sc);
      }

      const nowF = performance.now();
      cur.floats = cur.floats.filter(f => nowF - f.created < 1400);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const cur = s.current;
      const { player } = cur;
      const W = canvas.width, H = canvas.height;

      // Screen shake offset
      const shakeX = cur.shakeAmt > 0 ? (Math.random() - 0.5) * cur.shakeAmt * 2 : 0;
      const shakeY = cur.shakeAmt > 0 ? (Math.random() - 0.5) * cur.shakeAmt * 2 : 0;

      const camX = Math.floor(player.x / TILE_SIZE) - Math.floor(VIEWPORT_W / 2);
      const camY = Math.floor(player.y / TILE_SIZE) - Math.floor(VIEWPORT_H / 2);

      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Tiles
      for (let ty = 0; ty <= VIEWPORT_H; ty++) {
        for (let tx = 0; tx <= VIEWPORT_W; tx++) {
          const wx = camX + tx, wy = camY + ty;
          const tile = getTile(wx, wy);
          ctx.fillStyle = TILE_COLORS[tile];
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          const icon = TILE_ICONS[tile];
          if (icon) {
            ctx.font = `${Math.floor(TILE_SIZE * 0.65)}px serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(icon, tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE + TILE_SIZE/2);
          }
        }
      }

      // NPCs
      for (const npc of NPCS) {
        const ntx = Math.floor(npc.x / TILE_SIZE) - camX;
        const nty = Math.floor(npc.y / TILE_SIZE) - camY;
        if (ntx < -1 || ntx > VIEWPORT_W || nty < -1 || nty > VIEWPORT_H) continue;
        const nx = ntx * TILE_SIZE + TILE_SIZE/2, ny = nty * TILE_SIZE + TILE_SIZE/2 + Math.sin(cur.frame * 0.06) * 1.5;
        ctx.font = `${Math.floor(TILE_SIZE*0.7)}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(npc.icon, nx, ny);
        ctx.fillStyle = "#aef"; ctx.font = "bold 9px sans-serif";
        ctx.fillText(npc.name, nx, nty * TILE_SIZE - 5);
        ctx.font = "10px serif"; ctx.fillText("💬", nx + 12, nty * TILE_SIZE - 1);
      }

      // Monsters
      const now2 = performance.now();
      for (const m of cur.monsters) {
        if (!m.alive) continue;
        const mtx = Math.floor(m.x / TILE_SIZE) - camX;
        const mty = Math.floor(m.y / TILE_SIZE) - camY;
        if (mtx < -1 || mtx > VIEWPORT_W || mty < -1 || mty > VIEWPORT_H) continue;
        const mx = mtx * TILE_SIZE + TILE_SIZE/2;
        const my = mty * TILE_SIZE + TILE_SIZE/2 + Math.sin(cur.frame * 0.1 + m.x) * 2;
        const sx2 = mtx * TILE_SIZE, sy2 = mty * TILE_SIZE;

        if (m.aggro) {
          ctx.save();
          ctx.globalAlpha = 0.18 + Math.sin(cur.frame * 0.2) * 0.08;
          ctx.fillStyle = "#ff3333";
          ctx.beginPath(); ctx.arc(mx, my, TILE_SIZE * 0.8, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath(); ctx.ellipse(mx, sy2 + TILE_SIZE - 4, 9, 3, 0, 0, Math.PI*2); ctx.fill();

        ctx.font = `${Math.floor(TILE_SIZE * 0.72)}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(m.icon, mx, my);

        const bw = 34, bh = 4, bx = mx - bw/2, by = sy2 - 10;
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
        const hpFill = Math.max(0, m.hp / m.maxHp);
        ctx.fillStyle = hpFill > 0.5 ? "#27ae60" : hpFill > 0.25 ? "#e67e22" : "#e74c3c";
        ctx.fillRect(bx, by, bw * hpFill, bh);
        ctx.fillStyle = "#ffd700"; ctx.font = "bold 7px sans-serif";
        ctx.fillText(`Lv${m.level}`, mx, sy2 - 15);
      }

      // Player
      const psx = (Math.floor(player.x / TILE_SIZE) - camX) * TILE_SIZE;
      const psy = (Math.floor(player.y / TILE_SIZE) - camY) * TILE_SIZE;
      const px = psx + TILE_SIZE/2, py = psy + TILE_SIZE/2 + Math.sin(cur.frame * 0.15) * 2;
      const color = CLASS_COLORS[playerClass] || "#e74c3c";
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(px, psy + TILE_SIZE - 4, 10, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(CLASS_ICONS[playerClass] || "⚔️", px, py);
      ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif";
      ctx.fillText(playerName, px, psy - 5);
      const phw = 36, phx = px - phw/2, phy = psy - 18;
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(phx, phy, phw, 4);
      ctx.fillStyle = "#27ae60"; ctx.fillRect(phx, phy, phw * Math.max(0, playerHp/playerMaxHp), 4);

      // ── PARTICLES ───────────────────────────────────────────────────
      for (const p of cur.particles) {
        drawParticle(ctx, p, camX, camY);
      }

      // ── SKILL EFFECTS ───────────────────────────────────────────────
      for (const ef of cur.effects) {
        if (now2 < ef.created) continue; // delayed effects
        drawSkillEffect(ctx, ef, camX, camY, now2);
      }

      // ── FLOATING TEXT ────────────────────────────────────────────────
      const nowF = performance.now();
      for (const ft of cur.floats) {
        const age = (nowF - ft.created) / 1400;
        const ftx = (ft.x / TILE_SIZE - camX) * TILE_SIZE + TILE_SIZE/2;
        const fty = (ft.y / TILE_SIZE - camY) * TILE_SIZE - age * 36;
        const scale = (ft.scale ?? 1) * (1 + (1 - age) * 0.3);
        // Wobble
        const wobX = ft.wobble ? Math.sin(nowF * 0.02 + ft.id) * 3 : 0;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age * 1.2);
        ctx.translate(ftx + wobX, fty);
        ctx.scale(scale, scale);
        // Shadow for readability
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(ft.text, 1, 1);
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color; ctx.shadowBlur = 6;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
      }

      ctx.restore(); // end shake transform

      // Interact hint (no shake)
      if (cur.interactable) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(W/2 - 90, H - 34, 180, 26);
        ctx.strokeStyle = "#f0d060"; ctx.lineWidth = 1;
        ctx.strokeRect(W/2 - 90, H - 34, 180, 26);
        ctx.fillStyle = "#f0d060"; ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`[E] ${cur.interactable.label}`, W/2, H - 21);
      }

      // Minimap
      const mmS = 80, mmT = 2, mmX = W - mmS - 6, mmY = 6;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(mmX, mmY, mmS, mmS);
      ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1; ctx.strokeRect(mmX, mmY, mmS, mmS);
      const half = mmS / mmT / 2;
      for (let ty2 = 0; ty2 < mmS/mmT; ty2++) {
        for (let tx2 = 0; tx2 < mmS/mmT; tx2++) {
          const wx = Math.floor(player.x/TILE_SIZE) - half + tx2;
          const wy = Math.floor(player.y/TILE_SIZE) - half + ty2;
          ctx.fillStyle = TILE_COLORS[getTile(wx, wy)];
          ctx.fillRect(mmX + tx2*mmT, mmY + ty2*mmT, mmT, mmT);
        }
      }
      ctx.fillStyle = "#fff"; ctx.fillRect(mmX + mmS/2 - 1, mmY + mmS/2 - 1, 4, 4);
      for (const m of cur.monsters) {
        if (!m.alive) continue;
        const rx = Math.floor(m.x/TILE_SIZE) - Math.floor(player.x/TILE_SIZE);
        const ry = Math.floor(m.y/TILE_SIZE) - Math.floor(player.y/TILE_SIZE);
        const dx2 = mmX + mmS/2 + rx*mmT, dy2 = mmY + mmS/2 + ry*mmT;
        if (dx2 >= mmX && dx2 < mmX+mmS && dy2 >= mmY && dy2 < mmY+mmS) {
          ctx.fillStyle = m.aggro ? "#ff4444" : "#ff9999";
          ctx.fillRect(dx2, dy2, mmT, mmT);
        }
      }
    };

    const loop = (now: number) => {
      const dt = now - lastTime; lastTime = now;
      update(dt); render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playerHp, playerMaxHp, spawnFloat, onPlayerDamaged, onPlayerDied, killMonster, triggerShake]);

  // Keyboard
  useEffect(() => {
    const cur = s.current;
    const onDown = (e: KeyboardEvent) => {
      cur.keys.add(e.key);
      if (e.key === "e" || e.key === "E") {
        if (cur.interactable) onInteract(cur.interactable.type);
        e.preventDefault();
      }
      if (e.key === " " || e.key === "z" || e.key === "Z") { doAttack(); e.preventDefault(); }
      if (e.key === "1") doAttack(0);
      if (e.key === "2") doAttack(1);
      if (e.key === "3") doAttack(2);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => cur.keys.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [onInteract, doAttack]);

  const dpadPress = useCallback((dir: string) => { s.current.keys.add(dir); }, []);
  const dpadRelease = useCallback((dir: string) => { s.current.keys.delete(dir); }, []);
  const interactPress = useCallback(() => { if (s.current.interactable) onInteract(s.current.interactable.type); }, [onInteract]);

  const consumables = (inventory ?? []).filter(i => i.type === "consumable" && i.quantity > 0);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: VIEWPORT_W * TILE_SIZE, margin: "0 auto", userSelect: "none" }}>
      <canvas
        ref={canvasRef}
        width={VIEWPORT_W * TILE_SIZE}
        height={VIEWPORT_H * TILE_SIZE}
        style={{ display: "block", imageRendering: "pixelated", width: "100%", height: "auto", touchAction: "none" }}
      />

      <AnimatePresence>
        {combatTarget && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.78)", border: "1px solid rgba(231,76,60,0.5)",
              borderRadius: 12, padding: "5px 12px", display: "flex", alignItems: "center",
              gap: 8, minWidth: 180, maxWidth: "70%", backdropFilter: "blur(4px)",
            }}
          >
            <span style={{ fontSize: 20 }}>{combatTarget.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {combatTarget.name} <span style={{ color: "#f0d060" }}>Lv.{combatTarget.level}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", marginTop: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2, transition: "width 0.15s",
                  width: `${Math.max(0, combatTarget.hp / combatTarget.maxHp * 100)}%`,
                  background: combatTarget.hp / combatTarget.maxHp > 0.5 ? "#27ae60" : combatTarget.hp / combatTarget.maxHp > 0.25 ? "#e67e22" : "#e74c3c",
                }} />
              </div>
              <div style={{ color: "#777", fontSize: 9, marginTop: 1 }}>{combatTarget.hp}/{combatTarget.maxHp}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {s.current.interactable && (
          <motion.button
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            onTouchStart={e => { e.preventDefault(); interactPress(); }}
            onMouseDown={interactPress}
            style={{
              position: "absolute", bottom: "27%", left: "50%", transform: "translateX(-50%)",
              padding: "5px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: "rgba(20,16,0,0.82)", border: "1px solid rgba(240,208,96,0.55)",
              color: "#f0d060", cursor: "pointer", touchAction: "none", whiteSpace: "nowrap",
            }}
          >
            [E] {s.current.interactable.label}
          </motion.button>
        )}
      </AnimatePresence>

      {/* D-PAD */}
      <div style={{
        position: "absolute", bottom: 10, left: 10,
        display: "grid", gridTemplateColumns: "44px 44px 44px", gridTemplateRows: "44px 44px 44px",
        gap: 3,
      }}>
        <div /><DpadBtn label="▲" dir="ArrowUp" onPress={dpadPress} onRelease={dpadRelease} /><div />
        <DpadBtn label="◄" dir="ArrowLeft" onPress={dpadPress} onRelease={dpadRelease} />
        <button
          onTouchStart={e => { e.preventDefault(); interactPress(); }}
          onMouseDown={interactPress}
          style={{ borderRadius: 10, fontWeight: 700, fontSize: 13, background: "rgba(240,208,96,0.15)", border: "1px solid rgba(240,208,96,0.35)", color: "#f0d060", cursor: "pointer", touchAction: "none" }}
        >E</button>
        <DpadBtn label="►" dir="ArrowRight" onPress={dpadPress} onRelease={dpadRelease} />
        <div /><DpadBtn label="▼" dir="ArrowDown" onPress={dpadPress} onRelease={dpadRelease} /><div />
      </div>

      {/* ACTION BUTTONS */}
      <div style={{
        position: "absolute", bottom: 10, right: 10,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5,
      }}>
        {skills.length > 0 && (
          <div style={{ display: "flex", gap: 4 }}>
            {skills.map((sk, i) => (
              <RoundBtn
                key={sk.id}
                icon={sk.icon}
                label={sk.name}
                sub={`${sk.mpCost}MP`}
                badge={`${i + 1}`}
                color="#9b59b6"
                cooldownPct={skillCooldownPct[sk.id] ?? 0}
                disabled={playerMp < sk.mpCost}
                onPress={() => doAttack(i)}
                size={52}
              />
            ))}
            {consumables.slice(0, 1).map(item => (
              <RoundBtn
                key={item.id}
                icon={item.icon}
                label={item.name}
                sub={`x${item.quantity}`}
                color="#27ae60"
                cooldownPct={0}
                onPress={() => doUseItem(item.id)}
                size={52}
              />
            ))}
          </div>
        )}
        <RoundBtn
          icon="⚔️"
          label="โจมตี"
          color="#e74c3c"
          cooldownPct={atkCooldownPct}
          onPress={() => doAttack()}
          size={62}
          primary
        />
      </div>
    </div>
  );
}

function RoundBtn({ icon, label, sub, badge, color, cooldownPct, disabled, onPress, size = 54, primary }: {
  icon: string; label?: string; sub?: string; badge?: string;
  color: string; cooldownPct: number; disabled?: boolean;
  onPress: () => void; size?: number; primary?: boolean;
}) {
  const isCD = cooldownPct > 0.02;
  const dim = disabled || isCD;
  return (
    <motion.button
      whileTap={!dim ? { scale: 0.88 } : {}}
      onTouchStart={e => { e.preventDefault(); if (!dim) onPress(); }}
      onMouseDown={e => { e.preventDefault(); if (!dim) onPress(); }}
      style={{
        position: "relative", overflow: "hidden",
        width: size, height: size, borderRadius: "50%",
        cursor: dim ? "default" : "pointer",
        background: primary ? `radial-gradient(circle at 40% 35%, ${color}cc, ${color}66)` : `${color}22`,
        border: `2px solid ${dim ? color + "33" : color + "99"}`,
        boxShadow: primary && !dim ? `0 0 14px ${color}66` : "none",
        opacity: disabled ? 0.38 : 1,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 0, touchAction: "none", flexShrink: 0,
      }}
    >
      {isCD && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `conic-gradient(rgba(0,0,0,0.65) ${cooldownPct * 360}deg, transparent ${cooldownPct * 360}deg)`,
        }} />
      )}
      {badge && (
        <div style={{ position: "absolute", top: 2, right: 4, color: "#f0d060", fontSize: 8, fontWeight: 900, lineHeight: 1 }}>{badge}</div>
      )}
      <div style={{ fontSize: primary ? 24 : 18, lineHeight: 1, position: "relative" }}>{icon}</div>
      {label && <div style={{ color: "#fff", fontSize: 8, fontWeight: 700, lineHeight: 1.1, position: "relative", marginTop: 1 }}>{label}</div>}
      {sub && <div style={{ color: dim ? "#555" : color, fontSize: 7, lineHeight: 1, position: "relative" }}>{sub}</div>}
    </motion.button>
  );
}

function DpadBtn({ label, dir, onPress, onRelease }: {
  label: string; dir: string;
  onPress: (d: string) => void; onRelease: (d: string) => void;
}) {
  return (
    <button
      onTouchStart={e => { e.preventDefault(); onPress(dir); }}
      onTouchEnd={e => { e.preventDefault(); onRelease(dir); }}
      onMouseDown={() => onPress(dir)}
      onMouseUp={() => onRelease(dir)}
      onMouseLeave={() => onRelease(dir)}
      style={{
        width: 44, height: 44, borderRadius: 10,
        fontWeight: 900, fontSize: 18,
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#ddd", cursor: "pointer", touchAction: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >{label}</button>
  );
}

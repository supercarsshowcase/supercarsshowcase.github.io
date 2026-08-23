/**
 * RaceCanvas — Professional pseudo-3D racing game.
 * Perspective road with curves, hills, scenery, AI opponents.
 * WASD/Arrow controls, 3-lap races, full HUD.
 */
import { useCallback, useEffect, useRef } from "react";

/* ── Constants ─────────────────────────────────────────────────────────── */
const SEG_LEN = 200;          // length of each road segment (world units)
const DRAW_DIST = 150;        // how many segments ahead to draw
const ROAD_W = 1800;          // half-width of road
const LANES = 3;
const CAM_HEIGHT = 1000;      // camera Y above road
const CAM_DEPTH = 0.84;       // FOV factor
const PLAYER_Z = 0;           // player is always at Z=0 in camera space

/* ── Track definition ──────────────────────────────────────────────────── */
// Each entry: [curve, hill] — positive curve = right turn
type SegDef = { curve: number; hill: number; len?: number };
const TRACK_DEFS: Record<string, { name: string; segments: SegDef[]; laps: number }> = {
  "city-circuit": {
    name: "City Circuit",
    laps: 3,
    segments: [
      { curve: 0, hill: 0, len: 10 },          // straight start
      { curve: 2, hill: 0 },                     // gentle right
      { curve: 0, hill: 0, len: 5 },             // straight
      { curve: -3, hill: 1 },                     // left + hill up
      { curve: 0, hill: 0, len: 5 },             // straight
      { curve: 4, hill: 0 },                     // hard right
      { curve: 4, hill: -2 },                    // hard right + downhill
      { curve: 0, hill: 0, len: 8 },             // long straight
      { curve: -2, hill: 0 },                     // gentle left
      { curve: 0, hill: 3, len: 5 },             // uphill straight
      { curve: 3, hill: 0 },                      // right
      { curve: 0, hill: 0, len: 3 },             // straight
      { curve: -4, hill: -1 },                    // sharp left + downhill
      { curve: 0, hill: 0, len: 10 },            // finish straight
    ],
  },
  "speed-ring": {
    name: "Speed Ring",
    laps: 3,
    segments: [
      { curve: 0, hill: 0, len: 20 },            // long straight
      { curve: 2, hill: 0, len: 6 },              // gentle right
      { curve: 0, hill: 0, len: 5 },              // straight
      { curve: -2, hill: 0, len: 6 },             // gentle left
      { curve: 0, hill: 0, len: 5 },              // straight
      { curve: 3, hill: 1 },                       // right + hill
      { curve: 0, hill: -2, len: 8 },             // downhill straight
      { curve: -3, hill: 0 },                      // left
      { curve: 0, hill: 0, len: 15 },             // long straight
      { curve: 1, hill: 0, len: 4 },              // slight right
      { curve: 0, hill: 0, len: 10 },             // finish straight
    ],
  },
};

/* ── Build track segments ──────────────────────────────────────────────── */
interface TrackSeg {
  z: number;        // world Z
  y: number;        // world Y (elevation)
  curve: number;    // curvature at this point
  color: number;    // for rumble strip alternation
}

function buildTrack(def: SegDef[]): TrackSeg[] {
  const segs: TrackSeg[] = [];
  let z = 0;
  let y = 0;
  for (const d of def) {
    const count = d.len ?? 8;
    for (let i = 0; i < count; i++) {
      segs.push({ z, y, curve: d.curve, color: segs.length % 2 });
      z += SEG_LEN;
      y += d.hill * 20;
      y = Math.max(-500, Math.min(1500, y));
    }
  }
  return segs;
}

/* ── AI opponents ──────────────────────────────────────────────────────── */
const AI_NAMES = ["PHANTOM", "BLITZ", "VORTEX", "STORM"];
const AI_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

interface AiCar {
  z: number;        // world Z position
  x: number;        // lane offset (-1 to 1)
  speed: number;    // segments per frame
  segIdx: number;   // current segment index
  lap: number;
  name: string;
  color: string;
  skill: number;    // 0-1
  finished: boolean;
  finishTime: number;
}

function makeAi(count: number, totalSegs: number): AiCar[] {
  return Array.from({ length: count }, (_, i) => ({
    z: -(i + 1) * SEG_LEN * 4,
    x: -0.5 + (i % 3) * 0.5,
    speed: 2.0 + Math.random() * 1.5,
    segIdx: 0,
    lap: 0,
    name: AI_NAMES[i % 4],
    color: AI_COLORS[i % 4],
    skill: 0.4 + Math.random() * 0.4,
    finished: false,
    finishTime: 0,
  }));
}

function tickAi(car: AiCar, playerZ: number, totalSegs: number, track: TrackSeg[], dt: number) {
  if (car.finished) return;
  const z = ((car.z % (totalSegs * SEG_LEN)) + totalSegs * SEG_LEN) % (totalSegs * SEG_LEN);
  const segIdx = Math.floor(z / SEG_LEN) % totalSegs;
  const seg = track[segIdx];
  if (!seg) return;

  // Slow in curves
  const curveFactor = 1 - Math.abs(seg.curve) * 0.08;
  const targetSpeed = car.speed * Math.max(0.5, curveFactor) * (0.9 + car.skill * 0.2);
  car.speed += (targetSpeed - car.speed) * 0.05 * dt;

  // Steer toward road center with slight randomness
  car.x += (0 - car.x) * 0.02 * dt + (Math.random() - 0.5) * 0.01;

  car.z += car.speed * dt * 3000;

  // Lap counting
  const newZ = ((car.z % (totalSegs * SEG_LEN)) + totalSegs * SEG_LEN) % (totalSegs * SEG_LEN);
  const newSegIdx = Math.floor(newZ / SEG_LEN) % totalSegs;
  if (newSegIdx < segIdx && segIdx > totalSegs * 0.8) {
    car.lap++;
    if (car.lap >= 3) {
      car.finished = true;
      car.finishTime = Date.now();
    }
  }
}

/* ── Colors ────────────────────────────────────────────────────────────── */
const C = {
  grass1: "#1a3a1a",
  grass2: "#163016",
  road1: "#333",
  road2: "#2e2e2e",
  rumble1: "#cc2222",
  rumble2: "#eee",
  lane: "#555",
  sky: "#1a1a2e",
  horizon: "#16213e",
  sand: "#3a3520",
};

/* ── Projection helpers ────────────────────────────────────────────────── */
interface Proj {
  sx: number;
  sy: number;
  sw: number;
  sc: number;
}

function project(
  worldX: number, worldY: number, worldZ: number,
  camX: number, camY: number,
  W: number, H: number,
): Proj {
  const dz = worldZ - PLAYER_Z;
  const scale = dz > 0 ? CAM_DEPTH / dz : 0;
  const sx = W / 2 + (worldX - camX) * scale * W;
  const sy = H / 2 - (worldY - camY) * scale * H;
  const sw = ROAD_W * scale * W;
  return { sx, sy, sw, sc: scale };
}

/* ── Draw helpers ──────────────────────────────────────────────────────── */
function poly(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

function drawCar3d(ctx: CanvasRenderingContext2D, sx: number, sy: number, sw: number, color: string, name: string, isPlayer: boolean) {
  const w = sw * 0.45;
  const h = w * 0.5;
  const alpha = isPlayer ? 1 : 0.9;

  ctx.globalAlpha = alpha;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + h * 0.1, w * 0.9, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rear wing
  ctx.fillStyle = isPlayer ? "#cc1100" : darken(color, 0.7);
  ctx.fillRect(sx - w * 0.4, sy - h * 0.6, w * 0.8, h * 0.12);

  // Body
  ctx.fillStyle = color;
  const bw = w * 0.7;
  ctx.beginPath();
  ctx.moveTo(sx - bw, sy + h * 0.1);      // rear left
  ctx.lineTo(sx - bw * 0.6, sy - h * 0.5); // top left
  ctx.lineTo(sx + bw * 0.6, sy - h * 0.5); // top right
  ctx.lineTo(sx + bw, sy + h * 0.1);       // rear right
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.ellipse(sx, sy - h * 0.2, bw * 0.3, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helmet (player only)
  if (isPlayer) {
    ctx.fillStyle = "#ff2200";
    ctx.beginPath();
    ctx.arc(sx, sy - h * 0.22, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wheels
  ctx.fillStyle = "#111";
  const ww = w * 0.14;
  const wh = h * 0.15;
  ctx.fillRect(sx - bw - ww * 0.5, sy - wh * 0.5, ww, wh);
  ctx.fillRect(sx + bw - ww * 0.5, sy - wh * 0.5, ww, wh);
  ctx.fillRect(sx - bw * 0.65 - ww * 0.5, sy - h * 0.55, ww, wh);
  ctx.fillRect(sx + bw * 0.65 - ww * 0.5, sy - h * 0.55, ww, wh);

  // Tail lights
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(sx - bw * 0.6, sy + h * 0.05, w * 0.1, h * 0.06);
  ctx.fillRect(sx + bw * 0.6 - w * 0.1, sy + h * 0.05, w * 0.1, h * 0.06);

  // Name tag
  ctx.globalAlpha = 1;
  ctx.fillStyle = isPlayer ? "#ff2200" : "rgba(255,255,255,0.6)";
  ctx.font = `bold ${Math.max(9, Math.round(sw * 0.06))}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(name, sx, sy - h * 0.75);
  ctx.globalAlpha = 1;
}

function darken(hex: string, f: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

/* ── Main render ───────────────────────────────────────────────────────── */
interface RaceState {
  playerZ: number;
  playerX: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  ai: AiCar[];
  lap: number;
  maxLaps: number;
  time: number;
  phase: "cd" | "go" | "done";
  cdEnd: number;
  finished: boolean;
  segCount: number;
}

function renderFrame(ctx: CanvasRenderingContext2D, s: RaceState, track: TrackSeg[], W: number, H: number) {
  const totalSegs = s.segCount;
  const playerSeg = Math.floor(((s.playerZ % (totalSegs * SEG_LEN)) + totalSegs * SEG_LEN) % (totalSegs * SEG_LEN) / SEG_LEN) % totalSegs;

  // Camera X follows the road
  let camX = s.playerX * ROAD_W;
  let camY = CAM_HEIGHT;

  // Accumulate curves for camera offset
  let dx = 0;
  for (let i = 0; i < DRAW_DIST; i++) {
    const si = (playerSeg + i) % totalSegs;
    dx += track[si].curve;
  }
  camX += dx * 80;

  // ── Sky ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  skyGrad.addColorStop(0, "#0a0a1a");
  skyGrad.addColorStop(0.5, "#1a1a3e");
  skyGrad.addColorStop(1, "#162040");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.5);

  // ── Distant city silhouette ──
  ctx.fillStyle = "#121225";
  const horizonY = H * 0.45;
  for (let x = 0; x < W; x += 30) {
    const bh = 15 + Math.sin(x * 0.02 + 1) * 20 + Math.cos(x * 0.05) * 10;
    ctx.fillRect(x, horizonY - bh, 28, bh);
  }

  // ── Track bands (back to front) ──
  let prevP: Proj | null = null;
  const baseSegIdx = playerSeg;

  for (let n = DRAW_DIST; n >= 0; n--) {
    const segIdx = (baseSegIdx + n) % totalSegs;
    const seg = track[segIdx];
    const segZ = seg.z;

    // Adjust for player position
    const relZ = segZ - (s.playerZ % (totalSegs * SEG_LEN));
    const adjZ = relZ < -totalSegs * SEG_LEN / 2 ? relZ + totalSegs * SEG_LEN : relZ;

    if (adjZ <= 0) continue;

    // Curve offset
    let curveOffset = 0;
    for (let j = 0; j < n; j++) {
      const cIdx = (baseSegIdx + j) % totalSegs;
      curveOffset += track[cIdx].curve * 80;
    }

    const worldX = curveOffset;
    const worldY = seg.y;

    const p = project(worldX, worldY, adjZ, camX, camY, W, H);

    if (p.sy < -H || p.sy > H * 1.5) { prevP = p; continue; }
    if (p.sw < 0.5) { prevP = p; continue; }

    if (prevP && prevP.sw > 0.5) {
      const isAlt = seg.color === 0;
      const grassX1 = 0;
      const grassX2 = W;

      // Grass
      poly(ctx, 0, prevP.sy, W, prevP.sy, W, p.sy, 0, p.sy, isAlt ? C.grass1 : C.grass2);

      // Rumble strips
      const rw1 = prevP.sw * 1.15;
      const rw2 = p.sw * 1.15;
      poly(ctx, prevP.sx - rw1, prevP.sy, prevP.sx + rw1, prevP.sy, p.sx + rw2, p.sy, p.sx - rw2, p.sy, isAlt ? C.rumble1 : C.rumble2);

      // Road
      poly(ctx, prevP.sx - prevP.sw, prevP.sy, prevP.sx + prevP.sw, prevP.sy, p.sx + p.sw, p.sy, p.sx - p.sw, p.sy, isAlt ? C.road1 : C.road2);

      // Lane markings
      if (LANES > 1) {
        const lw1 = prevP.sw * 0.02;
        const lw2 = p.sw * 0.02;
        for (let l = 1; l < LANES; l++) {
          const frac = l / LANES;
          const lx1 = prevP.sx - prevP.sw + prevP.sw * 2 * frac;
          const lx2 = p.sx - p.sw + p.sw * 2 * frac;
          if (n % 6 < 3) { // dashed
            poly(ctx, lx1 - lw1, prevP.sy, lx1 + lw1, prevP.sy, lx2 + lw2, p.sy, lx2 - lw2, p.sy, C.lane);
          }
        }
      }

      // ── Scenery (buildings, stands) on both sides ──
      if (n % 8 === 0 && n > 2 && n < DRAW_DIST * 0.7) {
        const buildH = 60 + Math.sin(segIdx * 0.7) * 40;
        const buildW = p.sw * 0.3;
        const offset = p.sw * 1.4;

        // Right side building
        ctx.fillStyle = `hsl(${(segIdx * 23) % 360}, 10%, 15%)`;
        ctx.fillRect(p.sx + offset, p.sy - buildH * p.sc * 200, buildW, buildH * p.sc * 200);
        // Windows
        ctx.fillStyle = `hsl(${(segIdx * 50) % 60 + 30}, 60%, 50%)`;
        for (let wy = 0; wy < buildH * p.sc * 200; wy += 12) {
          for (let wx = 3; wx < buildW - 3; wx += 8) {
            if (Math.random() > 0.3) {
              ctx.fillRect(p.sx + offset + wx, p.sy - buildH * p.sc * 200 + wy + 2, 4, 6);
            }
          }
        }

        // Left side grandstand
        ctx.fillStyle = "#2a2a3a";
        ctx.fillRect(p.sx - offset - buildW, p.sy - buildH * 0.6 * p.sc * 200, buildW, buildH * 0.6 * p.sc * 200);
        // Spectators (colored dots)
        for (let sy2 = 0; sy2 < buildH * 0.5 * p.sc * 200; sy2 += 6) {
          for (let sx2 = 2; sx2 < buildW - 2; sx2 += 5) {
            ctx.fillStyle = `hsl(${(segIdx * 17 + sx2 + sy2) % 360}, 70%, 60%)`;
            ctx.fillRect(p.sx - offset - buildW + sx2, p.sy - buildH * 0.6 * p.sc * 200 + sy2, 3, 4);
          }
        }
      }

      // Start/finish line
      if (n === 5 || n === 6) {
        const sfw1 = prevP.sw;
        const sfw2 = p.sw;
        for (let c = 0; c < 8; c++) {
          const cf = c / 8;
          const cx1 = prevP.sx - sfw1 + sfw1 * 2 * cf;
          const cx2 = p.sx - sfw2 + sfw2 * 2 * cf;
          ctx.fillStyle = c % 2 === 0 ? "#fff" : "#111";
          ctx.beginPath();
          ctx.moveTo(cx1, prevP.sy);
          ctx.lineTo(cx1 + sfw1 * 2 / 8, prevP.sy);
          ctx.lineTo(cx2 + sfw2 * 2 / 8, p.sy);
          ctx.lineTo(cx2, p.sy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    prevP = p;
  }

  // ── AI cars (sorted back to front) ──
  const visibleAi: { car: AiCar; dist: number; proj: Proj }[] = [];
  for (const ai of s.ai) {
    const aiRelZ = ((ai.z - s.playerZ) % (totalSegs * SEG_LEN) + totalSegs * SEG_LEN) % (totalSegs * SEG_LEN);
    if (aiRelZ < SEG_LEN || aiRelZ > DRAW_DIST * SEG_LEN) continue;
    const aiSeg = Math.floor(aiRelZ / SEG_LEN) % totalSegs;
    let aiCurve = 0;
    for (let j = 0; j < aiSeg - playerSeg; j++) {
      const ci = (baseSegIdx + j) % totalSegs;
      aiCurve += track[ci].curve * 80;
    }
    const aiX = aiCurve + ai.x * ROAD_W * 0.5;
    const seg = track[aiSeg % totalSegs] ?? track[0];
    const p = project(aiX, seg.y, aiRelZ, camX, camY, W, H);
    visibleAi.push({ car: ai, dist: aiRelZ, proj: p });
  }
  visibleAi.sort((a, b) => b.dist - a.dist);
  for (const { car, proj: p } of visibleAi) {
    if (p.sy > 0 && p.sy < H && p.sw > 2) {
      drawCar3d(ctx, p.sx, p.sy - p.sw * 0.15, p.sw, car.color, car.name, false);
    }
  }

  // ── Player car (large at bottom center) ──
  const playerScreenY = H * 0.78;
  const playerCarW = W * 0.18;
  // Tilt based on steering
  const tilt = s.playerX * 0.15;
  ctx.save();
  ctx.translate(W / 2, playerScreenY);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(0, playerCarW * 0.25, playerCarW * 0.9, playerCarW * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Car body
  const pw = playerCarW * 0.4;
  const ph = playerCarW * 0.55;

  // Rear wing
  ctx.fillStyle = "#cc1100";
  ctx.fillRect(-pw * 0.9, -ph * 0.85, pw * 1.8, ph * 0.1);

  // Main body
  ctx.fillStyle = "#ff2200";
  ctx.beginPath();
  ctx.moveTo(-pw, ph * 0.1);
  ctx.quadraticCurveTo(-pw * 0.7, -ph * 0.7, -pw * 0.3, -ph * 0.9);
  ctx.lineTo(pw * 0.3, -ph * 0.9);
  ctx.quadraticCurveTo(pw * 0.7, -ph * 0.7, pw, ph * 0.1);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.ellipse(0, -ph * 0.35, pw * 0.3, ph * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = "#ff4400";
  ctx.beginPath();
  ctx.arc(0, -ph * 0.38, ph * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.ellipse(0, -ph * 0.38, ph * 0.1, ph * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sidepods
  ctx.fillStyle = "#cc1100";
  ctx.fillRect(-pw * 1.1, -ph * 0.2, pw * 0.25, ph * 0.4);
  ctx.fillRect(pw * 0.85, -ph * 0.2, pw * 0.25, ph * 0.4);

  // Wheels
  ctx.fillStyle = "#111";
  const ww = pw * 0.22;
  const wh = ph * 0.22;
  ctx.fillRect(-pw - ww, -ph * 0.15, ww, wh);       // rear left
  ctx.fillRect(pw, -ph * 0.15, ww, wh);              // rear right
  ctx.fillRect(-pw * 0.6 - ww, -ph * 0.85, ww, wh); // front left
  ctx.fillRect(pw * 0.6, -ph * 0.85, ww, wh);       // front right

  // Tail lights
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(-pw * 0.6, ph * 0.05, pw * 0.2, ph * 0.06);
  ctx.fillRect(pw * 0.4, ph * 0.05, pw * 0.2, ph * 0.06);

  ctx.restore();

  // ── HUD ──
  // Position
  const all = [
    { n: "YOU", lap: s.lap, seg: playerSeg, done: s.phase === "done", isPlayer: true },
    ...s.ai.map((a) => ({
      n: a.name,
      lap: a.lap,
      seg: Math.floor(((a.z % (totalSegs * SEG_LEN)) + totalSegs * SEG_LEN) % (totalSegs * SEG_LEN) / SEG_LEN) % totalSegs,
      done: a.finished,
      isPlayer: false,
    })),
  ];
  all.sort((a, b) => b.lap !== a.lap ? b.lap - a.lap : b.seg - a.seg);
  const pos = all.findIndex((c) => c.isPlayer) + 1;

  // POS + LAP box
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(ctx, 16, 16, 260, 62, 10);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`POS ${pos}/${all.length}    LAP ${Math.min(s.lap + 1, s.maxLaps)}/${s.maxLaps}`, 28, 44);

  // Timer
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(ctx, 16, 86, 220, 34, 8);
  ctx.fill();
  const sec = Math.floor(s.time / 1000);
  const ms = Math.floor((s.time % 1000) / 10);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillText(`CURRENT ${String(sec).padStart(2, "0")}:${String(ms).padStart(2, "0")}`, 28, 109);

  // Speedometer
  const kmh = Math.round(Math.abs(s.speed) * 52);
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(ctx, W / 2 - 60, H - 70, 120, 54, 10);
  ctx.fill();
  ctx.fillStyle = kmh > 280 ? "#ff2200" : kmh > 180 ? "#f59e0b" : "#22c55e";
  ctx.font = "bold 28px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(String(kmh), W / 2, H - 36);
  ctx.fillStyle = "#888";
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText("KMPH", W / 2, H - 22);

  // Leaderboard
  const lw = 200;
  const lh = 32 + all.length * 30;
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(ctx, W - lw - 16, 16, lw, lh, 10);
  ctx.fill();
  all.forEach((c, i) => {
    ctx.fillStyle = c.isPlayer ? "#ff2200" : "#888";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${i + 1}  ${c.n}`, W - 28, 40 + i * 30);
  });

  // ── Countdown ──
  if (s.phase === "cd") {
    const rem = Math.max(0, Math.ceil((s.cdEnd - s.time) / 1000));
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    if (rem > 0) {
      ctx.fillStyle = "#ff2200";
      ctx.font = "bold 140px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#ff2200";
      ctx.shadowBlur = 40;
      ctx.fillText(String(rem), W / 2, H / 2 + 50);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 100px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 40;
      ctx.fillText("GO!", W / 2, H / 2 + 35);
      ctx.shadowBlur = 0;
    }
  }

  // ── Race complete ──
  if (s.phase === "done") {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 56px 'Courier New', monospace";
    ctx.shadowColor = "#ff2200";
    ctx.shadowBlur = 25;
    ctx.fillText("RACE COMPLETE", W / 2, H / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#aaa";
    ctx.font = "22px 'Courier New', monospace";
    ctx.fillText(`Time: ${(s.time / 1000).toFixed(1)}s  ·  Position: ${pos}/${all.length}`, W / 2, H / 2 + 25);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── React Component ───────────────────────────────────────────────────── */
interface Props {
  mode: "computer";
  trackId?: string;
  aiCount?: number;
  onFinish?: (time: number) => void;
}

export function RaceCanvas({ mode: _mode, trackId = "city-circuit", aiCount = 3, onFinish }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const raf = useRef(0);

  const stateRef = useRef<RaceState | null>(null);
  const trackRef = useRef<TrackSeg[]>([]);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const init = useCallback(() => {
    const def = TRACK_DEFS[trackId] ?? TRACK_DEFS["city-circuit"];
    const track = buildTrack(def.segments);
    trackRef.current = track;

    const totalSegs = track.length;
    const maxLaps = def.laps;

    stateRef.current = {
      playerZ: 0,
      playerX: 0,
      speed: 0,
      maxSpeed: 6.5,
      acceleration: 0.14,
      ai: makeAi(aiCount, totalSegs),
      lap: 0,
      maxLaps,
      time: 0,
      phase: "cd",
      cdEnd: 3500,
      finished: false,
      segCount: totalSegs,
    };
  }, [trackId, aiCount]);

  useEffect(() => { init(); }, [init]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
        keys.current.add(k);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => { cv.current?.focus(); }, []);

  // Game loop
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = 960;
    const H = 560;
    c.width = W;
    c.height = H;

    let prevTime = 0;
    let done = false;

    const loop = (ts: number) => {
      const dt = prevTime ? Math.min((ts - prevTime) / 16.667, 3) : 1;
      prevTime = ts;
      const s = stateRef.current;
      const track = trackRef.current;
      if (!s || !track.length) { raf.current = requestAnimationFrame(loop); return; }

      // ── Phase logic ──
      if (s.phase === "cd") {
        s.time += dt * 16.667;
        if (s.time >= s.cdEnd) {
          s.phase = "go";
          s.time = 0;
        }
      }

      if (s.phase === "go") {
        s.time += dt * 16.667;
        const k = keys.current;
        const totalSegs = s.segCount;
        const totalZ = totalSegs * SEG_LEN;

        // Acceleration
        if (k.has("w") || k.has("arrowup")) {
          s.speed = Math.min(s.maxSpeed, s.speed + s.acceleration * dt);
        } else if (k.has("s") || k.has("arrowdown")) {
          s.speed = Math.max(-s.maxSpeed * 0.25, s.speed - 0.2 * dt);
        } else {
          s.speed *= 0.985;
        }
        if (Math.abs(s.speed) < 0.01) s.speed = 0;

        // Steering
        if (Math.abs(s.speed) > 0.2) {
          const steerRate = 0.06 * (1 - Math.abs(s.speed) / s.maxSpeed * 0.3);
          if (k.has("a") || k.has("arrowleft")) s.playerX -= steerRate * dt * (s.speed > 0 ? 1 : -1);
          if (k.has("d") || k.has("arrowright")) s.playerX += steerRate * dt * (s.speed > 0 ? 1 : -1);
        }
        s.playerX = Math.max(-1.5, Math.min(1.5, s.playerX));

        // Centrifugal force from curves
        const curSeg = Math.floor(((s.playerZ % totalZ) + totalZ) % totalZ / SEG_LEN) % totalSegs;
        const curveForce = track[curSeg]?.curve ?? 0;
        s.playerX += curveForce * 0.003 * s.speed * dt;

        // Move forward
        s.playerZ += s.speed * dt * 3000;

        // Off-road penalty
        if (Math.abs(s.playerX) > 1.0) {
          s.speed *= 0.97;
        }

        // Lap detection
        const newSeg = Math.floor(((s.playerZ % totalZ) + totalZ) % totalZ / SEG_LEN) % totalSegs;
        if (newSeg < curSeg && curSeg > totalSegs * 0.85) {
          s.lap++;
          if (s.lap >= s.maxLaps) {
            s.phase = "done";
            s.finished = true;
          }
        }

        // AI
        for (const ai of s.ai) {
          tickAi(ai, s.playerZ, totalSegs, track, dt);
        }
      }

      // Render
      renderFrame(ctx, s, track, W, H);

      // Finish callback
      if (s.phase === "done" && !done) {
        done = true;
        onFinishRef.current?.(s.time / 1000);
      }

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); };
  }, []);

  return (
    <canvas
      ref={cv}
      className="block w-full rounded-xl border border-white/10 bg-[#06060e] outline-none"
      style={{ maxWidth: 960, aspectRatio: "960/560" }}
      tabIndex={0}
      onFocus={(e) => e.currentTarget.focus()}
    />
  );
}

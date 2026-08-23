/**
 * RaceCanvas — Pseudo-3D racing game (OutRun / Pole Position style).
 *
 * Road renders with perspective: bands from bottom → horizon narrow and shift.
 * Player car drawn large at bottom. AI cars scale by distance.
 * WASD / Arrow keys. Self-contained countdown + physics.
 */
import { useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// TRACK
// ══════════════════════════════════════════════════════════════

function buildTrack(): number[] {
  const t: number[] = [];
  const s = (n: number, c: number) => t.push(...Array(n).fill(c));
  s(80, 0);       // start straight
  s(35, 0.0035);  // gentle right
  s(18, 0);       // short straight
  s(45, -0.005);  // medium left
  s(14, 0);
  s(28, 0.0045);  // right bend
  s(28, -0.0045); // left bend (S-curve)
  s(20, 0);
  s(35, 0.007);   // sharp right
  s(18, 0);
  s(40, -0.0025); // long gentle left
  s(55, 0);       // back straight
  return t;
}
const TRACK = buildTrack();
const TL = TRACK.length;

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const SEG = 200;
const MAX_SPD = 120;
const ACC = 0.7;
const BRK = 1.4;
const STR = 2.2;
const FRI = 0.28;
const OFF_FRI = 1.8;
const CENT = 0.38;
const LAPS = 3;
const VIEW = 6000;
const BAND = 3;

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface Ai {
  id: string; name: string; color: string;
  z: number; x: number; spd: number;
  target: number; skill: number;
  lap: number; done: boolean;
}

interface St {
  z: number; x: number; spd: number; steer: number;
  lap: number; time: number;
  ai: Ai[];
  phase: "cd" | "race" | "done";
  cdEnd: number; reported: boolean;
}

// ══════════════════════════════════════════════════════════════
// AI
// ══════════════════════════════════════════════════════════════

const AI_NAMES = ["PHANTOM", "BLITZ", "VORTEX", "STORM"];
const AI_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

function makeAi(n: number): Ai[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `a${i}`, name: AI_NAMES[i % 4], color: AI_COLORS[i % 4],
    z: -(i + 1) * 2500, x: 0, spd: 0,
    target: 65 + Math.random() * 35, skill: 0.45 + Math.random() * 0.35,
    lap: 0, done: false,
  }));
}

// ══════════════════════════════════════════════════════════════
// PHYSICS
// ══════════════════════════════════════════════════════════════

function physics(s: St, keys: Set<string>, dt: number) {
  if (s.phase !== "race") return;

  // Player accel / brake
  if (keys.has("w") || keys.has("arrowup")) s.spd = Math.min(MAX_SPD, s.spd + ACC * dt);
  else if (keys.has("s") || keys.has("arrowdown")) s.spd = Math.max(-MAX_SPD * 0.3, s.spd - BRK * dt);
  else { if (s.spd > 0) s.spd = Math.max(0, s.spd - FRI * dt); else if (s.spd < 0) s.spd = Math.min(0, s.spd + FRI * dt); }

  // Player steer
  const sf = 1 - Math.abs(s.spd) / MAX_SPD * 0.45;
  if (keys.has("a") || keys.has("arrowleft")) s.x -= STR * sf * dt * (s.spd >= 0 ? 1 : -1);
  if (keys.has("d") || keys.has("arrowright")) s.x += STR * sf * dt * (s.spd >= 0 ? 1 : -1);
  s.steer = (keys.has("a") || keys.has("arrowleft") ? -1 : 0) + (keys.has("d") || keys.has("arrowright") ? 1 : 0);

  // Centrifugal
  const si = ((Math.floor(s.z / SEG) % TL) + TL) % TL;
  s.x += TRACK[si] * s.spd * CENT * dt;

  // Off-road
  if (Math.abs(s.x) > 1) { s.spd *= 1 - OFF_FRI * dt; s.x = Math.max(-1.4, Math.min(1.4, s.x)); }
  s.x = Math.max(-1.2, Math.min(1.2, s.x));

  // Move
  s.z += s.spd * dt;

  // Lap
  if (s.z >= TL * SEG) { s.z -= TL * SEG; s.lap++; if (s.lap >= LAPS) s.phase = "done"; }

  // AI
  for (const a of s.ai) {
    if (a.done) continue;
    const ais = ((Math.floor(a.z / SEG) % TL) + TL) % TL;
    const ac = TRACK[ais];
    a.x += (0 - a.x) * 0.018 * a.skill * dt;
    a.x += ac * a.spd * CENT * 0.5 * dt;
    a.x = Math.max(-1, Math.min(1, a.x));
    const want = Math.abs(ac) > 0.004 ? a.target * 0.55 : a.target;
    if (a.spd < want) a.spd = Math.min(want, a.spd + ACC * 0.8 * dt);
    else a.spd = Math.max(want, a.spd - BRK * 0.25 * dt);
    a.z += a.spd * dt;
    if (a.z >= TL * SEG) { a.z -= TL * SEG; a.lap++; if (a.lap >= LAPS) a.done = true; }
  }

  s.time += dt * 16.667;
}

// ══════════════════════════════════════════════════════════════
// RENDERING
// ══════════════════════════════════════════════════════════════

function darken(hex: string, f: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

function drawFormula(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number, col: string, name: string, me: boolean, tilt: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(tilt * 0.15);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 20, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  // rear wing
  ctx.fillStyle = col; ctx.fillRect(-26, -7, 52, 5);
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-26, -2, 3, 12); ctx.fillRect(23, -2, 3, 12);
  // body
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(-20, 14); ctx.lineTo(-16, -18); ctx.lineTo(-6, -32); ctx.lineTo(6, -32); ctx.lineTo(16, -18); ctx.lineTo(20, 14);
  ctx.closePath(); ctx.fill();
  // nose
  ctx.fillStyle = me ? darken(col, 0.75) : darken(col, 0.6);
  ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(0, -44); ctx.lineTo(6, -32); ctx.closePath(); ctx.fill();
  // cockpit
  ctx.fillStyle = "#111"; ctx.fillRect(-7, -26, 14, 12);
  // front wing
  ctx.fillStyle = col; ctx.fillRect(-24, -38, 48, 3);
  // wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(-24, -14, 5, 18); ctx.fillRect(19, -14, 5, 18);
  ctx.fillRect(-22, 6, 4, 14); ctx.fillRect(18, 6, 4, 14);
  ctx.fillStyle = "#333"; ctx.fillRect(-23, -13, 3, 16); ctx.fillRect(20, -13, 3, 16);
  ctx.restore();
  // name
  ctx.fillStyle = me ? "#ff2e00" : "rgba(255,255,255,0.55)";
  ctx.font = `bold ${Math.max(7, 9 * sc)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(name, x, y - 48 * sc);
}

function render(ctx: CanvasRenderingContext2D, s: St, W: number, H: number) {
  const HY = Math.round(H * 0.37);

  // ── Sky ──
  const sg = ctx.createLinearGradient(0, 0, 0, HY);
  sg.addColorStop(0, "#080820"); sg.addColorStop(0.35, "#151540"); sg.addColorStop(1, "#2a2a5a");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, HY);

  // hills
  ctx.fillStyle = "#0f1f0f"; ctx.beginPath(); ctx.moveTo(0, HY);
  for (let i = 0; i <= W; i += 8) ctx.lineTo(i, HY - 12 + Math.sin(i * 0.012 + s.z * 0.00008) * 10 + Math.sin(i * 0.005) * 6);
  ctx.lineTo(W, HY); ctx.closePath(); ctx.fill();

  // buildings silhouette
  ctx.fillStyle = "#181830";
  for (let i = 0; i < 20; i++) {
    const bx = ((i * 73 + 20) % W);
    const bw = 18 + (i * 7) % 20;
    const bh = 15 + (i * 13) % 25;
    ctx.fillRect(bx, HY - bh, bw, bh);
  }

  // ── Road ──
  let cAcc = 0;
  for (let y = H; y > HY; y -= BAND) {
    const t = (H - y) / (H - HY);
    const d = 1 + t * 28;
    const wz = s.z + t * VIEW;
    const si = ((Math.floor(wz / SEG) % TL) + TL) % TL;
    const curv = TRACK[si];
    cAcc += curv * BAND;

    const rw = Math.min(W * 0.88, (W * 0.62) / d);
    const cx = W / 2 + (cAcc * W * 0.13) / d - (s.x * W * 0.28) / d;

    // grass
    ctx.fillStyle = si % 2 === 0 ? "#16421a" : "#1a4c1e"; ctx.fillRect(0, y - BAND, W, BAND);
    // shoulder
    const sw = rw * 1.14; ctx.fillStyle = si % 2 === 0 ? "#484848" : "#525252"; ctx.fillRect(cx - sw / 2, y - BAND, sw, BAND);
    // road
    ctx.fillStyle = si % 2 === 0 ? "#252525" : "#2c2c2c"; ctx.fillRect(cx - rw / 2, y - BAND, rw, BAND);
    // rumble
    const rwm = Math.max(2, rw * 0.04); ctx.fillStyle = si % 4 < 2 ? "#cc2222" : "#eeeeee";
    ctx.fillRect(cx - rw / 2 - rwm, y - BAND, rwm, BAND); ctx.fillRect(cx + rw / 2, y - BAND, rwm, BAND);
    // lanes
    if (si % 8 < 4) { ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(cx - 1, y - BAND, 2, BAND); }
    // roadside objects
    if (si % 28 === 0 && d < 14) {
      const ow = Math.max(3, 22 / d), oh = Math.max(3, 32 / d);
      ctx.fillStyle = "#3a3a58";
      ctx.fillRect(cx - rw / 2 - rwm - ow - 8 / d, y - BAND - oh, ow, oh);
      ctx.fillRect(cx + rw / 2 + rwm + 8 / d, y - BAND - oh, ow, oh);
    }
    // start/finish checkerboard
    if (si === 0 && d < 6) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) { ctx.fillStyle = "#fff"; ctx.fillRect(cx - rw * 0.3 + c * (rw * 0.6 / 8), y - BAND - r * 3, rw * 0.6 / 8, 3); }
      }
    }
  }

  // ── AI cars (back to front) ──
  const vis: { a: Ai; sx: number; sy: number; sc: number }[] = [];
  for (const a of s.ai) {
    let dz = a.z - s.z; if (dz < 0) dz += TL * SEG;
    if (dz > VIEW || dz < 50) continue;
    const t = dz / VIEW;
    const sy = H - (H - HY) * (1 - t);
    const d = 1 + t * 28;
    // approximate curve at AI position
    const ais = ((Math.floor(a.z / SEG) % TL) + TL) % TL;
    const ac = TRACK[ais];
    const approxC = ac * t * 3000;
    const cx = W / 2 + (approxC * W * 0.13) / d;
    const sx = cx + (a.x * W * 0.28) / d;
    const sc = Math.max(0.15, 1.4 / d);
    vis.push({ a, sx, sy, sc });
  }
  vis.sort((a, b) => a.sy - b.sy);
  for (const v of vis) drawFormula(ctx, v.sx, v.sy, v.sc, v.a.color, v.a.name, false, 0);

  // ── Player car ──
  drawFormula(ctx, W / 2, H - 75, 1.6, "#ff2e00", "YOU", true, s.steer);

  // ── Vignette ──
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  // ── HUD ──
  const all = [{ n: "YOU", z: s.z, l: s.lap }, ...s.ai.map(a => ({ n: a.name, z: a.z, l: a.lap }))];
  all.sort((a, b) => a.l !== b.l ? b.l - a.l : b.z - a.z);
  const pos = all.findIndex(c => c.n === "YOU") + 1;

  // POS + LAP
  ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.beginPath(); ctx.roundRect(12, 10, 260, 64, 10); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 22px monospace"; ctx.textAlign = "left";
  ctx.fillText(`POS ${pos}/${all.length}    LAP ${Math.min(s.lap + 1, LAPS)}/${LAPS}`, 24, 40);

  // Timer
  ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.beginPath(); ctx.roundRect(12, 82, 195, 32, 8); ctx.fill();
  const sec = Math.floor(s.time / 1000), ms = Math.floor((s.time % 1000) / 10);
  ctx.fillStyle = "#fff"; ctx.font = "bold 16px monospace";
  ctx.fillText(`CURRENT ${String(sec).padStart(2, "0")}:${String(ms).padStart(2, "0")}`, 24, 103);

  // Leaderboard
  const lw = 200, lh = 30 + all.length * 30;
  ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.beginPath(); ctx.roundRect(W - lw - 12, 10, lw, lh, 10); ctx.fill();
  all.forEach((c, i) => {
    const me = c.n === "YOU";
    ctx.fillStyle = me ? "#ff2e00" : "#777"; ctx.font = `bold 12px monospace`; ctx.textAlign = "right";
    ctx.fillText(`${i + 1}    ${c.n}`, W - 22, 36 + i * 30);
  });

  // Speed
  const kmh = Math.round(s.spd * 2.8);
  ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.beginPath(); ctx.roundRect(W / 2 - 58, H - 58, 116, 48, 10); ctx.fill();
  ctx.fillStyle = kmh > 280 ? "#ff2e00" : kmh > 180 ? "#f59e0b" : "#22c55e";
  ctx.font = "bold 26px monospace"; ctx.textAlign = "center";
  ctx.fillText(String(kmh), W / 2, H - 28);
  ctx.fillStyle = "#888"; ctx.font = "10px monospace"; ctx.fillText("KMPH", W / 2, H - 14);

  // ── Countdown ──
  if (s.phase === "cd") {
    const rem = Math.max(0, Math.ceil((s.cdEnd - s.time) / 1000));
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, W, H);
    if (rem > 0) {
      ctx.fillStyle = "#ff2e00"; ctx.font = "bold 110px monospace"; ctx.textAlign = "center";
      ctx.fillText(String(rem), W / 2, H / 2 + 35);
    } else {
      ctx.fillStyle = "#22c55e"; ctx.font = "bold 80px monospace"; ctx.textAlign = "center";
      ctx.fillText("GO!", W / 2, H / 2 + 26);
    }
  }

  // ── Finish ──
  if (s.phase === "done") {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; ctx.font = "bold 48px monospace"; ctx.textAlign = "center";
    ctx.fillText("RACE COMPLETE", W / 2, H / 2 - 10);
    ctx.fillStyle = "#aaa"; ctx.font = "22px monospace";
    ctx.fillText(`Time: ${(s.time / 1000).toFixed(1)}s`, W / 2, H / 2 + 28);
  }
}

// ══════════════════════════════════════════════════════════════
// REACT COMPONENT
// ══════════════════════════════════════════════════════════════

interface Props {
  mode: "computer";
  aiCount?: number;
  onFinish?: (time: number) => void;
}

export function RaceCanvas({ mode, aiCount = 3, onFinish }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const st = useRef<St | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    st.current = {
      z: 0, x: 0, spd: 0, steer: 0, lap: 0, time: 0,
      ai: makeAi(aiCount), phase: "cd", cdEnd: 3000, reported: false,
    };
  }, [aiCount]);

  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { e.preventDefault(); keys.current.add(k); }
    };
    const u = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", d, { passive: false });
    window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  useEffect(() => { cv.current?.focus(); }, []);

  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = 960, H = 600; c.width = W; c.height = H;
    let prev = 0;

    const loop = (ts: number) => {
      const dt = prev ? Math.min((ts - prev) / 16.667, 3) : 1; prev = ts;
      const s = st.current; if (!s) { raf.current = requestAnimationFrame(loop); return; }

      // Countdown
      if (s.phase === "cd") {
        s.time += dt * 16.667;
        if (s.time >= s.cdEnd) { s.phase = "race"; s.time = 0; }
      }

      // Physics
      if (s.phase === "race") {
        s.steer = 0;
        if (keys.current.has("a") || keys.current.has("arrowleft")) s.steer = -1;
        if (keys.current.has("d") || keys.current.has("arrowright")) s.steer = 1;
        physics(s, keys.current, dt);
      }

      // Finish callback
      if (s.phase === "done" && !s.reported) { s.reported = true; onFinish?.(s.time / 1000); }

      render(ctx, s, W, H);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [onFinish]);

  return (
    <canvas
      ref={cv}
      className="block w-full rounded-xl border border-apex-line bg-[#08080e] outline-none"
      style={{ maxWidth: 960, aspectRatio: "960/600" }}
      tabIndex={0}
      onFocus={(e) => e.currentTarget.focus()}
    />
  );
}

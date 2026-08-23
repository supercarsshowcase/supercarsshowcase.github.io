/**
 * RaceCanvas — Pseudo-3D formula racing (Pole Position / OutRun style).
 * Perspective-correct road, formula cars, 3 AI opponents, WASD controls.
 */
import { useEffect, useRef } from "react";

// ── Track ──────────────────────────────────────────────────────
function buildTrack(): number[] {
  const t: number[] = [];
  const s = (n: number, c: number) => { for (let i = 0; i < n; i++) t.push(c); };
  s(80, 0); s(35, 0.012); s(18, 0); s(45, -0.018); s(14, 0);
  s(28, 0.015); s(28, -0.015); s(20, 0); s(35, 0.03); s(18, 0);
  s(40, -0.008); s(55, 0);
  return t;
}
const TRK = buildTrack();
const TL = TRK.length;

// ── Constants ──────────────────────────────────────────────────
const SEG = 200, MAX_SPD = 110, ACC = 0.65, BRK = 1.3, STR = 2.0;
const FRI = 0.25, OFF_FRI = 1.6, CENT = 0.4, LAPS = 3, VIEW = 5000;

// ── Types ──────────────────────────────────────────────────────
interface Ai { id: string; name: string; color: string; z: number; x: number; spd: number; tgt: number; sk: number; lap: number; done: boolean; }
interface St { z: number; x: number; spd: number; steer: number; lap: number; t: number; ai: Ai[]; ph: "cd" | "go" | "done"; cdEnd: number; rep: boolean; }

// ── AI ─────────────────────────────────────────────────────────
const AN = ["PHANTOM", "BLITZ", "VORTEX", "STORM"];
const AC = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];
function mkAi(n: number): Ai[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `a${i}`, name: AN[i % 4], color: AC[i % 4],
    z: -(i + 1) * 2000, x: 0, spd: 0,
    tgt: 60 + Math.random() * 30, sk: 0.4 + Math.random() * 0.35,
    lap: 0, done: false,
  }));
}

// ── Physics ────────────────────────────────────────────────────
function tick(s: St, keys: Set<string>, dt: number) {
  if (s.ph !== "go") return;
  if (keys.has("w") || keys.has("arrowup")) s.spd = Math.min(MAX_SPD, s.spd + ACC * dt);
  else if (keys.has("s") || keys.has("arrowdown")) s.spd = Math.max(-MAX_SPD * 0.3, s.spd - BRK * dt);
  else { s.spd > 0 ? (s.spd = Math.max(0, s.spd - FRI * dt)) : (s.spd = Math.min(0, s.spd + FRI * dt)); }

  const sf = 1 - Math.abs(s.spd) / MAX_SPD * 0.4;
  if (keys.has("a") || keys.has("arrowleft")) s.x -= STR * sf * dt * (s.spd >= 0 ? 1 : -1);
  if (keys.has("d") || keys.has("arrowright")) s.x += STR * sf * dt * (s.spd >= 0 ? 1 : -1);
  s.steer = (keys.has("a") || keys.has("arrowleft") ? -1 : 0) + (keys.has("d") || keys.has("arrowright") ? 1 : 0);

  const si = ((Math.floor(s.z / SEG) % TL) + TL) % TL;
  s.x += TRK[si] * s.spd * CENT * dt;
  if (Math.abs(s.x) > 1) { s.spd *= 1 - OFF_FRI * dt; s.x = Math.max(-1.4, Math.min(1.4, s.x)); }
  s.x = Math.max(-1.2, Math.min(1.2, s.x));
  s.z += s.spd * dt;
  if (s.z >= TL * SEG) { s.z -= TL * SEG; s.lap++; if (s.lap >= LAPS) s.ph = "done"; }

  for (const a of s.ai) {
    if (a.done) continue;
    const ais = ((Math.floor(a.z / SEG) % TL) + TL) % TL;
    a.x += (0 - a.x) * 0.02 * a.sk * dt;
    a.x += TRK[ais] * a.spd * CENT * 0.5 * dt;
    a.x = Math.max(-1, Math.min(1, a.x));
    const w = Math.abs(TRK[ais]) > 0.012 ? a.tgt * 0.55 : a.tgt;
    a.spd < w ? (a.spd = Math.min(w, a.spd + ACC * 0.8 * dt)) : (a.spd = Math.max(w, a.spd - BRK * 0.3 * dt));
    a.z += a.spd * dt;
    if (a.z >= TL * SEG) { a.z -= TL * SEG; a.lap++; if (a.lap >= LAPS) a.done = true; }
  }
  s.t += dt * 16.667;
}

// ── Render ─────────────────────────────────────────────────────
function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number, col: string, nm: string, me: boolean, tilt: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(tilt * 0.12);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(0, 22, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
  // rear wing endplates
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-28, -4, 4, 14); ctx.fillRect(24, -4, 4, 14);
  // rear wing
  ctx.fillStyle = col; ctx.fillRect(-28, -8, 56, 5);
  // body
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(-20, 16); ctx.lineTo(-16, -16); ctx.lineTo(-7, -30); ctx.lineTo(7, -30); ctx.lineTo(16, -16); ctx.lineTo(20, 16);
  ctx.closePath(); ctx.fill();
  // sidepods
  ctx.fillStyle = me ? darken(col, 0.8) : darken(col, 0.7);
  ctx.fillRect(-22, -4, 6, 18); ctx.fillRect(16, -4, 6, 18);
  // nose
  ctx.fillStyle = me ? darken(col, 0.7) : darken(col, 0.55);
  ctx.beginPath(); ctx.moveTo(-7, -30); ctx.lineTo(0, -46); ctx.lineTo(7, -30); ctx.closePath(); ctx.fill();
  // front wing
  ctx.fillStyle = col; ctx.fillRect(-26, -42, 52, 3);
  // cockpit
  ctx.fillStyle = "#0a0a0a"; ctx.fillRect(-7, -26, 14, 12);
  // halo
  ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -22, 9, Math.PI, 0); ctx.stroke();
  // wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(-26, -12, 5, 18); ctx.fillRect(21, -12, 5, 18);
  ctx.fillRect(-24, 8, 4, 14); ctx.fillRect(20, 8, 4, 14);
  // wheel detail
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(-25, -11, 3, 16); ctx.fillRect(22, -11, 3, 16);
  ctx.restore();
  // label
  ctx.fillStyle = me ? "#ff2e00" : "rgba(255,255,255,0.5)";
  ctx.font = `bold ${Math.max(7, 9 * sc)}px sans-serif`; ctx.textAlign = "center";
  ctx.fillText(nm, x, y - 50 * sc);
}

function darken(hex: string, f: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

function render(ctx: CanvasRenderingContext2D, s: St, W: number, H: number) {
  const HY = Math.round(H * 0.38);

  // Sky gradient
  const sg = ctx.createLinearGradient(0, 0, 0, HY);
  sg.addColorStop(0, "#06061a"); sg.addColorStop(0.3, "#10103a"); sg.addColorStop(0.7, "#1a1a50"); sg.addColorStop(1, "#2a2a60");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, HY);

  // Clouds
  ctx.fillStyle = "rgba(200,200,255,0.06)";
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 140 + s.z * 0.05) % (W + 200)) - 100;
    const cy = 10 + (i * 19) % (HY - 30);
    ctx.beginPath(); ctx.ellipse(cx, cy, 50 + (i * 13) % 30, 8 + (i * 7) % 6, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Distant hills
  ctx.fillStyle = "#0c1c0c"; ctx.beginPath(); ctx.moveTo(0, HY);
  for (let i = 0; i <= W; i += 6) {
    ctx.lineTo(i, HY - 10 + Math.sin(i * 0.015 + s.z * 0.00006) * 8 + Math.sin(i * 0.007 + 1) * 5);
  }
  ctx.lineTo(W, HY); ctx.closePath(); ctx.fill();

  // Building silhouettes
  ctx.fillStyle = "#12122a";
  for (let i = 0; i < 25; i++) {
    const bx = ((i * 67 + Math.floor(s.z * 0.02) * 3) % (W + 40)) - 20;
    const bw = 12 + (i * 11) % 22, bh = 10 + (i * 17) % 30;
    ctx.fillRect(bx, HY - bh, bw, bh);
  }

  // ── Road (perspective bands) ──
  let dx = 0;
  const BH = 3;
  for (let y = H; y > HY; y -= BH) {
    const t = (H - y) / (H - HY);
    const z = 1 / (1 - t * 0.96);

    const wz = s.z + t * VIEW * 0.8;
    const si = ((Math.floor(wz / SEG) % TL) + TL) % TL;
    dx += TRK[si] * BH * 60;

    const rw = Math.min(W * 0.88, (W * 0.55) / z);
    const cx = W / 2 + dx / z - (s.x * W * 0.22) / z;

    // Grass
    ctx.fillStyle = si % 2 === 0 ? "#14401a" : "#184a1e"; ctx.fillRect(0, y - BH, W, BH);
    // Shoulder
    const sw = rw * 1.15; ctx.fillStyle = si % 2 === 0 ? "#444" : "#4e4e4e"; ctx.fillRect(cx - sw / 2, y - BH, sw, BH);
    // Road
    ctx.fillStyle = si % 2 === 0 ? "#222" : "#282828"; ctx.fillRect(cx - rw / 2, y - BH, rw, BH);
    // Rumble strips
    const rwm = Math.max(2, rw * 0.04);
    ctx.fillStyle = si % 4 < 2 ? "#cc2222" : "#eee";
    ctx.fillRect(cx - rw / 2 - rwm, y - BH, rwm, BH);
    ctx.fillRect(cx + rw / 2, y - BH, rwm, BH);
    // Lane lines
    if (si % 8 < 4) { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(cx - 1, y - BH, 2, BH); }
    // Roadside objects
    if (si % 25 === 0 && z < 12) {
      const ow = Math.max(3, 18 / z), oh = Math.max(3, 28 / z);
      ctx.fillStyle = "#2a2a48";
      ctx.fillRect(cx - rw / 2 - rwm - ow - 6 / z, y - BH - oh, ow, oh);
      ctx.fillRect(cx + rw / 2 + rwm + 6 / z, y - BH - oh, ow, oh);
    }
    // Finish line
    if (si === 0 && z < 5) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = "#fff"; ctx.fillRect(cx - rw * 0.25 + c * (rw * 0.5 / 8), y - BH - r * BH, rw * 0.5 / 8, BH);
        }
      }
    }
  }

  // ── AI cars (back to front) ──
  const vis: { a: Ai; sx: number; sy: number; sc: number }[] = [];
  for (const a of s.ai) {
    let dz = a.z - s.z; if (dz < 0) dz += TL * SEG; if (dz > VIEW || dz < 50) continue;
    const t = dz / VIEW;
    const sy = H - (H - HY) * (1 - t);
    const z = 1 / (1 - t * 0.96);
    const ais = ((Math.floor(a.z / SEG) % TL) + TL) % TL;
    const adx = TRK[ais] * t * 15000;
    const cx = W / 2 + adx / z;
    const sx = cx + (a.x * W * 0.22) / z;
    const sc = Math.max(0.12, 1.3 / z);
    vis.push({ a, sx, sy, sc });
  }
  vis.sort((a, b) => a.sy - b.sy);
  for (const v of vis) drawCar(ctx, v.sx, v.sy, v.sc, v.a.color, v.a.name, false, 0);

  // ── Player car ──
  drawCar(ctx, W / 2, H - 70, 1.6, "#ff2e00", "YOU", true, s.steer);

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  // ── HUD ──
  const all = [{ n: "YOU", z: s.z, l: s.lap }, ...s.ai.map(a => ({ n: a.name, z: a.z, l: a.lap }))];
  all.sort((a, b) => a.l !== b.l ? b.l - a.l : b.z - a.z);
  const pos = all.findIndex(c => c.n === "YOU") + 1;

  // POS + LAP
  ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.beginPath(); ctx.roundRect(14, 12, 270, 60, 10); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 22px monospace"; ctx.textAlign = "left";
  ctx.fillText(`POS ${pos}/${all.length}    LAP ${Math.min(s.lap + 1, LAPS)}/${LAPS}`, 26, 40);

  // Timer
  ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.beginPath(); ctx.roundRect(14, 80, 200, 32, 8); ctx.fill();
  const sec = Math.floor(s.t / 1000), ms = Math.floor((s.t % 1000) / 10);
  ctx.fillStyle = "#fff"; ctx.font = "bold 16px monospace";
  ctx.fillText(`CURRENT ${String(sec).padStart(2, "0")}:${String(ms).padStart(2, "0")}`, 26, 101);

  // Leaderboard
  const lw = 195, lh = 28 + all.length * 28;
  ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.beginPath(); ctx.roundRect(W - lw - 14, 12, lw, lh, 10); ctx.fill();
  all.forEach((c, i) => {
    ctx.fillStyle = c.n === "YOU" ? "#ff2e00" : "#777";
    ctx.font = "bold 12px monospace"; ctx.textAlign = "right";
    ctx.fillText(`${i + 1}   ${c.n}`, W - 24, 34 + i * 28);
  });

  // Speed
  const kmh = Math.round(s.spd * 2.8);
  ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.beginPath(); ctx.roundRect(W / 2 - 55, H - 56, 110, 44, 10); ctx.fill();
  ctx.fillStyle = kmh > 280 ? "#ff2e00" : kmh > 180 ? "#f59e0b" : "#22c55e";
  ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
  ctx.fillText(String(kmh), W / 2, H - 28);
  ctx.fillStyle = "#888"; ctx.font = "10px monospace"; ctx.fillText("KMPH", W / 2, H - 14);

  // Controls hint (first 3 seconds of racing)
  if (s.ph === "go" && s.t < 3000) {
    const a = Math.max(0, 1 - s.t / 3000);
    ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`; ctx.font = "14px monospace"; ctx.textAlign = "center";
    ctx.fillText("W = Accelerate   A/D = Steer   S = Brake", W / 2, H - 70);
  }

  // ── Countdown ──
  if (s.ph === "cd") {
    const rem = Math.max(0, Math.ceil((s.cdEnd - s.t) / 1000));
    ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
    if (rem > 0) {
      ctx.fillStyle = "#ff2e00"; ctx.font = "bold 120px monospace"; ctx.textAlign = "center";
      ctx.shadowColor = "#ff2e00"; ctx.shadowBlur = 30;
      ctx.fillText(String(rem), W / 2, H / 2 + 40);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#22c55e"; ctx.font = "bold 90px monospace"; ctx.textAlign = "center";
      ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 30;
      ctx.fillText("GO!", W / 2, H / 2 + 28);
      ctx.shadowBlur = 0;
    }
  }

  // ── Finish ──
  if (s.ph === "done") {
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; ctx.font = "bold 52px monospace"; ctx.textAlign = "center";
    ctx.shadowColor = "#ff2e00"; ctx.shadowBlur = 20;
    ctx.fillText("RACE COMPLETE", W / 2, H / 2 - 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#aaa"; ctx.font = "22px monospace";
    ctx.fillText(`Time: ${(s.t / 1000).toFixed(1)}s  |  Position: ${pos}/${all.length}`, W / 2, H / 2 + 30);
  }
}

// ── React Component ────────────────────────────────────────────
interface Props { mode: "computer"; aiCount?: number; onFinish?: (time: number) => void; }

export function RaceCanvas({ mode, aiCount = 3, onFinish }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const st = useRef<St | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    st.current = {
      z: 0, x: 0, spd: 0, steer: 0, lap: 0, t: 0,
      ai: mkAi(aiCount), ph: "cd", cdEnd: 3000, rep: false,
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
      if (s.ph === "cd") { s.t += dt * 16.667; if (s.t >= s.cdEnd) { s.ph = "go"; s.t = 0; } }
      if (s.ph === "go") tick(s, keys.current, dt);
      if (s.ph === "done" && !s.rep) { s.rep = true; onFinish?.(s.t / 1000); }
      render(ctx, s, W, H);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [onFinish]);

  return (
    <canvas ref={cv}
      className="block w-full rounded-xl border border-apex-line bg-[#06060e] outline-none"
      style={{ maxWidth: 960, aspectRatio: "960/600" }}
      tabIndex={0} onFocus={(e) => e.currentTarget.focus()}
    />
  );
}

/**
 * RaceCanvas — Fullscreen top-down multiplayer racing game.
 *
 * Controls: W/A/S/D or Arrow keys. Canvas auto-focuses on mount.
 * Modes: multiplayer (server-synced) or vs-Computer (local AI).
 */
import { useCallback, useEffect, useRef } from "react";

// ── Physics constants ──
const MAX_SPEED = 5.5;
const ACCELERATION = 0.14;
const BRAKE_DECEL = 0.2;
const FRICTION = 0.025;
const TURN_SPEED = 0.052;
const CHECKPOINT_RADIUS = 65;

interface TrackDef {
  id: string;
  name: string;
  checkpoints: { x: number; y: number }[];
  spawns: { x: number; y: number; angle: number }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  laps: number;
}

interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  lap: number;
  finished: boolean;
  finishTime?: number;
  placement?: number;
}

interface RaceCanvasProps {
  track: TrackDef;
  myId: string;
  players: PlayerState[];
  status: "waiting" | "countdown" | "racing" | "finished";
  countdownEnds?: number;
  /** If true, run AI opponents locally instead of reading from props. */
  vsComputer?: boolean;
  aiCount?: number;
  onPositionUpdate?: (x: number, y: number, angle: number, speed: number, lap: number) => void;
  onFinish?: (finishTime: number) => void;
}

// ── AI car state ──
interface AiCar {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  lap: number;
  lastCheckpoint: number;
  finished: boolean;
  finishTime?: number;
  placement?: number;
  targetSpeed: number;
  skill: number; // 0-1, how good the AI is
}

const AI_NAMES = [
  "Phantom", "Blitz", "Vortex", "Storm", "Ace",
  "Nova", "Turbo", "Ghost", "Fury", "Dash",
];

function createAiCars(track: TrackDef, count: number): AiCar[] {
  return Array.from({ length: count }, (_, i) => {
    const spawn = track.spawns[Math.min(i + 1, track.spawns.length - 1)];
    return {
      id: `ai-${i}`,
      name: AI_NAMES[i % AI_NAMES.length],
      x: spawn.x,
      y: spawn.y,
      angle: spawn.angle,
      speed: 0,
      lap: 0,
      lastCheckpoint: -1,
      finished: false,
      finishTime: undefined,
      placement: undefined,
      targetSpeed: 2.5 + Math.random() * 2,
      skill: 0.4 + Math.random() * 0.4,
    };
  });
}

function updateAi(
  ai: AiCar,
  track: TrackDef,
  dt: number,
): void {
  if (ai.finished) return;

  // Target the next checkpoint
  const nextIdx = (ai.lastCheckpoint + 1) % track.checkpoints.length;
  const cp = track.checkpoints[nextIdx];
  const dx = cp.x - ai.x;
  const dy = cp.y - ai.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const targetAngle = Math.atan2(dy, dx);

  // Smooth steering toward target
  let angleDiff = targetAngle - ai.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  ai.angle += angleDiff * (0.08 + ai.skill * 0.06) * dt;

  // Speed control — accelerate on straights, slow in turns
  const turnSeverity = Math.abs(angleDiff);
  const desiredSpeed = turnSeverity > 0.8
    ? ai.targetSpeed * 0.5
    : turnSeverity > 0.3
      ? ai.targetSpeed * 0.75
      : ai.targetSpeed;

  if (ai.speed < desiredSpeed) {
    ai.speed = Math.min(desiredSpeed, ai.speed + ACCELERATION * dt);
  } else {
    ai.speed = Math.max(desiredSpeed, ai.speed - BRAKE_DECEL * 0.5 * dt);
  }

  ai.speed *= 1 - FRICTION * dt;

  // Move
  ai.x += Math.cos(ai.angle) * ai.speed * dt;
  ai.y += Math.sin(ai.angle) * ai.speed * dt;

  // Boundary
  ai.x = Math.max(track.bounds.minX, Math.min(track.bounds.maxX, ai.x));
  ai.y = Math.max(track.bounds.minY, Math.min(track.bounds.maxY, ai.y));

  // Checkpoint
  if (dist < CHECKPOINT_RADIUS) {
    ai.lastCheckpoint = nextIdx;
    if (nextIdx === track.checkpoints.length - 1) {
      ai.lap += 1;
      if (ai.lap >= track.laps) {
        ai.finished = true;
      }
    }
  }
}

export function RaceCanvas({
  track,
  myId,
  players,
  status,
  countdownEnds,
  vsComputer = false,
  aiCount = 3,
  onPositionUpdate,
  onFinish,
}: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef(new Set<string>());
  const myRef = useRef({ x: 0, y: 0, angle: 0, speed: 0, lap: 0, lastCheckpoint: -1, finished: false });
  const aiRef = useRef<AiCar[]>([]);
  const frameRef = useRef(0);
  const raceStartRef = useRef(0);
  const finishedRef = useRef(false);
  const lastFrameTime = useRef(0);
  const countdownRef = useRef(3);

  // Initialize positions from server players
  useEffect(() => {
    const me = players.find((p) => p.id === myId);
    if (me) {
      myRef.current = { ...myRef.current, x: me.x, y: me.y, angle: me.angle, speed: me.speed, lap: me.lap };
    }
  }, [players, myId]);

  // Init AI cars
  useEffect(() => {
    if (vsComputer) {
      aiRef.current = createAiCars(track, aiCount);
    }
  }, [vsComputer, aiCount, track]);

  // Countdown
  useEffect(() => {
    if (status !== "countdown" || !countdownEnds) return;
    const tick = () => {
      countdownRef.current = Math.max(0, Math.ceil((countdownEnds - Date.now()) / 1000));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [status, countdownEnds]);

  // Race start
  useEffect(() => {
    if (status === "racing" && raceStartRef.current === 0) {
      raceStartRef.current = Date.now();
      finishedRef.current = false;
      myRef.current.finished = false;
    }
  }, [status]);

  // Auto-focus canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.focus();
    }
  }, []);

  // Key handlers on window (not canvas) for reliability
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Main game loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 960;
    const H = 600;
    canvas.width = W;
    canvas.height = H;

    // Transform helpers
    const trackW = track.bounds.maxX - track.bounds.minX + 200;
    const trackH = track.bounds.maxY - track.bounds.minY + 200;
    const scale = Math.min(W / trackW, H / trackH) * 0.92;
    const ox = (W - (track.bounds.maxX - track.bounds.minX) * scale) / 2 - track.bounds.minX * scale + 100 * scale;
    const oy = (H - (track.bounds.maxY - track.bounds.minY) * scale) / 2 - track.bounds.minY * scale + 100 * scale;

    const m = myRef.current;
    let syncCounter = 0;

    const loop = (ts: number) => {
      const dt = lastFrameTime.current ? Math.min((ts - lastFrameTime.current) / 16.667, 3) : 1;
      lastFrameTime.current = ts;

      ctx.clearRect(0, 0, W, H);

      // ── Background ──
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      grad.addColorStop(0, "#12121f");
      grad.addColorStop(1, "#08080e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      // ── Track surface ──
      // Outer road
      ctx.strokeStyle = "#1e1e30";
      ctx.lineWidth = 90;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      track.checkpoints.forEach((cp, i) => (i === 0 ? ctx.moveTo(cp.x, cp.y) : ctx.lineTo(cp.x, cp.y)));
      ctx.closePath();
      ctx.stroke();

      // Inner road edge
      ctx.strokeStyle = "#252540";
      ctx.lineWidth = 78;
      ctx.beginPath();
      track.checkpoints.forEach((cp, i) => (i === 0 ? ctx.moveTo(cp.x, cp.y) : ctx.lineTo(cp.x, cp.y)));
      ctx.closePath();
      ctx.stroke();

      // Center dashed line
      ctx.strokeStyle = "#333355";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      track.checkpoints.forEach((cp, i) => (i === 0 ? ctx.moveTo(cp.x, cp.y) : ctx.lineTo(cp.x, cp.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Checkpoint halos ──
      const nextCp = (m.lastCheckpoint + 1) % track.checkpoints.length;
      track.checkpoints.forEach((cp, i) => {
        const isNext = i === nextCp && status === "racing";
        if (isNext) {
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, CHECKPOINT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,46,0,0.06)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,46,0,0.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // ── Start/Finish line ──
      const finishCp = track.checkpoints[track.checkpoints.length - 1];
      const prevCp = track.checkpoints[track.checkpoints.length - 2];
      const fAngle = Math.atan2(finishCp.y - prevCp.y, finishCp.x - prevCp.x) + Math.PI / 2;
      ctx.save();
      ctx.translate(finishCp.x, finishCp.y);
      ctx.rotate(fAngle);
      ctx.fillStyle = "#fff";
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 10; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillRect(-50 + c * 10, -20 + r * 10, 10, 10);
          }
        }
      }
      ctx.restore();

      // ── Physics ──
      if (status === "racing" && !m.finished) {
        const keys = keysRef.current;
        const up = keys.has("w") || keys.has("arrowup");
        const dn = keys.has("s") || keys.has("arrowdown");
        const lt = keys.has("a") || keys.has("arrowleft");
        const rt = keys.has("d") || keys.has("arrowright");

        if (up) m.speed = Math.min(MAX_SPEED, m.speed + ACCELERATION * dt);
        if (dn) m.speed = Math.max(-MAX_SPEED * 0.35, m.speed - BRAKE_DECEL * dt);
        m.speed *= 1 - FRICTION * dt;
        if (Math.abs(m.speed) < 0.01) m.speed = 0;

        if (Math.abs(m.speed) > 0.1) {
          const turnRate = TURN_SPEED * (1 - Math.abs(m.speed) / MAX_SPEED * 0.35);
          if (lt) m.angle -= turnRate * Math.sign(m.speed) * dt;
          if (rt) m.angle += turnRate * Math.sign(m.speed) * dt;
        }

        m.x += Math.cos(m.angle) * m.speed * dt;
        m.y += Math.sin(m.angle) * m.speed * dt;
        m.x = Math.max(track.bounds.minX, Math.min(track.bounds.maxX, m.x));
        m.y = Math.max(track.bounds.minY, Math.min(track.bounds.maxY, m.y));

        // Checkpoint
        const nc = (m.lastCheckpoint + 1) % track.checkpoints.length;
        const cdx = m.x - track.checkpoints[nc].x;
        const cdy = m.y - track.checkpoints[nc].y;
        if (Math.sqrt(cdx * cdx + cdy * cdy) < CHECKPOINT_RADIUS) {
          m.lastCheckpoint = nc;
          if (nc === track.checkpoints.length - 1) {
            m.lap += 1;
            if (m.lap >= track.laps && !finishedRef.current) {
              m.finished = true;
              finishedRef.current = true;
              onFinish?.((Date.now() - raceStartRef.current) / 1000);
            }
          }
        }

        // Sync to server
        syncCounter++;
        if (syncCounter % 6 === 0 && onPositionUpdate) {
          onPositionUpdate(m.x, m.y, m.angle, m.speed, m.lap);
        }
      }

      // ── Update AI ──
      if (vsComputer && status === "racing") {
        for (const ai of aiRef.current) {
          updateAi(ai, track, dt);
        }
      }

      // ── Draw all cars ──
      const drawCar = (x: number, y: number, angle: number, color: string, name: string, isMe: boolean, alpha: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Shadow
        ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
        ctx.beginPath();
        ctx.roundRect(-15, -6 + 3, 30, 12, 4);
        ctx.fill();

        // Body
        ctx.fillStyle = color.replace("1)", `${alpha})`);
        ctx.beginPath();
        ctx.roundRect(-15, -7, 30, 14, 4);
        ctx.fill();

        // Windshield
        ctx.fillStyle = `rgba(0,0,0,${0.6 * alpha})`;
        ctx.fillRect(5, -5, 5, 10);

        // Headlights
        ctx.fillStyle = `rgba(255,255,200,${0.9 * alpha})`;
        ctx.fillRect(14, -5, 2, 3);
        ctx.fillRect(14, 2, 2, 3);

        // Tail lights
        ctx.fillStyle = `rgba(255,30,30,${0.7 * alpha})`;
        ctx.fillRect(-15, -5, 2, 3);
        ctx.fillRect(-15, 2, 2, 3);

        ctx.restore();

        // Name
        ctx.fillStyle = isMe ? "#ff2e00" : `rgba(255,255,255,${0.7 * alpha})`;
        ctx.font = `bold ${isMe ? 10 : 8}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(name, x, y - 14);

        // Lap
        ctx.fillStyle = `rgba(255,255,255,${0.3 * alpha})`;
        ctx.font = "7px monospace";
        ctx.fillText(
          `L${Math.min((isMe ? myRef.current.lap : 0) + 1, track.laps)}/${track.laps}`,
          x, y + 20,
        );
      };

      // Draw AI cars first, then multiplayer others, then me on top
      if (vsComputer) {
        for (const ai of aiRef.current) {
          const col = ai.finished ? "rgba(100,100,180,1)" : "rgba(59,130,246,1)";
          drawCar(ai.x, ai.y, ai.angle, col, ai.name, false, ai.finished ? 0.5 : 1);
        }
      } else {
        for (const p of players) {
          if (p.id === myId) continue;
          drawCar(p.x, p.y, p.angle, "rgba(59,130,246,1)", p.name, false, p.finished ? 0.5 : 1);
        }
      }

      // Draw me
      drawCar(m.x, m.y, m.angle, "rgba(255,46,0,1)", "YOU", true, 1);

      ctx.restore();

      // ── HUD ──
      // Speed bar
      const speedPct = Math.abs(m.speed) / MAX_SPEED;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 100, H - 36, 200, 14, 7);
      ctx.fill();
      ctx.fillStyle = speedPct > 0.8 ? "#ff2e00" : speedPct > 0.5 ? "#f59e0b" : "#22c55e";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 100, H - 36, 200 * speedPct, 14, 7);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.abs(Math.round(m.speed * 30))} km/h`, W / 2, H - 26);

      // Lap + Position HUD
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.roundRect(12, 10, 140, 50, 8);
      ctx.fill();
      ctx.fillStyle = "#ff2e00";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`LAP ${Math.min(m.lap + 1, track.laps)}/${track.laps}`, 22, 32);

      // Position
      const allCars = vsComputer
        ? [{ id: myId, lap: m.lap, finished: m.finished }, ...aiRef.current.map((a) => ({ id: a.id, lap: a.lap, finished: a.finished }))]
        : [{ id: myId, lap: m.lap, finished: m.finished }, ...players.filter((p) => p.id !== myId).map((p) => ({ id: p.id, lap: p.lap, finished: p.finished }))];
      allCars.sort((a, b) => b.lap - a.lap);
      const pos = allCars.findIndex((c) => c.id === myId) + 1;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`POS ${pos}/${allCars.length}`, 22, 50);

      // Mini-map
      const mmW = 130, mmH = 90;
      const mmX = W - mmW - 14, mmY = H - mmH - 14;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath();
      ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 6);
      ctx.fill();

      const ms = Math.min(mmW / trackW, mmH / trackH) * 0.85;
      const mox = mmX + mmW / 2 - ((track.bounds.minX + track.bounds.maxX) / 2) * ms;
      const moy = mmY + mmH / 2 - ((track.bounds.minY + track.bounds.maxY) / 2) * ms;

      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      track.checkpoints.forEach((cp, i) => (i === 0 ? ctx.moveTo(mox + cp.x * ms, moy + cp.y * ms) : ctx.lineTo(mox + cp.x * ms, moy + cp.y * ms)));
      ctx.closePath();
      ctx.stroke();

      // Me on minimap
      ctx.beginPath();
      ctx.arc(mox + m.x * ms, moy + m.y * ms, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ff2e00";
      ctx.fill();

      // AI on minimap
      if (vsComputer) {
        for (const ai of aiRef.current) {
          ctx.beginPath();
          ctx.arc(mox + ai.x * ms, moy + ai.y * ms, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#3b82f6";
          ctx.fill();
        }
      }

      // ── Overlays ──
      if (status === "countdown") {
        const cd = countdownRef.current;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);
        if (cd > 0) {
          ctx.fillStyle = "#ff2e00";
          ctx.font = "bold 80px monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(cd), W / 2, H / 2 + 24);
        } else {
          ctx.fillStyle = "#22c55e";
          ctx.font = "bold 52px monospace";
          ctx.textAlign = "center";
          ctx.fillText("GO!", W / 2, H / 2 + 16);
        }
      }

      if (status === "racing" && raceStartRef.current > 0) {
        const elapsed = Date.now() - raceStartRef.current;
        if (elapsed < 1200) {
          const a = Math.max(0, 1 - elapsed / 1200);
          ctx.fillStyle = `rgba(34,197,94,${a})`;
          ctx.font = "bold 60px monospace";
          ctx.textAlign = "center";
          ctx.fillText("GO!", W / 2, H / 2 + 18);
        }
      }

      if (status === "finished") {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RACE COMPLETE", W / 2, H / 2);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameRef.current);
      lastFrameTime.current = 0;
    };
  }, [track, myId, players, status, vsComputer, aiCount, onPositionUpdate, onFinish]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full rounded-xl border border-apex-line bg-[#08080e] outline-none"
      style={{ maxWidth: 960, aspectRatio: "960/600" }}
      tabIndex={0}
      onFocus={(e) => e.currentTarget.focus()}
    />
  );
}

/**
 * RaceCanvas — Top-down multiplayer racing game rendered on HTML Canvas.
 *
 * Controls: W/A/S/D or Arrow keys.
 * Physics: acceleration, braking, steering with drift, friction.
 * Sync: reads/writes positions via Convex mutations/queries.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackDef } from "@/convex/race";

// ── Physics constants ──
const MAX_SPEED = 6;
const ACCELERATION = 0.12;
const BRAKE_DECEL = 0.18;
const FRICTION = 0.02;
const TURN_SPEED = 0.045;
const DRIFT_FACTOR = 0.92; // How much lateral velocity is kept (1 = no drift, 0 = full drift)
const OFF_TRACK_FRICTION = 0.08;
const CHECKPOINT_RADIUS = 60;

interface PlayerState {
  id: string;
  name: string;
  carId: string;
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
  onPositionUpdate: (x: number, y: number, angle: number, speed: number, lap: number) => void;
  onFinish: (finishTime: number) => void;
}

export function RaceCanvas({
  track,
  myId,
  players,
  status,
  countdownEnds,
  onPositionUpdate,
  onFinish,
}: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const myStateRef = useRef({ x: 0, y: 0, angle: 0, speed: 0, lap: 0, lastCheckpoint: -1 });
  const frameRef = useRef(0);
  const raceStartRef = useRef(0);
  const finishedRef = useRef(false);
  const [countdown, setCountdown] = useState(3);

  // Find my starting position
  const myPlayer = players.find((p) => p.id === myId);

  // Initialize position from server state
  useEffect(() => {
    if (myPlayer) {
      myStateRef.current.x = myPlayer.x;
      myStateRef.current.y = myPlayer.y;
      myStateRef.current.angle = myPlayer.angle;
      myStateRef.current.speed = myPlayer.speed;
      myStateRef.current.lap = myPlayer.lap;
    }
  }, [myPlayer]);

  // Countdown timer
  useEffect(() => {
    if (status !== "countdown" || !countdownEnds) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((countdownEnds - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [status, countdownEnds]);

  // Mark race start
  useEffect(() => {
    if (status === "racing" && raceStartRef.current === 0) {
      raceStartRef.current = Date.now();
      finishedRef.current = false;
    }
  }, [status]);

  // Key handlers
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
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scaleX = W / (track.bounds.maxX - track.bounds.minX + 200);
    const scaleY = H / (track.bounds.maxY - track.bounds.minY + 200);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (W - (track.bounds.maxX - track.bounds.minX) * scale) / 2 - track.bounds.minX * scale + 100 * scale;
    const offsetY = (H - (track.bounds.maxY - track.bounds.minY) * scale) / 2 - track.bounds.minY * scale + 100 * scale;

    const s = myStateRef.current;

    const gameLoop = () => {
      ctx.clearRect(0, 0, W, H);

      // Draw track background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Draw track surface (simplified road between checkpoints)
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw road
      ctx.strokeStyle = "#2a2a3e";
      ctx.lineWidth = 80;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      track.checkpoints.forEach((cp, i) => {
        if (i === 0) ctx.moveTo(cp.x, cp.y);
        else ctx.lineTo(cp.x, cp.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Road center line
      ctx.strokeStyle = "#3a3a4e";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      track.checkpoints.forEach((cp, i) => {
        if (i === 0) ctx.moveTo(cp.x, cp.y);
        else ctx.lineTo(cp.x, cp.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw checkpoints
      track.checkpoints.forEach((cp, i) => {
        const isNext = (s.lastCheckpoint + 1) % track.checkpoints.length === i;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, CHECKPOINT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = isNext ? "rgba(255,46,0,0.08)" : "rgba(255,255,255,0.02)";
        ctx.fill();
        ctx.strokeStyle = isNext ? "rgba(255,46,0,0.3)" : "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Checkpoint number
        ctx.fillStyle = isNext ? "rgba(255,46,0,0.4)" : "rgba(255,255,255,0.15)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(i + 1), cp.x, cp.y + 4);
      });

      // ── Physics (only during racing) ──
      if (status === "racing" && !finishedRef.current) {
        const keys = keysRef.current;
        const up = keys.has("w") || keys.has("arrowup");
        const down = keys.has("s") || keys.has("arrowdown");
        const left = keys.has("a") || keys.has("arrowleft");
        const right = keys.has("d") || keys.has("arrowright");

        // Acceleration
        if (up) s.speed = Math.min(MAX_SPEED, s.speed + ACCELERATION);
        if (down) s.speed = Math.max(-MAX_SPEED * 0.4, s.speed - BRAKE_DECEL);

        // Friction
        s.speed *= 1 - FRICTION;
        if (Math.abs(s.speed) < 0.01) s.speed = 0;

        // Steering (only when moving)
        if (Math.abs(s.speed) > 0.1) {
          const turnRate = TURN_SPEED * (1 - Math.abs(s.speed) / MAX_SPEED * 0.4);
          if (left) s.angle -= turnRate * Math.sign(s.speed);
          if (right) s.angle += turnRate * Math.sign(s.speed);
        }

        // Move
        const vx = Math.cos(s.angle) * s.speed;
        const vy = Math.sin(s.angle) * s.speed;
        s.x += vx;
        s.y += vy;

        // Boundary clamping
        s.x = Math.max(track.bounds.minX, Math.min(track.bounds.maxX, s.x));
        s.y = Math.max(track.bounds.minY, Math.min(track.bounds.maxY, s.y));

        // Checkpoint detection
        const nextIdx = (s.lastCheckpoint + 1) % track.checkpoints.length;
        const cp = track.checkpoints[nextIdx];
        const dx = s.x - cp.x;
        const dy = s.y - cp.y;
        if (Math.sqrt(dx * dx + dy * dy) < CHECKPOINT_RADIUS) {
          s.lastCheckpoint = nextIdx;
          // Completed a lap if we hit all checkpoints
          if (nextIdx === track.checkpoints.length - 1) {
            s.lap += 1;
            if (s.lap >= track.laps && !finishedRef.current) {
              finishedRef.current = true;
              const finishTime = (Date.now() - raceStartRef.current) / 1000;
              onFinish(finishTime);
            }
          }
        }

        // Sync to server (throttled to every 5 frames)
        frameRef.current++;
        if (frameRef.current % 5 === 0) {
          onPositionUpdate(s.x, s.y, s.angle, s.speed, s.lap);
        }
      }

      // Draw all players
      const allPlayers: PlayerState[] = players.map((p) => {
        if (p.id === myId) {
          return { ...p, x: s.x, y: s.y, angle: s.angle, speed: s.speed, lap: s.lap };
        }
        return p;
      });

      // Sort: draw finished players dimmer
      allPlayers.sort((a, b) => (a.id === myId ? 1 : 0) - (b.id === myId ? 1 : 0));

      allPlayers.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        const isMe = p.id === myId;
        const alpha = p.finished ? 0.5 : 1;

        // Car shadow
        ctx.fillStyle = `rgba(0,0,0,${0.4 * alpha})`;
        ctx.fillRect(-14, -7 + 3, 28, 14);

        // Car body
        ctx.fillStyle = isMe
          ? `rgba(255,46,0,${alpha})`
          : `rgba(59,130,246,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(-14, -7, 28, 14, 3);
        ctx.fill();

        // Windshield
        ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
        ctx.fillRect(4, -5, 6, 10);

        // Headlights
        ctx.fillStyle = `rgba(255,255,200,${0.8 * alpha})`;
        ctx.fillRect(13, -5, 2, 3);
        ctx.fillRect(13, 2, 2, 3);

        ctx.restore();

        // Name tag
        ctx.fillStyle = isMe ? "#ff2e00" : "rgba(255,255,255,0.6)";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x, p.y - 14);

        // Lap indicator
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "8px monospace";
        ctx.fillText(
          p.finished ? `P${p.placement ?? "?"}` : `L${Math.min(p.lap + 1, track.laps)}/${track.laps}`,
          p.x,
          p.y + 20,
        );
      });

      ctx.restore();

      // HUD: Mini-map
      drawMiniMap(ctx, track, allPlayers, myId, W, H);

      // HUD: Lap counter
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`LAP ${Math.min(s.lap + 1, track.laps)}/${track.laps}`, 16, 28);

      // HUD: Speed
      ctx.textAlign = "right";
      ctx.fillText(`${Math.abs(Math.round(s.speed * 30))} km/h`, W - 16, 28);

      // HUD: Position
      const myPlace = allPlayers
        .filter((p) => !p.finished || (p.placement ?? 99) < 99)
        .sort((a, b) => {
          if (a.lap !== b.lap) return b.lap - a.lap;
          return 0;
        });
      const place = myPlace.findIndex((p) => p.id === myId) + 1;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff2e00";
      ctx.font = "bold 18px monospace";
      ctx.fillText(`${place}/${allPlayers.length}`, W / 2, 28);

      // Countdown overlay
      if (status === "countdown" && countdown > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ff2e00";
        ctx.font = "bold 72px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(countdown), W / 2, H / 2 + 20);
      }

      // "GO!" flash
      if (status === "racing" && raceStartRef.current > 0) {
        const elapsed = Date.now() - raceStartRef.current;
        if (elapsed < 1500) {
          const alpha = Math.max(0, 1 - elapsed / 1500);
          ctx.fillStyle = `rgba(255,46,0,${alpha})`;
          ctx.font = "bold 56px monospace";
          ctx.textAlign = "center";
          ctx.fillText("GO!", W / 2, H / 2 + 16);
        }
      }

      // Finished overlay
      if (status === "finished") {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RACE COMPLETE", W / 2, H / 2 - 10);
      }

      frameRef.current = requestAnimationFrame(gameLoop);
    };

    frameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [track, myId, players, status, countdown, onPositionUpdate, onFinish]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={600}
      className="w-full rounded-xl border border-apex-line bg-[#0a0a1a]"
      style={{ maxWidth: 960, aspectRatio: "960/600" }}
      tabIndex={0}
    />
  );
}

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  track: TrackDef,
  players: PlayerState[],
  myId: string,
  W: number,
  H: number,
) {
  const mmW = 140;
  const mmH = 100;
  const mmX = W - mmW - 12;
  const mmY = H - mmH - 12;

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 6);
  ctx.fill();

  const scaleX = mmW / (track.bounds.maxX - track.bounds.minX + 200);
  const scaleY = mmH / (track.bounds.maxY - track.bounds.minY + 200);
  const s = Math.min(scaleX, scaleY);
  const ox = mmX + (mmW - (track.bounds.maxX - track.bounds.minX) * s) / 2 - track.bounds.minX * s + 100 * s;
  const oy = mmY + (mmH - (track.bounds.maxY - track.bounds.minY) * s) / 2 - track.bounds.minY * s + 100 * s;

  // Track
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  track.checkpoints.forEach((cp, i) => {
    if (i === 0) ctx.moveTo(ox + cp.x * s, oy + cp.y * s);
    else ctx.lineTo(ox + cp.x * s, oy + cp.y * s);
  });
  ctx.closePath();
  ctx.stroke();

  // Players
  players.forEach((p) => {
    ctx.beginPath();
    ctx.arc(ox + p.x * s, oy + p.y * s, p.id === myId ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = p.id === myId ? "#ff2e00" : "#3b82f6";
    ctx.fill();
  });
}

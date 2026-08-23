/**
 * RaceCanvas — Professional top-down racer with self-contained game loop.
 * Countdown, physics, AI, HUD — all internal. No external timer dependencies.
 * Mode: "multiplayer" reads positions from props; "computer" runs AI locally.
 */
import { useCallback, useEffect, useRef } from "react";

const MAX_SPEED = 5.5;
const ACCEL = 0.14;
const BRAKE = 0.22;
const FRICTION = 0.025;
const TURN = 0.052;
const CP_RADIUS = 70;

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
  x: number; y: number; angle: number; speed: number;
  lap: number; finished: boolean; finishTime?: number; placement?: number;
}

interface AiCar {
  id: string; name: string;
  x: number; y: number; angle: number; speed: number;
  lap: number; lastCp: number; finished: boolean; finishTime?: number; placement?: number;
  target: number; skill: number;
}

interface Props {
  track: TrackDef;
  myId: string;
  players: PlayerState[];
  /** "multiplayer" = positions from server props; "computer" = local AI */
  mode: "multiplayer" | "computer";
  /** For multiplayer: initial status from lobby */
  lobbyStatus?: "waiting" | "countdown" | "racing" | "finished";
  countdownSec?: number;
  aiCount?: number;
  onPositionUpdate?: (x: number, y: number, angle: number, speed: number, lap: number) => void;
  onFinish?: (time: number) => void;
}

const AI_NAMES = ["Phantom", "Blitz", "Vortex", "Storm", "Ace", "Nova", "Turbo", "Ghost"];

function makeAi(track: TrackDef, count: number): AiCar[] {
  return Array.from({ length: count }, (_, i) => {
    const s = track.spawns[Math.min(i + 1, track.spawns.length - 1)];
    return {
      id: `ai${i}`, name: AI_NAMES[i % AI_NAMES.length],
      x: s.x, y: s.y, angle: s.angle, speed: 0,
      lap: 0, lastCp: -1, finished: false,
      target: 2.8 + Math.random() * 2.2, skill: 0.45 + Math.random() * 0.35,
    };
  });
}

function tickAi(ai: AiCar, track: TrackDef, dt: number) {
  if (ai.finished) return;
  const ni = (ai.lastCp + 1) % track.checkpoints.length;
  const cp = track.checkpoints[ni];
  const dx = cp.x - ai.x, dy = cp.y - ai.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ta = Math.atan2(dy, dx);
  let ad = ta - ai.angle;
  while (ad > Math.PI) ad -= Math.PI * 2;
  while (ad < -Math.PI) ad += Math.PI * 2;
  ai.angle += ad * (0.07 + ai.skill * 0.06) * dt;
  const sev = Math.abs(ad);
  const want = sev > 0.8 ? ai.target * 0.45 : sev > 0.3 ? ai.target * 0.7 : ai.target;
  if (ai.speed < want) ai.speed = Math.min(want, ai.speed + ACCEL * dt);
  else ai.speed = Math.max(want, ai.speed - BRAKE * 0.4 * dt);
  ai.speed *= 1 - FRICTION * dt;
  ai.x += Math.cos(ai.angle) * ai.speed * dt;
  ai.y += Math.sin(ai.angle) * ai.speed * dt;
  ai.x = Math.max(track.bounds.minX, Math.min(track.bounds.maxX, ai.x));
  ai.y = Math.max(track.bounds.minY, Math.min(track.bounds.maxY, ai.y));
  if (dist < CP_RADIUS) {
    ai.lastCp = ni;
    if (ni === track.checkpoints.length - 1) {
      ai.lap += 1;
      if (ai.lap >= track.laps) ai.finished = true;
    }
  }
}

export function RaceCanvas({
  track, myId, players, mode, lobbyStatus, countdownSec = 3, aiCount = 3,
  onPositionUpdate, onFinish,
}: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const m = useRef({ x: 0, y: 0, a: 0, s: 0, lap: 0, cp: -1, done: false });
  const ais = useRef<AiCar[]>([]);
  const rf = useRef(0);
  const lt = useRef(0);
  const raceT = useRef(0); // ms since race start
  const cdEnd = useRef(0); // countdown end time (performance.now based)
  const phase = useRef<"countdown" | "racing" | "finished">("countdown");
  const myDone = useRef(false);

  // Init AI
  useEffect(() => { if (mode === "computer") ais.current = makeAi(track, aiCount); }, [mode, aiCount, track]);

  // Init position from server
  useEffect(() => {
    const me = players.find(p => p.id === myId);
    if (me) { m.current.x = me.x; m.current.y = me.y; m.current.a = me.angle; m.current.s = me.speed; m.current.lap = me.lap; }
  }, [players, myId]);

  // Start countdown when lobbyStatus changes to countdown
  useEffect(() => {
    if (mode === "multiplayer" && lobbyStatus === "countdown") {
      cdEnd.current = performance.now() + countdownSec * 1000;
      phase.current = "countdown";
      myDone.current = false;
      raceT.current = 0;
      m.current.cp = -1;
      m.current.lap = 0;
      m.current.done = false;
      ais.current = makeAi(track, aiCount);
    }
    if (mode === "computer") {
      cdEnd.current = performance.now() + countdownSec * 1000;
      phase.current = "countdown";
      myDone.current = false;
      raceT.current = 0;
      m.current.cp = -1;
      m.current.lap = 0;
      m.current.done = false;
    }
  }, [mode, lobbyStatus, countdownSec, track, aiCount]);

  // Auto-start racing phase when multiplayer status says racing
  useEffect(() => {
    if (mode === "multiplayer" && lobbyStatus === "racing" && phase.current === "countdown") {
      phase.current = "racing";
      raceT.current = 0;
    }
  }, [mode, lobbyStatus]);

  // Keys
  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
        e.preventDefault(); keys.current.add(k);
      }
    };
    const u = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", d, { passive: false });
    window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  // Auto focus
  useEffect(() => { cvRef.current?.focus(); }, []);

  // ── GAME LOOP ──
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = 960, H = 600;
    cv.width = W; cv.height = H;

    const tW = track.bounds.maxX - track.bounds.minX + 200;
    const tH = track.bounds.maxY - track.bounds.minY + 200;
    const sc = Math.min(W / tW, H / tH) * 0.9;
    const ox = (W - (track.bounds.maxX - track.bounds.minX) * sc) / 2 - track.bounds.minX * sc + 100 * sc;
    const oy = (H - (track.bounds.maxY - track.bounds.minY) * sc) / 2 - track.bounds.minY * sc + 100 * sc;

    let syncN = 0;
    const p = m.current;

    const loop = (ts: number) => {
      const dt = lt.current ? Math.min((ts - lt.current) / 16.667, 3) : 1;
      lt.current = ts;

      // ── Phase logic ──
      if (phase.current === "countdown" && performance.now() >= cdEnd.current) {
        phase.current = "racing";
        raceT.current = 0;
      }
      if (phase.current === "racing") raceT.current += dt * 16.667;

      // ── Clear ──
      const g = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.7);
      g.addColorStop(0,"#12121f"); g.addColorStop(1,"#08080e");
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

      ctx.save(); ctx.translate(ox,oy); ctx.scale(sc,sc);

      // ── Track ──
      ctx.strokeStyle="#1c1c2e"; ctx.lineWidth=92; ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.beginPath(); track.checkpoints.forEach((c,i)=>i===0?ctx.moveTo(c.x,c.y):ctx.lineTo(c.x,c.y)); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle="#222238"; ctx.lineWidth=80;
      ctx.beginPath(); track.checkpoints.forEach((c,i)=>i===0?ctx.moveTo(c.x,c.y):ctx.lineTo(c.x,c.y)); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle="#2a2a45"; ctx.lineWidth=1.5; ctx.setLineDash([14,14]);
      ctx.beginPath(); track.checkpoints.forEach((c,i)=>i===0?ctx.moveTo(c.x,c.y):ctx.lineTo(c.x,c.y)); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);

      // ── Start/finish checkerboard ──
      const fc=track.checkpoints[track.checkpoints.length-1], pc=track.checkpoints[track.checkpoints.length-2];
      const fa=Math.atan2(fc.y-pc.y,fc.x-pc.x)+Math.PI/2;
      ctx.save(); ctx.translate(fc.x,fc.y); ctx.rotate(fa);
      for(let r=0;r<4;r++)for(let c=0;c<10;c++){if((r+c)%2===0){ctx.fillStyle="#ddd";ctx.fillRect(-50+c*10,-20+r*10,10,10);}}
      ctx.restore();

      // ── Checkpoint glow ──
      const nc=(p.cp+1)%track.checkpoints.length;
      track.checkpoints.forEach((cp,i)=>{
        if(i===nc && phase.current==="racing"){
          ctx.beginPath(); ctx.arc(cp.x,cp.y,CP_RADIUS,0,Math.PI*2);
          ctx.fillStyle="rgba(255,46,0,0.06)"; ctx.fill();
          ctx.strokeStyle="rgba(255,46,0,0.2)"; ctx.lineWidth=1.5; ctx.stroke();
        }
      });

      // ── Physics ──
      if (phase.current==="racing" && !p.done) {
        const k=keys.current;
        if(k.has("w")||k.has("arrowup")) p.s=Math.min(MAX_SPEED,p.s+ACCEL*dt);
        if(k.has("s")||k.has("arrowdown")) p.s=Math.max(-MAX_SPEED*0.35,p.s-BRAKE*dt);
        p.s*=1-FRICTION*dt;
        if(Math.abs(p.s)<0.01)p.s=0;
        if(Math.abs(p.s)>0.1){const tr=TURN*(1-Math.abs(p.s)/MAX_SPEED*0.35);if(k.has("a")||k.has("arrowleft"))p.a-=tr*Math.sign(p.s)*dt;if(k.has("d")||k.has("arrowright"))p.a+=tr*Math.sign(p.s)*dt;}
        p.x+=Math.cos(p.a)*p.s*dt; p.y+=Math.sin(p.a)*p.s*dt;
        p.x=Math.max(track.bounds.minX,Math.min(track.bounds.maxX,p.x));
        p.y=Math.max(track.bounds.minY,Math.min(track.bounds.maxY,p.y));
        const cdx=p.x-track.checkpoints[nc].x, cdy=p.y-track.checkpoints[nc].y;
        if(Math.sqrt(cdx*cdx+cdy*cdy)<CP_RADIUS){
          p.cp=nc;
          if(nc===track.checkpoints.length-1){p.lap++;if(p.lap>=track.laps&&!myDone.current){p.done=true;myDone.current=true;phase.current="finished";onFinish?.(raceT.current/1000);}}
        }
        syncN++; if(syncN%6===0&&onPositionUpdate) onPositionUpdate(p.x,p.y,p.a,p.s,p.lap);
      }

      // AI
      if(mode==="computer"&&phase.current==="racing"){for(const ai of ais.current)tickAi(ai,track,dt);}

      // ── Draw cars ──
      const drawCar=(x:number,y:number,a:number,col:string,name:string,isMe:boolean,al:number)=>{
        ctx.save(); ctx.translate(x,y); ctx.rotate(a);
        ctx.fillStyle=`rgba(0,0,0,${0.5*al})`; ctx.beginPath(); ctx.roundRect(-15,-6+3,30,12,4); ctx.fill();
        ctx.fillStyle=col.replace(/[\d.]+\)$/,`${al})`); ctx.beginPath(); ctx.roundRect(-15,-7,30,14,4); ctx.fill();
        ctx.fillStyle=`rgba(0,0,0,${0.6*al})`; ctx.fillRect(5,-5,5,10);
        ctx.fillStyle=`rgba(255,255,200,${0.9*al})`; ctx.fillRect(14,-5,2,3); ctx.fillRect(14,2,2,3);
        ctx.fillStyle=`rgba(255,30,30,${0.7*al})`; ctx.fillRect(-15,-5,2,3); ctx.fillRect(-15,2,2,3);
        ctx.restore();
        ctx.fillStyle=isMe?"#ff2e00":`rgba(255,255,255,${0.7*al})`; ctx.font=`bold ${isMe?10:8}px sans-serif`; ctx.textAlign="center"; ctx.fillText(name,x,y-14);
      };

      // Draw AI
      if(mode==="computer"){for(const ai of ais.current)drawCar(ai.x,ai.y,ai.angle,ai.finished?"rgba(100,100,180,1)":"rgba(59,130,246,1)",ai.name,false,ai.finished?0.5:1);}
      // Draw others
      if(mode==="multiplayer"){for(const pl of players){if(pl.id===myId)continue;drawCar(pl.x,pl.y,pl.angle,"rgba(59,130,246,1)",pl.name,false,pl.finished?0.5:1);}}
      // Draw me
      drawCar(p.x,p.y,p.a,"rgba(255,46,0,1)","YOU",true,1);

      ctx.restore();

      // ── HUD ──

      // Top-left: POS + LAP
      ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(12,10,200,56,10); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 18px monospace"; ctx.textAlign="left";
      const allC=mode==="computer"
        ?[{id:myId,lap:p.lap,d:p.done},...ais.current.map(a=>({id:a.id,lap:a.lap,d:a.finished}))]
        :[{id:myId,lap:p.lap,d:p.done},...players.filter(q=>q.id!==myId).map(q=>({id:q.id,lap:q.lap,d:q.finished}))];
      allC.sort((a,b)=>b.lap-a.lap);
      const pos=allC.findIndex(c=>c.id===myId)+1;
      ctx.fillText(`POS ${pos}/${allC.length}`,22,32);
      ctx.fillStyle="#aaa"; ctx.font="14px monospace";
      ctx.fillText(`LAP ${Math.min(p.lap+1,track.laps)}/${track.laps}`,22,52);

      // Top-left: Timer
      const secs=Math.floor(raceT.current/1000);
      const ms=Math.floor((raceT.current%1000)/10);
      ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(12,74,140,32,8); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 16px monospace"; ctx.textAlign="left";
      ctx.fillText(`TIME ${String(secs).padStart(2,"0")}:${String(ms).padStart(2,"0")}`,22,95);

      // Top-right: Leaderboard
      const lb=allC.sort((a,b)=>b.lap-a.lap);
      const lbW=180, lbH=30+lb.length*28;
      ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(W-lbW-12,10,lbW,lbH,10); ctx.fill();
      ctx.font="bold 11px monospace"; ctx.textAlign="right";
      lb.forEach((c,i)=>{
        const isMe=c.id===myId;
        ctx.fillStyle=isMe?"#ff2e00":"#888";
        const nm=isMe?"YOU":mode==="computer"?ais.current.find(a=>a.id===c.id)?.name??c.id:players.find(q=>q.id===c.id)?.name??c.id;
        ctx.fillText(`${i+1}. ${nm.toUpperCase()}`,W-22,34+i*28);
      });

      // Bottom-center: Speed
      const spd=Math.abs(Math.round(p.s*30));
      ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(W/2-80,H-50,160,40,10); ctx.fill();
      ctx.fillStyle=spd>120?"#ff2e00":spd>80?"#f59e0b":"#22c55e";
      ctx.font="bold 22px monospace"; ctx.textAlign="center";
      ctx.fillText(`${spd}`,W/2,H-24);
      ctx.fillStyle="#888"; ctx.font="10px monospace";
      ctx.fillText("KMPH",W/2,H-14);

      // Bottom-left: Mini-map
      const mmW=120,mmH=80,mmX=12,mmY=H-mmH-12;
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(mmX-4,mmY-4,mmW+8,mmH+8,6); ctx.fill();
      const ms2=Math.min(mmW/tW,mmH/tH)*0.85;
      const mo2x=mmX+mmW/2-((track.bounds.minX+track.bounds.maxX)/2)*ms2;
      const mo2y=mmY+mmH/2-((track.bounds.minY+track.bounds.maxY)/2)*ms2;
      ctx.strokeStyle="#333"; ctx.lineWidth=1.5;
      ctx.beginPath(); track.checkpoints.forEach((cp,i)=>i===0?ctx.moveTo(mo2x+cp.x*ms2,mo2y+cp.y*ms2):ctx.lineTo(mo2x+cp.x*ms2,mo2y+cp.y*ms2)); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(mo2x+p.x*ms2,mo2y+p.y*ms2,3,0,Math.PI*2); ctx.fillStyle="#ff2e00"; ctx.fill();
      if(mode==="computer"){for(const ai of ais.current){ctx.beginPath();ctx.arc(mo2x+ai.x*ms2,mo2y+ai.y*ms2,2,0,Math.PI*2);ctx.fillStyle="#3b82f6";ctx.fill();}}

      // ── Overlays ──
      if(phase.current==="countdown"){
        const rem=Math.max(0,Math.ceil((cdEnd.current-performance.now())/1000));
        ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,0,W,H);
        if(rem>0){
          ctx.fillStyle="#ff2e00"; ctx.font="bold 90px monospace"; ctx.textAlign="center"; ctx.fillText(String(rem),W/2,H/2+28);
        }else{
          ctx.fillStyle="#22c55e"; ctx.font="bold 60px monospace"; ctx.textAlign="center"; ctx.fillText("GO!",W/2,H/2+20);
          if(performance.now()-cdEnd.current>1000) phase.current="racing";
        }
      }

      if(phase.current==="finished"){
        ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,W,H);
        ctx.fillStyle="#fff"; ctx.font="bold 40px monospace"; ctx.textAlign="center"; ctx.fillText("RACE COMPLETE",W/2,H/2-10);
        ctx.fillStyle="#aaa"; ctx.font="18px monospace"; ctx.fillText(`Time: ${(raceT.current/1000).toFixed(1)}s`,W/2,H/2+24);
      }

      rf.current=requestAnimationFrame(loop);
    };
    rf.current=requestAnimationFrame(loop);
    return ()=>{cancelAnimationFrame(rf.current);lt.current=0;};
  },[track,myId,players,mode,lobbyStatus,countdownSec,aiCount,onPositionUpdate,onFinish]);

  return (
    <canvas
      ref={cvRef}
      className="block w-full rounded-xl border border-apex-line bg-[#08080e] outline-none"
      style={{ maxWidth:960, aspectRatio:"960/600" }}
      tabIndex={0}
      onFocus={(e)=>e.currentTarget.focus()}
    />
  );
}

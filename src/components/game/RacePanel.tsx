import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, Flag, Globe, Plus, Swords, Users } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TRACKS as SERVER_TRACKS } from "@/convex/race";
import { useAuth } from "@/hooks/use-auth";
import { RaceCanvas } from "./RaceCanvas";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type View = "browser" | "lobby" | "racing";

const TRACK_LIST = [
  { id: "city-circuit", name: "City Circuit", desc: "3 laps · Technical turns", icon: "🏙️" },
  { id: "speed-ring", name: "Speed Ring", desc: "3 laps · High-speed oval", icon: "⚡" },
];

function getTrackDef(id: string) {
  return (SERVER_TRACKS.find((t) => t.id === id) ?? SERVER_TRACKS[0]) as any;
}

export function RacePanel({ state, dispatch }: { state: any; dispatch: React.Dispatch<any> }) {
  const { user } = useAuth();
  const myId = user?._id;

  const [view, setView] = useState<View>("browser");
  const [selectedTrack, setSelectedTrack] = useState("city-circuit");
  const [lobbyId, setLobbyId] = useState<Id<"raceLobbies"> | null>(null);
  const [aiMode, setAiMode] = useState(false);
  const [aiFinished, setAiFinished] = useState(false);

  const createLobby = useMutation(api.race.createLobby);
  const joinLobbyM = useMutation(api.race.joinLobby);
  const leaveLobbyM = useMutation(api.race.leaveLobby);
  const deleteLobbyM = useMutation(api.race.deleteLobby);
  const startCountdown = useMutation(api.race.startCountdown);
  const beginRaceM = useMutation(api.race.beginRace);
  const updatePositionM = useMutation(api.race.updatePosition);
  const finishRaceM = useMutation(api.race.finishRace);
  const cleanupStale = useMutation(api.race.cleanupStaleLobbies);

  const myLobby = useQuery(api.race.getMyLobby);
  const lobbies = useQuery(api.race.listLobbies);

  // ── Sync multiplayer view from server ──
  useEffect(() => {
    if (!myLobby || aiMode) return;
    setLobbyId(myLobby._id);
    if (myLobby.status === "waiting") setView("lobby");
    else if (myLobby.status === "countdown" || myLobby.status === "racing") setView("racing");
    else if (myLobby.status === "finished") setView("lobby");

    // Auto-transition countdown → racing
    if (myLobby.status === "countdown" && myLobby.countdownEnds) {
      const msLeft = myLobby.countdownEnds - Date.now();
      if (msLeft <= 0) {
        void beginRaceM({ lobbyId: myLobby._id });
      } else {
        const t = setTimeout(() => void beginRaceM({ lobbyId: myLobby._id }), msLeft + 200);
        return () => clearTimeout(t);
      }
    }
  }, [myLobby, aiMode, beginRaceM]);

  const handleCreate = useCallback(async (trackId: string) => {
    try {
      const id = await createLobby({ trackId });
      setLobbyId(id);
      setAiMode(false);
      setView("lobby");
      toast.success("Lobby created!");
    } catch (e: any) { toast.error(e.message); }
  }, [createLobby]);

  const handleJoin = useCallback(async (lid: Id<"raceLobbies">) => {
    try {
      await joinLobbyM({ lobbyId: lid, carId: "starter" });
      setLobbyId(lid);
      setAiMode(false);
      setView("lobby");
      toast.success("Joined!");
    } catch (e: any) { toast.error(e.message); }
  }, [joinLobbyM]);

  const handleLeave = useCallback(async () => {
    await leaveLobbyM();
    setLobbyId(null);
    setAiMode(false);
    setView("browser");
  }, [leaveLobbyM]);

  const handleDelete = useCallback(async () => {
    if (lobbyId) { await deleteLobbyM({ lobbyId }); setLobbyId(null); setView("browser"); }
  }, [lobbyId, deleteLobbyM]);

  const handleStart = useCallback(async () => {
    if (lobbyId) { try { await startCountdown({ lobbyId }); } catch (e: any) { toast.error(e.message); } }
  }, [lobbyId, startCountdown]);

  const handlePosUpdate = useCallback(async (x: number, y: number, angle: number, speed: number, lap: number) => {
    if (lobbyId) await updatePositionM({ lobbyId, x, y, angle, speed, lap });
  }, [lobbyId, updatePositionM]);

  const handleFinish = useCallback(async (finishTime: number) => {
    if (lobbyId) { await finishRaceM({ lobbyId, finishTime }); toast.success(`Finished in ${finishTime.toFixed(1)}s!`); }
  }, [lobbyId, finishRaceM]);

  // Cleanup stale lobbies
  useEffect(() => {
    const id = setInterval(() => void cleanupStale(), 30_000);
    return () => clearInterval(id);
  }, [cleanupStale]);

  // Launch vs Computer
  const startAi = (trackId: string) => {
    setSelectedTrack(trackId);
    setAiMode(true);
    setAiFinished(false);
    setView("racing");
  };

  const lobby = myLobby;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">Multiplayer</p>
          <h2 className="mt-1 font-display text-2xl font-black text-white">RACE</h2>
        </div>
        {view !== "browser" && (
          <button type="button" onClick={aiMode ? () => { setAiMode(false); setView("browser"); } : handleLeave}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 transition-colors hover:border-apex-red hover:text-white">
            <ArrowLeft className="size-3.5" /> Leave
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── BROWSER ── */}
        {view === "browser" && (
          <motion.div key="browser" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Vs Computer */}
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/15"><Bot className="size-5 text-green-400" /></div>
                <div>
                  <p className="font-display text-sm font-bold text-white">Race Vs Computer</p>
                  <p className="text-[11px] text-white/40">Practice against AI opponents — instant play</p>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {TRACK_LIST.map((t) => (
                  <button key={t.id} type="button" onClick={() => setSelectedTrack(t.id)}
                    className={cn("rounded-lg border p-3 text-left transition-all", selectedTrack === t.id ? "border-green-500 bg-green-500/10" : "border-apex-line bg-[#0a0a0c] hover:border-white/20")}>
                    <span className="text-2xl">{t.icon}</span>
                    <p className="mt-1 font-display text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-white/35">{t.desc}</p>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => startAi(selectedTrack)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-green-700">
                <Bot className="size-4" /> Start Race
              </button>
            </div>

            {/* Create multiplayer */}
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-apex-red/15"><Plus className="size-5 text-apex-red" /></div>
                <div>
                  <p className="font-display text-sm font-bold text-white">Create Multiplayer Race</p>
                  <p className="text-[11px] text-white/40">Host a race for others to join</p>
                </div>
              </div>
              <button type="button" onClick={() => handleCreate(selectedTrack)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-apex-red py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-apex-red/80">
                <Flag className="size-4" /> Create Race
              </button>
            </div>

            {/* Open lobbies */}
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15"><Globe className="size-5 text-blue-400" /></div>
                <div>
                  <p className="font-display text-sm font-bold text-white">Open Lobbies</p>
                  <p className="text-[11px] text-white/40">Join an existing race</p>
                </div>
              </div>
              {!lobbies || lobbies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-[#0a0a0c] py-8 text-center">
                  <Users className="mx-auto size-8 text-white/15" />
                  <p className="mt-2 text-sm text-white/30">No open lobbies</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lobbies.map((l) => (
                    <div key={l._id} className="flex items-center justify-between rounded-lg border border-apex-line bg-[#0a0a0c] p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{TRACK_LIST.find((t) => t.id === l.trackId)?.icon ?? "🏁"}</span>
                        <div>
                          <p className="font-display text-xs font-bold text-white">{l.hostName}'s Race</p>
                          <p className="text-[10px] text-white/35">{l.trackName} · {l.playerCount}/8</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleJoin(l._id)}
                        className="rounded-md bg-apex-red/80 px-4 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:bg-apex-red">Join</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-white/50">Controls</p>
              <div className="grid grid-cols-3 gap-3">
                {[{ k: "W / ↑", l: "Accelerate" }, { k: "S / ↓", l: "Brake" }, { k: "A/D / ←→", l: "Steer" }].map((c) => (
                  <div key={c.k} className="rounded-lg bg-[#0a0a0c] p-3 text-center">
                    <p className="font-display text-sm font-bold text-apex-red">{c.k}</p>
                    <p className="mt-1 text-[10px] text-white/35">{c.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LOBBY (multiplayer) ── */}
        {view === "lobby" && lobby && !aiMode && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-display text-sm font-bold text-white">{lobby.hostName}'s Race</p>
                  <p className="text-[11px] text-white/40">{TRACK_LIST.find((t) => t.id === lobby.trackId)?.name}</p>
                </div>
                <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-[10px] font-bold uppercase text-yellow-400">
                  {lobby.status === "waiting" ? "Waiting" : lobby.status === "countdown" ? "Starting" : lobby.status === "racing" ? "In Progress" : "Done"}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Players ({lobby.players.length}/8)</p>
                {lobby.players.map((p, i) => (
                  <div key={p._id} className="flex items-center gap-3 rounded-lg border border-apex-line bg-[#0a0a0c] p-3">
                    <div className={cn("flex size-8 items-center justify-center rounded-full font-display text-xs font-bold", i === 0 ? "bg-apex-red/20 text-apex-red" : "bg-white/5 text-white/40")}>{i + 1}</div>
                    <p className="flex-1 font-display text-sm font-bold text-white">{p.playerName}{p.userId === myId && <span className="ml-2 text-[9px] text-apex-red">(You)</span>}</p>
                    {p.userId === lobby.hostId && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">Host</span>}
                  </div>
                ))}
                {lobby.players.length < 8 && <div className="rounded-lg border border-dashed border-white/10 py-3 text-center"><p className="text-[11px] text-white/25">Waiting for players... ({lobby.players.length}/8)</p></div>}
              </div>
              <div className="mt-4 flex gap-2">
                {lobby.hostId === myId && lobby.players.length >= 1 && (
                  <button type="button" onClick={handleStart} disabled={lobby.status !== "waiting"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-apex-red py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">
                    <Swords className="size-4" /> Start Race
                  </button>
                )}
                <button type="button" onClick={lobby.hostId === myId ? handleDelete : handleLeave}
                  className="rounded-lg border border-white/15 px-6 py-3 font-display text-[11px] font-bold uppercase text-white/50 hover:border-red-500 hover:text-red-400">
                  {lobby.hostId === myId ? "Disband" : "Leave"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── RACING (multiplayer) ── */}
        {view === "racing" && lobby && myId && !aiMode && (
          <motion.div key="mp-race" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <RaceCanvas
              track={getTrackDef(lobby.trackId)}
              myId={myId}
              players={lobby.players.map((p) => ({
                id: p.userId, name: p.playerName,
                x: p.x, y: p.y, angle: p.angle, speed: p.speed,
                lap: p.lap, finished: p.finished, finishTime: p.finishTime, placement: p.placement,
              }))}
              mode="multiplayer"
              lobbyStatus={lobby.status as any}
              countdownSec={3}
              onPositionUpdate={handlePosUpdate}
              onFinish={handleFinish}
            />
            {lobby.status === "finished" && (
              <div className="mt-4 rounded-xl border border-apex-line bg-apex-panel p-5">
                <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white">Race Results</p>
                {[...lobby.players].filter((p) => p.finished).sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)).map((p) => (
                  <div key={p._id} className={cn("flex items-center gap-3 rounded-lg border p-3 mb-2", p.userId === myId ? "border-apex-red/30 bg-apex-red/5" : "border-apex-line bg-[#0a0a0c]")}>
                    <span className={cn("flex size-8 items-center justify-center rounded-full font-display text-sm font-bold", p.placement === 1 ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-white/30")}>{p.placement ?? "?"}</span>
                    <p className="flex-1 font-display text-sm font-bold text-white">{p.playerName}{p.userId === myId && <span className="ml-2 text-[9px] text-apex-red">(You)</span>}</p>
                    <span className="text-[11px] text-white/40">{p.finishTime?.toFixed(1)}s</span>
                  </div>
                ))}
                <button type="button" onClick={() => { setView("browser"); setLobbyId(null); void leaveLobbyM(); }}
                  className="mt-3 w-full rounded-lg border border-apex-red/40 bg-apex-red/10 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white hover:bg-apex-red">Back</button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── RACING (vs Computer) ── */}
        {view === "racing" && aiMode && (
          <motion.div key="ai-race" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            {!aiFinished ? (
              <RaceCanvas
                track={getTrackDef(selectedTrack)}
                myId="local"
                players={[]}
                mode="computer"
                countdownSec={3}
                aiCount={3}
                onFinish={() => setAiFinished(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-6 rounded-xl border border-apex-line bg-apex-panel p-10">
                <p className="font-display text-4xl font-black text-white">RACE COMPLETE</p>
                <p className="text-sm text-white/40">Great driving!</p>
                <button type="button" onClick={() => { setAiMode(false); setAiFinished(false); setView("browser"); }}
                  className="rounded-lg border border-apex-red/40 bg-apex-red/10 px-10 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white hover:bg-apex-red">Back to Lobbies</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

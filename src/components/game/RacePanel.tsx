import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Flag,
  Globe,
  Plus,
  Swords,
  Users,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { RaceCanvas } from "./RaceCanvas";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type View = "browser" | "lobby" | "racing";

const TRACKS = [
  { id: "city-circuit", name: "City Circuit", desc: "3 laps · Technical turns", icon: "🏙️" },
  { id: "speed-ring", name: "Speed Ring", desc: "3 laps · High-speed oval", icon: "⚡" },
];

export function RacePanel({
  state,
  dispatch,
}: {
  state: any;
  dispatch: React.Dispatch<any>;
}) {
  const { user } = useAuth();
  const myId = user?._id;

  const [view, setView] = useState<View>("browser");
  const [selectedTrack, setSelectedTrack] = useState("city-circuit");
  const [lobbyId, setLobbyId] = useState<Id<"raceLobbies"> | null>(null);

  const createLobby = useMutation(api.race.createLobby);
  const joinLobby = useMutation(api.race.joinLobby);
  const leaveLobby = useMutation(api.race.leaveLobby);
  const deleteLobby = useMutation(api.race.deleteLobby);
  const startCountdown = useMutation(api.race.startCountdown);
  const beginRace = useMutation(api.race.beginRace);
  const updatePosition = useMutation(api.race.updatePosition);
  const finishRace = useMutation(api.race.finishRace);
  const cleanupStale = useMutation(api.race.cleanupStaleLobbies);

  // Poll my lobby
  const myLobby = useQuery(api.race.getMyLobby);
  const lobbies = useQuery(api.race.listLobbies);

  // Sync view from server state
  useEffect(() => {
    if (myLobby) {
      setLobbyId(myLobby._id);
      if (myLobby.status === "waiting") setView("lobby");
      else if (myLobby.status === "countdown" || myLobby.status === "racing") setView("racing");
      else if (myLobby.status === "finished") setView("lobby");
    }
  }, [myLobby]);

  const handleCreate = useCallback(
    async (trackId: string) => {
      try {
        const id = await createLobby({ trackId });
        setLobbyId(id);
        setView("lobby");
        toast.success("Lobby created!");
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    [createLobby],
  );

  const handleJoin = useCallback(
    async (lid: Id<"raceLobbies">) => {
      try {
        await joinLobby({ lobbyId: lid, carId: "starter" });
        setLobbyId(lid);
        setView("lobby");
        toast.success("Joined lobby!");
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    [joinLobby],
  );

  const handleLeave = useCallback(async () => {
    await leaveLobby();
    setLobbyId(null);
    setView("browser");
  }, [leaveLobby]);

  const handleDelete = useCallback(async () => {
    if (lobbyId) {
      await deleteLobby({ lobbyId });
      setLobbyId(null);
      setView("browser");
    }
  }, [lobbyId, deleteLobby]);

  const handleStart = useCallback(async () => {
    if (lobbyId) {
      try {
        await startCountdown({ lobbyId });
      } catch (e: any) {
        toast.error(e.message);
      }
    }
  }, [lobbyId, startCountdown]);

  const handlePositionUpdate = useCallback(
    async (x: number, y: number, angle: number, speed: number, lap: number) => {
      if (lobbyId) {
        await updatePosition({ lobbyId, x, y, angle, speed, lap });
      }
    },
    [lobbyId, updatePosition],
  );

  const handleFinish = useCallback(
    async (finishTime: number) => {
      if (lobbyId) {
        await finishRace({ lobbyId, finishTime });
        toast.success(`Race finished in ${finishTime.toFixed(1)}s!`);
      }
    },
    [lobbyId, finishRace],
  );

  // Cleanup stale lobbies periodically
  useEffect(() => {
    const id = setInterval(() => {
      void cleanupStale();
    }, 30_000);
    return () => clearInterval(id);
  }, [cleanupStale]);

  const lobby = myLobby;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-apex-red">
            Multiplayer
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-white">
            RACE
          </h2>
        </div>
        {view !== "browser" && (
          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 transition-colors hover:border-apex-red hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Leave
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── BROWSER VIEW ── */}
        {view === "browser" && (
          <motion.div
            key="browser"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Create Race */}
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-apex-red/15">
                  <Plus className="size-5 text-apex-red" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-white">Create Race</p>
                  <p className="text-[11px] text-white/40">Host a new multiplayer race</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                {TRACKS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTrack(t.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      selectedTrack === t.id
                        ? "border-apex-red bg-apex-red/10"
                        : "border-apex-line bg-[#0a0a0c] hover:border-white/20",
                    )}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <p className="mt-1 font-display text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-white/35">{t.desc}</p>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleCreate(selectedTrack)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-apex-red py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-apex-red/80"
              >
                <Flag className="size-4" />
                Create Race
              </button>
            </div>

            {/* Open Lobbies */}
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15">
                  <Globe className="size-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-white">Open Lobbies</p>
                  <p className="text-[11px] text-white/40">Join an existing race</p>
                </div>
              </div>

              {!lobbies || lobbies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-[#0a0a0c] py-8 text-center">
                  <Users className="mx-auto size-8 text-white/15" />
                  <p className="mt-2 text-sm text-white/30">No open lobbies</p>
                  <p className="text-[11px] text-white/20">Create one to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lobbies.map((l) => (
                    <div
                      key={l._id}
                      className="flex items-center justify-between rounded-lg border border-apex-line bg-[#0a0a0c] p-3 transition-colors hover:border-white/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-white/5 text-lg">
                          {TRACKS.find((t) => t.id === l.trackId)?.icon ?? "🏁"}
                        </div>
                        <div>
                          <p className="font-display text-xs font-bold text-white">
                            {l.hostName}'s Race
                          </p>
                          <p className="text-[10px] text-white/35">
                            {l.trackName} · {l.playerCount}/8 players
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJoin(l._id)}
                        className="rounded-md bg-apex-red/80 px-4 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How to play */}
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                How to Play
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "W / ↑", label: "Accelerate" },
                  { key: "S / ↓", label: "Brake" },
                  { key: "A/D / ←→", label: "Steer" },
                ].map((c) => (
                  <div key={c.key} className="rounded-lg bg-[#0a0a0c] p-3 text-center">
                    <p className="font-display text-sm font-bold text-apex-red">{c.key}</p>
                    <p className="mt-1 text-[10px] text-white/35">{c.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LOBBY VIEW ── */}
        {view === "lobby" && lobby && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-display text-sm font-bold text-white">
                    {lobby.hostName}'s Race
                  </p>
                  <p className="text-[11px] text-white/40">
                    {TRACKS.find((t) => t.id === lobby.trackId)?.name ?? "Unknown Track"}
                  </p>
                </div>
                <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-[10px] font-bold uppercase text-yellow-400">
                  {lobby.status === "waiting"
                    ? "Waiting"
                    : lobby.status === "countdown"
                      ? "Starting..."
                      : lobby.status === "racing"
                        ? "In Progress"
                        : "Finished"}
                </span>
              </div>

              {/* Players */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Players ({lobby.players.length}/8)
                </p>
                {lobby.players.map((p, i) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 rounded-lg border border-apex-line bg-[#0a0a0c] p-3"
                  >
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full font-display text-xs font-bold",
                        i === 0
                          ? "bg-apex-red/20 text-apex-red"
                          : "bg-white/5 text-white/40",
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm font-bold text-white">
                        {p.playerName}
                        {p.userId === myId && (
                          <span className="ml-2 text-[9px] text-apex-red">(You)</span>
                        )}
                      </p>
                    </div>
                    {p.userId === lobby.hostId && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                        Host
                      </span>
                    )}
                  </div>
                ))}
                {lobby.players.length < 8 && (
                  <div className="rounded-lg border border-dashed border-white/10 py-3 text-center">
                    <p className="text-[11px] text-white/25">
                      Waiting for players... ({lobby.players.length}/8)
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {lobby.hostId === myId && lobby.players.length >= 1 && (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={lobby.status !== "waiting"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-apex-red py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-apex-red/80 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                  >
                    <Swords className="size-4" />
                    Start Race
                  </button>
                )}
                <button
                  type="button"
                  onClick={lobby.hostId === myId ? handleDelete : handleLeave}
                  className="rounded-lg border border-white/15 px-6 py-3 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/50 transition-colors hover:border-red-500 hover:text-red-400"
                >
                  {lobby.hostId === myId ? "Disband" : "Leave"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── RACING VIEW ── */}
        {view === "racing" && lobby && myId && (
          <motion.div
            key="racing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <RaceCanvas
              track={lobby.track}
              myId={myId}
              players={lobby.players.map((p) => ({
                id: p.userId,
                name: p.playerName,
                carId: p.carId,
                x: p.x,
                y: p.y,
                angle: p.angle,
                speed: p.speed,
                lap: p.lap,
                finished: p.finished,
                finishTime: p.finishTime,
                placement: p.placement,
              }))}
              status={lobby.status as "waiting" | "countdown" | "racing" | "finished"}
              countdownEnds={lobby.countdownEnds}
              onPositionUpdate={handlePositionUpdate}
              onFinish={handleFinish}
            />

            {/* Finish overlay with results */}
            {lobby.status === "finished" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-apex-line bg-apex-panel p-5">
                  <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white">
                    Race Results
                  </p>
                  {[...lobby.players]
                    .filter((p) => p.finished)
                    .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
                    .map((p) => (
                      <div
                        key={p._id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3",
                          p.userId === myId
                            ? "border-apex-red/30 bg-apex-red/5"
                            : "border-apex-line bg-[#0a0a0c]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full font-display text-sm font-bold",
                            p.placement === 1
                              ? "bg-yellow-500/20 text-yellow-400"
                              : p.placement === 2
                                ? "bg-white/10 text-white/60"
                                : p.placement === 3
                                  ? "bg-amber-700/20 text-amber-600"
                                  : "bg-white/5 text-white/30",
                          )}
                        >
                          {p.placement ?? "?"}
                        </span>
                        <div className="flex-1">
                          <p className="font-display text-sm font-bold text-white">
                            {p.playerName}
                            {p.userId === myId && (
                              <span className="ml-2 text-[9px] text-apex-red">(You)</span>
                            )}
                          </p>
                        </div>
                        <span className="text-[11px] text-white/40">
                          {p.finishTime?.toFixed(1)}s
                        </span>
                      </div>
                    ))}

                <button
                  type="button"
                  onClick={() => {
                    setView("browser");
                    setLobbyId(null);
                    void leaveLobby();
                  }}
                  className="mt-3 w-full rounded-lg border border-apex-red/40 bg-apex-red/10 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-apex-red"
                >
                  Back to Lobbies
                </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

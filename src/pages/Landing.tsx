import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, Users, Trophy, Gift } from "lucide-react";
import { GemDiamond } from "@/components/GemDiamond";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Payouts",
    desc: "Withdraw your gems instantly via in-game mailbox. No waiting, no delays.",
  },
  {
    icon: Shield,
    title: "Provably Fair",
    desc: "Every game outcome is verifiable. Trust the math, not the house.",
  },
  {
    icon: Users,
    title: "Live Community",
    desc: "Chat with thousands of players, join rains, and climb the leaderboard.",
  },
  {
    icon: Trophy,
    title: "Daily Rewards",
    desc: "Log in every day for cashback bonuses and exclusive promo codes.",
  },
  {
    icon: Gift,
    title: "Content Creators",
    desc: "Get sponsored by PetBet! Join our Discord to apply.",
  },
];

const GAMES = [
  { name: "Roulette", emoji: "🎲", desc: "Bet on colors and win big", color: "from-blue-500/20 to-blue-600/5" },
  { name: "Tower", emoji: "🏰", desc: "Climb the tower for massive multipliers", color: "from-green-500/20 to-green-600/5" },
  { name: "Mines", emoji: "💣", desc: "Find gems, avoid mines", color: "from-yellow-500/20 to-yellow-600/5" },
  { name: "Blackjack", emoji: "🃏", desc: "Beat the dealer to 21", color: "from-red-500/20 to-red-600/5" },
  { name: "Multibattles", emoji: "🎯", desc: "Flip coins against other players", color: "from-purple-500/20 to-purple-600/5" },
];

const STATS = [
  { value: "50K+", label: "Active Players" },
  { value: "10B+", label: "Gems Wagered" },
  { value: "5", label: "Games" },
  { value: "24/7", label: "Live Chat" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-petbet-ink text-white">
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-petbet-blue/10 via-petbet-ink to-petbet-ink" />
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-petbet-blue/5 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <GemDiamond className="size-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-petbet-gem">
                Pet Simulator 99 Gambling
              </span>
            </div>
            <h1 className="font-display text-6xl font-black leading-[0.9] tracking-tight sm:text-8xl">
              PET
              <span className="text-petbet-blue">BET</span>
              99
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
              The ultimate Pet Simulator 99 gem gambling platform. Play Roulette, Tower, Mines,
              Blackjack, and Multibattles. Withdraw your winnings directly to your PS99 mailbox.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/roulette"
                className="group inline-flex items-center gap-2 rounded-xl bg-petbet-blue px-8 py-4 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-petbet-blue-bright hover:shadow-[0_0_40px_-8px_rgba(74,144,217,0.7)]"
              >
                Start Gambling
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/leaderboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-white hover:bg-white/5"
              >
                Leaderboard
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-petbet-line bg-petbet-panel/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-petbet-line lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col items-center gap-1 px-4 py-8 text-center"
            >
              <span className="font-display text-2xl font-black tracking-tight text-white sm:text-4xl">
                {stat.value}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-petbet-muted sm:text-xs">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Games */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petbet-blue">
            Our Games
          </p>
          <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
            Choose Your <span className="text-petbet-blue">Game</span>
          </h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link
                to={`/${game.name.toLowerCase()}`}
                className={`group block rounded-xl border border-petbet-line bg-gradient-to-br ${game.color} p-6 transition-all hover:-translate-y-1 hover:border-petbet-blue/30`}
              >
                <span className="mb-4 block text-4xl">{game.emoji}</span>
                <h3 className="font-display text-xl font-black">{game.name}</h3>
                <p className="mt-2 text-sm text-white/50">{game.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold uppercase text-petbet-blue opacity-0 transition-opacity group-hover:opacity-100">
                  Play Now <ArrowRight className="size-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-petbet-line bg-petbet-panel/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petbet-blue">
              Why PetBet99
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
              Built for <span className="text-petbet-blue">Players</span>
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-xl border border-petbet-line bg-petbet-panel p-6"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-petbet-blue/10">
                  <feature.icon className="size-5 text-petbet-blue" />
                </div>
                <h3 className="font-display text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-petbet-line">
        <div className="absolute inset-0 bg-gradient-to-br from-petbet-blue/10 via-petbet-ink to-petbet-ink" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
            Ready to <span className="text-petbet-blue">Gamble</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/50">
            Join thousands of Pet Simulator 99 players. Start with 10M free gems!
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/roulette"
              className="group inline-flex items-center gap-2 rounded-xl bg-petbet-blue px-8 py-4 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-petbet-blue-bright"
            >
              Start Playing
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-petbet-line bg-petbet-sidebar">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <GemDiamond className="size-5" />
              <span className="font-display text-lg font-black tracking-tight text-white">
                PETBET99
              </span>
            </div>
            <p className="text-xs text-petbet-muted">
              © {new Date().getFullYear()} PetBet99. Pet Simulator 99 is a trademark of BIG Games.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

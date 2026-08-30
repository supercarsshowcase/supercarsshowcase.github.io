import { useCallback, useEffect, useState } from "react";
import { useGems, formatGems } from "@/context/gem-context";
import { GemDiamond } from "@/components/GemDiamond";
import { cn } from "@/lib/utils";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface Card {
  suit: Suit;
  rank: Rank;
}

type GamePhase = "betting" | "player-turn" | "dealer-turn" | "result";

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (["K", "Q", "J"].includes(rank)) return 10;
  return parseInt(rank);
}

function handValue(hand: Card[]): number {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    value += cardValue(card.rank);
    if (card.rank === "A") aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function CardComponent({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed border-petbet-line-strong bg-petbet-panel-3 sm:size-24">
        <span className="text-2xl opacity-30">?</span>
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";

  return (
    <div className="flex size-20 flex-col items-center justify-center rounded-lg border-2 border-petbet-line-strong bg-white sm:size-24">
      <span className={cn("text-lg font-bold", isRed ? "text-red-500" : "text-gray-900")}>
        {card.rank}
      </span>
      <span className={cn("text-2xl", isRed ? "text-red-500" : "text-gray-900")}>
        {card.suit}
      </span>
    </div>
  );
}

export default function Blackjack() {
  const { gems, addGems, spendGems } = useGems();
  const [betAmount, setBetAmount] = useState(20_000_000);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [result, setResult] = useState<"win" | "lose" | "push" | "blackjack" | null>(null);
  const [lastWin, setLastWin] = useState(0);

  const deal = useCallback(() => {
    if (!spendGems(betAmount)) return;

    const newDeck = createDeck();
    const pHand = [newDeck.pop()!, newDeck.pop()!];
    const dHand = [newDeck.pop()!, newDeck.pop()!];

    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setResult(null);
    setLastWin(0);

    // Check for blackjack
    if (handValue(pHand) === 21) {
      setPhase("result");
      setResult("blackjack");
      const winAmount = Math.floor(betAmount * 2.5);
      addGems(winAmount);
      setLastWin(winAmount);
    } else {
      setPhase("player-turn");
    }
  }, [spendGems, betAmount, addGems]);

  const hit = useCallback(() => {
    const newDeck = [...deck];
    const newHand = [...playerHand, newDeck.pop()!];

    setDeck(newDeck);
    setPlayerHand(newHand);

    if (handValue(newHand) > 21) {
      setPhase("result");
      setResult("lose");
      setLastWin(-betAmount);
    }
  }, [deck, playerHand, betAmount]);

  const stand = useCallback(() => {
    setPhase("dealer-turn");
  }, []);

  // Dealer AI
  useEffect(() => {
    if (phase !== "dealer-turn") return;

    const timer = setTimeout(() => {
      const newDeck = [...deck];
      const newDealerHand = [...dealerHand];

      const draw = () => {
        while (handValue(newDealerHand) < 17) {
          const card = newDeck.pop();
          if (card) newDealerHand.push(card);
        }
      };

      draw();

      setDeck(newDeck);
      setDealerHand(newDealerHand);

      const dValue = handValue(newDealerHand);
      const pValue = handValue(playerHand);

      if (dValue > 21) {
        setResult("win");
        addGems(betAmount * 2);
        setLastWin(betAmount);
      } else if (dValue > pValue) {
        setResult("lose");
        setLastWin(-betAmount);
      } else if (dValue < pValue) {
        setResult("win");
        addGems(betAmount * 2);
        setLastWin(betAmount);
      } else {
        setResult("push");
        addGems(betAmount);
        setLastWin(0);
      }

      setPhase("result");
    }, 800);

    return () => clearTimeout(timer);
  }, [phase, deck, dealerHand, playerHand, betAmount, addGems]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 font-display text-3xl font-black uppercase tracking-tight">
        Blackjack
      </h1>

      {/* Dealer hand */}
      <div className="mb-8 rounded-xl bg-petbet-panel p-6">
        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-petbet-muted">
          Dealer — {phase === "player-turn" ? "?" : handValue(dealerHand)}
        </div>
        <div className="flex justify-center gap-2">
          {dealerHand.map((card, i) => (
            <CardComponent
              key={i}
              card={card}
              hidden={phase === "player-turn" && i === 1}
            />
          ))}
        </div>
      </div>

      {/* Controls + info */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left panel */}
        <div className="w-full max-w-xs shrink-0 rounded-xl bg-petbet-panel p-5">
          <h2 className="mb-4 font-display text-lg font-black uppercase">
            Blackjack
          </h2>

          {phase === "betting" && (
            <>
              {/* Bet amount */}
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-petbet-muted">
                  Bet Amount
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-petbet-panel-2 px-3 py-2">
                  <GemDiamond className="size-3.5" />
                  <input
                    type="text"
                    value={formatGems(betAmount)}
                    readOnly
                    className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setBetAmount((v) => Math.max(100, Math.floor(v / 2)))}
                    className="rounded bg-petbet-panel-3 px-2 py-1 text-[10px] font-bold text-white/60"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetAmount((v) => v * 2)}
                    className="rounded bg-petbet-panel-3 px-2 py-1 text-[10px] font-bold text-white/60"
                  >
                    2×
                  </button>
                </div>
              </div>

              {/* Rules */}
              <div className="mb-4 space-y-2 rounded-lg bg-petbet-panel-2 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-petbet-muted">Blackjack pays</span>
                  <span className="font-bold text-white">2.5×</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-petbet-muted">Dealer stands</span>
                  <span className="font-bold text-white">17+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-petbet-muted">Split on</span>
                  <span className="font-bold text-white">same rank</span>
                </div>
              </div>

              <button
                type="button"
                onClick={deal}
                className="w-full rounded-xl bg-petbet-green py-3.5 font-display text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-petbet-green-dark"
              >
                Place Bet
              </button>
            </>
          )}

          {phase === "player-turn" && (
            <>
              <p className="mb-4 text-center text-lg font-bold text-white">
                Your hand: {handValue(playerHand)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={hit}
                  className="rounded-xl bg-petbet-blue py-3 font-display text-sm font-bold uppercase text-white transition-colors hover:bg-petbet-blue-bright"
                >
                  Hit
                </button>
                <button
                  type="button"
                  onClick={stand}
                  className="rounded-xl bg-petbet-panel-2 py-3 font-display text-sm font-bold uppercase text-white transition-colors hover:bg-petbet-panel-3"
                >
                  Stand
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-petbet-panel-2 py-3 font-display text-sm font-bold uppercase text-petbet-muted"
                >
                  Double
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-petbet-panel-2 py-3 font-display text-sm font-bold uppercase text-petbet-muted"
                >
                  Split
                </button>
              </div>
            </>
          )}

          {phase === "result" && (
            <>
              <div className="mb-4 text-center">
                <p
                  className={cn(
                    "text-2xl font-black",
                    result === "win" || result === "blackjack"
                      ? "text-petbet-green"
                      : result === "push"
                        ? "text-petbet-yellow"
                        : "text-petbet-red",
                  )}
                >
                  {result === "blackjack"
                    ? "Blackjack!"
                    : result === "win"
                      ? "You Win!"
                      : result === "push"
                        ? "Push"
                        : "You Lose"}
                </p>
                {lastWin !== 0 && (
                  <p
                    className={cn(
                      "mt-2 text-sm font-bold",
                      lastWin > 0 ? "text-petbet-green" : "text-petbet-red",
                    )}
                  >
                    {lastWin > 0 ? `+${formatGems(lastWin)}` : `-${formatGems(Math.abs(lastWin))}`} gems
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhase("betting");
                  setPlayerHand([]);
                  setDealerHand([]);
                  setResult(null);
                }}
                className="w-full rounded-xl bg-petbet-blue py-3.5 font-display text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-petbet-blue-bright"
              >
                Play Again
              </button>
            </>
          )}
        </div>

        {/* Player hand */}
        <div className="flex-1 rounded-xl bg-petbet-panel p-6">
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-petbet-muted">
            Your Hand — {handValue(playerHand)}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {playerHand.map((card, i) => (
              <CardComponent key={i} card={card} />
            ))}
          </div>
          {playerHand.length === 0 && (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-petbet-muted">Place a bet to start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

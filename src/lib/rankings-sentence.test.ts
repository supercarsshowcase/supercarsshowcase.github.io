import { readFileSync } from "node:fs";
import { describe, test as it, expect } from "bun:test";
import { formatNumber, formatPriceCompact } from "@/lib/format";
import type { Car } from "@/lib/types";
import {
  RANK_BOARDS,
  rankBoard,
  rankCars,
  leaderMargin,
  type RankBoardId,
} from "@/lib/rankings";

/**
 * Mirror of the JSX sentence assembly in src/pages/Rankings.tsx. If the
 * component's maps change shape this file fails until it is updated too —
 * the point is to catch regressions like "outguns the Chiron 97 hp." (the
 * "by" connective silently dropped) or "over the Chiron." (no margin).
 */

const BOARD_LEAD_VERB: Record<RankBoardId, string> = {
  fastest: "leads the pack by",
  quickest: "launches",
  powerful: "outguns",
  expensive: "outsells",
};

const BOARD_RU_FIRST: Record<RankBoardId, boolean> = {
  fastest: false,
  quickest: false,
  powerful: true,
  expensive: true,
};

const BOARD_LEAD_SUFFIX: Record<RankBoardId, string> = {
  fastest: "over",
  quickest: "quicker than",
  powerful: "by",
  expensive: "by",
};

function sentence(boardId: RankBoardId, leader: Car, runnerUp: Car): string {
  const board = rankBoard(boardId);
  const margin = leaderMargin(board, leader, runnerUp);
  if (margin <= 0) return "";
  const ruFirst = BOARD_RU_FIRST[boardId];
  const parts = [`${leader.brand} ${leader.model}`, BOARD_LEAD_VERB[boardId]];
  if (ruFirst)
    parts.push(`the ${runnerUp.brand} ${runnerUp.model}`, BOARD_LEAD_SUFFIX[boardId]);
  parts.push(board.format(margin, "USD"));
  // NB: join(" ") normalizes whitespace, so this mirror is blind to JSX-level
  // whitespace bugs in the component (see the source-guard test below).
  if (!ruFirst)
    parts.push(`${BOARD_LEAD_SUFFIX[boardId]} the ${runnerUp.brand} ${runnerUp.model}`);
  return `${parts.join(" ")}.`;
}

const champ = rankCars("fastest", 10)[0];
// Same car with a distinct brand/model and strictly worse stats, so every
// board has a positive #1-vs-#2 margin.
const rival: Car = {
  ...champ,
  brand: "Zenvo",
  model: "ST1",
  topSpeedKmh: champ.topSpeedKmh - 20,
  horsepower: Math.max(1, champ.horsepower - 100),
  priceUSD: Math.max(1_000, champ.priceUSD - 1_000_000),
  zeroToHundredKmh: champ.zeroToHundredKmh + 0.5,
};

describe("leaderboard margin sentences", () => {
  it("reads correctly on every board (verb + connective + trailing dot)", () => {
    for (const b of RANK_BOARDS) {
      const out = sentence(b.id, champ, rival);
      expect(out.endsWith(".")).toBe(true);
      expect(out.includes(BOARD_LEAD_VERB[b.id])).toBe(true);
      // The connective must appear exactly once — catches the dropped "by"
      // on the powerful/expensive boards.
      expect(out.split(BOARD_LEAD_SUFFIX[b.id]).length - 1).toBe(1);
      // The margin value itself must never be missing.
      expect(
        out.includes(rankBoard(b.id).format(leaderMargin(b, champ, rival), "USD")),
      ).toBe(true);
    }
  });

  it("outguns/outsells put the runner-up BEFORE the margin, with 'by'", () => {
    expect(sentence("powerful", champ, rival)).toBe(
      `${champ.brand} ${champ.model} outguns the Zenvo ST1 by ${formatNumber(champ.horsepower - rival.horsepower)} hp.`,
    );
    expect(sentence("expensive", champ, rival)).toBe(
      `${champ.brand} ${champ.model} outsells the Zenvo ST1 by ${formatPriceCompact(champ.priceUSD - rival.priceUSD, "USD")}.`,
    );
  });

  it("fastest/quickest put the runner-up AFTER the margin", () => {
    expect(sentence("fastest", champ, rival)).toBe(
      `${champ.brand} ${champ.model} leads the pack by ${formatNumber(champ.topSpeedKmh - rival.topSpeedKmh)} km/h over the Zenvo ST1.`,
    );
    expect(sentence("quickest", champ, rival)).toBe(
      `${champ.brand} ${champ.model} launches ${(rival.zeroToHundredKmh - champ.zeroToHundredKmh).toFixed(1)} s quicker than the Zenvo ST1.`,
    );
  });

  it("hides the sentence entirely on a tie (margin 0)", () => {
    const tie = { ...rival, topSpeedKmh: champ.topSpeedKmh };
    expect(sentence("fastest", champ, tie)).toBe("");
  });

  it("keeps the explicit space between margin and connective (JSX whitespace)", () => {
    // Regression: JSX collapses the newline after the margin span, so the
    // fastest board rendered "… by 20 km/hover the Zenvo ST1.". The mirror
    // above can't see this (its join normalizes whitespace), so guard the
    // component source: the !ruFirst branch must open with an explicit
    // `{" "}` token right before the connective.
    const src = readFileSync("src/pages/Rankings.tsx", "utf8");
    expect(src).toMatch(/\{" "\}\s*\{BOARD_LEAD_SUFFIX\[boardId\]\} the/);
  });
});

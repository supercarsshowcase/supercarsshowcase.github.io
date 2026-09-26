// One-off review round 3. Deleted after use.
import fs from "node:fs";

// ── 1. Rankings.tsx: correct per-board sentence structure ──
const p = "src/pages/Rankings.tsx";
let s = fs.readFileSync(p, "utf8");

const oldSentence = `                {margin > 0 && leader && runnerUp && (
          <p className="text-xs text-apex-muted">
            <span className="font-display font-bold uppercase tracking-[0.14em] text-white">
              {leader.brand} {leader.model}
            </span>{" "}
            {BOARD_LEAD_VERB[boardId]}{" "}
            <span className="font-display font-bold text-apex-red">
              {board.format(margin, currency)}
            </span>{" "}
            {BOARD_LEAD_SUFFIX[boardId]} the {runnerUp.brand} {runnerUp.model}.
          </p>
        )}`;

const newSentence = `        {margin > 0 && leader && runnerUp && (
          <p className="text-xs text-apex-muted">
            <span className="font-display font-bold uppercase tracking-[0.14em] text-white">
              {leader.brand} {leader.model}
            </span>{" "}
            {BOARD_LEAD_VERB[boardId]}{" "}
            {BOARD_RU_FIRST[boardId] && (
              <>
                the {runnerUp.brand} {runnerUp.model}{" "}
              </>
            )}
            <span className="font-display font-bold text-apex-red">
              {board.format(margin, currency)}
            </span>
            {!BOARD_RU_FIRST[boardId] && (
              <>
                {BOARD_LEAD_SUFFIX[boardId]} the {runnerUp.brand}{" "}
                {runnerUp.model}
              </>
            )}
            .
          </p>
        )}`;

if (!s.includes(oldSentence)) throw new Error("sentence block not found");
s = s.replace(oldSentence, newSentence);

// Runner-up placement: fastest/quickest put the runner-up AFTER the margin
// ("…by 12 km/h over the X", "…0.19 s quicker than the X"); powerful and
// expensive need it BEFORE ("outguns the X by 97 hp", "outsells the X by …").
const anchor = `/** Completes the sentence for verb forms that need a different connective. */`;
if (!s.includes(anchor)) throw new Error("suffix anchor not found");
s = s.replace(anchor,
`/** True when the runner-up must appear BEFORE the margin for the sentence
 *  to read correctly ("outguns the X by 97 hp", not "outguns 97 hp by the X"). */
const BOARD_RU_FIRST: Record<RankBoardId, boolean> = {
  fastest: false,
  quickest: false,
  powerful: true,
  expensive: true,
};

/** Completes the sentence for verb forms that need a different connective. */`);

fs.writeFileSync(p, s);

// ── 2. AppShell.tsx: tray NavLinks never compress ──
const ap = "src/components/AppShell.tsx";
let a = fs.readFileSync(ap, "utf8");
const from = `"rounded-md px-3 py-1.5 font-display text-[13px] font-semibold uppercase tracking-[0.16em] transition-all"`;
const to = `"shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-display text-[13px] font-semibold uppercase tracking-[0.16em] transition-all"`;
const n = a.split(from).length - 1;
if (n !== 2) throw new Error("expected 2 tray NavLink classNames, got " + n);
a = a.split(from).join(to);
fs.writeFileSync(ap, a);

console.log("sentences fixed · BOARD_RU_FIRST added · tray links squish-proofed");

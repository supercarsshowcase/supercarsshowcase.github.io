// One-off: category + slug fixes in shards A/B/C. Count-checked per file.
import { readFileSync, writeFileSync } from "node:fs";

function patch(path, pairs) {
  let src = readFileSync(path, "utf8");
  for (const [from, to, want] of pairs) {
    const n = src.split(from).length - 1;
    if (n !== want) throw new Error(`${path}: "${from.slice(0, 40)}…" expected ${want}, found ${n}`);
    src = src.split(from).join(to);
  }
  writeFileSync(path, src);
  console.log(`patched ${path}`);
}

patch("src/data/shards-a.ts", [
  ['"Convertible", ', '"Roadster", ', 2],
  ['"Wagon", ', '"Sedan", ', 3],
  ['"Pickup", ', '"Classic", ', 1],
]);
patch("src/data/shards-b.ts", [
  ['"Convertible", ', '"Roadster", ', 12],
]);
patch("src/data/shards-c.ts", [
  ['"Convertible", ', '"Roadster", ', 4],
  ['"Hatchback Sport", ', '"Sports Car", ', 1],
  ['["audi-r8-v10", ', '["audi-r8-v10-mk1", ', 1],
  ['["audi-r8-v10-performance", ', '["audi-r8-v10-performance-quattro", ', 1],
  ['["bentley-continental-supersports", ', '["bentley-continental-supersports-2017", ', 1],
]);
console.log("all shard fixes applied");

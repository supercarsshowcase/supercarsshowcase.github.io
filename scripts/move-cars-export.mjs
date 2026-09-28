// One-off: relocate the composed CARS export below BASE_CARS + category fixes.
import { readFileSync, writeFileSync } from "node:fs";

// ── cars.ts: move export ──
{
  const path = "src/data/cars.ts";
  let src = readFileSync(path, "utf8");
  const exportBlock = `/**
 * The 1000-car archive: the hand-written 88 + the shard expansion (912).
 * EXTRA_CARS throws at module load on any slug collision (vs base or within
 * the expansion), so a dupe can never ship silently. (The composed export
 * is declared AFTER the BASE_CARS array at the bottom of the file.)
 */
export const CARS: Car[] = [...BASE_CARS, ...EXTRA_CARS];
`;
  const n = src.split(exportBlock).length - 1;
  if (n !== 1) throw new Error(`export block found ${n}×, expected 1`);
  src = src.replace(exportBlock, "");
  const moved = `/**
 * The 1000-car archive: the hand-written 88 + the shard expansion (912).
 * EXTRA_CARS throws at module load on any slug collision (vs base or within
 * the expansion), so a dupe can never ship silently.
 */
export const CARS: Car[] = [...BASE_CARS, ...EXTRA_CARS];\n`;
  src = src.trimEnd() + "\n\n" + moved;
  writeFileSync(path, src);
  console.log("cars.ts export moved below BASE_CARS");
}

// ── category fixes ──
function replaceAll(path, from, to) {
  const src = readFileSync(path, "utf8");
  const n = src.split(from).length - 1;
  if (n === 0) throw new Error(`${path}: "${from}" not found`);
  writeFileSync(path, src.split(from).join(to));
  console.log(`${path}: "${from}" ×${n}`);
}
replaceAll("src/data/shards-c.ts", `"Wagon", `, `"Sedan", `);
replaceAll("src/data/shards-d.ts", `"Convertible", `, `"Roadster", `);
replaceAll("src/data/shards-e1.ts", `"Wagon Sport", `, `"Sedan", `);

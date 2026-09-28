// One-off: shard E1 fixes. Count-checked.
import { readFileSync, writeFileSync } from "node:fs";

function replaceAll(path, from, to) {
  const src = readFileSync(path, "utf8");
  const n = src.split(from).length - 1;
  if (n === 0) throw new Error(`${path}: "${from}" not found`);
  writeFileSync(path, src.split(from).join(to));
  console.log(`${path}: "${from.slice(0, 30)}…" ×${n}`);
}

// 1) slug already exists in cars.ts — rename this row.
replaceAll("src/data/shards-e1.ts", `["jaguar-f-type-svr", "F-Type SVR"`, `["jaguar-f-type-svr-2016", "F-Type SVR"`);
// 2) invalid categories → nearest valid member.
replaceAll("src/data/shards-e1.ts", `"Hatchback Sport", `, `"Sports Car", `);
replaceAll("src/data/shards-e1.ts", `"Convertible", `, `"Roadster", `);

// 3) engine codes used by E1 rows that don't exist yet.
const path = "src/data/cars-extra.ts";
let src = readFileSync(path, "utf8");
const additions = [
  [`  I4T: "I4 Turbo",`, `  I4D: "I4 Turbo-Diesel",`],
  [`  I5T: "I5 Turbo",`, `  I5NA: "I5 Naturally-Aspirated",`],
];
for (const [from, to] of additions) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`${path}: anchor "${from}" found ${n}×, expected 1`);
  src = src.replace(from, to);
}
writeFileSync(path, src);
console.log("engine codes added:", additions.length);

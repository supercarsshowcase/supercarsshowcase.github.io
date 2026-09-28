// Relative import: also typechecked by the Convex toolchain (no "@/") alias.
// Aggregator: expands every shard into full Car objects, preserving shard
// order (A → E2). Deliberately imports NOTHING from cars.ts — cars.ts imports
// THIS, so a cycle here would run guards against an uninitialized CARS.
// (The slug-uniqueness guard lives in cars.ts after composition, where both
// arrays exist.)
import type { Car } from "../lib/types";
import { expandCar, type ExtraSpec } from "./cars-extra";
import { SHARD_A, SHARD_A2, SHARD_A3 } from "./shards-a";
import { SHARD_B } from "./shards-b";
import { SHARD_C } from "./shards-c";
import { SHARD_D } from "./shards-d";
import { SHARD_E1 } from "./shards-e1";
import { SHARD_E2 } from "./shards-e2";

const SHARDS: { brand: string; rows: readonly ExtraSpec[] }[] = [
  SHARD_A,
  SHARD_A2,
  SHARD_A3,
  ...SHARD_B,
  ...SHARD_C,
  ...SHARD_D,
  ...SHARD_E1,
  ...SHARD_E2,
];

export const EXTRA_CARS: Car[] = SHARDS.flatMap((shard) =>
  shard.rows.map((row) => expandCar(shard.brand, row)),
);

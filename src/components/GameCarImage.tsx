import { memo } from "react";
import { gameCarImage, gameArchiveCar } from "@/game/data";
import { useCarImage } from "@/data/enrich";
import type { GameCarDef } from "@/game/types";
import { SmartImage } from "./SmartImage";

/** Static image chain (direct → twin → fuzzy match), else the archive twin's
 *  runtime-enriched Wikipedia thumbnail, else "" (generated scene). */
function useGameCarImage(car: GameCarDef): string {
  const staticImg = gameCarImage(car);
  const twin = staticImg ? undefined : gameArchiveCar(car);
  const enriched = useCarImage(twin);
  return staticImg || enriched;
}

/**
 * SmartImage for game cars. Wraps the same placeholder/scene fallback as the
 * showcase CarCard, so collection/dealer/wheel thumbnails fill in with real
 * photos instead of staying on the silhouette.
 */
export const GameCarImage = memo(function GameCarImage({
  car,
  alt,
  seed,
  className,
}: {
  car: GameCarDef;
  alt: string;
  seed?: string;
  className?: string;
}) {
  const src = useGameCarImage(car);
  return <SmartImage src={src} alt={alt} seed={seed ?? car.id} className={className} />;
});

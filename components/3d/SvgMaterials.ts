import { MaterialPresetId } from "./MaterialPresets"

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

export const clamp01Number = (value: unknown, fallback = 0) =>
  Math.max(0, Math.min(1, finiteNumber(value, fallback)))

export const materialLightMultiplier = (preset: MaterialPresetId) => {
  if (preset === "chrome") return 2.35
  if (preset === "glass") return 1.65
  if (preset === "satin") return 1.08
  if (preset === "pearl") return 1.35
  if (preset === "lacquer") return 1.2
  return 1
}

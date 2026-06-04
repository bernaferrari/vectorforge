import { isGraphiteCutPreset, type MaterialPresetId } from "./MaterialPresets"
import { finiteNumber } from "./SvgGeometry"

export const clamp01Number = (value: unknown, fallback = 0) =>
  Math.max(0, Math.min(1, finiteNumber(value, fallback)))

export const materialLightMultiplier = (preset: MaterialPresetId) => {
  if (preset === "prismChrome") return 2.85
  if (preset === "gelGlass") return 2.05
  if (isGraphiteCutPreset(preset)) return 0.95
  if (preset === "chrome") return 2.35
  if (preset === "glass") return 1.65
  if (preset === "aura") return 1.85
  if (preset === "holo") return 1.28
  if (preset === "satin") return 1.08
  if (preset === "pearl") return 1.35
  if (preset === "lacquer") return 1.2
  if (preset === "neon") return 0.78
  if (preset === "ink") return 0.7
  return 1
}

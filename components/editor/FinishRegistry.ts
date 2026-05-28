import type { MaterialPresetId } from "../3d/MaterialPresets"
import type { MaterialSettings } from "./EditorModel"

export const MATERIAL_METADATA: Record<
  MaterialPresetId,
  { name: string; subtitle: string; description: string; glowColor: string }
> = {
  frost: {
    name: "Frost",
    subtitle: "Soft Translucent",
    description:
      "A milky translucent finish with soft internal color and restrained highlights. Distinct from satin without becoming full glass.",
    glowColor: "rgba(186, 230, 253, 0.24)",
  },
  satin: {
    name: "Satin",
    subtitle: "Google PBR",
    description:
      "A Google-inspired tactile surface with moderate roughness, a tiny metallic lift, and a small emissive boost.",
    glowColor: "rgba(66, 133, 244, 0.24)",
  },
  glass: {
    name: "Glass",
    subtitle: "Clear Refraction",
    description:
      "A subtle translucent finish with controlled highlights. Useful when depth matters without making the shape disappear.",
    glowColor: "rgba(14, 165, 233, 0.25)",
  },
  chrome: {
    name: "Metal",
    subtitle: "Studio Chrome",
    description:
      "A vivid reflective finish with studio-box highlights. It keeps mesh color readable instead of crushing it into black.",
    glowColor: "rgba(125, 211, 252, 0.28)",
  },
  pearl: {
    name: "Pearl",
    subtitle: "Soft Iridescent",
    description:
      "A bright ceramic finish with soft pearlescent sheen. It feels lighter and more dimensional than glossy paint.",
    glowColor: "rgba(216, 180, 254, 0.24)",
  },
  lacquer: {
    name: "Lacquer",
    subtitle: "Gloss Paint",
    description:
      "A polished enamel-like finish with strong clearcoat and clean color. Useful for app-icon surfaces.",
    glowColor: "rgba(244, 63, 94, 0.2)",
  },
  custom: {
    name: "Custom",
    subtitle: "Advanced",
    description:
      "Manual roughness, metal, coat, transparency, and emission controls.",
    glowColor: "rgba(124, 92, 255, 0.25)",
  },
}

export const MATERIAL_PREVIEW: Record<MaterialPresetId, string> = {
  frost:
    "radial-gradient(circle at 32% 24%, #ffffff 0%, rgba(226,244,255,.9) 28%, rgba(148,197,255,.42) 56%, rgba(196,181,253,.38) 100%)",
  satin:
    "radial-gradient(circle at 28% 24%, #ffffff 0%, #ff9900 16%, #807aff 42%, #00c796 72%, #1759ff 100%)",
  glass:
    "radial-gradient(circle at 30% 24%, #ffffff, rgba(186,230,253,.92) 30%, rgba(59,130,246,.18) 62%, rgba(14,116,144,.46))",
  chrome:
    "radial-gradient(circle at 30% 22%, #ffffff 0%, #e0f2fe 18%, #64748b 31%, #ffffff 43%, #38bdf8 58%, #f8fafc 68%, #27272a 100%)",
  pearl:
    "radial-gradient(circle at 30% 24%, #ffffff 0%, #fdf4ff 24%, #bae6fd 44%, #d8b4fe 66%, #64748b 100%)",
  lacquer:
    "radial-gradient(circle at 34% 26%, #ffffff 0%, #fecdd3 18%, #fb7185 48%, #be123c 100%)",
  custom: "radial-gradient(circle at 34% 28%, #ede9fe, #a78bfa 45%, #6d28d9)",
}

export const FINISH_PRESETS: MaterialPresetId[] = [
  "frost",
  "satin",
  "glass",
  "chrome",
  "pearl",
  "lacquer",
]

export const MATERIAL_DEFAULT_SETTINGS: Record<
  Exclude<MaterialPresetId, "custom">,
  MaterialSettings
> = {
  frost: {
    roughness: 0.72,
    metalness: 0,
    reflectance: 0.76,
    clearcoat: 0.18,
    clearcoatRoughness: 0.62,
    transmission: 0.28,
    thickness: 0.65,
    emissiveIntensity: 0.035,
  },
  satin: {
    roughness: 0.34,
    metalness: 0.04,
    reflectance: 0.62,
    clearcoat: 0,
    clearcoatRoughness: 0.35,
    transmission: 0,
    thickness: 0.4,
    emissiveIntensity: 0.0744,
  },
  glass: {
    roughness: 0.12,
    metalness: 0,
    reflectance: 0.72,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    transmission: 0.38,
    thickness: 0.85,
    emissiveIntensity: 0,
  },
  chrome: {
    roughness: 0.075,
    metalness: 0.48,
    reflectance: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transmission: 0,
    thickness: 0.4,
    emissiveIntensity: 0.08,
  },
  pearl: {
    roughness: 0.42,
    metalness: 0,
    reflectance: 0.86,
    clearcoat: 0.72,
    clearcoatRoughness: 0.22,
    transmission: 0,
    thickness: 0.6,
    emissiveIntensity: 0.035,
  },
  lacquer: {
    roughness: 0.2,
    metalness: 0,
    reflectance: 0.72,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    transmission: 0,
    thickness: 0.5,
    emissiveIntensity: 0.04,
  },
}

export const materialDefaultSettings = (preset: MaterialPresetId) =>
  preset === "custom" ? null : MATERIAL_DEFAULT_SETTINGS[preset]

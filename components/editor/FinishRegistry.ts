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
  aura: {
    name: "Aura",
    subtitle: "Luminous Glass",
    description:
      "A soft Apple-like luminous glass finish with bright white body, blue rim, and gentle internal glow.",
    glowColor: "rgba(147, 197, 253, 0.34)",
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
  neon: {
    name: "Neon",
    subtitle: "Soft Emissive",
    description:
      "A self-lit finish with controlled glow. Useful for luminous icons without burning out the surface color.",
    glowColor: "rgba(34, 211, 238, 0.28)",
  },
  holo: {
    name: "Holo",
    subtitle: "Prismatic Pearl",
    description:
      "A pearly prismatic finish with cyan-violet color travel. It reads softer and more chromatic than metal.",
    glowColor: "rgba(103, 232, 249, 0.3)",
  },
  ink: {
    name: "Ink",
    subtitle: "Matte Graphic",
    description:
      "A dry matte finish with low reflection and stronger shadow shape. It intentionally avoids glass, metal, glow, and satin shine.",
    glowColor: "rgba(15, 23, 42, 0.12)",
  },
  prismChrome: {
    name: "Prism",
    subtitle: "Elevated Chrome",
    description:
      "A black-gloss studio finish with prismatic cyan, orange, blue, and magenta reflection bands for the high-shine number references.",
    glowColor: "rgba(56, 189, 248, 0.34)",
  },
  gelGlass: {
    name: "Gel",
    subtitle: "Elevated Glass",
    description:
      "A luminous translucent finish with saturated rim glow and soft colored internal reflection for app-icon glass looks.",
    glowColor: "rgba(217, 70, 239, 0.28)",
  },
  cutInk: {
    name: "Cut",
    subtitle: "Elevated Matte",
    description:
      "A sculpted dark finish with subtle clearcoat, side shading, and crisp chamfer emphasis for dimensional black glyphs.",
    glowColor: "rgba(148, 163, 184, 0.18)",
  },
  cutInner: {
    name: "Incut",
    subtitle: "Inner Chamfer",
    description:
      "A graphite cut that lifts recessed planes so counters and interior turns read carved inward.",
    glowColor: "rgba(148, 163, 184, 0.2)",
  },
  cutOuter: {
    name: "Outcut",
    subtitle: "Outer Chamfer",
    description:
      "A graphite cut that emphasizes the outside bevel and rim for a raised, machined edge.",
    glowColor: "rgba(203, 213, 225, 0.2)",
  },
  softCut: {
    name: "Soft Cut",
    subtitle: "Soft Chamfer",
    description:
      "A softer graphite cut that keeps closed caps and uses a calmer rounded bevel instead of raised roof sheets.",
    glowColor: "rgba(203, 213, 225, 0.16)",
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
  aura: "radial-gradient(circle at 30% 24%, #ffffff 0%, #f8fbff 24%, #dbeafe 48%, #93c5fd 70%, #1d4ed8 100%)",
  chrome:
    "radial-gradient(circle at 30% 22%, #ffffff 0%, #e0f2fe 18%, #64748b 31%, #ffffff 43%, #38bdf8 58%, #f8fafc 68%, #27272a 100%)",
  pearl:
    "radial-gradient(circle at 30% 24%, #ffffff 0%, #fdf4ff 24%, #bae6fd 44%, #d8b4fe 66%, #64748b 100%)",
  lacquer:
    "radial-gradient(circle at 34% 26%, #ffffff 0%, #fecdd3 18%, #fb7185 48%, #be123c 100%)",
  neon: "radial-gradient(circle at 34% 28%, #ecfeff 0%, #67e8f9 20%, #22d3ee 46%, #0e7490 74%, #164e63 100%)",
  holo: "radial-gradient(circle at 26% 22%, #ffffff 0%, #a5f3fc 18%, #c4b5fd 38%, #f0abfc 58%, #7dd3fc 78%, #312e81 100%)",
  ink: "radial-gradient(circle at 34% 28%, #e2e8f0 0%, #64748b 20%, #1f2937 58%, #020617 100%)",
  prismChrome:
    "conic-gradient(from 220deg at 48% 42%, #020617 0deg, #020617 42deg, #008cff 70deg, #00f5ff 92deg, #ff8a00 128deg, #020617 160deg, #050505 220deg, #d946ef 260deg, #00b7ff 306deg, #020617 360deg)",
  gelGlass:
    "radial-gradient(circle at 30% 22%, #ffffff 0%, #67e8f9 18%, #22d3ee 34%, #d946ef 54%, #2563eb 76%, #7c3aed 100%)",
  cutInk:
    "linear-gradient(135deg, #f8fafc 0%, #111827 16%, #020617 42%, #334155 58%, #050505 78%, #94a3b8 100%)",
  cutInner:
    "radial-gradient(circle at 50% 45%, #9ca3af 0%, #374151 24%, #111827 54%, #020617 100%)",
  cutOuter:
    "linear-gradient(135deg, #cbd5e1 0%, #4b5563 18%, #050505 38%, #111827 66%, #94a3b8 100%)",
  softCut:
    "radial-gradient(circle at 32% 24%, #f8fafc 0%, #71717a 22%, #27272a 44%, #0a0a0a 70%, #a1a1aa 100%)",
  custom: "radial-gradient(circle at 34% 28%, #ede9fe, #a78bfa 45%, #6d28d9)",
}

export const FINISH_PRESETS: MaterialPresetId[] = [
  "frost",
  "satin",
  "glass",
  "aura",
  "chrome",
  "pearl",
  "lacquer",
  "neon",
  "holo",
  "ink",
  "prismChrome",
  "gelGlass",
  "cutInk",
  "cutInner",
  "cutOuter",
  "softCut",
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
  aura: {
    roughness: 0.24,
    metalness: 0,
    reflectance: 0.86,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12,
    transmission: 0.48,
    thickness: 1.15,
    emissiveIntensity: 0.46,
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
  neon: {
    roughness: 0.28,
    metalness: 0,
    reflectance: 0.34,
    clearcoat: 0,
    clearcoatRoughness: 0.2,
    transmission: 0,
    thickness: 0.35,
    emissiveIntensity: 0.82,
  },
  holo: {
    roughness: 0.3,
    metalness: 0.02,
    reflectance: 0.72,
    clearcoat: 0.82,
    clearcoatRoughness: 0.16,
    transmission: 0,
    thickness: 0.5,
    emissiveIntensity: 0.28,
  },
  ink: {
    roughness: 0.96,
    metalness: 0,
    reflectance: 0.08,
    clearcoat: 0,
    clearcoatRoughness: 0.8,
    transmission: 0,
    thickness: 0.35,
    emissiveIntensity: 0.02,
  },
  prismChrome: {
    roughness: 0.035,
    metalness: 0.68,
    reflectance: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    transmission: 0,
    thickness: 0.45,
    emissiveIntensity: 0.14,
  },
  gelGlass: {
    roughness: 0.18,
    metalness: 0,
    reflectance: 0.92,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    transmission: 0.34,
    thickness: 1.45,
    emissiveIntensity: 0.62,
  },
  cutInk: {
    roughness: 0.76,
    metalness: 0,
    reflectance: 0.46,
    clearcoat: 0.12,
    clearcoatRoughness: 0.58,
    transmission: 0,
    thickness: 0.4,
    emissiveIntensity: 0.045,
  },
  cutInner: {
    roughness: 0.78,
    metalness: 0,
    reflectance: 0.5,
    clearcoat: 0.1,
    clearcoatRoughness: 0.62,
    transmission: 0,
    thickness: 0.4,
    emissiveIntensity: 0.055,
  },
  cutOuter: {
    roughness: 0.72,
    metalness: 0,
    reflectance: 0.58,
    clearcoat: 0.18,
    clearcoatRoughness: 0.46,
    transmission: 0,
    thickness: 0.4,
    emissiveIntensity: 0.05,
  },
  softCut: {
    roughness: 0.82,
    metalness: 0,
    reflectance: 0.42,
    clearcoat: 0.08,
    clearcoatRoughness: 0.7,
    transmission: 0,
    thickness: 0.4,
    emissiveIntensity: 0.035,
  },
}

export const materialDefaultSettings = (preset: MaterialPresetId) =>
  preset === "custom" ? null : MATERIAL_DEFAULT_SETTINGS[preset]

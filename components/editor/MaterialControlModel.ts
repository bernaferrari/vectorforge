import type { MaterialSettingKey } from "./EditorModel"

export type MaterialControlDefinition = {
  key: MaterialSettingKey
  label: string
  min: number
  max: number
  sliderMax: number
  step: number
  precision: number
}

export const MATERIAL_CONTROLS: MaterialControlDefinition[] = [
  {
    key: "roughness",
    label: "Smoothness",
    min: 0,
    max: 1,
    sliderMax: 1,
    step: 0.02,
    precision: 2,
  },
  {
    key: "metalness",
    label: "Metallic",
    min: 0,
    max: 1,
    sliderMax: 1,
    step: 0.02,
    precision: 2,
  },
  {
    key: "reflectance",
    label: "Reflectance",
    min: 0,
    max: 1,
    sliderMax: 1,
    step: 0.02,
    precision: 2,
  },
  {
    key: "clearcoat",
    label: "Clearcoat",
    min: 0,
    max: 1,
    sliderMax: 1,
    step: 0.05,
    precision: 2,
  },
  {
    key: "clearcoatRoughness",
    label: "Coat Soft",
    min: 0,
    max: 1,
    sliderMax: 1,
    step: 0.05,
    precision: 2,
  },
  {
    key: "transmission",
    label: "Transparency",
    min: 0,
    max: 1,
    sliderMax: 1,
    step: 0.05,
    precision: 2,
  },
  {
    key: "thickness",
    label: "Glass Depth",
    min: 0.1,
    max: 4,
    sliderMax: 2,
    step: 0.1,
    precision: 1,
  },
  {
    key: "emissiveIntensity",
    label: "Emission",
    min: 0,
    max: 5,
    sliderMax: 2,
    step: 0.1,
    precision: 1,
  },
]

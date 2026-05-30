import type { MaterialPresetId } from "../3d/MaterialPresets"

export interface ExportSceneSnapshot {
  materialPreset: MaterialPresetId
  colorA: string
  colorB: string
  roughness: number
  metalness: number
  reflectance: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  thickness: number
  emissiveIntensity: number
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  layerSpacing: number
  ambientIntensity: number
  keyLightIntensity: number
  rimLightIntensity: number
  svgPathA: string
  svgPathB: string
}

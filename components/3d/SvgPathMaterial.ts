import * as THREE from "three"
import { createThreeMaterial, isGraphiteCutPreset } from "./MaterialPresets"
import type { SvgCanvasProps } from "./SvgTypes"

export type SvgPathMaterialOptions = {
  props: SvgCanvasProps
  color: string
  isIconA: boolean
  isCrossfade: boolean
  useGradientVertexColors: boolean
  layerOrder: number
  isSlashOverlay: boolean
  clippingPlanes: THREE.Plane[]
}

export const createSvgPathMaterial = ({
  props,
  color,
  isIconA,
  isCrossfade,
  useGradientVertexColors,
  layerOrder,
  isSlashOverlay,
  clippingPlanes,
}: SvgPathMaterialOptions) => {
  const forceGraphiteCut = isGraphiteCutPreset(props.materialPreset)
  const materialUsesGradient = useGradientVertexColors && !forceGraphiteCut
  const material = createThreeMaterial(props.materialPreset, {
    color: forceGraphiteCut
      ? "#2f3031"
      : props.enableGradient
        ? "#ffffff"
        : color,
    roughness: props.roughness,
    metalness: props.metalness,
    reflectance: props.reflectance,
    clearcoat: props.clearcoat,
    clearcoatRoughness: props.clearcoatRoughness,
    transmission: props.transmission,
    thickness: props.thickness,
    emissiveIntensity: props.emissiveIntensity,
    wireframe: props.wireframe,
    opacity: isIconA
      ? isCrossfade
        ? 1.0 - props.transitionProgress
        : 1.0
      : isCrossfade
        ? props.transitionProgress
        : 1.0,
    vertexColors: materialUsesGradient,
  }) as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial

  if (
    props.emissiveIntensity &&
    props.emissiveIntensity > 0 &&
    !props.enableGradient
  ) {
    material.emissive = new THREE.Color(color)
  }

  if (layerOrder > 0 || isSlashOverlay) {
    material.polygonOffset = true
    material.polygonOffsetFactor = -layerOrder * 2
    material.polygonOffsetUnits = -layerOrder * 2
  }

  if (clippingPlanes.length > 0) {
    material.clippingPlanes = clippingPlanes
    material.clipShadows = true
  }

  return material
}

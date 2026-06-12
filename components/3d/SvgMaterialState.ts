import * as THREE from "three"
import { isGraphiteCutPreset, type MaterialPresetId } from "./MaterialPresets"
import { applyGradientVertexColors, gradientStopsFromFill } from "./SvgColor"
import { ICON_VIEWBOX_SIZE } from "./SvgSceneUtils"
import { finiteNumber } from "./SvgGeometry"
import type { SvgCanvasProps } from "./SvgTypes"

export const updateGroupMaterialState = (
  group: THREE.Group | null,
  {
    opacity,
    clippingPlanes = null,
    transparent = opacity < 1,
  }: {
    opacity: number
    clippingPlanes?: THREE.Plane[] | null
    transparent?: boolean
  }
) => {
  if (!group) return
  const materialStateKey = `${Math.round(opacity * 1000)}:${
    transparent ? 1 : 0
  }:${clippingPlanes?.length ?? 0}`
  if (group.userData.materialStateKey === materialStateKey) return
  group.userData.materialStateKey = materialStateKey
  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    materials.forEach((material) => {
      const baseOpacity = finiteNumber(material.userData?.baseOpacity, 1)
      const baseTransparent = Boolean(material.userData?.baseTransparent)
      const nextOpacity = Math.max(0, Math.min(1, baseOpacity * opacity))
      const nextTransparent = baseTransparent || transparent || nextOpacity < 1
      const currentPlanes = material.clippingPlanes
      const nextPlaneCount = clippingPlanes?.length ?? 0
      const currentPlaneCount = currentPlanes?.length ?? 0
      const samePlanes =
        currentPlaneCount === nextPlaneCount &&
        (nextPlaneCount === 0 ||
          clippingPlanes?.every(
            (plane, index) => currentPlanes?.[index] === plane
          ))

      if (Math.abs(material.opacity - nextOpacity) > 0.0005) {
        material.opacity = nextOpacity
      }
      if (material.transparent !== nextTransparent) {
        material.transparent = nextTransparent
        material.needsUpdate = true
      }
      if (!samePlanes) {
        material.clippingPlanes = clippingPlanes
        material.clipShadows = nextPlaneCount > 0
        material.needsUpdate = true
      }
    })
  })
}

export const updateGroupMaterialSettings = (
  group: THREE.Group | null,
  {
    materialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    wireframe,
  }: Pick<
    SvgCanvasProps,
    | "roughness"
    | "metalness"
    | "reflectance"
    | "clearcoat"
    | "clearcoatRoughness"
    | "transmission"
    | "thickness"
    | "emissiveIntensity"
    | "wireframe"
  > & { materialPreset: MaterialPresetId }
) => {
  if (!group) return
  const envMapIntensity =
    materialPreset === "prismChrome"
      ? Math.max(2.6, reflectance * 3.2)
      : materialPreset === "gelGlass"
        ? Math.max(1.45, reflectance * 1.75)
        : isGraphiteCutPreset(materialPreset)
          ? Math.max(0.42, reflectance * 1.4)
          : materialPreset === "chrome"
            ? Math.max(1.8, reflectance * 2.4)
            : materialPreset === "holo"
              ? Math.max(0.9, reflectance * 1.15)
              : materialPreset === "aura"
                ? Math.max(1.05, reflectance * 1.3)
                : reflectance

  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    materials.forEach((material) => {
      const writable = material as THREE.Material & {
        roughness?: number
        metalness?: number
        reflectivity?: number
        envMapIntensity?: number
        clearcoat?: number
        clearcoatRoughness?: number
        transmission?: number
        thickness?: number
        emissiveIntensity?: number
        wireframe?: boolean
      }
      let needsUpdate = false

      if (writable.roughness !== undefined) writable.roughness = roughness
      if (writable.metalness !== undefined) {
        writable.metalness =
          materialPreset === "prismChrome"
            ? Math.min(metalness, 0.74)
            : materialPreset === "chrome"
              ? Math.min(metalness, 0.52)
              : materialPreset === "holo"
                ? Math.min(metalness, 0.08)
                : metalness
      }
      if (writable.reflectivity !== undefined)
        writable.reflectivity = reflectance
      if (writable.envMapIntensity !== undefined) {
        writable.envMapIntensity = envMapIntensity
      }
      if (writable.clearcoat !== undefined) writable.clearcoat = clearcoat
      if (writable.clearcoatRoughness !== undefined) {
        writable.clearcoatRoughness = clearcoatRoughness
      }
      if (writable.transmission !== undefined)
        writable.transmission = transmission
      if (writable.thickness !== undefined) writable.thickness = thickness
      if (writable.emissiveIntensity !== undefined) {
        writable.emissiveIntensity = emissiveIntensity
      }
      const surfaceEmissiveUniform = material.userData
        ?.surfaceEmissiveUniform as { value?: number } | undefined
      if (surfaceEmissiveUniform) {
        surfaceEmissiveUniform.value = emissiveIntensity
      }
      if (writable.wireframe !== wireframe) {
        writable.wireframe = wireframe
        needsUpdate = true
      }
      if (needsUpdate) material.needsUpdate = true
    })
  })
}

export const updateGroupFillColors = (
  group: THREE.Group | null,
  {
    color,
    colorSecondary,
    colorStops,
    enableGradient,
    gradientType,
    materialPreset,
    emissiveIntensity,
  }: {
    color: string
    colorSecondary?: string
    colorStops?: SvgCanvasProps["colorAStops"]
    enableGradient?: boolean
    gradientType?: SvgCanvasProps["gradientType"]
    materialPreset: MaterialPresetId
    emissiveIntensity: number
  }
) => {
  if (!group) return
  const forceGraphiteCut = isGraphiteCutPreset(materialPreset)
  const useVertexColors = Boolean(enableGradient && !forceGraphiteCut)
  const stops = gradientStopsFromFill(colorStops, color, colorSecondary ?? color)
  const iconBounds = new THREE.Box2(
    new THREE.Vector2(0, 0),
    new THREE.Vector2(ICON_VIEWBOX_SIZE, ICON_VIEWBOX_SIZE)
  )

  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry || !mesh.material) return

    if (useVertexColors) {
      applyGradientVertexColors(
        mesh.geometry,
        gradientType ?? "linear",
        stops,
        iconBounds
      )
      const colorAttribute = mesh.geometry.getAttribute("color")
      if (colorAttribute) colorAttribute.needsUpdate = true
    }

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    materials.forEach((material) => {
      const writable = material as THREE.Material & {
        color?: THREE.Color
        emissive?: THREE.Color
        emissiveIntensity?: number
        vertexColors?: boolean
      }
      let needsUpdate = false
      if (writable.vertexColors !== undefined && writable.vertexColors !== useVertexColors) {
        writable.vertexColors = useVertexColors
        needsUpdate = true
      }
      if (writable.color) {
        writable.color.set(forceGraphiteCut ? "#2f3031" : useVertexColors ? "#ffffff" : color)
      }
      if (writable.emissive && emissiveIntensity > 0 && !useVertexColors) {
        writable.emissive.set(color)
      }
      if (needsUpdate) material.needsUpdate = true
    })
  })
}

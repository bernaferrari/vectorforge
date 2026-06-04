import * as THREE from "three"
import type { GradientStop, SvgCanvasProps } from "./SvgTypes"

export const MODEL_SCALE = 0.12
export const ICON_VIEWBOX_SIZE = 24
export const DEFAULT_VIEWPORT_FRACTION = 0.5
export const CAMERA_FOV = 40
export const MAX_BEVEL_SEGMENTS = 24
export const GIZMO_SNAP_DEGREES = 45
export const SVG_PATH_LAYER_GAP_RATIO = 0.018
export const SVG_PATH_LAYER_GAP_MIN = 0.035
export const VECTORFORGE_SLASH_DEPTH_RATIO = 0.16
export const VECTORFORGE_SLASH_FORWARD_RATIO = 0.035
export const WIPE_SEAM_OVERLAP_WORLD = 0.8 * MODEL_SCALE

export const pathRebuildSignature = (
  overrides: SvgCanvasProps["pathOverridesA"]
) =>
  JSON.stringify(
    (overrides ?? [])
      .map(({ id, visible, color, depthMultiplier, scale }) => ({
        id,
        visible,
        color,
        depthMultiplier,
        scale,
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  )

export const gradientStopsSignature = (stops: GradientStop[] | undefined) =>
  (stops ?? [])
    .map((stop) => `${stop.color}:${Number(stop.position).toFixed(3)}`)
    .join("|")

export const applySvgModelScale = (group: THREE.Group) => {
  group.scale.set(MODEL_SCALE, -MODEL_SCALE, MODEL_SCALE)
}

export const framedCameraDistance = (camera: THREE.PerspectiveCamera) => {
  const smallerViewportAxis = Math.max(0.2, Math.min(1, camera.aspect))
  const iconWorldSize = ICON_VIEWBOX_SIZE * MODEL_SCALE
  const targetVisibleWorldSize = iconWorldSize / DEFAULT_VIEWPORT_FRACTION
  const visibleWorldPerDistance =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * smallerViewportAxis
  return targetVisibleWorldSize / visibleWorldPerDistance
}

export const disposeObjectTree = (object: THREE.Object3D | null) => {
  object?.traverse((child) => {
    const mesh = child as THREE.Mesh
    const line = child as THREE.LineSegments
    if (!mesh.isMesh && !line.isLineSegments) return
    const renderable = child as THREE.Mesh | THREE.LineSegments
    renderable.geometry?.dispose()
    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : [renderable.material]
    materials.forEach((material) => material.dispose())
  })
}

export const createStudioEnvironmentTexture = () => {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext("2d")
  if (!context) return null

  const sky = context.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, "#ffffff")
  sky.addColorStop(0.16, "#dbeafe")
  sky.addColorStop(0.34, "#334155")
  sky.addColorStop(0.52, "#07070a")
  sky.addColorStop(0.74, "#111827")
  sky.addColorStop(1, "#fafafa")
  context.fillStyle = sky
  context.fillRect(0, 0, canvas.width, canvas.height)

  const addSoftBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    alpha: number
  ) => {
    const gradient = context.createRadialGradient(
      x + w * 0.5,
      y + h * 0.5,
      1,
      x + w * 0.5,
      y + h * 0.5,
      Math.max(w, h) * 0.65
    )
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    context.globalAlpha = alpha
    context.fillStyle = gradient
    context.fillRect(x, y, w, h)
    context.globalAlpha = 1
  }

  addSoftBox(20, 12, 190, 78, "#ffffff", 0.95)
  addSoftBox(342, 28, 140, 52, "#93c5fd", 0.7)
  addSoftBox(40, 118, 180, 44, "#06b6d4", 0.62)
  addSoftBox(286, 104, 168, 52, "#f97316", 0.52)
  addSoftBox(230, 30, 120, 74, "#d946ef", 0.44)
  addSoftBox(160, 172, 190, 42, "#ffffff", 0.55)

  context.globalAlpha = 0.8
  context.fillStyle = "rgba(255,255,255,0.9)"
  context.fillRect(0, 104, canvas.width, 5)
  context.fillStyle = "rgba(96,165,250,0.42)"
  context.fillRect(0, 118, canvas.width, 3)
  context.fillStyle = "rgba(34,211,238,0.48)"
  context.fillRect(0, 132, canvas.width, 2)
  context.fillStyle = "rgba(249,115,22,0.4)"
  context.fillRect(0, 148, canvas.width, 3)
  context.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

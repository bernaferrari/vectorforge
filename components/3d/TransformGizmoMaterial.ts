import * as THREE from "three"
import type { TransformGizmoHandle } from "./TransformGizmo"

export const createTransformGizmoMaterial = (color: number, opacity = 0.9) => {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  material.userData.transformBaseColor = color
  material.userData.transformBaseOpacity = opacity
  return material
}

export const createTransformGizmoHitMaterial = () => {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.001,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  material.userData.transformGizmoHit = true
  return material
}

export const transformHandleKey = (
  handle: TransformGizmoHandle | null | undefined
) => (handle ? `${handle.kind}:${handle.axis ?? "center"}` : null)

const HIGHLIGHT_WHITE = new THREE.Color(0xffffff)
const highlightColorScratch = new THREE.Color()

export const applyTransformGizmoHighlight = (
  gizmo: THREE.Group,
  hoveredKey: string | null,
  activeKey: string | null
) => {
  gizmo.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.material || !mesh.userData.transformGizmo) return

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    materials.forEach((material) => {
      if (material.userData.transformGizmoHit) return

      const handleKey = transformHandleKey(
        mesh.userData.transformGizmo as TransformGizmoHandle
      )
      const isActive = activeKey !== null && handleKey === activeKey
      const isHovered = hoveredKey !== null && handleKey === hoveredKey
      const baseColor =
        typeof material.userData.transformBaseColor === "number"
          ? material.userData.transformBaseColor
          : 0xffffff
      const baseOpacity =
        typeof material.userData.transformBaseOpacity === "number"
          ? material.userData.transformBaseOpacity
          : 0.9
      const basicMaterial = material as THREE.MeshBasicMaterial

      highlightColorScratch.set(baseColor)
      if (isHovered) highlightColorScratch.lerp(HIGHLIGHT_WHITE, 0.46)
      basicMaterial.color.copy(
        isActive ? HIGHLIGHT_WHITE : highlightColorScratch
      )
      basicMaterial.opacity = isActive
        ? 1
        : isHovered
          ? Math.min(1, baseOpacity + 0.2)
          : baseOpacity
      basicMaterial.transparent = basicMaterial.opacity < 1
      mesh.scale.setScalar(1)
    })
  })
}

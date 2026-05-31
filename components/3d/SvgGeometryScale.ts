import * as THREE from "three"
import { finiteNumber } from "./SvgGeometry"

export const cacheInnerGeometryElements = (group: THREE.Group) => {
  const candidates: Array<{
    mesh: THREE.Mesh
    area: number
    center: THREE.Vector3
    box: THREE.Box3
  }> = []
  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox
    if (!box || box.isEmpty()) return
    const size = new THREE.Vector3()
    box.getSize(size)
    const area = Math.abs(size.x * size.y)
    if (!Number.isFinite(area) || area <= 0) return
    candidates.push({
      mesh,
      area,
      center: box.getCenter(new THREE.Vector3()),
      box: box.clone(),
    })
  })

  if (candidates.length < 2) return
  const outer = candidates.reduce(
    (largest, candidate) =>
      candidate.area > largest.area ? candidate : largest,
    candidates[0]
  )
  const largestArea = outer.area
  const innerAreaThreshold = largestArea * 0.72
  const outerSize = new THREE.Vector3()
  outer.box.getSize(outerSize)
  const marginX = Math.max(0.04, outerSize.x * 0.035)
  const marginY = Math.max(0.04, outerSize.y * 0.035)
  const innerMeshes: THREE.Mesh[] = []

  candidates.forEach(({ mesh, area, center, box }) => {
    if (mesh === outer.mesh) return
    if (area >= innerAreaThreshold) return
    const isInsideOuterSilhouette =
      box.min.x >= outer.box.min.x + marginX &&
      box.max.x <= outer.box.max.x - marginX &&
      box.min.y >= outer.box.min.y + marginY &&
      box.max.y <= outer.box.max.y - marginY
    if (!isInsideOuterSilhouette) return

    mesh.userData.innerScaleCenter = center.clone()
    mesh.userData.innerScaleBasePosition = mesh.position.clone()
    innerMeshes.push(mesh)
  })

  group.userData.innerGeometryMeshes = innerMeshes
}

export const applyInnerElementScale = (
  group: THREE.Group,
  scale: { x: number; y: number; z: number }
) => {
  const normalizedScale = {
    x: Math.max(0.35, Math.min(1.35, finiteNumber(scale.x, 1))),
    y: Math.max(0.35, Math.min(1.35, finiteNumber(scale.y, 1))),
    z: Math.max(0.2, Math.min(1.35, finiteNumber(scale.z, 1))),
  }
  const scaleKey = `${normalizedScale.x.toFixed(4)},${normalizedScale.y.toFixed(4)},${normalizedScale.z.toFixed(4)}`
  if (group.userData.innerScaleKey === scaleKey) return
  group.userData.innerScaleKey = scaleKey

  const innerMeshes = group.userData.innerGeometryMeshes as
    | THREE.Mesh[]
    | undefined
  if (!innerMeshes?.length) return

  innerMeshes.forEach((mesh) => {
    const center = mesh.userData.innerScaleCenter as THREE.Vector3 | undefined
    const basePosition = mesh.userData.innerScaleBasePosition as
      | THREE.Vector3
      | undefined
    if (!center || !basePosition) return

    mesh.scale.set(normalizedScale.x, normalizedScale.y, normalizedScale.z)
    mesh.position.set(
      basePosition.x + center.x * (1 - normalizedScale.x),
      basePosition.y + center.y * (1 - normalizedScale.y),
      basePosition.z + center.z * (1 - normalizedScale.z)
    )
    mesh.updateMatrix()
  })
}

export const applyMeshSetScale = (
  meshes: THREE.Mesh[],
  scale: { x: number; y: number; z: number }
) => {
  if (meshes.length === 0) return

  const normalizedScale = {
    x: Math.max(0.05, Math.min(3, finiteNumber(scale.x, 1))),
    y: Math.max(0.05, Math.min(3, finiteNumber(scale.y, 1))),
    z: Math.max(0.05, Math.min(3, finiteNumber(scale.z, 1))),
  }
  const bounds = new THREE.Box3()
  const min = new THREE.Vector3()
  const max = new THREE.Vector3()

  meshes.forEach((mesh) => {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    const box = mesh.geometry?.boundingBox
    if (!box || box.isEmpty()) return
    if (!mesh.userData.layerScaleBasePosition) {
      mesh.userData.layerScaleBasePosition = mesh.position.clone()
    }
    const basePosition = mesh.userData.layerScaleBasePosition as THREE.Vector3
    min.copy(box.min).add(basePosition)
    max.copy(box.max).add(basePosition)
    bounds.expandByPoint(min)
    bounds.expandByPoint(max)
  })

  if (bounds.isEmpty()) return
  const center = bounds.getCenter(new THREE.Vector3())

  meshes.forEach((mesh) => {
    if (!mesh.userData.layerScaleBasePosition) {
      mesh.userData.layerScaleBasePosition = mesh.position.clone()
    }
    const basePosition = mesh.userData.layerScaleBasePosition as THREE.Vector3
    mesh.scale.set(normalizedScale.x, normalizedScale.y, normalizedScale.z)
    mesh.position.set(
      center.x + (basePosition.x - center.x) * normalizedScale.x,
      center.y + (basePosition.y - center.y) * normalizedScale.y,
      center.z + (basePosition.z - center.z) * normalizedScale.z
    )
    mesh.updateMatrix()
  })
}

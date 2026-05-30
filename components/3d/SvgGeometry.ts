import * as THREE from "three"

export const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

export const normalizeSvgToIconViewBox = (svgContent: string) => {
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i)
  if (!viewBoxMatch) return svgContent

  const [minX, minY, width, height] = viewBoxMatch[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (
    ![minX, minY, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return svgContent
  }

  if (minX === 0 && minY === 0 && width === 24 && height === 24) {
    return svgContent
  }

  const inner = svgContent
    .replace(/^<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim()
  const scaleX = 24 / width
  const scaleY = 24 / height
  const translateX = -minX * scaleX
  const translateY = -minY * scaleY

  return `<svg viewBox="0 0 24 24"><g transform="matrix(${scaleX} 0 0 ${scaleY} ${translateX} ${translateY})">${inner}</g></svg>`
}

export const containsInvalidPositions = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position")
  if (!position) return true
  const values = position.array
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) return true
  }
  return false
}

const addMeshVolumeCentroid = (
  geometry: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  centerAccumulator: THREE.Vector3,
  fallbackBox: THREE.Box3
) => {
  const position = geometry.getAttribute("position")
  if (!position) return 0

  const index = geometry.getIndex()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const cross = new THREE.Vector3()
  const triangleCenter = new THREE.Vector3()
  let signedVolume = 0

  const readVertex = (vertexIndex: number, target: THREE.Vector3) => {
    target.fromBufferAttribute(position, vertexIndex).applyMatrix4(matrix)
    if (
      !Number.isFinite(target.x) ||
      !Number.isFinite(target.y) ||
      !Number.isFinite(target.z)
    )
      return false
    fallbackBox.expandByPoint(target)
    return true
  }

  const addTriangle = (ia: number, ib: number, ic: number) => {
    if (!readVertex(ia, a) || !readVertex(ib, b) || !readVertex(ic, c)) return

    const volume = a.dot(cross.crossVectors(b, c)) / 6
    if (!Number.isFinite(volume) || Math.abs(volume) < 1e-10) return

    triangleCenter.copy(a).add(b).add(c).multiplyScalar(0.25)
    centerAccumulator.addScaledVector(triangleCenter, volume)
    signedVolume += volume
  }

  if (index) {
    for (let i = 0; i < index.count - 2; i += 3) {
      addTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2))
    }
  } else {
    for (let i = 0; i < position.count - 2; i += 3) {
      addTriangle(i, i + 1, i + 2)
    }
  }

  return signedVolume
}

const getGroupMassCenter = (group: THREE.Group, space: "local" | "world") => {
  const center = new THREE.Vector3()
  const fallbackBox = new THREE.Box3()
  let signedVolume = 0

  group.updateMatrixWorld(true)
  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return
    mesh.updateMatrix()
    signedVolume += addMeshVolumeCentroid(
      mesh.geometry,
      space === "world" ? mesh.matrixWorld : mesh.matrix,
      center,
      fallbackBox
    )
  })

  if (Math.abs(signedVolume) > 1e-8 && Number.isFinite(signedVolume)) {
    return center.multiplyScalar(1 / signedVolume)
  }

  return fallbackBox.isEmpty()
    ? null
    : fallbackBox.getCenter(new THREE.Vector3())
}

export const getVisibleIconCenter = (groups: Array<THREE.Group | null>) => {
  const center = new THREE.Vector3()
  let count = 0

  groups.forEach((group) => {
    if (!group?.visible || group.children.length === 0) return
    const cachedLocalCenter = group.userData.massCenterLocal as
      | THREE.Vector3
      | undefined
    const groupCenter =
      cachedLocalCenter instanceof THREE.Vector3
        ? group.localToWorld(cachedLocalCenter.clone())
        : getGroupMassCenter(group, "world")
    if (!groupCenter) return
    center.add(groupCenter)
    count += 1
  })

  if (count === 0) return null
  return center.multiplyScalar(1 / count)
}

export const getVisiblePivotBounds = (
  groups: Array<THREE.Group | null>,
  pivot: THREE.Group
) => {
  const bounds = new THREE.Box3()
  const vertex = new THREE.Vector3()

  pivot.updateMatrixWorld(true)
  groups.forEach((group) => {
    if (!group?.visible || group.children.length === 0) return
    const cachedBounds = group.userData.localBounds as THREE.Box3 | undefined
    if (cachedBounds instanceof THREE.Box3 && !cachedBounds.isEmpty()) {
      for (const x of [cachedBounds.min.x, cachedBounds.max.x]) {
        for (const y of [cachedBounds.min.y, cachedBounds.max.y]) {
          for (const z of [cachedBounds.min.z, cachedBounds.max.z]) {
            vertex.set(x, y, z)
            group.localToWorld(vertex)
            pivot.worldToLocal(vertex)
            bounds.expandByPoint(vertex)
          }
        }
      }
      return
    }

    group.updateMatrixWorld(true)
    group.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return

      const position = mesh.geometry.getAttribute("position")
      if (!position) return

      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
        pivot.worldToLocal(vertex)
        if (
          !Number.isFinite(vertex.x) ||
          !Number.isFinite(vertex.y) ||
          !Number.isFinite(vertex.z)
        )
          continue
        bounds.expandByPoint(vertex)
      }
    })
  })

  return bounds.isEmpty() ? null : bounds
}

const getGroupLocalBounds = (group: THREE.Group) => {
  const bounds = new THREE.Box3()
  const vertex = new THREE.Vector3()

  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    mesh.updateMatrix()
    const position = mesh.geometry.getAttribute("position")
    if (!position) return

    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(mesh.matrix)
      if (
        !Number.isFinite(vertex.x) ||
        !Number.isFinite(vertex.y) ||
        !Number.isFinite(vertex.z)
      )
        continue
      bounds.expandByPoint(vertex)
    }
  })

  return bounds.isEmpty() ? null : bounds
}

export const cacheGroupGeometryAnalysis = (group: THREE.Group) => {
  group.userData.massCenterLocal = getGroupMassCenter(group, "local")
  group.userData.localBounds = getGroupLocalBounds(group)
}

export const minContourDimension = (shape: THREE.Shape) => {
  const contourBoxes = [shape, ...shape.holes]
    .map((contour) => {
      const pts = contour.getPoints(16)
      if (
        pts.length < 2 ||
        pts.some((pt) => !Number.isFinite(pt.x) || !Number.isFinite(pt.y))
      )
        return null
      const box = new THREE.Box2().setFromPoints(pts)
      const size = new THREE.Vector2()
      box.getSize(size)
      if (!Number.isFinite(size.x) || !Number.isFinite(size.y)) return null
      return Math.min(Math.abs(size.x), Math.abs(size.y))
    })
    .filter((value): value is number => value !== null && value > 0)

  return contourBoxes.length ? Math.min(...contourBoxes) : 0
}

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

  meshes.forEach((mesh) => {
    mesh.geometry?.computeBoundingBox()
    const box = mesh.geometry?.boundingBox
    if (!box || box.isEmpty()) return
    if (!mesh.userData.layerScaleBasePosition) {
      mesh.userData.layerScaleBasePosition = mesh.position.clone()
    }
    const basePosition = mesh.userData.layerScaleBasePosition as THREE.Vector3
    const min = box.min.clone().add(basePosition)
    const max = box.max.clone().add(basePosition)
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

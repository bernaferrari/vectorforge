import * as THREE from "three"

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

export const cacheGroupGeometryAnalysis = (group: THREE.Group) => {
  group.userData.massCenterLocal = getGroupMassCenter(group, "local")
  group.userData.localBounds = getGroupLocalBounds(group)
}

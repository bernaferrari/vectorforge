import * as THREE from "three"
import { getVisiblePivotBounds } from "./SvgGeometryAnalysis"

const LAYER_OUTLINE_NAME = "selected-layer-outline"

const removeLayerOutline = (mesh: THREE.Mesh) => {
  const outline = mesh.getObjectByName(LAYER_OUTLINE_NAME) as
    | THREE.LineSegments
    | undefined
  if (!outline) return
  mesh.remove(outline)
  outline.geometry?.dispose()
  const materials = Array.isArray(outline.material)
    ? outline.material
    : [outline.material]
  materials.forEach((material) => material.dispose())
}

const ensureLayerOutline = (mesh: THREE.Mesh) => {
  if (mesh.getObjectByName(LAYER_OUTLINE_NAME)) return
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 24),
    new THREE.LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
    })
  )
  outline.name = LAYER_OUTLINE_NAME
  outline.renderOrder = 500
  outline.scale.setScalar(1.002)
  mesh.add(outline)
}

export const updateLayerSelectionOutline = ({
  groups,
  selectedLayerId,
}: {
  groups: Array<THREE.Group | null>
  selectedLayerId: string | null | undefined
}) => {
  groups.forEach((group) => {
    if (!group || group.userData.selectedLayerId === selectedLayerId) return
    group.userData.selectedLayerId = selectedLayerId
    group.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh || !mesh.userData.pathLayerId) return
      if (selectedLayerId && mesh.userData.pathLayerId === selectedLayerId) {
        ensureLayerOutline(mesh)
      } else {
        removeLayerOutline(mesh)
      }
    })
  })
}

export const updateCenterMarker = ({
  marker,
  pivot,
  visibleCenter,
  showCenterPoint,
  iconGroups,
}: {
  marker: THREE.Group | null
  pivot: THREE.Group | null
  visibleCenter: THREE.Vector3 | null
  showCenterPoint: boolean | undefined
  iconGroups: Array<THREE.Group | null>
}) => {
  if (!marker || !pivot) return

  marker.visible = Boolean(showCenterPoint)
  if (!showCenterPoint || !visibleCenter) {
    marker.visible = false
    return
  }

  marker.visible = true
  marker.position.copy(pivot.worldToLocal(visibleCenter.clone()))

  const bounds = getVisiblePivotBounds(iconGroups, pivot)
  const halfDepth = bounds
    ? Math.max(0.16, Math.min(1.2, (bounds.max.z - bounds.min.z) / 2))
    : 0.35
  const back = marker.getObjectByName("center-marker-back")
  const front = marker.getObjectByName("center-marker-front")
  const axis = marker.getObjectByName("center-marker-axis") as
    | THREE.Line
    | undefined
  if (back) back.position.z = -halfDepth
  if (front) front.position.z = halfDepth
  if (axis?.geometry) {
    const position = axis.geometry.getAttribute("position") as
      | THREE.BufferAttribute
      | undefined
    if (position) {
      position.setXYZ(0, 0, 0, -halfDepth)
      position.setXYZ(1, 0, 0, halfDepth)
      position.needsUpdate = true
      axis.geometry.computeBoundingSphere()
    }
  }
}

export const renderSvgScene = ({
  isCrossfade,
  scene,
  renderer,
  camera,
  iconA,
  iconB,
  marker,
  transformGizmo,
}: {
  isCrossfade: boolean
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  iconA: THREE.Group | null
  iconB: THREE.Group | null
  marker: THREE.Group | null
  transformGizmo: THREE.Group | null
}) => {
  const markerVisible = marker?.visible ?? false
  const transformGizmoVisible = transformGizmo?.visible ?? false

  const renderCenterOverlay = () => {
    if (!markerVisible && !transformGizmoVisible) return

    const iconAVisible = iconA?.visible ?? false
    const iconBVisible = iconB?.visible ?? false
    const previousAutoClear = renderer.autoClear
    renderer.clearDepth()
    renderer.autoClear = false
    if (iconA) iconA.visible = false
    if (iconB) iconB.visible = false
    if (marker) marker.visible = markerVisible
    if (transformGizmo) transformGizmo.visible = transformGizmoVisible
    renderer.render(scene, camera)
    renderer.autoClear = previousAutoClear
    if (iconA) iconA.visible = iconAVisible
    if (iconB) iconB.visible = iconBVisible
  }

  if (marker) marker.visible = false
  if (transformGizmo) transformGizmo.visible = false

  if (!isCrossfade || !iconA || !iconB) {
    renderer.render(scene, camera)
    renderCenterOverlay()
    if (marker) marker.visible = markerVisible
    if (transformGizmo) transformGizmo.visible = transformGizmoVisible
    return
  }

  const iconAVisible = iconA.visible
  const iconBVisible = iconB.visible

  renderer.autoClear = true
  iconA.visible = true
  iconB.visible = false
  renderer.render(scene, camera)

  renderer.autoClear = false
  renderer.clearDepth()
  iconA.visible = false
  iconB.visible = true
  renderer.render(scene, camera)

  renderCenterOverlay()

  iconA.visible = iconAVisible
  iconB.visible = iconBVisible
  if (marker) marker.visible = markerVisible
  if (transformGizmo) transformGizmo.visible = transformGizmoVisible
  renderer.autoClear = true
}

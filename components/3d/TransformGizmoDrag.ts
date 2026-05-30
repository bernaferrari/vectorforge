import * as THREE from "three"
import { TRANSFORM_GIZMO_SIZE, type TransformAxis } from "./TransformGizmo"

export type RotationDragScreenFrame = {
  startAngle: number
  lastAngle: number
  sweepDelta: number
  startValue: number
  center: { x: number; y: number }
  basisX: { x: number; y: number }
  basisY: { x: number; y: number }
}

export type RotationDragWorldFrame = {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
}

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

export const shortestAngleDelta = (angle: number, origin: number) => {
  let delta = angle - origin
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  return delta
}

const localAxisVector = (axis: TransformAxis) =>
  axis === "x"
    ? new THREE.Vector3(1, 0, 0)
    : axis === "y"
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1)

const rotationPlaneAxes = (axis: TransformAxis) => {
  if (axis === "x") return { x: "y", y: "z", normal: "x" } as const
  if (axis === "y") return { x: "z", y: "x", normal: "y" } as const
  return { x: "x", y: "y", normal: "z" } as const
}

export const createRotationDragWorldFrame = ({
  axis,
  pivot,
  gizmo,
}: {
  axis: TransformAxis
  pivot: THREE.Object3D
  gizmo: THREE.Object3D
}): RotationDragWorldFrame => {
  pivot.updateMatrixWorld(true)
  gizmo.updateMatrixWorld(true)
  const axes = rotationPlaneAxes(axis)
  const basisX = localAxisVector(axes.x).transformDirection(pivot.matrixWorld)
  const basisY = localAxisVector(axes.y).transformDirection(pivot.matrixWorld)
  const normal = localAxisVector(axes.normal).transformDirection(
    pivot.matrixWorld
  )
  const basisMatrix = new THREE.Matrix4().makeBasis(basisX, basisY, normal)
  return {
    position: gizmo.getWorldPosition(new THREE.Vector3()),
    quaternion: new THREE.Quaternion().setFromRotationMatrix(basisMatrix),
    scale: gizmo.getWorldScale(new THREE.Vector3()),
  }
}

export const applyRotationDragOverlay = ({
  overlay,
  gizmo,
  axis,
  angleDeg,
  frame,
  showGizmoWhenHidden,
}: {
  overlay: THREE.Group
  gizmo: THREE.Group | null
  axis: TransformAxis | null
  angleDeg?: number
  frame?: RotationDragWorldFrame | null
  showGizmoWhenHidden: boolean
}) => {
  if (!axis || !gizmo || !frame) {
    overlay.visible = false
    if (gizmo && showGizmoWhenHidden) gizmo.visible = true
    return
  }

  overlay.visible = true
  gizmo.visible = false
  overlay.position.copy(frame.position)
  overlay.quaternion.copy(frame.quaternion)
  overlay.scale.copy(frame.scale)

  const dial = overlay.userData.dial as THREE.Group | undefined
  if (dial) {
    dial.rotation.z = THREE.MathUtils.degToRad(angleDeg ?? 0)
  }
}

export const updateRotationDragSector = ({
  overlay,
  startAngleDeg,
  currentAngleDeg,
}: {
  overlay: THREE.Group
  startAngleDeg: number
  currentAngleDeg: number
}) => {
  const sector = overlay.userData.sector as THREE.Mesh | undefined
  if (!sector) return
  const radius = finiteNumber(overlay.userData.radius, TRANSFORM_GIZMO_SIZE)
  const delta = currentAngleDeg - startAngleDeg
  const steps = Math.max(2, Math.ceil(Math.abs(delta) / 6))
  const positions: number[] = []

  for (let index = 0; index < steps; index += 1) {
    const a0 = THREE.MathUtils.degToRad(startAngleDeg + (delta * index) / steps)
    const a1 = THREE.MathUtils.degToRad(
      startAngleDeg + (delta * (index + 1)) / steps
    )
    positions.push(
      0,
      0,
      0,
      Math.cos(a0) * radius,
      Math.sin(a0) * radius,
      0,
      Math.cos(a1) * radius,
      Math.sin(a1) * radius,
      0
    )
  }

  const geometry = sector.geometry as THREE.BufferGeometry
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.computeBoundingSphere()
}

export const updateRotationDragTooltip = ({
  tooltip,
  delta,
  clientX,
  clientY,
}: {
  tooltip: HTMLDivElement | null
  delta: number
  clientX: number
  clientY: number
}) => {
  if (!tooltip) return
  tooltip.textContent = `${delta >= 0 ? "+" : ""}${Math.round(delta)}°`
  tooltip.style.transform = `translate3d(${clientX + 14}px, ${clientY - 34}px, 0)`
  tooltip.style.opacity = "1"
}

export const rotationDialAngleFromPointer = ({
  frame,
  clientX,
  clientY,
}: {
  frame: RotationDragScreenFrame | null
  clientX: number
  clientY: number
}) => {
  if (!frame) return null
  const px = clientX - frame.center.x
  const py = clientY - frame.center.y
  const { basisX, basisY } = frame
  const det = basisX.x * basisY.y - basisX.y * basisY.x
  if (Math.abs(det) < 0.0001) return null
  const u = (px * basisY.y - py * basisY.x) / det
  const v = (basisX.x * py - basisX.y * px) / det
  return THREE.MathUtils.radToDeg(Math.atan2(v, u))
}

export const getRotationDragScreenFrame = ({
  overlay,
  camera,
  canvas,
  startValue,
}: {
  overlay: THREE.Group
  camera: THREE.Camera
  canvas: HTMLCanvasElement
  startValue: number
}): RotationDragScreenFrame => {
  overlay.updateMatrixWorld(true)
  const rect = canvas.getBoundingClientRect()
  const radius = finiteNumber(overlay.userData.radius, TRANSFORM_GIZMO_SIZE)
  const projectPoint = (point: THREE.Vector3) => {
    const projected = point.applyMatrix4(overlay.matrixWorld).project(camera)
    return {
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height,
    }
  }
  const center = projectPoint(new THREE.Vector3(0, 0, 0))
  const xPoint = projectPoint(new THREE.Vector3(radius, 0, 0))
  const yPoint = projectPoint(new THREE.Vector3(0, radius, 0))

  return {
    startAngle: 0,
    lastAngle: 0,
    sweepDelta: 0,
    startValue,
    center,
    basisX: { x: xPoint.x - center.x, y: xPoint.y - center.y },
    basisY: { x: yPoint.x - center.x, y: yPoint.y - center.y },
  }
}

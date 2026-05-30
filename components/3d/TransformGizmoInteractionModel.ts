import type { MutableRefObject, RefObject } from "react"
import * as THREE from "three"
import {
  TRANSFORM_AXES,
  TRANSFORM_GIZMO_SIZE,
  type TransformAxis,
  type TransformGizmoHandle,
} from "./TransformGizmo"
import { finiteNumber } from "./SvgGeometry"
import type { SvgCanvasLiveRenderProps } from "./useSvgCanvasLiveRefs"
import { bindWindowPointerDrag } from "@/lib/drag-events"

const gizmoLocalCenterScratch = new THREE.Vector3()
const gizmoProjectedCenterScratch = new THREE.Vector3()
const gizmoProjectedAxisScratch = new THREE.Vector3()

export type TransformScreenAxis = Record<
  TransformAxis,
  { x: number; y: number }
>

export type TransformGizmoInteractionOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>
  pivotGroupRef: MutableRefObject<THREE.Group | null>
  transformGizmoGroupRef: MutableRefObject<THREE.Group | null>
  transformGizmoHitObjectsRef: MutableRefObject<THREE.Object3D[]>
  rotationDragOverlayRef: MutableRefObject<THREE.Group | null>
  rotationDragTooltipRef: RefObject<HTMLDivElement | null>
  liveRenderPropsRef: MutableRefObject<SvgCanvasLiveRenderProps>
  onObjectScaleChangeRef: MutableRefObject<
    ((scale: number) => void) | undefined
  >
  onObjectScaleAxisChangeRef: MutableRefObject<
    ((axis: TransformAxis, value: number) => void) | undefined
  >
  onMoveOffsetChangeRef: MutableRefObject<
    ((axis: TransformAxis, value: number) => void) | undefined
  >
  onRotationAxisChangeRef: MutableRefObject<
    ((axis: TransformAxis, value: number) => void) | undefined
  >
}

export const TRANSFORM_AXIS_VECTORS: Record<TransformAxis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
}

export const axisDragCursor = (axis: TransformAxis) =>
  axis === "x" ? "ew-resize" : axis === "y" ? "ns-resize" : "grab"

export const clampTransformValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const projectedAxisPointerDelta = ({
  axis,
  event,
  startX,
  startY,
  screenAxis,
}: {
  axis: TransformAxis
  event: PointerEvent
  startX: number
  startY: number
  screenAxis: TransformScreenAxis
}) => {
  const { x, y } = screenAxis[axis]
  return (event.clientX - startX) * x + (event.clientY - startY) * y
}

export const transformGizmoHandleFromObject = (object: THREE.Object3D) =>
  object.userData.transformGizmo as TransformGizmoHandle | undefined

export const hitTransformGizmoHandle = ({
  event,
  canvas,
  camera,
  hitObjects,
  raycaster,
  pointer,
}: {
  event: PointerEvent
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  hitObjects: THREE.Object3D[]
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
}) => {
  const rect = canvas.getBoundingClientRect()
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -(((event.clientY - rect.top) / rect.height) * 2 - 1)
  )
  raycaster.setFromCamera(pointer, camera)
  const intersections = raycaster.intersectObjects(hitObjects, true)
  const hit =
    intersections.find((item) => {
      const handle = transformGizmoHandleFromObject(item.object)
      return handle?.kind === "scale"
    }) ?? intersections[0]
  const handle = hit ? transformGizmoHandleFromObject(hit.object) : undefined
  return handle ?? null
}

export const updateTransformGizmoPlacement = ({
  center,
  camera,
  gizmo,
  pivot,
  showTransformGizmo,
  overlayActive,
  objectScale,
  objectScaleAxes,
  screenAxis,
}: {
  center: THREE.Vector3 | null
  camera: THREE.PerspectiveCamera
  gizmo: THREE.Group
  pivot: THREE.Group
  showTransformGizmo: boolean | undefined
  overlayActive: boolean
  objectScale: number
  objectScaleAxes: Record<TransformAxis, number>
  screenAxis: TransformScreenAxis
}) => {
  const visible = Boolean(showTransformGizmo && center)
  gizmo.visible = visible && !overlayActive
  if (!visible || !center) return false

  gizmo.position.copy(pivot.worldToLocal(gizmoLocalCenterScratch.copy(center)))
  const parentScale = Math.max(0.05, finiteNumber(objectScale, 1))
  gizmo.scale.set(
    1 / Math.max(0.05, parentScale * finiteNumber(objectScaleAxes.x, 1)),
    1 / Math.max(0.05, parentScale * finiteNumber(objectScaleAxes.y, 1)),
    1 / Math.max(0.05, parentScale * finiteNumber(objectScaleAxes.z, 1))
  )

  const centerScreen = gizmoProjectedCenterScratch.copy(center).project(camera)

  TRANSFORM_AXES.forEach((axis) => {
    const projectedEnd = gizmoProjectedAxisScratch
      .copy(TRANSFORM_AXIS_VECTORS[axis])
      .transformDirection(pivot.matrixWorld)
      .multiplyScalar(TRANSFORM_GIZMO_SIZE * parentScale)
      .add(center)
      .project(camera)
    const dx = projectedEnd.x - centerScreen.x
    const dy = centerScreen.y - projectedEnd.y
    const length = Math.max(0.001, Math.hypot(dx, dy))
    screenAxis[axis] = {
      x: dx / length,
      y: dy / length,
    }
  })

  return true
}

export const startTransformPointerDrag = ({
  event,
  cursor,
  handle,
  onMove,
  onStart,
  onEnd,
}: {
  event: PointerEvent
  cursor: string
  handle: TransformGizmoHandle
  onMove: (event: PointerEvent) => void
  onStart: (handle: TransformGizmoHandle) => void
  onEnd: (handle: TransformGizmoHandle) => void
}) => {
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  document.body.style.cursor = cursor
  onStart(handle)
  onMove(event)
  bindWindowPointerDrag({
    onMove,
    onEnd: () => {
      document.body.style.cursor = ""
      onEnd(handle)
    },
  })
}

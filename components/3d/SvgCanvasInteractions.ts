import * as THREE from "three"
import type { MutableRefObject } from "react"
import type { TransformAxis, TransformGizmoHandle } from "./TransformGizmo"
import type { SvgCanvasProps } from "./SvgTypes"
import {
  isPrimaryButtonReleased,
  safelyReleasePointerCapture,
  safelySetPointerCapture,
} from "@/lib/drag-events"

type PointerPosition = { x: number; y: number }
type RotationVelocity = { x: number; y: number }

export type SvgCanvasPointerBindings = {
  canvas: HTMLCanvasElement
  hitTransformGizmo: (event: PointerEvent) => TransformGizmoHandle | null
  beginTransformScale: (event: PointerEvent, axis?: TransformAxis) => void
  beginTransformMove: (axis: TransformAxis, event: PointerEvent) => void
  beginTransformRotate: (axis: TransformAxis, event: PointerEvent) => void
  setTransformGizmoHighlight: (
    hovered: TransformGizmoHandle | null,
    active?: TransformGizmoHandle | null
  ) => void
  applyViewRotationDelta: (delta: RotationVelocity) => void
  isDraggingRef: MutableRefObject<boolean>
  isInertiaActiveRef: MutableRefObject<boolean>
  hasViewDragMovedRef: MutableRefObject<boolean>
  activePointerIdRef: MutableRefObject<number | null>
  pointerStartPositionRef: MutableRefObject<PointerPosition>
  previousPointerPositionRef: MutableRefObject<PointerPosition>
  rotationVelocityRef: MutableRefObject<RotationVelocity>
  viewInertiaEnabledRef: MutableRefObject<boolean>
  targetZoomRef: MutableRefObject<number>
  currentZoomRef: MutableRefObject<number>
  animationStartRef: MutableRefObject<number>
  iconAGroupRef: MutableRefObject<THREE.Group | null>
  iconBGroupRef: MutableRefObject<THREE.Group | null>
  onZoomChange?: SvgCanvasProps["onZoomChange"]
}

const clampZoom = (zoom: number) => Math.max(0.3, Math.min(3, zoom))

export const bindSvgCanvasPointerInteractions = ({
  canvas,
  hitTransformGizmo,
  beginTransformScale,
  beginTransformMove,
  beginTransformRotate,
  setTransformGizmoHighlight,
  applyViewRotationDelta,
  isDraggingRef,
  isInertiaActiveRef,
  hasViewDragMovedRef,
  activePointerIdRef,
  pointerStartPositionRef,
  previousPointerPositionRef,
  rotationVelocityRef,
  viewInertiaEnabledRef,
  targetZoomRef,
  currentZoomRef,
  animationStartRef,
  iconAGroupRef,
  iconBGroupRef,
  onZoomChange,
}: SvgCanvasPointerBindings) => {
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    const transformHandle = hitTransformGizmo(event)
    if (transformHandle) {
      if (transformHandle.kind === "scale") {
        beginTransformScale(event, transformHandle.axis)
        return
      }
      if (transformHandle.kind === "move" && transformHandle.axis) {
        beginTransformMove(transformHandle.axis, event)
        return
      }
      if (transformHandle.kind === "rotate" && transformHandle.axis) {
        beginTransformRotate(transformHandle.axis, event)
        return
      }
    }

    isDraggingRef.current = true
    hasViewDragMovedRef.current = false
    activePointerIdRef.current = event.pointerId
    pointerStartPositionRef.current = { x: event.clientX, y: event.clientY }
    previousPointerPositionRef.current = { x: event.clientX, y: event.clientY }
    safelySetPointerCapture(canvas, event.pointerId)
  }

  const endViewDrag = (event: PointerEvent) => {
    if (activePointerIdRef.current !== event.pointerId) return
    isDraggingRef.current = false
    activePointerIdRef.current = null
    if (!hasViewDragMovedRef.current) {
      safelyReleasePointerCapture(canvas, event.pointerId)
      return
    }

    hasViewDragMovedRef.current = false
    const speed = Math.hypot(
      rotationVelocityRef.current.x,
      rotationVelocityRef.current.y
    )
    if (viewInertiaEnabledRef.current && speed > 0.002) {
      isInertiaActiveRef.current = true
    } else {
      isInertiaActiveRef.current = false
      rotationVelocityRef.current = { x: 0, y: 0 }
    }
    safelyReleasePointerCapture(canvas, event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDraggingRef.current) {
      setTransformGizmoHighlight(hitTransformGizmo(event))
      return
    }
    if (activePointerIdRef.current !== event.pointerId) return
    if (isPrimaryButtonReleased(event)) {
      endViewDrag(event)
      return
    }

    const totalDeltaX = event.clientX - pointerStartPositionRef.current.x
    const totalDeltaY = event.clientY - pointerStartPositionRef.current.y
    if (!hasViewDragMovedRef.current) {
      if (Math.hypot(totalDeltaX, totalDeltaY) < 3) return
      hasViewDragMovedRef.current = true
      isInertiaActiveRef.current = false
      rotationVelocityRef.current = { x: 0, y: 0 }
      previousPointerPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      }
      return
    }

    const deltaX = event.clientX - previousPointerPositionRef.current.x
    const deltaY = event.clientY - previousPointerPositionRef.current.y
    const velocity = {
      x: deltaY * 0.006,
      y: deltaX * 0.006,
    }

    rotationVelocityRef.current = velocity
    applyViewRotationDelta(velocity)
    previousPointerPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  const handlePointerCancel = (event: PointerEvent) => {
    if (activePointerIdRef.current !== event.pointerId) return
    isDraggingRef.current = false
    hasViewDragMovedRef.current = false
    activePointerIdRef.current = null
    isInertiaActiveRef.current = false
    rotationVelocityRef.current = { x: 0, y: 0 }
    safelyReleasePointerCapture(canvas, event.pointerId)
  }

  const handlePointerLeave = () => {
    if (!isDraggingRef.current) setTransformGizmoHighlight(null)
  }

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    if (!onZoomChange) return
    const direction = event.deltaY > 0 ? -1 : 1
    const newZoom = clampZoom(targetZoomRef.current + direction * 0.08)
    targetZoomRef.current = newZoom
    onZoomChange(Number(newZoom.toFixed(2)))
  }

  const handleDoubleClick = () => {
    targetZoomRef.current = 1
    currentZoomRef.current = 1
    animationStartRef.current = performance.now()
    iconAGroupRef.current?.rotation.set(0, 0, 0)
    iconBGroupRef.current?.rotation.set(0, 0, 0)
    onZoomChange?.(1)
  }

  canvas.addEventListener("pointerdown", handlePointerDown)
  canvas.addEventListener("pointermove", handlePointerMove)
  canvas.addEventListener("pointerup", endViewDrag)
  canvas.addEventListener("pointercancel", handlePointerCancel)
  canvas.addEventListener("pointerleave", handlePointerLeave)
  canvas.addEventListener("wheel", handleWheel, { passive: false })
  canvas.addEventListener("dblclick", handleDoubleClick)

  return () => {
    canvas.removeEventListener("pointerdown", handlePointerDown)
    canvas.removeEventListener("pointermove", handlePointerMove)
    canvas.removeEventListener("pointerup", endViewDrag)
    canvas.removeEventListener("pointercancel", handlePointerCancel)
    canvas.removeEventListener("pointerleave", handlePointerLeave)
    canvas.removeEventListener("wheel", handleWheel)
    canvas.removeEventListener("dblclick", handleDoubleClick)
  }
}

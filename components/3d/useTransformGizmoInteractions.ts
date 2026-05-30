"use client"

import { useRef } from "react"
import * as THREE from "three"
import { type TransformAxis, type TransformGizmoHandle } from "./TransformGizmo"
import {
  applyTransformGizmoHighlight,
  transformHandleKey,
} from "./TransformGizmoMaterial"
import {
  axisDragCursor,
  clampTransformValue,
  hitTransformGizmoHandle,
  projectedAxisPointerDelta,
  startTransformPointerDrag,
  type TransformGizmoInteractionOptions,
  type TransformScreenAxis,
  updateTransformGizmoPlacement,
} from "./TransformGizmoInteractionModel"
import {
  type RotationDragScreenFrame,
  type RotationDragWorldFrame,
  applyRotationDragOverlay,
  createRotationDragWorldFrame,
  getRotationDragScreenFrame,
  rotationDialAngleFromPointer,
  shortestAngleDelta,
  updateRotationDragSector,
  updateRotationDragTooltip,
} from "./TransformGizmoDrag"
import { finiteNumber } from "./SvgGeometry"

export function useTransformGizmoInteractions({
  canvasRef,
  cameraRef,
  pivotGroupRef,
  transformGizmoGroupRef,
  transformGizmoHitObjectsRef,
  rotationDragOverlayRef,
  rotationDragTooltipRef,
  liveRenderPropsRef,
  onObjectScaleChangeRef,
  onObjectScaleAxisChangeRef,
  onMoveOffsetChangeRef,
  onRotationAxisChangeRef,
}: TransformGizmoInteractionOptions) {
  const transformRaycasterRef = useRef(new THREE.Raycaster())
  const transformPointerRef = useRef(new THREE.Vector2())
  const transformScreenAxisRef = useRef<TransformScreenAxis>({
    x: { x: 1, y: 0 },
    y: { x: 0, y: -1 },
    z: { x: 0.7, y: -0.7 },
  })
  const transformHoveredHandleRef = useRef<string | null>(null)
  const transformActiveHandleRef = useRef<string | null>(null)
  const rotationDragOverlayStateRef = useRef<{
    axis: TransformAxis | null
    angle: number
  }>({ axis: null, angle: 0 })
  const rotationDragScreenRef = useRef<RotationDragScreenFrame | null>(null)
  const rotationDragWorldFrameRef = useRef<RotationDragWorldFrame | null>(null)

  const setTransformGizmoHighlight = (
    hovered: TransformGizmoHandle | null,
    active?: TransformGizmoHandle | null
  ) => {
    const gizmo = transformGizmoGroupRef.current
    if (!gizmo) return
    const hoveredKey = transformHandleKey(hovered)
    if (active !== undefined) {
      transformActiveHandleRef.current = transformHandleKey(active)
    }
    if (
      hoveredKey === transformHoveredHandleRef.current &&
      active === undefined
    )
      return
    transformHoveredHandleRef.current = hoveredKey
    const activeKey = transformActiveHandleRef.current
    applyTransformGizmoHighlight(gizmo, hoveredKey, activeKey)
  }

  const setRotationDragOverlay = (axis: TransformAxis | null, angleDeg = 0) => {
    const overlay = rotationDragOverlayRef.current
    const gizmo = transformGizmoGroupRef.current
    if (!overlay) return
    if (!axis || !gizmo) {
      rotationDragOverlayStateRef.current = { axis: null, angle: 0 }
      rotationDragScreenRef.current = null
      rotationDragWorldFrameRef.current = null
      const tooltip = rotationDragTooltipRef.current
      if (tooltip) tooltip.style.opacity = "0"
      applyRotationDragOverlay({
        overlay,
        gizmo,
        axis: null,
        showGizmoWhenHidden: Boolean(
          liveRenderPropsRef.current.showTransformGizmo
        ),
      })
      return
    }

    rotationDragOverlayStateRef.current = { axis, angle: angleDeg }
    const frame =
      rotationDragWorldFrameRef.current ??
      (pivotGroupRef.current
        ? createRotationDragWorldFrame({
            axis,
            pivot: pivotGroupRef.current,
            gizmo,
          })
        : null)
    applyRotationDragOverlay({
      overlay,
      gizmo,
      axis,
      angleDeg,
      frame,
      showGizmoWhenHidden: Boolean(
        liveRenderPropsRef.current.showTransformGizmo
      ),
    })
  }

  const startTransformDrag = (
    event: PointerEvent,
    cursor: string,
    handle: TransformGizmoHandle,
    onMove: (event: PointerEvent) => void
  ) => {
    startTransformPointerDrag({
      event,
      cursor,
      handle,
      onMove,
      onStart: (activeHandle) => {
        setTransformGizmoHighlight(activeHandle, activeHandle)
        if (activeHandle.kind === "rotate" && transformGizmoGroupRef.current) {
          transformGizmoGroupRef.current.visible = false
        }
      },
      onEnd: (activeHandle) => {
        setTransformGizmoHighlight(null, null)
        if (activeHandle.kind === "rotate") setRotationDragOverlay(null)
      },
    })
  }

  const beginTransformMove = (axis: TransformAxis, event: PointerEvent) => {
    const startX = event.clientX
    const startY = event.clientY
    const startValue = finiteNumber(
      liveRenderPropsRef.current.moveOffset[axis],
      0
    )
    startTransformDrag(
      event,
      axisDragCursor(axis),
      { kind: "move", axis },
      (ev) => {
        const projectedDelta = projectedAxisPointerDelta({
          axis,
          event: ev,
          startX,
          startY,
          screenAxis: transformScreenAxisRef.current,
        })
        const next = Math.round(
          clampTransformValue(startValue + projectedDelta * 0.35, -100, 100)
        )
        onMoveOffsetChangeRef.current?.(axis, next)
      }
    )
  }

  const beginTransformScale = (event: PointerEvent, axis?: TransformAxis) => {
    const startX = event.clientX
    const startY = event.clientY
    const baseScale = finiteNumber(liveRenderPropsRef.current.objectScale, 1)
    const axisScales = liveRenderPropsRef.current.objectScaleAxes
    const startScale = axis ? finiteNumber(axisScales[axis], 1) : baseScale
    const cursor = axis ? axisDragCursor(axis) : "grab"
    startTransformDrag(event, cursor, { kind: "scale", axis }, (ev) => {
      const projectedDelta = axis
        ? projectedAxisPointerDelta({
            axis,
            event: ev,
            startX,
            startY,
            screenAxis: transformScreenAxisRef.current,
          })
        : startY - ev.clientY
      const next = Number(
        clampTransformValue(
          startScale + projectedDelta * 0.008,
          0.1,
          3
        ).toFixed(2)
      )
      if (axis) {
        onObjectScaleAxisChangeRef.current?.(axis, next)
      } else {
        onObjectScaleChangeRef.current?.(next)
      }
    })
  }

  const beginTransformRotate = (axis: TransformAxis, event: PointerEvent) => {
    const startValue = finiteNumber(
      liveRenderPropsRef.current.rotationOffset[axis],
      0
    )
    const gizmo = transformGizmoGroupRef.current
    const pivot = pivotGroupRef.current
    if (!gizmo || !pivot) return
    pivot.updateMatrixWorld(true)
    gizmo.updateMatrixWorld(true)
    rotationDragWorldFrameRef.current = createRotationDragWorldFrame({
      axis,
      pivot,
      gizmo,
    })
    setRotationDragOverlay(axis, 0)
    gizmo.visible = false
    const overlay = rotationDragOverlayRef.current
    const camera = cameraRef.current
    const canvas = canvasRef.current
    const screenFrame =
      overlay && camera && canvas
        ? getRotationDragScreenFrame({
            overlay,
            camera,
            canvas,
            startValue,
          })
        : null
    if (!screenFrame) {
      setRotationDragOverlay(null)
      return
    }
    rotationDragScreenRef.current = screenFrame
    const startDialAngle =
      rotationDialAngleFromPointer({
        frame: rotationDragScreenRef.current,
        clientX: event.clientX,
        clientY: event.clientY,
      }) ?? 0
    rotationDragScreenRef.current = {
      ...screenFrame,
      startAngle: startDialAngle,
      lastAngle: startDialAngle,
      sweepDelta: 0,
    }
    setRotationDragOverlay(axis, startDialAngle)
    if (overlay) {
      updateRotationDragSector({
        overlay,
        startAngleDeg: startDialAngle,
        currentAngleDeg: startDialAngle,
      })
    }
    updateRotationDragTooltip({
      tooltip: rotationDragTooltipRef.current,
      delta: 0,
      clientX: event.clientX,
      clientY: event.clientY,
    })
    startTransformDrag(event, "grabbing", { kind: "rotate", axis }, (ev) => {
      const drag = rotationDragScreenRef.current
      if (!drag) return
      const angle = rotationDialAngleFromPointer({
        frame: drag,
        clientX: ev.clientX,
        clientY: ev.clientY,
      })
      if (angle === null) return
      const stepDelta = shortestAngleDelta(angle, drag.lastAngle)
      const delta = drag.sweepDelta + stepDelta
      const next = Math.round(drag.startValue + delta)
      rotationDragScreenRef.current = {
        ...drag,
        lastAngle: angle,
        sweepDelta: delta,
      }
      const displayAngle = drag.startAngle + delta
      setRotationDragOverlay(axis, displayAngle)
      if (rotationDragOverlayRef.current) {
        updateRotationDragSector({
          overlay: rotationDragOverlayRef.current,
          startAngleDeg: drag.startAngle,
          currentAngleDeg: displayAngle,
        })
      }
      updateRotationDragTooltip({
        tooltip: rotationDragTooltipRef.current,
        delta,
        clientX: ev.clientX,
        clientY: ev.clientY,
      })
      onRotationAxisChangeRef.current?.(axis, next)
    })
  }

  const updateTransformGizmo = (
    center: THREE.Vector3 | null,
    camera: THREE.PerspectiveCamera
  ) => {
    const gizmo = transformGizmoGroupRef.current
    const pivot = pivotGroupRef.current
    if (!gizmo || !pivot) return
    const overlayState = rotationDragOverlayStateRef.current
    const placementVisible = updateTransformGizmoPlacement({
      center,
      camera,
      gizmo,
      pivot,
      showTransformGizmo: liveRenderPropsRef.current.showTransformGizmo,
      overlayActive: Boolean(overlayState.axis),
      objectScale: liveRenderPropsRef.current.objectScale,
      objectScaleAxes: liveRenderPropsRef.current.objectScaleAxes,
      screenAxis: transformScreenAxisRef.current,
    })
    if (!placementVisible) {
      setTransformGizmoHighlight(null, null)
      return
    }

    if (overlayState.axis) {
      setRotationDragOverlay(overlayState.axis, overlayState.angle)
    }
  }

  const hitTransformGizmo = (event: PointerEvent) => {
    if (!liveRenderPropsRef.current.showTransformGizmo) return null
    const canvas = canvasRef.current
    const camera = cameraRef.current
    const hits = transformGizmoHitObjectsRef.current
    if (!canvas || !camera || hits.length === 0) return null

    return hitTransformGizmoHandle({
      event,
      canvas,
      camera,
      hitObjects: hits,
      raycaster: transformRaycasterRef.current,
      pointer: transformPointerRef.current,
    })
  }

  return {
    beginTransformMove,
    beginTransformScale,
    beginTransformRotate,
    hitTransformGizmo,
    setTransformGizmoHighlight,
    setRotationDragOverlay,
    updateTransformGizmo,
  }
}

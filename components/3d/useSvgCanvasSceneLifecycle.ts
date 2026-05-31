"use client"

import { useEffect, type MutableRefObject, type RefObject } from "react"
import * as THREE from "three"
import type { TransformAxis, TransformGizmoHandle } from "./TransformGizmo"
import {
  bindSvgSceneResize,
  createSvgSceneResources,
  disposeSvgSceneResources,
} from "./SvgSceneLifecycle"
import { bindSvgCanvasPointerInteractions } from "./SvgCanvasInteractions"
import type { SvgCanvasProps } from "./SvgTypes"

type PointerPosition = { x: number; y: number }
type RotationVelocity = { x: number; y: number }

type NullableRef<T> = MutableRefObject<T | null>

type SvgCanvasSceneLifecycleOptions = {
  props: SvgCanvasProps
  canvasRef: RefObject<HTMLCanvasElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  sceneRef: NullableRef<THREE.Scene>
  rendererRef: NullableRef<THREE.WebGLRenderer>
  cameraRef: NullableRef<THREE.PerspectiveCamera>
  animationStartRef: MutableRefObject<number>
  ambientLightRef: NullableRef<THREE.AmbientLight>
  keyLightRef: NullableRef<THREE.DirectionalLight>
  softboxLightRef: NullableRef<THREE.RectAreaLight>
  rimLightRef: NullableRef<THREE.DirectionalLight>
  pivotGroupRef: NullableRef<THREE.Group>
  iconAGroupRef: NullableRef<THREE.Group>
  iconBGroupRef: NullableRef<THREE.Group>
  centerMarkerRef: NullableRef<THREE.Group>
  clipPlaneARef: NullableRef<THREE.Plane>
  clipPlaneBRef: NullableRef<THREE.Plane>
  transformGizmoGroupRef: NullableRef<THREE.Group>
  transformGizmoHitObjectsRef: MutableRefObject<THREE.Object3D[]>
  rotationDragOverlayRef: NullableRef<THREE.Group>
  resetViewFrameRef: MutableRefObject<number | null>
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
  hitTransformGizmo: (event: PointerEvent) => TransformGizmoHandle | null
  beginTransformScale: (event: PointerEvent, axis?: TransformAxis) => void
  beginTransformMove: (axis: TransformAxis, event: PointerEvent) => void
  beginTransformRotate: (axis: TransformAxis, event: PointerEvent) => void
  setTransformGizmoHighlight: (
    hovered: TransformGizmoHandle | null,
    active?: TransformGizmoHandle | null
  ) => void
  applyViewRotationDelta: (delta: RotationVelocity) => void
  cancelViewNudge: () => void
}

export function useSvgCanvasSceneLifecycle({
  props,
  canvasRef,
  containerRef,
  sceneRef,
  rendererRef,
  cameraRef,
  animationStartRef,
  ambientLightRef,
  keyLightRef,
  softboxLightRef,
  rimLightRef,
  pivotGroupRef,
  iconAGroupRef,
  iconBGroupRef,
  centerMarkerRef,
  clipPlaneARef,
  clipPlaneBRef,
  transformGizmoGroupRef,
  transformGizmoHitObjectsRef,
  rotationDragOverlayRef,
  resetViewFrameRef,
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
  hitTransformGizmo,
  beginTransformScale,
  beginTransformMove,
  beginTransformRotate,
  setTransformGizmoHighlight,
  applyViewRotationDelta,
  cancelViewNudge,
}: SvgCanvasSceneLifecycleOptions) {
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const { renderer, studioEnvironment } = createSvgSceneResources({
      canvas,
      container,
      props,
      refs: {
        sceneRef,
        rendererRef,
        cameraRef,
        animationStartRef,
        pivotGroupRef,
        centerMarkerRef,
        transformGizmoGroupRef,
        transformGizmoHitObjectsRef,
        rotationDragOverlayRef,
        clipPlaneARef,
        clipPlaneBRef,
        ambientLightRef,
        keyLightRef,
        softboxLightRef,
        rimLightRef,
      },
    })
    const unbindCanvasPointerInteractions = bindSvgCanvasPointerInteractions({
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
      onZoomChange: props.onZoomChange,
    })
    const unbindSceneResize = bindSvgSceneResize({
      container,
      cameraRef,
      rendererRef,
      currentZoomRef,
    })

    return () => {
      unbindSceneResize()
      unbindCanvasPointerInteractions()
      disposeSvgSceneResources({
        refs: {
          transformGizmoGroupRef,
          rotationDragOverlayRef,
          transformGizmoHitObjectsRef,
        },
        renderer,
        studioEnvironment,
      })
      cancelViewNudge()
      if (resetViewFrameRef.current !== null) {
        cancelAnimationFrame(resetViewFrameRef.current)
        resetViewFrameRef.current = null
      }
    }
  }, [props.onZoomChange])
}

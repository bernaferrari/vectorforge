"use client"

import { useEffect, useRef, type MutableRefObject } from "react"
import * as THREE from "three"
import {
  OrientationGizmoRefs,
  updateOrientationGizmo,
} from "./OrientationGizmo"
import { getVisibleIconCenter } from "./SvgGeometryAnalysis"
import {
  applySvgPivotTransform,
  svgDisplayRotationFromDegrees,
} from "./SvgPivotTransform"
import {
  renderSvgScene,
  updateCenterMarker,
  updateLayerSelectionOutline,
} from "./SvgRenderHelpers"
import {
  ZOOM_DAMPING,
  advanceInertiaVelocity,
  type RotationVelocity,
} from "./SvgRenderLoopModel"
import { framedCameraDistance } from "./SvgSceneUtils"
import { applySvgTransitionState } from "./SvgTransitionState"
import type { SvgCanvasLiveRenderProps } from "./useSvgCanvasLiveRefs"

type NullableRef<T> = MutableRefObject<T | null>

type UseSvgRenderLoopOptions = {
  sceneRef: NullableRef<THREE.Scene>
  rendererRef: NullableRef<THREE.WebGLRenderer>
  cameraRef: NullableRef<THREE.PerspectiveCamera>
  liveRenderPropsRef: MutableRefObject<SvgCanvasLiveRenderProps>
  isInertiaActiveRef: MutableRefObject<boolean>
  rotationVelocityRef: MutableRefObject<RotationVelocity>
  applyViewRotationDelta: (delta: RotationVelocity) => void
  pivotGroupRef: NullableRef<THREE.Group>
  iconAGroupRef: NullableRef<THREE.Group>
  iconBGroupRef: NullableRef<THREE.Group>
  currentZoomRef: MutableRefObject<number>
  targetZoomRef: MutableRefObject<number>
  orientationGizmoRefs: OrientationGizmoRefs
  clipPlaneARef: NullableRef<THREE.Plane>
  clipPlaneBRef: NullableRef<THREE.Plane>
  centerMarkerRef: NullableRef<THREE.Group>
  transformGizmoGroupRef: NullableRef<THREE.Group>
  updateTransformGizmo: (
    center: THREE.Vector3 | null,
    camera: THREE.PerspectiveCamera
  ) => void
}

export function useSvgRenderLoop({
  sceneRef,
  rendererRef,
  cameraRef,
  liveRenderPropsRef,
  isInertiaActiveRef,
  rotationVelocityRef,
  applyViewRotationDelta,
  pivotGroupRef,
  iconAGroupRef,
  iconBGroupRef,
  currentZoomRef,
  targetZoomRef,
  orientationGizmoRefs,
  clipPlaneARef,
  clipPlaneBRef,
  centerMarkerRef,
  transformGizmoGroupRef,
  updateTransformGizmo,
}: UseSvgRenderLoopOptions) {
  const applyViewRotationDeltaRef = useRef(applyViewRotationDelta)
  const updateTransformGizmoRef = useRef(updateTransformGizmo)

  useEffect(() => {
    applyViewRotationDeltaRef.current = applyViewRotationDelta
  }, [applyViewRotationDelta])

  useEffect(() => {
    updateTransformGizmoRef.current = updateTransformGizmo
  }, [updateTransformGizmo])

  useEffect(() => {
    let animFrameId: number

    const renderLoop = () => {
      const scene = sceneRef.current
      const renderer = rendererRef.current
      const camera = cameraRef.current

      if (!scene || !renderer || !camera) return

      const liveProps = liveRenderPropsRef.current
      const progress = liveProps.transitionProgress

      if (isInertiaActiveRef.current) {
        applyViewRotationDeltaRef.current(rotationVelocityRef.current)
        const inertia = advanceInertiaVelocity(rotationVelocityRef.current)
        rotationVelocityRef.current = inertia.velocity
        isInertiaActiveRef.current = inertia.active
      }

      const displayRotation = svgDisplayRotationFromDegrees(
        liveProps.rotationOffset
      )

      if (pivotGroupRef.current) {
        applySvgPivotTransform({
          pivot: pivotGroupRef.current,
          iconA: iconAGroupRef.current,
          iconB: iconBGroupRef.current,
          liveProps,
          displayRotation,
        })
      }

      currentZoomRef.current +=
        (targetZoomRef.current - currentZoomRef.current) * ZOOM_DAMPING
      camera.position.z = framedCameraDistance(camera) / currentZoomRef.current

      updateOrientationGizmo(orientationGizmoRefs, displayRotation)

      const { isCrossfade } = applySvgTransitionState({
        progress,
        transitionType: liveProps.transitionType,
        wipeDirection: liveProps.wipeDirection,
        iconA: iconAGroupRef.current,
        iconB: iconBGroupRef.current,
        pivot: pivotGroupRef.current,
        clipPlaneA: clipPlaneARef.current,
        clipPlaneB: clipPlaneBRef.current,
      })

      const shouldUpdateCenterTools = Boolean(
        liveProps.showCenterPoint || liveProps.showTransformGizmo
      )
      updateLayerSelectionOutline({
        groups: [iconAGroupRef.current, iconBGroupRef.current],
        selectedLayerId: liveProps.selectedLayerId,
      })
      const visibleCenter = shouldUpdateCenterTools
        ? getVisibleIconCenter([iconAGroupRef.current, iconBGroupRef.current])
        : null

      updateCenterMarker({
        marker: centerMarkerRef.current,
        pivot: pivotGroupRef.current,
        visibleCenter,
        showCenterPoint: liveProps.showCenterPoint,
        iconGroups: [iconAGroupRef.current, iconBGroupRef.current],
      })
      updateTransformGizmoRef.current(visibleCenter, camera)

      renderSvgScene({
        isCrossfade,
        scene,
        renderer,
        camera,
        iconA: iconAGroupRef.current,
        iconB: iconBGroupRef.current,
        marker: centerMarkerRef.current,
        transformGizmo: transformGizmoGroupRef.current,
      })
      animFrameId = requestAnimationFrame(renderLoop)
    }

    animFrameId = requestAnimationFrame(renderLoop)

    return () => {
      cancelAnimationFrame(animFrameId)
    }
  }, [
    cameraRef,
    centerMarkerRef,
    clipPlaneARef,
    clipPlaneBRef,
    currentZoomRef,
    iconAGroupRef,
    iconBGroupRef,
    isInertiaActiveRef,
    liveRenderPropsRef,
    orientationGizmoRefs,
    pivotGroupRef,
    rendererRef,
    rotationVelocityRef,
    sceneRef,
    targetZoomRef,
    transformGizmoGroupRef,
  ])
}

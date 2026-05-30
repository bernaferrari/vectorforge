"use client"

import React, {
  useEffect,
  useState,
  forwardRef,
  useMemo,
  useCallback,
} from "react"
import * as THREE from "three"
import { gradientStopsSignature, pathRebuildSignature } from "./SvgSceneUtils"
import { updateGroupMaterialSettings } from "./SvgMaterialState"
import { updateSceneLights } from "./SvgSceneSetup"
import {
  bindSvgSceneResize,
  createSvgSceneResources,
  disposeSvgSceneResources,
} from "./SvgSceneLifecycle"
import { SvgCanvasOverlays } from "./SvgCanvasOverlays"
import type { SvgCanvasProps, SvgCanvasRef } from "./SvgTypes"
import { bindSvgCanvasPointerInteractions } from "./SvgCanvasInteractions"
import { useCanvasRecorder } from "./useCanvasRecorder"
import { useSvgCanvasImperativeHandle } from "./useSvgCanvasImperativeHandle"
import { useSvgCanvasLiveRefs } from "./useSvgCanvasLiveRefs"
import { useSvgModelGroups } from "./useSvgModelGroups"
import { useSvgRenderLoop } from "./useSvgRenderLoop"
import { useSvgViewNudge } from "./useSvgViewNudge"
import { useTransformGizmoInteractions } from "./useTransformGizmoInteractions"
import { useSvgCanvasSceneRefs } from "./useSvgCanvasSceneRefs"
export type {
  GradientStop,
  PathOverride,
  SvgCanvasProps,
  SvgCanvasRef,
} from "./SvgTypes"

export const SvgCanvas = forwardRef<SvgCanvasRef, SvgCanvasProps>(
  (props, ref) => {
    const {
      containerRef,
      canvasRef,
      rotationDragTooltipRef,
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
      isDraggingRef,
      isInertiaActiveRef,
      hasViewDragMovedRef,
      pointerStartPositionRef,
      previousPointerPositionRef,
      rotationVelocityRef,
      activePointerIdRef,
      targetZoomRef,
      currentZoomRef,
      clipPlaneARef,
      clipPlaneBRef,
      orientationGizmoRefs,
      transformGizmoGroupRef,
      transformGizmoHitObjectsRef,
      rotationDragOverlayRef,
      resetViewFrameRef,
    } = useSvgCanvasSceneRefs(props.zoom)
    const pathOverridesASignature = useMemo(
      () => pathRebuildSignature(props.pathOverridesA),
      [props.pathOverridesA]
    )
    const pathOverridesBSignature = useMemo(
      () => pathRebuildSignature(props.pathOverridesB),
      [props.pathOverridesB]
    )
    const [modelReady, setModelReady] = useState(false)
    const colorAStopsKey = useMemo(
      () => gradientStopsSignature(props.colorAStops),
      [props.colorAStops]
    )
    const colorBStopsKey = useMemo(
      () => gradientStopsSignature(props.colorBStops),
      [props.colorBStops]
    )

    const {
      liveRenderPropsRef,
      viewInertiaEnabledRef,
      onViewRotationCommitRef,
      onViewRotationSetRef,
      onObjectScaleChangeRef,
      onObjectScaleAxisChangeRef,
      onMoveOffsetChangeRef,
      onRotationAxisChangeRef,
    } = useSvgCanvasLiveRefs(props)

    const canvasRecorder = useCanvasRecorder()

    const {
      beginTransformMove,
      beginTransformScale,
      beginTransformRotate,
      hitTransformGizmo,
      setTransformGizmoHighlight,
      updateTransformGizmo,
    } = useTransformGizmoInteractions({
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
    })
    const { viewNudgeFrameRef, cancelViewNudge, nudgeViewRotation } =
      useSvgViewNudge({
        liveRenderPropsRef,
        isInertiaActiveRef,
        rotationVelocityRef,
        onViewRotationSetRef,
      })

    useEffect(() => {
      props.onModelReadyChange?.(modelReady)
    }, [modelReady, props.onModelReadyChange])

    const applyViewRotationDelta = useCallback(
      (delta: { x: number; y: number }) => {
        const rotationDelta = {
          x: THREE.MathUtils.radToDeg(delta.x),
          y: THREE.MathUtils.radToDeg(delta.y),
          z: 0,
        }
        if (
          Math.abs(rotationDelta.x) > 0.1 ||
          Math.abs(rotationDelta.y) > 0.1
        ) {
          onViewRotationCommitRef.current?.(rotationDelta)
        }
      },
      [onViewRotationCommitRef]
    )

    useSvgCanvasImperativeHandle({
      ref,
      props,
      canvasRef,
      rendererRef,
      pivotGroupRef,
      iconAGroupRef,
      iconBGroupRef,
      canvasRecorder,
      resetViewFrameRef,
      viewNudgeFrameRef,
      isInertiaActiveRef,
      rotationVelocityRef,
      liveRenderPropsRef,
      currentZoomRef,
      targetZoomRef,
      animationStartRef,
      onViewRotationSet: onViewRotationSetRef.current,
    })

    // Synchronize sidebar zooms with internal targetZoomRef
    useEffect(() => {
      targetZoomRef.current = props.zoom
    }, [props.zoom])

    // Effect: Initializes Scene, Camera, Renderer, and Lights
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

    // Effect: Updates Lights
    useEffect(() => {
      updateSceneLights({
        props,
        ambientLight: ambientLightRef.current,
        keyLight: keyLightRef.current,
        softboxLight: softboxLightRef.current,
        rimLight: rimLightRef.current,
        renderer: rendererRef.current,
      })
    }, [
      props.ambientColor,
      props.ambientIntensity,
      props.keyLightColor,
      props.keyLightIntensity,
      props.keyLightPosition,
      props.keyLightSoftness,
      props.rimLightColor,
      props.rimLightIntensity,
      props.materialPreset,
    ])

    useSvgModelGroups({
      props,
      pivotGroupRef,
      iconAGroupRef,
      iconBGroupRef,
      clipPlaneARef,
      clipPlaneBRef,
      setModelReady,
      pathOverridesASignature,
      pathOverridesBSignature,
      colorAStopsKey,
      colorBStopsKey,
    })

    useEffect(() => {
      const materialSettings = {
        materialPreset: props.materialPreset,
        roughness: props.roughness,
        metalness: props.metalness,
        reflectance: props.reflectance,
        clearcoat: props.clearcoat,
        clearcoatRoughness: props.clearcoatRoughness,
        transmission: props.transmission,
        thickness: props.thickness,
        emissiveIntensity: props.emissiveIntensity,
        wireframe: props.wireframe,
      }
      updateGroupMaterialSettings(iconAGroupRef.current, materialSettings)
      updateGroupMaterialSettings(iconBGroupRef.current, materialSettings)
    }, [
      props.materialPreset,
      props.roughness,
      props.metalness,
      props.reflectance,
      props.clearcoat,
      props.clearcoatRoughness,
      props.transmission,
      props.thickness,
      props.emissiveIntensity,
      props.wireframe,
    ])

    useSvgRenderLoop({
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
    })

    return (
      <div
        ref={containerRef}
        className="relative h-full min-h-[400px] w-full overflow-hidden rounded-xl border border-border/10 bg-[oklch(0.13_0.012_280)] shadow-2xl"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
        />
        <SvgCanvasOverlays
          modelReady={modelReady}
          orientationGizmoRefs={orientationGizmoRefs}
          rotationDragTooltipRef={rotationDragTooltipRef}
          onNudgeViewRotation={nudgeViewRotation}
        />
      </div>
    )
  }
)

SvgCanvas.displayName = "SvgCanvas"

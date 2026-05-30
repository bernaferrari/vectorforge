"use client"

import React, {
  useRef,
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
import type { OrientationGizmoRefs } from "./OrientationGizmo"
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
export type {
  GradientStop,
  PathOverride,
  SvgCanvasProps,
  SvgCanvasRef,
} from "./SvgTypes"

export const SvgCanvas = forwardRef<SvgCanvasRef, SvgCanvasProps>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pathOverridesASignature = useMemo(
      () => pathRebuildSignature(props.pathOverridesA),
      [props.pathOverridesA]
    )
    const pathOverridesBSignature = useMemo(
      () => pathRebuildSignature(props.pathOverridesB),
      [props.pathOverridesB]
    )
    const rotationDragTooltipRef = useRef<HTMLDivElement>(null)
    const [modelReady, setModelReady] = useState(false)
    const colorAStopsKey = useMemo(
      () => gradientStopsSignature(props.colorAStops),
      [props.colorAStops]
    )
    const colorBStopsKey = useMemo(
      () => gradientStopsSignature(props.colorBStops),
      [props.colorBStops]
    )

    // Three.js instances refs
    const sceneRef = useRef<THREE.Scene | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const animationStartRef = useRef<number>(performance.now())

    // Lighting refs
    const ambientLightRef = useRef<THREE.AmbientLight | null>(null)
    const keyLightRef = useRef<THREE.DirectionalLight | null>(null)
    const softboxLightRef = useRef<THREE.RectAreaLight | null>(null)
    const rimLightRef = useRef<THREE.DirectionalLight | null>(null)

    // Pivot and Mesh group refs
    const pivotGroupRef = useRef<THREE.Group | null>(null)
    const iconAGroupRef = useRef<THREE.Group | null>(null)
    const iconBGroupRef = useRef<THREE.Group | null>(null)
    const centerMarkerRef = useRef<THREE.Group | null>(null)

    // Drag interaction states with inertia
    const isDraggingRef = useRef(false)
    const isInertiaActiveRef = useRef(false)
    const hasViewDragMovedRef = useRef(false)
    const pointerStartPositionRef = useRef({ x: 0, y: 0 })
    const previousPointerPositionRef = useRef({ x: 0, y: 0 })
    const rotationVelocityRef = useRef({ x: 0, y: 0 })
    const activePointerIdRef = useRef<number | null>(null)
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

    // Camera Zoom Refs (with damping)
    const targetZoomRef = useRef<number>(props.zoom)
    const currentZoomRef = useRef<number>(props.zoom)

    // Clipping Plane refs
    const clipPlaneARef = useRef<THREE.Plane | null>(null)
    const clipPlaneBRef = useRef<THREE.Plane | null>(null)

    const canvasRecorder = useCanvasRecorder()

    // SVG Orientation Gizmo Elements Refs
    const lineXRef = useRef<SVGLineElement>(null)
    const lineYRef = useRef<SVGLineElement>(null)
    const lineZRef = useRef<SVGLineElement>(null)
    const markerXRef = useRef<SVGGElement>(null)
    const markerYRef = useRef<SVGGElement>(null)
    const markerZRef = useRef<SVGGElement>(null)
    const orientationGizmoRefs = useMemo<OrientationGizmoRefs>(
      () => ({
        lineXRef,
        lineYRef,
        lineZRef,
        markerXRef,
        markerYRef,
        markerZRef,
      }),
      []
    )
    const transformGizmoGroupRef = useRef<THREE.Group | null>(null)
    const transformGizmoHitObjectsRef = useRef<THREE.Object3D[]>([])
    const rotationDragOverlayRef = useRef<THREE.Group | null>(null)
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
    const resetViewFrameRef = useRef<number | null>(null)
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

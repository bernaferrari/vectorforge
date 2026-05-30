"use client"

import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { OrientationGizmoRefs } from "./OrientationGizmo"

export function useSvgCanvasSceneRefs(initialZoom: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationDragTooltipRef = useRef<HTMLDivElement>(null)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animationStartRef = useRef(0)
  if (animationStartRef.current === 0) {
    animationStartRef.current = performance.now()
  }

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null)
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)
  const softboxLightRef = useRef<THREE.RectAreaLight | null>(null)
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null)

  const pivotGroupRef = useRef<THREE.Group | null>(null)
  const iconAGroupRef = useRef<THREE.Group | null>(null)
  const iconBGroupRef = useRef<THREE.Group | null>(null)
  const centerMarkerRef = useRef<THREE.Group | null>(null)

  const isDraggingRef = useRef(false)
  const isInertiaActiveRef = useRef(false)
  const hasViewDragMovedRef = useRef(false)
  const pointerStartPositionRef = useRef({ x: 0, y: 0 })
  const previousPointerPositionRef = useRef({ x: 0, y: 0 })
  const rotationVelocityRef = useRef({ x: 0, y: 0 })
  const activePointerIdRef = useRef<number | null>(null)

  const targetZoomRef = useRef(initialZoom)
  const currentZoomRef = useRef(initialZoom)

  const clipPlaneARef = useRef<THREE.Plane | null>(null)
  const clipPlaneBRef = useRef<THREE.Plane | null>(null)

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
  const resetViewFrameRef = useRef<number | null>(null)

  return {
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
  }
}

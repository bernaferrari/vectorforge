"use client"

import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react"
import * as THREE from "three"
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js"
import { createThreeMaterial } from "./MaterialPresets"
import { createDiagonalWipePlanes } from "./DiagonalWipe"
import {
  TRANSFORM_GIZMO_SIZE,
  TransformAxis,
  TransformGizmoHandle,
  applyTransformGizmoHighlight,
  createRotationDragOverlay,
  createTransformGizmo,
  transformHandleKey,
} from "./TransformGizmo"
import {
  applyGradientVertexColors,
  fallbackGoogleMeshStops,
  gradientStopsFromFill,
} from "./SvgColor"
import { downloadBlob, prepareFilamentExportObject } from "./SvgExport"
import {
  cacheGroupGeometryAnalysis,
  containsInvalidPositions,
  finiteNumber,
  applyInnerElementScale,
  getVisibleIconCenter,
  getVisiblePivotBounds,
  minContourDimension,
  normalizeSvgToIconViewBox,
  cacheInnerGeometryElements,
} from "./SvgGeometry"
import { clamp01Number, materialLightMultiplier } from "./SvgMaterials"
import type { SvgCanvasProps, SvgCanvasRef } from "./SvgTypes"
import {
  bindWindowPointerDrag,
  isPrimaryButtonReleased,
  safelyReleasePointerCapture,
  safelySetPointerCapture,
} from "@/lib/drag-events"
export type {
  GradientStop,
  PathOverride,
  SvgCanvasProps,
  SvgCanvasRef,
} from "./SvgTypes"

const MODEL_SCALE = 0.12
const ICON_VIEWBOX_SIZE = 24
const DEFAULT_VIEWPORT_FRACTION = 0.5
const CAMERA_FOV = 40
const MAX_BEVEL_SEGMENTS = 24
const GIZMO_SNAP_DEGREES = 45
const SVG_PATH_LAYER_GAP_RATIO = 0.018
const SVG_PATH_LAYER_GAP_MIN = 0.035
const VECTORFORGE_SLASH_DEPTH_RATIO = 0.16
const WIPE_SEAM_OVERLAP_WORLD = 0.8 * MODEL_SCALE

const applySvgModelScale = (group: THREE.Group) => {
  group.scale.set(MODEL_SCALE, -MODEL_SCALE, MODEL_SCALE)
}

const framedCameraDistance = (camera: THREE.PerspectiveCamera) => {
  const smallerViewportAxis = Math.max(0.2, Math.min(1, camera.aspect))
  const iconWorldSize = ICON_VIEWBOX_SIZE * MODEL_SCALE
  const targetVisibleWorldSize = iconWorldSize / DEFAULT_VIEWPORT_FRACTION
  const visibleWorldPerDistance =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * smallerViewportAxis
  return targetVisibleWorldSize / visibleWorldPerDistance
}

const disposeObjectTree = (object: THREE.Object3D | null) => {
  object?.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    materials.forEach((material) => material.dispose())
  })
}

const updateGroupMaterialState = (
  group: THREE.Group | null,
  {
    opacity,
    clippingPlanes = null,
    transparent = opacity < 1,
  }: {
    opacity: number
    clippingPlanes?: THREE.Plane[] | null
    transparent?: boolean
  }
) => {
  if (!group) return
  const materialStateKey = `${Math.round(opacity * 1000)}:${transparent ? 1 : 0}:${clippingPlanes?.length ?? 0}`
  if (group.userData.materialStateKey === materialStateKey) return
  group.userData.materialStateKey = materialStateKey
  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    materials.forEach((material) => {
      const baseOpacity = finiteNumber(material.userData?.baseOpacity, 1)
      const baseTransparent = Boolean(material.userData?.baseTransparent)
      const nextOpacity = Math.max(0, Math.min(1, baseOpacity * opacity))
      const nextTransparent = baseTransparent || transparent || nextOpacity < 1
      const currentPlanes = material.clippingPlanes
      const nextPlaneCount = clippingPlanes?.length ?? 0
      const currentPlaneCount = currentPlanes?.length ?? 0
      const samePlanes =
        currentPlaneCount === nextPlaneCount &&
        (nextPlaneCount === 0 ||
          clippingPlanes?.every(
            (plane, index) => currentPlanes?.[index] === plane
          ))

      if (Math.abs(material.opacity - nextOpacity) > 0.0005) {
        material.opacity = nextOpacity
      }
      if (material.transparent !== nextTransparent) {
        material.transparent = nextTransparent
        material.needsUpdate = true
      }
      if (!samePlanes) {
        material.clippingPlanes = clippingPlanes
        material.clipShadows = nextPlaneCount > 0
        material.needsUpdate = true
      }
    })
  })
}

const createStudioEnvironmentTexture = () => {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext("2d")
  if (!context) return null

  const sky = context.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, "#ffffff")
  sky.addColorStop(0.16, "#dbeafe")
  sky.addColorStop(0.34, "#334155")
  sky.addColorStop(0.52, "#07070a")
  sky.addColorStop(0.74, "#111827")
  sky.addColorStop(1, "#fafafa")
  context.fillStyle = sky
  context.fillRect(0, 0, canvas.width, canvas.height)

  const addSoftBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    alpha: number
  ) => {
    const gradient = context.createRadialGradient(
      x + w * 0.5,
      y + h * 0.5,
      1,
      x + w * 0.5,
      y + h * 0.5,
      Math.max(w, h) * 0.65
    )
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    context.globalAlpha = alpha
    context.fillStyle = gradient
    context.fillRect(x, y, w, h)
    context.globalAlpha = 1
  }

  addSoftBox(20, 12, 190, 78, "#ffffff", 0.95)
  addSoftBox(342, 28, 140, 52, "#93c5fd", 0.7)
  addSoftBox(160, 172, 190, 42, "#ffffff", 0.55)

  context.globalAlpha = 0.8
  context.fillStyle = "rgba(255,255,255,0.9)"
  context.fillRect(0, 104, canvas.width, 5)
  context.fillStyle = "rgba(96,165,250,0.42)"
  context.fillRect(0, 118, canvas.width, 3)
  context.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

export const SvgCanvas = forwardRef<SvgCanvasRef, SvgCanvasProps>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rotationDragTooltipRef = useRef<HTMLDivElement>(null)
    const [modelReady, setModelReady] = useState(false)
    const colorAStopsKey = (props.colorAStops ?? [])
      .map((stop) => `${stop.color}:${Number(stop.position).toFixed(3)}`)
      .join("|")
    const colorBStopsKey = (props.colorBStops ?? [])
      .map((stop) => `${stop.color}:${Number(stop.position).toFixed(3)}`)
      .join("|")

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
    const onViewRotationCommitRef = useRef(props.onViewRotationCommit)
    const onViewRotationSetRef = useRef(props.onViewRotationSet)
    const onObjectScaleChangeRef = useRef(props.onObjectScaleChange)
    const onObjectScaleAxisChangeRef = useRef(props.onObjectScaleAxisChange)
    const onMoveOffsetChangeRef = useRef(props.onMoveOffsetChange)
    const onRotationAxisChangeRef = useRef(props.onRotationAxisChange)
    const liveRenderPropsRef = useRef({
      transitionType: props.transitionType,
      transitionProgress: props.transitionProgress,
      wipeDirection: props.wipeDirection,
      rotationOffset: props.rotationOffset,
      innerElementScale: props.innerElementScale,
      objectScale: props.objectScale,
      objectScaleAxes: props.objectScaleAxes ?? { x: 1, y: 1, z: 1 },
      moveOffset: props.moveOffset,
      showCenterPoint: props.showCenterPoint,
      showTransformGizmo: props.showTransformGizmo,
      isPlaying: props.isPlaying,
      keyLightIntensity: props.keyLightIntensity,
    })
    const viewInertiaEnabledRef = useRef(props.viewInertiaEnabled ?? true)

    // Camera Zoom Refs (with damping)
    const targetZoomRef = useRef<number>(props.zoom)
    const currentZoomRef = useRef<number>(props.zoom)

    // Clipping Plane refs
    const clipPlaneARef = useRef<THREE.Plane | null>(null)
    const clipPlaneBRef = useRef<THREE.Plane | null>(null)

    // Video recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])

    // SVG Orientation Gizmo Elements Refs
    const lineXRef = useRef<SVGLineElement>(null)
    const lineYRef = useRef<SVGLineElement>(null)
    const lineZRef = useRef<SVGLineElement>(null)
    const markerXRef = useRef<SVGGElement>(null)
    const markerYRef = useRef<SVGGElement>(null)
    const markerZRef = useRef<SVGGElement>(null)
    const transformGizmoGroupRef = useRef<THREE.Group | null>(null)
    const transformGizmoHitObjectsRef = useRef<THREE.Object3D[]>([])
    const transformRaycasterRef = useRef(new THREE.Raycaster())
    const transformPointerRef = useRef(new THREE.Vector2())
    const rotationDragOverlayRef = useRef<THREE.Group | null>(null)
    const transformScreenAxisRef = useRef<
      Record<TransformAxis, { x: number; y: number }>
    >({
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
    const rotationDragScreenRef = useRef<{
      startAngle: number
      startValue: number
      center: { x: number; y: number }
      basisX: { x: number; y: number }
      basisY: { x: number; y: number }
    } | null>(null)
    const rotationDragWorldFrameRef = useRef<{
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      scale: THREE.Vector3
    } | null>(null)
    const viewNudgeFrameRef = useRef<number | null>(null)
    const resetViewFrameRef = useRef<number | null>(null)
    const viewNudgeStateRef = useRef<
      Record<"x" | "y", { value: number | null; target: number | null }>
    >({
      x: { value: null, target: null },
      y: { value: null, target: null },
    })

    liveRenderPropsRef.current = {
      transitionType: props.transitionType,
      transitionProgress: props.transitionProgress,
      wipeDirection: props.wipeDirection,
      rotationOffset: props.rotationOffset,
      innerElementScale: props.innerElementScale,
      objectScale: props.objectScale,
      objectScaleAxes: props.objectScaleAxes ?? { x: 1, y: 1, z: 1 },
      moveOffset: props.moveOffset,
      showCenterPoint: props.showCenterPoint,
      showTransformGizmo: props.showTransformGizmo,
      isPlaying: props.isPlaying,
      keyLightIntensity: props.keyLightIntensity,
    }
    onViewRotationCommitRef.current = props.onViewRotationCommit
    onViewRotationSetRef.current = props.onViewRotationSet
    onObjectScaleChangeRef.current = props.onObjectScaleChange
    onObjectScaleAxisChangeRef.current = props.onObjectScaleAxisChange
    onMoveOffsetChangeRef.current = props.onMoveOffsetChange
    onRotationAxisChangeRef.current = props.onRotationAxisChange
    viewInertiaEnabledRef.current = props.viewInertiaEnabled ?? true

    useEffect(() => {
      props.onModelReadyChange?.(modelReady)
    }, [modelReady, props.onModelReadyChange])

    const applyViewRotationDelta = (delta: { x: number; y: number }) => {
      const rotationDelta = {
        x: THREE.MathUtils.radToDeg(delta.x),
        y: THREE.MathUtils.radToDeg(delta.y),
        z: 0,
      }
      if (Math.abs(rotationDelta.x) > 0.1 || Math.abs(rotationDelta.y) > 0.1) {
        onViewRotationCommitRef.current?.(rotationDelta)
      }
    }

    // Handle outside actions via ref
    useImperativeHandle(ref, () => ({
      exportGltf() {
        if (!pivotGroupRef.current) return
        const exporter = new GLTFExporter()
        const exportGroup = prepareFilamentExportObject(
          pivotGroupRef.current,
          props,
          [iconAGroupRef.current, iconBGroupRef.current],
          applySvgModelScale
        )

        exporter.parse(
          exportGroup,
          (gltf) => {
            if (gltf instanceof ArrayBuffer) {
              downloadBlob(
                new Blob([gltf], { type: "model/gltf-binary" }),
                "vectorforge-icon.glb"
              )
              return
            }
            const output = JSON.stringify(gltf)
            downloadBlob(
              new Blob([output], { type: "model/gltf+json" }),
              "vectorforge-icon.gltf"
            )
          },
          (error) => {
            console.error("An error occurred during glTF export:", error)
          },
          {
            binary: true,
            onlyVisible: true,
            trs: false,
            truncateDrawRange: true,
            maxTextureSize: 2048,
          }
        )
      },

      startRecording() {
        const canvas = canvasRef.current
        if (!canvas || !rendererRef.current) return

        recordedChunksRef.current = []
        const stream = canvas.captureStream(60)

        const options = { mimeType: "video/webm;codecs=vp9" }
        let recorder
        try {
          recorder = new MediaRecorder(stream, options)
        } catch {
          recorder = new MediaRecorder(stream)
        }

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        mediaRecorderRef.current = recorder
        recorder.start()
      },

      stopRecording(callback: (blob: Blob) => void) {
        const recorder = mediaRecorderRef.current
        if (!recorder) return

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: "video/webm",
          })
          callback(blob)
        }

        recorder.stop()
        mediaRecorderRef.current = null
      },

      resetRotation() {
        if (resetViewFrameRef.current !== null) {
          cancelAnimationFrame(resetViewFrameRef.current)
          resetViewFrameRef.current = null
        }
        if (viewNudgeFrameRef.current !== null) {
          cancelAnimationFrame(viewNudgeFrameRef.current)
          viewNudgeFrameRef.current = null
        }
        isInertiaActiveRef.current = false
        rotationVelocityRef.current = { x: 0, y: 0 }

        const startRotation = liveRenderPropsRef.current.rotationOffset
        const startZoom = currentZoomRef.current
        const duration = 320
        const startTime = performance.now()
        targetZoomRef.current = 1.0
        animationStartRef.current = performance.now()
        props.onZoomChange?.(1.0)
        const tick = (now: number) => {
          const t = Math.max(0, Math.min(1, (now - startTime) / duration))
          const eased = 1 - Math.pow(1 - t, 3)
          currentZoomRef.current = startZoom + (1 - startZoom) * eased
          onViewRotationSetRef.current?.(
            {
              x: startRotation.x * (1 - eased),
              y: startRotation.y * (1 - eased),
              z: startRotation.z * (1 - eased),
            },
            { commit: false }
          )

          if (t < 1) {
            resetViewFrameRef.current = requestAnimationFrame(tick)
            return
          }

          resetViewFrameRef.current = null
          currentZoomRef.current = 1.0
          onViewRotationSetRef.current?.({ x: 0, y: 0, z: 0 }, { commit: true })
        }

        resetViewFrameRef.current = requestAnimationFrame(tick)
      },
    }))

    // Synchronize sidebar zooms with internal targetZoomRef
    useEffect(() => {
      targetZoomRef.current = props.zoom
    }, [props.zoom])

    // Helper: Parses SVG paths and builds a 3D Group with granular path overrides
    const buildSvgGroup = (
      svgContent: string,
      isIconA: boolean
    ): THREE.Group => {
      const group = new THREE.Group()
      if (!svgContent) return group

      const loader = new SVGLoader()
      let svgData
      try {
        svgData = loader.parse(normalizeSvgToIconViewBox(svgContent))
      } catch (e) {
        console.error("Failed to parse SVG content:", e)
        return group
      }

      const paths = svgData.paths
      const centerOffset = new THREE.Vector3()
      const baseDepth = Math.max(0.02, finiteNumber(props.extrusionDepth, 1))
      const baseBevelSize = Math.max(0, finiteNumber(props.bevelSize, 0))
      const baseBevelThickness = Math.max(
        0,
        finiteNumber(props.bevelThickness, 0)
      )
      const baseBevelSegments = Math.max(
        0,
        Math.min(
          MAX_BEVEL_SEGMENTS,
          Math.round(finiteNumber(props.bevelSegments, 1))
        )
      )
      const curveSegments = Math.max(
        8,
        Math.min(
          64,
          Math.round(
            1 / Math.max(0.015, finiteNumber(props.geometryQuality, 0.045))
          )
        )
      )
      const layerSpacing = finiteNumber(props.layerSpacing, 0)
      const pathLayerGap =
        paths.length > 1
          ? Math.max(
              SVG_PATH_LAYER_GAP_MIN,
              baseDepth * SVG_PATH_LAYER_GAP_RATIO,
              layerSpacing * 0.06
            )
          : 0

      const extrudeSettings = {
        depth: baseDepth,
        bevelEnabled: props.bevelEnabled,
        bevelThickness: baseBevelThickness,
        bevelSize: baseBevelSize,
        bevelSegments: baseBevelSegments,
        curveSegments,
        steps: 1,
      }

      const clippingPlanes: THREE.Plane[] = []
      const isWipeActive =
        props.transitionType === "wipe" &&
        (props.wipeDirection.x !== 0 || props.wipeDirection.y !== 0)

      if (isWipeActive) {
        if (isIconA && clipPlaneARef.current)
          clippingPlanes.push(clipPlaneARef.current)
        if (!isIconA && clipPlaneBRef.current)
          clippingPlanes.push(clipPlaneBRef.current)
      }

      const isCrossfade =
        props.transitionType === "wipe" &&
        props.wipeDirection.x === 0 &&
        props.wipeDirection.y === 0
      // Material Symbols are authored in a stable 24x24 icon space. Keep color
      // sampling in that same space so wipe pairs do not remap/reverse gradients
      // when the incoming glyph has a different local bounding box.
      const iconBounds = new THREE.Box2(
        new THREE.Vector2(0, 0),
        new THREE.Vector2(ICON_VIEWBOX_SIZE, ICON_VIEWBOX_SIZE)
      )

      paths.forEach((path, pathIndex) => {
        // Apply path level overrides
        const overrides = isIconA ? props.pathOverridesA : props.pathOverridesB
        const override = overrides?.find((o) => o.id === pathIndex.toString())

        const isVisible = override ? override.visible : true
        if (!isVisible) return
        const isSlashOverlay =
          path.userData?.node?.getAttribute?.("data-vectorforge-slash") ===
          "true"

        const customColor =
          override?.color ||
          (path.color
            ? `#${path.color.getHexString()}`
            : isIconA
              ? props.colorA
              : props.colorB)
        const depthMultiplier = Math.max(
          0.02,
          finiteNumber(override ? override.depthMultiplier : 1.0, 1.0)
        )

        const gradientType = props.gradientType ?? "linear"
        const gradientStops = gradientStopsFromFill(
          isIconA ? props.colorAStops : props.colorBStops,
          isIconA ? props.colorA : props.colorB,
          isIconA
            ? props.colorASecondary || props.colorA
            : props.colorBSecondary || props.colorB
        )
        const useGradientVertexColors = Boolean(props.enableGradient)

        const pathMaterial = createThreeMaterial(props.materialPreset, {
          color: props.enableGradient ? "#ffffff" : customColor,
          roughness: props.roughness,
          metalness: props.metalness,
          reflectance: props.reflectance,
          clearcoat: props.clearcoat,
          clearcoatRoughness: props.clearcoatRoughness,
          transmission: props.transmission,
          thickness: props.thickness,
          emissiveIntensity: props.emissiveIntensity,
          wireframe: props.wireframe,
          opacity: isIconA
            ? isCrossfade
              ? 1.0 - props.transitionProgress
              : 1.0
            : isCrossfade
              ? props.transitionProgress
              : 1.0,
          vertexColors: useGradientVertexColors,
        }) as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial

        if (
          props.emissiveIntensity &&
          props.emissiveIntensity > 0 &&
          !props.enableGradient
        ) {
          pathMaterial.emissive = new THREE.Color(customColor)
        }

        if (pathIndex > 0 || isSlashOverlay) {
          pathMaterial.polygonOffset = true
          pathMaterial.polygonOffsetFactor = -pathIndex * 2
          pathMaterial.polygonOffsetUnits = -pathIndex * 2
        }

        if (clippingPlanes.length > 0) {
          pathMaterial.clippingPlanes = clippingPlanes
          pathMaterial.clipShadows = true
        }

        const shapes = SVGLoader.createShapes(path)

        shapes.forEach((shape) => {
          const shapePts = shape.getPoints(12)
          if (
            shapePts.length < 2 ||
            shapePts.some(
              (pt) => !Number.isFinite(pt.x) || !Number.isFinite(pt.y)
            )
          ) {
            return
          }

          const shapeBox = new THREE.Box2().setFromPoints(shapePts)
          const shapeSize = new THREE.Vector2()
          shapeBox.getSize(shapeSize)
          if (!Number.isFinite(shapeSize.x) || !Number.isFinite(shapeSize.y)) {
            return
          }

          const shapeMinDim = Math.max(
            0.1,
            Math.min(Math.abs(shapeSize.x), Math.abs(shapeSize.y))
          )
          const contourMinDim = Math.max(
            0.1,
            minContourDimension(shape) || shapeMinDim
          )
          const hasHoles = shape.holes.length > 0

          const shapeDepth = isSlashOverlay
            ? Math.max(0.08, baseDepth * VECTORFORGE_SLASH_DEPTH_RATIO)
            : Math.max(0.02, baseDepth * depthMultiplier)
          const bevelContourLimit = hasHoles
            ? contourMinDim * 0.025
            : shapeMinDim * 0.05
          const bevelDepthLimit = hasHoles
            ? shapeDepth * 0.12
            : shapeDepth * 0.18
          const safeBevelSize = props.bevelEnabled
            ? Math.max(
                0.001,
                Math.min(baseBevelSize, bevelContourLimit, bevelDepthLimit)
              )
            : 0
          const safeBevelThickness = props.bevelEnabled
            ? Math.max(
                0.001,
                Math.min(
                  baseBevelThickness,
                  hasHoles ? contourMinDim * 0.04 : shapeMinDim * 0.08,
                  hasHoles ? shapeDepth * 0.16 : shapeDepth * 0.25
                )
              )
            : 0

          let geometry: THREE.ExtrudeGeometry
          try {
            geometry = new THREE.ExtrudeGeometry(shape, {
              ...extrudeSettings,
              depth: shapeDepth,
              bevelSize: safeBevelSize,
              bevelThickness: safeBevelThickness,
              bevelSegments: baseBevelSegments,
              bevelEnabled:
                props.bevelEnabled &&
                safeBevelSize > 0.001 &&
                safeBevelThickness > 0.001,
            })
          } catch (error) {
            console.warn("Skipping SVG shape that failed extrusion", error)
            return
          }

          if (containsInvalidPositions(geometry)) {
            geometry.dispose()
            console.warn("Skipping SVG shape with invalid geometry positions")
            return
          }

          if (useGradientVertexColors) {
            const stops =
              gradientStops.length > 0
                ? gradientStops
                : gradientStopsFromFill(
                    fallbackGoogleMeshStops,
                    props.colorA,
                    props.colorB
                  )
            applyGradientVertexColors(geometry, gradientType, stops, iconBounds)
          }

          const mesh = new THREE.Mesh(geometry, pathMaterial)
          mesh.position.z = isSlashOverlay
            ? baseDepth + pathLayerGap
            : pathIndex * pathLayerGap
          mesh.renderOrder = isSlashOverlay ? 100 + pathIndex : pathIndex
          mesh.castShadow = true
          mesh.receiveShadow = true

          group.add(mesh)
        })
      })

      cacheInnerGeometryElements(group)
      applyInnerElementScale(group, props.innerElementScale)

      if (group.children.length > 0) {
        // Align paired icons by the SVG coordinate system, not by each icon's
        // individual mass. Otherwise adding a slash changes the origin and the
        // base glyph no longer overlaps the unslashed version during a wipe.
        centerOffset.set(
          ICON_VIEWBOX_SIZE / 2,
          ICON_VIEWBOX_SIZE / 2,
          baseDepth / 2
        )
        group.children.forEach((child) => {
          child.position.x -= centerOffset.x
          child.position.y -= centerOffset.y
          child.position.z -= centerOffset.z
        })
      }

      applySvgModelScale(group)
      cacheGroupGeometryAnalysis(group)

      return group
    }

    const nudgeViewRotation = (axis: "x" | "y", direction: -1 | 1) => {
      isInertiaActiveRef.current = false
      rotationVelocityRef.current = { x: 0, y: 0 }
      const current = liveRenderPropsRef.current.rotationOffset
      const nudgeState = viewNudgeStateRef.current[axis]
      const startValue = nudgeState.value ?? current[axis]
      const targetBase = nudgeState.target ?? current[axis]
      const epsilon = 0.001
      const targetValue =
        direction > 0
          ? Math.floor((targetBase + epsilon) / GIZMO_SNAP_DEGREES) *
              GIZMO_SNAP_DEGREES +
            GIZMO_SNAP_DEGREES
          : Math.ceil((targetBase - epsilon) / GIZMO_SNAP_DEGREES) *
              GIZMO_SNAP_DEGREES -
            GIZMO_SNAP_DEGREES

      if (viewNudgeFrameRef.current !== null) {
        cancelAnimationFrame(viewNudgeFrameRef.current)
        viewNudgeFrameRef.current = null
      }
      nudgeState.target = targetValue
      const startTime = performance.now()
      const duration = 220
      const tick = (now: number) => {
        const t = Math.max(0, Math.min(1, (now - startTime) / duration))
        const eased = 1 - Math.pow(1 - t, 3)
        const next = startValue + (targetValue - startValue) * eased
        nudgeState.value = next
        onViewRotationSetRef.current?.({ [axis]: next }, { commit: t >= 1 })
        if (t < 1) {
          viewNudgeFrameRef.current = requestAnimationFrame(tick)
        } else {
          viewNudgeFrameRef.current = null
          nudgeState.value = null
          nudgeState.target = null
        }
      }
      viewNudgeFrameRef.current = requestAnimationFrame(tick)
    }

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

    const setRotationDragOverlay = (
      axis: TransformAxis | null,
      angleDeg = 0
    ) => {
      const overlay = rotationDragOverlayRef.current
      const gizmo = transformGizmoGroupRef.current
      if (!overlay) return
      if (!axis || !gizmo) {
        overlay.visible = false
        rotationDragOverlayStateRef.current = { axis: null, angle: 0 }
        rotationDragScreenRef.current = null
        rotationDragWorldFrameRef.current = null
        const tooltip = rotationDragTooltipRef.current
        if (tooltip) tooltip.style.opacity = "0"
        if (gizmo && liveRenderPropsRef.current.showTransformGizmo) {
          gizmo.visible = true
        }
        return
      }

      rotationDragOverlayStateRef.current = { axis, angle: angleDeg }
      overlay.visible = true
      gizmo.visible = false
      const frame =
        rotationDragWorldFrameRef.current ??
        (() => {
          pivotGroupRef.current?.updateMatrixWorld(true)
          gizmo.updateMatrixWorld(true)
          const localNormal =
            axis === "x"
              ? new THREE.Vector3(1, 0, 0)
              : axis === "y"
                ? new THREE.Vector3(0, 1, 0)
                : new THREE.Vector3(0, 0, 1)
          const normal = localNormal.transformDirection(
            pivotGroupRef.current?.matrixWorld ?? new THREE.Matrix4()
          )
          return {
            position: gizmo.getWorldPosition(new THREE.Vector3()),
            quaternion: new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              normal
            ),
            scale: gizmo.getWorldScale(new THREE.Vector3()),
          }
        })()
      overlay.position.copy(frame.position)
      overlay.quaternion.copy(frame.quaternion)
      overlay.scale.copy(frame.scale)

      const dial = overlay.userData.dial as THREE.Group | undefined
      if (dial) {
        dial.rotation.z = THREE.MathUtils.degToRad(angleDeg)
      }
    }

    const updateRotationDragSector = (
      startAngleDeg: number,
      currentAngleDeg: number
    ) => {
      const overlay = rotationDragOverlayRef.current
      const sector = overlay?.userData.sector as THREE.Mesh | undefined
      if (!overlay || !sector) return
      const radius = finiteNumber(overlay.userData.radius, TRANSFORM_GIZMO_SIZE)
      const delta = shortestAngleDelta(currentAngleDeg, startAngleDeg)
      const steps = Math.max(2, Math.ceil(Math.abs(delta) / 6))
      const positions: number[] = []

      for (let index = 0; index < steps; index += 1) {
        const a0 = THREE.MathUtils.degToRad(
          startAngleDeg + (delta * index) / steps
        )
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

    const updateRotationDragTooltip = (
      delta: number,
      clientX: number,
      clientY: number
    ) => {
      const tooltip = rotationDragTooltipRef.current
      if (!tooltip) return
      tooltip.textContent = `${delta >= 0 ? "+" : ""}${Math.round(delta)}°`
      tooltip.style.transform = `translate3d(${clientX + 14}px, ${clientY - 34}px, 0)`
      tooltip.style.opacity = "1"
    }

    const rotationDialAngleFromPointer = (clientX: number, clientY: number) => {
      const frame = rotationDragScreenRef.current
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

    const shortestAngleDelta = (angle: number, origin: number) => {
      let delta = angle - origin
      while (delta > 180) delta -= 360
      while (delta < -180) delta += 360
      return delta
    }

    const getRotationDragScreenFrame = (startValue: number) => {
      const overlay = rotationDragOverlayRef.current
      const camera = cameraRef.current
      const canvas = canvasRef.current
      if (!overlay || !camera || !canvas) return null

      overlay.updateMatrixWorld(true)
      const rect = canvas.getBoundingClientRect()
      const radius = finiteNumber(overlay.userData.radius, TRANSFORM_GIZMO_SIZE)
      const projectPoint = (point: THREE.Vector3) => {
        const projected = point
          .applyMatrix4(overlay.matrixWorld)
          .project(camera)
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
        startValue,
        center,
        basisX: { x: xPoint.x - center.x, y: xPoint.y - center.y },
        basisY: { x: yPoint.x - center.x, y: yPoint.y - center.y },
      }
    }

    const startTransformDrag = (
      event: PointerEvent,
      cursor: string,
      handle: TransformGizmoHandle,
      onMove: (event: PointerEvent) => void
    ) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      document.body.style.cursor = cursor
      setTransformGizmoHighlight(handle, handle)
      if (handle.kind === "rotate" && transformGizmoGroupRef.current) {
        transformGizmoGroupRef.current.visible = false
      }
      onMove(event)
      bindWindowPointerDrag({
        onMove,
        onEnd: () => {
          document.body.style.cursor = ""
          setTransformGizmoHighlight(null, null)
          if (handle.kind === "rotate") setRotationDragOverlay(null)
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
      const cursor =
        axis === "x" ? "ew-resize" : axis === "y" ? "ns-resize" : "grab"
      startTransformDrag(event, cursor, { kind: "move", axis }, (ev) => {
        const { x: ux, y: uy } = transformScreenAxisRef.current[axis]
        const projectedDelta =
          (ev.clientX - startX) * ux + (ev.clientY - startY) * uy
        const next = Math.round(
          Math.max(-100, Math.min(100, startValue + projectedDelta * 0.35))
        )
        onMoveOffsetChangeRef.current?.(axis, next)
      })
    }

    const beginTransformScale = (event: PointerEvent, axis?: TransformAxis) => {
      const startX = event.clientX
      const startY = event.clientY
      const baseScale = finiteNumber(liveRenderPropsRef.current.objectScale, 1)
      const axisScales = liveRenderPropsRef.current.objectScaleAxes
      const startScale = axis ? finiteNumber(axisScales[axis], 1) : baseScale
      const cursor =
        axis === "x" ? "ew-resize" : axis === "y" ? "ns-resize" : "grab"
      startTransformDrag(event, cursor, { kind: "scale", axis }, (ev) => {
        const projectedDelta = axis
          ? (ev.clientX - startX) * transformScreenAxisRef.current[axis].x +
            (ev.clientY - startY) * transformScreenAxisRef.current[axis].y
          : startY - ev.clientY
        const next = Number(
          Math.max(
            0.1,
            Math.min(3, startScale + projectedDelta * 0.008)
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
      const localNormal =
        axis === "x"
          ? new THREE.Vector3(1, 0, 0)
          : axis === "y"
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(0, 0, 1)
      const normal = localNormal.transformDirection(pivot.matrixWorld)
      rotationDragWorldFrameRef.current = {
        position: gizmo.getWorldPosition(new THREE.Vector3()),
        quaternion: new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          normal
        ),
        scale: gizmo.getWorldScale(new THREE.Vector3()),
      }
      setRotationDragOverlay(axis, 0)
      gizmo.visible = false
      const screenFrame = getRotationDragScreenFrame(startValue)
      if (!screenFrame) {
        setRotationDragOverlay(null)
        return
      }
      rotationDragScreenRef.current = screenFrame
      const startDialAngle =
        rotationDialAngleFromPointer(event.clientX, event.clientY) ?? 0
      rotationDragScreenRef.current = {
        ...screenFrame,
        startAngle: startDialAngle,
      }
      setRotationDragOverlay(axis, startDialAngle)
      updateRotationDragSector(startDialAngle, startDialAngle)
      updateRotationDragTooltip(0, event.clientX, event.clientY)
      startTransformDrag(event, "grabbing", { kind: "rotate", axis }, (ev) => {
        const drag = rotationDragScreenRef.current
        if (!drag) return
        const angle = rotationDialAngleFromPointer(ev.clientX, ev.clientY)
        if (angle === null) return
        const delta = shortestAngleDelta(angle, drag.startAngle)
        const next = Math.round(
          Math.max(-1440, Math.min(1440, drag.startValue + delta))
        )
        setRotationDragOverlay(axis, angle)
        updateRotationDragSector(drag.startAngle, angle)
        updateRotationDragTooltip(delta, ev.clientX, ev.clientY)
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
      const visible = Boolean(
        liveRenderPropsRef.current.showTransformGizmo && center
      )
      const overlayState = rotationDragOverlayStateRef.current
      gizmo.visible = visible && !overlayState.axis
      if (!visible || !center) {
        setTransformGizmoHighlight(null, null)
        return
      }

      gizmo.position.copy(pivot.worldToLocal(center.clone()))
      const parentScale = Math.max(
        0.05,
        finiteNumber(liveRenderPropsRef.current.objectScale, 1)
      )
      const axisScale = liveRenderPropsRef.current.objectScaleAxes
      gizmo.scale.set(
        1 / Math.max(0.05, parentScale * finiteNumber(axisScale.x, 1)),
        1 / Math.max(0.05, parentScale * finiteNumber(axisScale.y, 1)),
        1 / Math.max(0.05, parentScale * finiteNumber(axisScale.z, 1))
      )
      if (overlayState.axis) {
        setRotationDragOverlay(overlayState.axis, overlayState.angle)
      }

      const centerScreen = center.clone().project(camera)
      const axisVectors: Record<TransformAxis, THREE.Vector3> = {
        x: new THREE.Vector3(1, 0, 0),
        y: new THREE.Vector3(0, 1, 0),
        z: new THREE.Vector3(0, 0, 1),
      }

      ;(Object.keys(axisVectors) as TransformAxis[]).forEach((axis) => {
        const worldEnd = center.clone().add(
          axisVectors[axis]
            .clone()
            .transformDirection(pivot.matrixWorld)
            .multiplyScalar(TRANSFORM_GIZMO_SIZE * parentScale)
        )
        const projectedEnd = worldEnd.project(camera)
        const dx = projectedEnd.x - centerScreen.x
        const dy = centerScreen.y - projectedEnd.y
        const length = Math.max(0.001, Math.hypot(dx, dy))
        transformScreenAxisRef.current[axis] = {
          x: dx / length,
          y: dy / length,
        }
      })
    }

    const hitTransformGizmo = (event: PointerEvent) => {
      if (!liveRenderPropsRef.current.showTransformGizmo) return null
      const canvas = canvasRef.current
      const camera = cameraRef.current
      const hits = transformGizmoHitObjectsRef.current
      if (!canvas || !camera || hits.length === 0) return null

      const rect = canvas.getBoundingClientRect()
      const pointer = transformPointerRef.current
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      )
      const raycaster = transformRaycasterRef.current
      raycaster.setFromCamera(pointer, camera)
      const intersections = raycaster.intersectObjects(hits, true)
      const hit =
        intersections.find((item) => {
          const handle = item.object.userData.transformGizmo as
            | TransformGizmoHandle
            | undefined
          return handle?.kind === "scale"
        }) ?? intersections[0]
      const handle = hit?.object.userData.transformGizmo as
        | TransformGizmoHandle
        | undefined
      return handle ?? null
    }

    // 2D SVG Orientation Compass Updater (updates line/circle/text endpoints)
    const updateGizmo = (rx: number, ry: number, rz: number) => {
      const cx = 40
      const cy = 40
      const L = 22 // axis length in pixels

      const euler = new THREE.Euler(rx, ry, rz, "XYZ")

      const project = (x: number, y: number, z: number) => {
        const vector = new THREE.Vector3(x, y, z).applyEuler(euler)

        return {
          x: cx + vector.x * L,
          y: cy - vector.y * L, // Negate Y for screen projection
          z: vector.z,
        }
      }

      const ptX = project(1, 0, 0)
      const ptY = project(0, 1, 0)
      const ptZ = project(0, 0, 1)

      // Apply values to DOM nodes for max performance (60 FPS without React re-renders)
      if (lineXRef.current) {
        lineXRef.current.setAttribute("x2", ptX.x.toFixed(1))
        lineXRef.current.setAttribute("y2", ptX.y.toFixed(1))
      }
      if (lineYRef.current) {
        lineYRef.current.setAttribute("x2", ptY.x.toFixed(1))
        lineYRef.current.setAttribute("y2", ptY.y.toFixed(1))
      }
      if (lineZRef.current) {
        lineZRef.current.setAttribute("x2", ptZ.x.toFixed(1))
        lineZRef.current.setAttribute("y2", ptZ.y.toFixed(1))
      }

      markerXRef.current?.setAttribute(
        "transform",
        `translate(${ptX.x.toFixed(1)} ${ptX.y.toFixed(1)})`
      )
      markerYRef.current?.setAttribute(
        "transform",
        `translate(${ptY.x.toFixed(1)} ${ptY.y.toFixed(1)})`
      )
      markerZRef.current?.setAttribute(
        "transform",
        `translate(${ptZ.x.toFixed(1)} ${ptZ.y.toFixed(1)})`
      )
    }

    // Effect: Initializes Scene, Camera, Renderer, and Lights
    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return

      const scene = new THREE.Scene()
      sceneRef.current = scene
      RectAreaLightUniformsLib.init()

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowMap
      renderer.localClippingEnabled = true
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      const materialLight =
        props.keyLightIntensity * materialLightMultiplier(props.materialPreset)
      renderer.toneMappingExposure = Math.max(
        0.45,
        Math.min(1.8, 0.75 + materialLight * 0.08)
      )
      rendererRef.current = renderer

      const studioEnvironment = createStudioEnvironmentTexture()
      scene.environment = studioEnvironment

      const camera = new THREE.PerspectiveCamera(
        CAMERA_FOV,
        width / height,
        0.1,
        100
      )
      camera.position.set(0, 0, framedCameraDistance(camera))
      cameraRef.current = camera

      animationStartRef.current = performance.now()

      const pivotGroup = new THREE.Group()
      scene.add(pivotGroup)
      pivotGroupRef.current = pivotGroup

      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false,
      })
      const markerBackMaterial = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
        depthWrite: false,
      })
      const markerFrontMaterial = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.82,
        depthTest: false,
        depthWrite: false,
      })
      const markerLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.38,
        depthTest: false,
        depthWrite: false,
      })
      const centerMarker = new THREE.Group()
      centerMarker.visible = Boolean(props.showCenterPoint)
      centerMarker.renderOrder = 1000
      centerMarker.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 12), markerMaterial)
      )
      const markerBack = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 14, 10),
        markerBackMaterial
      )
      markerBack.name = "center-marker-back"
      const markerFront = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 14, 10),
        markerFrontMaterial
      )
      markerFront.name = "center-marker-front"
      const markerLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, -0.35),
          new THREE.Vector3(0, 0, 0.35),
        ]),
        markerLineMaterial
      )
      markerLine.name = "center-marker-axis"
      centerMarker.add(markerLine, markerBack, markerFront)
      pivotGroup.add(centerMarker)
      centerMarkerRef.current = centerMarker

      const transformGizmo = createTransformGizmo()
      pivotGroup.add(transformGizmo.group)
      transformGizmoGroupRef.current = transformGizmo.group
      transformGizmoHitObjectsRef.current = transformGizmo.hitObjects

      const rotationDragOverlay = createRotationDragOverlay()
      scene.add(rotationDragOverlay)
      rotationDragOverlayRef.current = rotationDragOverlay

      // Define Clipping planes
      const clipPlaneA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.5)
      const clipPlaneB = new THREE.Plane(new THREE.Vector3(1, 0, 0), 2.5)
      clipPlaneARef.current = clipPlaneA
      clipPlaneBRef.current = clipPlaneB

      const ambientLight = new THREE.AmbientLight(
        props.ambientColor,
        props.ambientIntensity
      )
      scene.add(ambientLight)
      ambientLightRef.current = ambientLight

      const keyLight = new THREE.DirectionalLight(
        props.keyLightColor,
        props.keyLightIntensity * materialLightMultiplier(props.materialPreset)
      )
      keyLight.position.set(
        props.keyLightPosition.x,
        props.keyLightPosition.y,
        props.keyLightPosition.z
      )
      keyLight.castShadow = true
      keyLight.shadow.mapSize.width = 1024
      keyLight.shadow.mapSize.height = 1024
      scene.add(keyLight)
      keyLightRef.current = keyLight

      const softboxLight = new THREE.RectAreaLight(
        props.keyLightColor,
        0,
        3.5,
        1.6
      )
      softboxLight.position.set(
        props.keyLightPosition.x,
        props.keyLightPosition.y,
        props.keyLightPosition.z
      )
      softboxLight.lookAt(0, 0, 0)
      scene.add(softboxLight)
      softboxLightRef.current = softboxLight

      const rimLight = new THREE.DirectionalLight(
        props.rimLightColor,
        props.rimLightIntensity
      )
      rimLight.position.set(-6, -3, 3)
      scene.add(rimLight)
      rimLightRef.current = rimLight

      // Direct Pointer Drag-to-Rotate Interaction
      const canvas = canvasRef.current

      const handlePointerDown = (e: PointerEvent) => {
        if (e.button !== 0 || !canvas) return
        const transformHandle = hitTransformGizmo(e)
        if (transformHandle) {
          if (transformHandle.kind === "scale") {
            beginTransformScale(e, transformHandle.axis)
            return
          }
          if (transformHandle.kind === "move" && transformHandle.axis) {
            beginTransformMove(transformHandle.axis, e)
            return
          }
          if (transformHandle.kind === "rotate" && transformHandle.axis) {
            beginTransformRotate(transformHandle.axis, e)
            return
          }
        }
        isDraggingRef.current = true
        hasViewDragMovedRef.current = false
        activePointerIdRef.current = e.pointerId
        pointerStartPositionRef.current = { x: e.clientX, y: e.clientY }
        previousPointerPositionRef.current = { x: e.clientX, y: e.clientY }
        safelySetPointerCapture(canvas, e.pointerId)
      }

      const handlePointerMove = (e: PointerEvent) => {
        if (!isDraggingRef.current) {
          setTransformGizmoHighlight(hitTransformGizmo(e))
          return
        }
        if (activePointerIdRef.current !== e.pointerId) return
        if (isPrimaryButtonReleased(e)) {
          handlePointerUp(e)
          return
        }
        const totalDeltaX = e.clientX - pointerStartPositionRef.current.x
        const totalDeltaY = e.clientY - pointerStartPositionRef.current.y
        if (!hasViewDragMovedRef.current) {
          if (Math.hypot(totalDeltaX, totalDeltaY) < 3) return
          hasViewDragMovedRef.current = true
          isInertiaActiveRef.current = false
          rotationVelocityRef.current = { x: 0, y: 0 }
          previousPointerPositionRef.current = { x: e.clientX, y: e.clientY }
          return
        }
        const deltaX = e.clientX - previousPointerPositionRef.current.x
        const deltaY = e.clientY - previousPointerPositionRef.current.y

        const velocity = {
          x: deltaY * 0.006,
          y: deltaX * 0.006,
        }

        rotationVelocityRef.current = velocity
        applyViewRotationDelta(velocity)

        previousPointerPositionRef.current = { x: e.clientX, y: e.clientY }
      }

      const handlePointerUp = (e: PointerEvent) => {
        if (activePointerIdRef.current !== e.pointerId) return
        isDraggingRef.current = false
        activePointerIdRef.current = null
        if (!hasViewDragMovedRef.current) {
          safelyReleasePointerCapture(canvas, e.pointerId)
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
        safelyReleasePointerCapture(canvas, e.pointerId)
      }

      const handlePointerCancel = (e: PointerEvent) => {
        if (activePointerIdRef.current !== e.pointerId) return
        isDraggingRef.current = false
        hasViewDragMovedRef.current = false
        activePointerIdRef.current = null
        isInertiaActiveRef.current = false
        rotationVelocityRef.current = { x: 0, y: 0 }
        safelyReleasePointerCapture(canvas, e.pointerId)
      }

      const handlePointerLeave = () => {
        if (!isDraggingRef.current) {
          setTransformGizmoHighlight(null)
        }
      }

      // Smooth Scroll-Wheel Zooming
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        if (!props.onZoomChange) return
        const zoomStep = 0.08
        const direction = e.deltaY > 0 ? -1 : 1
        const newZoom = Math.max(
          0.3,
          Math.min(3.0, targetZoomRef.current + direction * zoomStep)
        )
        targetZoomRef.current = newZoom
        props.onZoomChange(Number(newZoom.toFixed(2)))
      }

      const handleDoubleClick = () => {
        targetZoomRef.current = 1.0
        currentZoomRef.current = 1.0
        animationStartRef.current = performance.now()
        if (iconAGroupRef.current) iconAGroupRef.current.rotation.set(0, 0, 0)
        if (iconBGroupRef.current) iconBGroupRef.current.rotation.set(0, 0, 0)
        props.onZoomChange?.(1.0)
      }

      canvas.addEventListener("pointerdown", handlePointerDown)
      canvas.addEventListener("pointermove", handlePointerMove)
      canvas.addEventListener("pointerup", handlePointerUp)
      canvas.addEventListener("pointercancel", handlePointerCancel)
      canvas.addEventListener("pointerleave", handlePointerLeave)
      canvas.addEventListener("wheel", handleWheel, { passive: false })
      canvas.addEventListener("dblclick", handleDoubleClick)

      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current)
          return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        if (w <= 0 || h <= 0) return
        cameraRef.current.aspect = w / h
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(w, h)
        cameraRef.current.position.z =
          framedCameraDistance(cameraRef.current) / currentZoomRef.current
      }
      window.addEventListener("resize", handleResize)
      const resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(containerRef.current)

      return () => {
        window.removeEventListener("resize", handleResize)
        resizeObserver.disconnect()
        if (canvas) {
          canvas.removeEventListener("pointerdown", handlePointerDown)
          canvas.removeEventListener("pointermove", handlePointerMove)
          canvas.removeEventListener("pointerup", handlePointerUp)
          canvas.removeEventListener("pointercancel", handlePointerCancel)
          canvas.removeEventListener("pointerleave", handlePointerLeave)
          canvas.removeEventListener("wheel", handleWheel)
          canvas.removeEventListener("dblclick", handleDoubleClick)
        }
        disposeObjectTree(transformGizmoGroupRef.current)
        disposeObjectTree(rotationDragOverlayRef.current)
        transformGizmoGroupRef.current = null
        rotationDragOverlayRef.current = null
        transformGizmoHitObjectsRef.current = []
        renderer.dispose()
        studioEnvironment?.dispose()
        if (viewNudgeFrameRef.current !== null) {
          cancelAnimationFrame(viewNudgeFrameRef.current)
          viewNudgeFrameRef.current = null
        }
        if (resetViewFrameRef.current !== null) {
          cancelAnimationFrame(resetViewFrameRef.current)
          resetViewFrameRef.current = null
        }
      }
    }, [props.onZoomChange])

    // Effect: Updates Lights
    useEffect(() => {
      const materialLight =
        props.keyLightIntensity * materialLightMultiplier(props.materialPreset)
      const softness = clamp01Number(props.keyLightSoftness, 0)
      if (ambientLightRef.current) {
        ambientLightRef.current.color.set(props.ambientColor)
        ambientLightRef.current.intensity =
          props.ambientIntensity + materialLight * (0.035 + softness * 0.025)
      }
      if (keyLightRef.current) {
        keyLightRef.current.color.set(props.keyLightColor)
        keyLightRef.current.intensity = materialLight * (1 - softness * 0.48)
        keyLightRef.current.position.set(
          props.keyLightPosition.x,
          props.keyLightPosition.y,
          props.keyLightPosition.z
        )
      }
      if (softboxLightRef.current) {
        softboxLightRef.current.color.set(props.keyLightColor)
        softboxLightRef.current.intensity = materialLight * softness * 1.75
        softboxLightRef.current.width = 1.4 + softness * 5.2
        softboxLightRef.current.height = 0.8 + softness * 2.4
        softboxLightRef.current.position.set(
          props.keyLightPosition.x,
          props.keyLightPosition.y,
          props.keyLightPosition.z
        )
        softboxLightRef.current.lookAt(0, 0, 0)
      }
      if (rimLightRef.current) {
        rimLightRef.current.color.set(props.rimLightColor)
        rimLightRef.current.intensity = props.rimLightIntensity
      }
      if (rendererRef.current) {
        rendererRef.current.toneMappingExposure = Math.max(
          0.45,
          Math.min(1.8, 0.75 + materialLight * 0.08)
        )
      }
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

    // Effect: Rebuilds SVG 3D models when properties change
    useEffect(() => {
      const scene = sceneRef.current
      const pivot = pivotGroupRef.current
      if (!scene || !pivot) return

      const hadModel = Boolean(iconAGroupRef.current || iconBGroupRef.current)
      if (!hadModel) setModelReady(false)

      if (iconAGroupRef.current) pivot.remove(iconAGroupRef.current)
      if (iconBGroupRef.current) pivot.remove(iconBGroupRef.current)

      const groupA = buildSvgGroup(props.iconAContent, true)
      const groupB = buildSvgGroup(props.iconBContent, false)

      pivot.add(groupA)
      pivot.add(groupB)

      iconAGroupRef.current = groupA
      iconBGroupRef.current = groupB
      setModelReady(groupA.children.length > 0 || groupB.children.length > 0)
    }, [
      props.iconAContent,
      props.iconBContent,
      props.extrusionDepth,
      props.bevelEnabled,
      props.bevelThickness,
      props.bevelSize,
      props.bevelSegments,
      props.geometryQuality,
      props.layerSpacing,
      props.materialPreset,
      props.colorA,
      props.colorB,
      props.colorASecondary,
      props.colorBSecondary,
      colorAStopsKey,
      colorBStopsKey,
      props.enableGradient,
      props.gradientType,
      props.roughness,
      props.metalness,
      props.reflectance,
      props.clearcoat,
      props.clearcoatRoughness,
      props.transmission,
      props.thickness,
      props.emissiveIntensity,
      props.wireframe,
      props.transitionType,
      props.wipeDirection,
      props.pathOverridesA,
      props.pathOverridesB,
    ])

    // Effect: Real-time rendering animation loop
    useEffect(() => {
      let animFrameId: number

      const renderLoop = () => {
        const scene = sceneRef.current
        const renderer = rendererRef.current
        const camera = cameraRef.current

        if (!scene || !renderer || !camera) return

        const liveProps = liveRenderPropsRef.current
        const progress = liveProps.transitionProgress

        // 1. Use direct view rotation while editing, with optional release inertia.
        const dampingFactor = 0.08
        if (isInertiaActiveRef.current) {
          applyViewRotationDelta(rotationVelocityRef.current)
          rotationVelocityRef.current = {
            x: rotationVelocityRef.current.x * 0.92,
            y: rotationVelocityRef.current.y * 0.92,
          }
          if (
            Math.hypot(
              rotationVelocityRef.current.x,
              rotationVelocityRef.current.y
            ) < 0.0007
          ) {
            isInertiaActiveRef.current = false
            rotationVelocityRef.current = { x: 0, y: 0 }
          }
        }

        const displayRotation = {
          x: THREE.MathUtils.degToRad(liveProps.rotationOffset.x),
          y: THREE.MathUtils.degToRad(liveProps.rotationOffset.y),
          z: THREE.MathUtils.degToRad(liveProps.rotationOffset.z),
        }

        if (pivotGroupRef.current) {
          if (iconAGroupRef.current) {
            applyInnerElementScale(
              iconAGroupRef.current,
              liveProps.innerElementScale
            )
          }
          if (iconBGroupRef.current) {
            applyInnerElementScale(
              iconBGroupRef.current,
              liveProps.innerElementScale
            )
          }
          pivotGroupRef.current.rotation.x = displayRotation.x
          pivotGroupRef.current.rotation.y = displayRotation.y
          pivotGroupRef.current.rotation.z = displayRotation.z
          const baseScale = Math.max(
            0.05,
            finiteNumber(liveProps.objectScale, 1)
          )
          const axisScale = liveProps.objectScaleAxes
          pivotGroupRef.current.scale.set(
            baseScale * finiteNumber(axisScale.x, 1),
            baseScale * finiteNumber(axisScale.y, 1),
            baseScale * finiteNumber(axisScale.z, 1)
          )
          pivotGroupRef.current.position.set(
            finiteNumber(liveProps.moveOffset.x, 0) * 0.02,
            finiteNumber(liveProps.moveOffset.y, 0) * 0.02,
            finiteNumber(liveProps.moveOffset.z, 0) * 0.02
          )
          pivotGroupRef.current.updateMatrixWorld(true)
        }

        // 2. Smoothly damp the scroll-wheel camera zoom
        currentZoomRef.current +=
          (targetZoomRef.current - currentZoomRef.current) * dampingFactor
        camera.position.z =
          framedCameraDistance(camera) / currentZoomRef.current

        // 3. Update the 2D SVG Orientation Gizmo
        updateGizmo(displayRotation.x, displayRotation.y, displayRotation.z)

        // All rotation is driven by the timeline via the pivot group (rotationOffset),
        // so the inner shape groups stay neutral and spin together with the pivot.

        // 4. Compute Transition Wipe boundaries
        const transitionIsActive = progress > 0.001 && progress < 0.999
        const isWipeActive =
          transitionIsActive &&
          liveProps.transitionType === "wipe" &&
          (liveProps.wipeDirection.x !== 0 || liveProps.wipeDirection.y !== 0)
        const isCrossfade =
          transitionIsActive &&
          liveProps.transitionType === "wipe" &&
          liveProps.wipeDirection.x === 0 &&
          liveProps.wipeDirection.y === 0

        if (isWipeActive && clipPlaneARef.current && clipPlaneBRef.current) {
          const wipePlanes = createDiagonalWipePlanes({
            width: ICON_VIEWBOX_SIZE * MODEL_SCALE,
            height: ICON_VIEWBOX_SIZE * MODEL_SCALE,
            progress,
            direction: liveProps.wipeDirection,
            seamOverlap: WIPE_SEAM_OVERLAP_WORLD,
          })

          if (pivotGroupRef.current) {
            pivotGroupRef.current.updateMatrixWorld(true)
            clipPlaneARef.current
              .copy(wipePlanes.basePlane)
              .applyMatrix4(pivotGroupRef.current.matrixWorld)
            clipPlaneBRef.current
              .copy(wipePlanes.wipedPlane)
              .applyMatrix4(pivotGroupRef.current.matrixWorld)
          } else {
            clipPlaneARef.current.copy(wipePlanes.basePlane)
            clipPlaneBRef.current.copy(wipePlanes.wipedPlane)
          }

          if (iconAGroupRef.current) {
            iconAGroupRef.current.visible = true
            iconAGroupRef.current.position.set(0, 0, 0)
            applySvgModelScale(iconAGroupRef.current)
            updateGroupMaterialState(iconAGroupRef.current, {
              opacity: 1,
              clippingPlanes: [clipPlaneARef.current],
            })
          }
          if (iconBGroupRef.current) {
            iconBGroupRef.current.visible = true
            iconBGroupRef.current.position.set(0, 0, 0)
            applySvgModelScale(iconBGroupRef.current)
            updateGroupMaterialState(iconBGroupRef.current, {
              opacity: 1,
              clippingPlanes: [clipPlaneBRef.current],
            })
          }
        } else if (isCrossfade) {
          if (iconAGroupRef.current) {
            iconAGroupRef.current.visible = true
            iconAGroupRef.current.position.set(0, 0, 0)
            applySvgModelScale(iconAGroupRef.current)
            updateGroupMaterialState(iconAGroupRef.current, {
              opacity: 1 - progress,
              transparent: true,
            })
          }
          if (iconBGroupRef.current) {
            iconBGroupRef.current.visible = true
            iconBGroupRef.current.position.set(0, 0, 0)
            applySvgModelScale(iconBGroupRef.current)
            updateGroupMaterialState(iconBGroupRef.current, {
              opacity: progress,
              transparent: true,
            })
          }
        } else {
          // "None" — hard cut: show A in the first half, B in the second (no blend).
          const showB = progress >= 0.5
          if (iconAGroupRef.current) {
            iconAGroupRef.current.visible = !showB
            iconAGroupRef.current.position.set(0, 0, 0)
            applySvgModelScale(iconAGroupRef.current)
            updateGroupMaterialState(iconAGroupRef.current, { opacity: 1 })
          }
          if (iconBGroupRef.current) {
            iconBGroupRef.current.visible = showB
            iconBGroupRef.current.position.set(0, 0, 0)
            applySvgModelScale(iconBGroupRef.current)
            updateGroupMaterialState(iconBGroupRef.current, { opacity: 1 })
          }
        }

        const shouldUpdateCenterTools = Boolean(
          liveProps.showCenterPoint || liveProps.showTransformGizmo
        )
        const visibleCenter = shouldUpdateCenterTools
          ? getVisibleIconCenter([iconAGroupRef.current, iconBGroupRef.current])
          : null

        if (centerMarkerRef.current && pivotGroupRef.current) {
          const marker = centerMarkerRef.current
          marker.visible = Boolean(liveProps.showCenterPoint)

          if (liveProps.showCenterPoint && visibleCenter) {
            marker.visible = true
            marker.position.copy(
              pivotGroupRef.current.worldToLocal(visibleCenter.clone())
            )

            const bounds = getVisiblePivotBounds(
              [iconAGroupRef.current, iconBGroupRef.current],
              pivotGroupRef.current
            )
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
          } else {
            marker.visible = false
          }
        }
        updateTransformGizmo(visibleCenter, camera)

        if (isCrossfade && iconAGroupRef.current && iconBGroupRef.current) {
          const iconA = iconAGroupRef.current
          const iconB = iconBGroupRef.current
          const marker = centerMarkerRef.current
          const iconAVisible = iconA.visible
          const iconBVisible = iconB.visible
          const markerVisible = marker?.visible ?? false

          if (marker) marker.visible = false

          renderer.autoClear = true
          iconA.visible = true
          iconB.visible = false
          renderer.render(scene, camera)

          renderer.autoClear = false
          renderer.clearDepth()
          iconA.visible = false
          iconB.visible = true
          renderer.render(scene, camera)

          if (marker && markerVisible) {
            renderer.clearDepth()
            iconA.visible = false
            iconB.visible = false
            marker.visible = true
            renderer.render(scene, camera)
          }

          iconA.visible = iconAVisible
          iconB.visible = iconBVisible
          if (marker) marker.visible = markerVisible
          renderer.autoClear = true
        } else {
          renderer.render(scene, camera)
        }
        animFrameId = requestAnimationFrame(renderLoop)
      }

      animFrameId = requestAnimationFrame(renderLoop)

      return () => {
        cancelAnimationFrame(animFrameId)
      }
    }, [])

    return (
      <div
        ref={containerRef}
        className="relative h-full min-h-[400px] w-full overflow-hidden rounded-xl border border-border/10 bg-[oklch(0.13_0.012_280)] shadow-2xl"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
        />
        {!modelReady && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/5 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[11px] font-medium text-white/75 shadow-2xl">
              <span className="size-2 animate-pulse rounded-full bg-white/70" />
              Preparing 3D icon
            </div>
          </div>
        )}
        <div
          ref={rotationDragTooltipRef}
          className="pointer-events-none fixed top-0 left-0 z-50 rounded-md border border-white/10 bg-black/75 px-2 py-1 text-[11px] font-medium text-white tabular-nums opacity-0 shadow-xl transition-opacity duration-75"
        />

        {/* Interactive 3D Orientation Gizmo — minimal, Figma-like (no chrome, centered with the play bar) */}
        <svg
          viewBox="0 0 80 80"
          className="group/gizmo pointer-events-auto absolute right-5 bottom-0.5 z-20 h-[84px] w-[84px] select-none"
        >
          {/* Basis Axis Lines (thin, muted) */}
          <line
            ref={lineXRef}
            x1="40"
            y1="40"
            x2="40"
            y2="40"
            className="stroke-rose-400/70 stroke-[1.5]"
            strokeLinecap="round"
          />
          <line
            ref={lineYRef}
            x1="40"
            y1="40"
            x2="40"
            y2="40"
            className="stroke-emerald-400/70 stroke-[1.5]"
            strokeLinecap="round"
          />
          <line
            ref={lineZRef}
            x1="40"
            y1="40"
            x2="40"
            y2="40"
            className="stroke-sky-400/70 stroke-[1.5]"
            strokeLinecap="round"
          />

          {/* Axis Endpoints */}
          <g ref={markerXRef} transform="translate(40 40)">
            <circle cx="0" cy="0" r="8" className="fill-black/35 blur-[1px]" />
            <circle
              cx="0"
              cy="0"
              r="7"
              className="fill-rose-500/18 stroke-rose-400/85 stroke-1"
            />
            <text
              x="0"
              y="0.3"
              className="fill-rose-200 font-sans text-[7px] font-semibold select-none"
              textAnchor="middle"
              dominantBaseline="central"
            >
              X
            </text>
          </g>

          <g ref={markerYRef} transform="translate(40 40)">
            <circle cx="0" cy="0" r="8" className="fill-black/35 blur-[1px]" />
            <circle
              cx="0"
              cy="0"
              r="7"
              className="fill-emerald-500/18 stroke-emerald-400/85 stroke-1"
            />
            <text
              x="0"
              y="0.3"
              className="fill-emerald-200 font-sans text-[7px] font-semibold select-none"
              textAnchor="middle"
              dominantBaseline="central"
            >
              Y
            </text>
          </g>

          <g ref={markerZRef} transform="translate(40 40)">
            <circle cx="0" cy="0" r="8" className="fill-black/35 blur-[1px]" />
            <circle
              cx="0"
              cy="0"
              r="7"
              className="fill-sky-500/18 stroke-sky-400/85 stroke-1"
            />
            <text
              x="0"
              y="0.3"
              className="fill-sky-200 font-sans text-[7px] font-semibold select-none"
              textAnchor="middle"
              dominantBaseline="central"
            >
              Z
            </text>
          </g>

          {/* Center Origin Anchor */}
          <circle cx="40" cy="40" r="1.5" className="fill-white/50" />

          <g className="pointer-events-none opacity-0 transition-opacity duration-150 group-focus-within/gizmo:pointer-events-auto group-focus-within/gizmo:opacity-100 group-hover/gizmo:pointer-events-auto group-hover/gizmo:opacity-100">
            <g
              className="cursor-pointer text-emerald-300/65 transition-colors hover:text-emerald-200"
              onClick={() => nudgeViewRotation("x", 1)}
            >
              <title>Tilt up 45 degrees</title>
              <rect
                x="28"
                y="0"
                width="24"
                height="22"
                rx="11"
                className="fill-transparent"
              />
              <path
                d="M40 5.7 C42.9 7.8 44.6 10.8 44.8 14.4 C43.4 13.2 41.8 12.5 40 12.5 C38.2 12.5 36.6 13.2 35.2 14.4 C35.4 10.8 37.1 7.8 40 5.7Z"
                className="fill-current opacity-90"
              />
            </g>
            <g
              className="cursor-pointer text-emerald-300/65 transition-colors hover:text-emerald-200"
              onClick={() => nudgeViewRotation("x", -1)}
            >
              <title>Tilt down 45 degrees</title>
              <rect
                x="28"
                y="58"
                width="24"
                height="22"
                rx="11"
                className="fill-transparent"
              />
              <path
                d="M40 74.3 C37.1 72.2 35.4 69.2 35.2 65.6 C36.6 66.8 38.2 67.5 40 67.5 C41.8 67.5 43.4 66.8 44.8 65.6 C44.6 69.2 42.9 72.2 40 74.3Z"
                className="fill-current opacity-90"
              />
            </g>
            <g
              className="cursor-pointer text-rose-300/65 transition-colors hover:text-rose-200"
              onClick={() => nudgeViewRotation("y", 1)}
            >
              <title>Rotate left 45 degrees</title>
              <rect
                x="0"
                y="28"
                width="22"
                height="24"
                rx="11"
                className="fill-transparent"
              />
              <path
                d="M5.7 40 C7.8 37.1 10.8 35.4 14.4 35.2 C13.2 36.6 12.5 38.2 12.5 40 C12.5 41.8 13.2 43.4 14.4 44.8 C10.8 44.6 7.8 42.9 5.7 40Z"
                className="fill-current opacity-90"
              />
            </g>
            <g
              className="cursor-pointer text-rose-300/65 transition-colors hover:text-rose-200"
              onClick={() => nudgeViewRotation("y", -1)}
            >
              <title>Rotate right 45 degrees</title>
              <rect
                x="58"
                y="28"
                width="22"
                height="24"
                rx="11"
                className="fill-transparent"
              />
              <path
                d="M74.3 40 C72.2 42.9 69.2 44.6 65.6 44.8 C66.8 43.4 67.5 41.8 67.5 40 C67.5 38.2 66.8 36.6 65.6 35.2 C69.2 35.4 72.2 37.1 74.3 40Z"
                className="fill-current opacity-90"
              />
            </g>
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.11_0.012_280)]/80 via-transparent to-[oklch(0.18_0.012_280)]/20 mix-blend-overlay" />
      </div>
    )
  }
)

SvgCanvas.displayName = "SvgCanvas"

import * as THREE from "three"
import type { MutableRefObject } from "react"
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js"
import { createRotationDragOverlay } from "./TransformGizmoOverlay"
import { createTransformGizmo } from "./TransformGizmo"
import {
  createStudioEnvironmentTexture,
  disposeObjectTree,
  framedCameraDistance,
} from "./SvgSceneUtils"
import {
  createCenterMarker,
  createClipPlanes,
  createSceneLights,
  createSvgCamera,
  createSvgRenderer,
} from "./SvgSceneSetup"
import { materialLightMultiplier } from "./SvgMaterials"
import type { SvgCanvasProps } from "./SvgTypes"

type SceneResourceRefs = {
  sceneRef: MutableRefObject<THREE.Scene | null>
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>
  cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>
  animationStartRef: MutableRefObject<number>
  pivotGroupRef: MutableRefObject<THREE.Group | null>
  centerMarkerRef: MutableRefObject<THREE.Group | null>
  transformGizmoGroupRef: MutableRefObject<THREE.Group | null>
  transformGizmoHitObjectsRef: MutableRefObject<THREE.Object3D[]>
  rotationDragOverlayRef: MutableRefObject<THREE.Group | null>
  clipPlaneARef: MutableRefObject<THREE.Plane | null>
  clipPlaneBRef: MutableRefObject<THREE.Plane | null>
  ambientLightRef: MutableRefObject<THREE.AmbientLight | null>
  keyLightRef: MutableRefObject<THREE.DirectionalLight | null>
  softboxLightRef: MutableRefObject<THREE.RectAreaLight | null>
  rimLightRef: MutableRefObject<THREE.DirectionalLight | null>
}

export const createSvgSceneResources = ({
  canvas,
  container,
  props,
  refs,
}: {
  canvas: HTMLCanvasElement
  container: HTMLDivElement
  props: SvgCanvasProps
  refs: SceneResourceRefs
}) => {
  const scene = new THREE.Scene()
  refs.sceneRef.current = scene
  RectAreaLightUniformsLib.init()

  const width = container.clientWidth
  const height = container.clientHeight
  const materialLight =
    props.keyLightIntensity * materialLightMultiplier(props.materialPreset)
  const renderer = createSvgRenderer({ canvas, width, height, materialLight })
  refs.rendererRef.current = renderer

  const studioEnvironment = createStudioEnvironmentTexture()
  scene.environment = studioEnvironment

  const camera = createSvgCamera(width, height)
  refs.cameraRef.current = camera
  refs.animationStartRef.current = performance.now()

  const pivotGroup = new THREE.Group()
  scene.add(pivotGroup)
  refs.pivotGroupRef.current = pivotGroup

  const centerMarker = createCenterMarker(Boolean(props.showCenterPoint))
  pivotGroup.add(centerMarker)
  refs.centerMarkerRef.current = centerMarker

  const transformGizmo = createTransformGizmo()
  pivotGroup.add(transformGizmo.group)
  refs.transformGizmoGroupRef.current = transformGizmo.group
  refs.transformGizmoHitObjectsRef.current = transformGizmo.hitObjects

  const rotationDragOverlay = createRotationDragOverlay()
  scene.add(rotationDragOverlay)
  refs.rotationDragOverlayRef.current = rotationDragOverlay

  const { clipPlaneA, clipPlaneB } = createClipPlanes()
  refs.clipPlaneARef.current = clipPlaneA
  refs.clipPlaneBRef.current = clipPlaneB

  const { ambientLight, keyLight, softboxLight, rimLight } =
    createSceneLights(props)
  scene.add(ambientLight)
  refs.ambientLightRef.current = ambientLight
  scene.add(keyLight)
  refs.keyLightRef.current = keyLight
  scene.add(softboxLight)
  refs.softboxLightRef.current = softboxLight
  scene.add(rimLight)
  refs.rimLightRef.current = rimLight

  return { renderer, studioEnvironment }
}

export const bindSvgSceneResize = ({
  container,
  cameraRef,
  rendererRef,
  currentZoomRef,
}: {
  container: HTMLDivElement
  cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>
  currentZoomRef: MutableRefObject<number>
}) => {
  const handleResize = () => {
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!camera || !renderer) return

    const width = container.clientWidth
    const height = container.clientHeight
    if (width <= 0 || height <= 0) return

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    camera.position.z = framedCameraDistance(camera) / currentZoomRef.current
  }

  window.addEventListener("resize", handleResize)
  const resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(container)

  return () => {
    window.removeEventListener("resize", handleResize)
    resizeObserver.disconnect()
  }
}

export const disposeSvgSceneResources = ({
  refs,
  renderer,
  studioEnvironment,
}: {
  refs: Pick<
    SceneResourceRefs,
    | "transformGizmoGroupRef"
    | "rotationDragOverlayRef"
    | "transformGizmoHitObjectsRef"
  >
  renderer: THREE.WebGLRenderer
  studioEnvironment: THREE.Texture | null
}) => {
  disposeObjectTree(refs.transformGizmoGroupRef.current)
  disposeObjectTree(refs.rotationDragOverlayRef.current)
  refs.transformGizmoGroupRef.current = null
  refs.rotationDragOverlayRef.current = null
  refs.transformGizmoHitObjectsRef.current = []
  renderer.dispose()
  studioEnvironment?.dispose()
}

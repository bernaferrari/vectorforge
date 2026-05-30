import * as THREE from "three"
import { CAMERA_FOV, framedCameraDistance } from "./SvgSceneUtils"
import { clamp01Number, materialLightMultiplier } from "./SvgMaterials"
import type { SvgCanvasProps } from "./SvgTypes"

export const createSvgRenderer = ({
  canvas,
  width,
  height,
  materialLight,
}: {
  canvas: HTMLCanvasElement
  width: number
  height: number
  materialLight: number
}) => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
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
  renderer.toneMappingExposure = Math.max(
    0.45,
    Math.min(1.8, 0.75 + materialLight * 0.08)
  )
  return renderer
}

export const createSvgCamera = (width: number, height: number) => {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    width / height,
    0.1,
    100
  )
  camera.position.set(0, 0, framedCameraDistance(camera))
  return camera
}

export const createCenterMarker = (visible: boolean) => {
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
  centerMarker.visible = visible
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
  return centerMarker
}

export const createClipPlanes = () => ({
  clipPlaneA: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.5),
  clipPlaneB: new THREE.Plane(new THREE.Vector3(1, 0, 0), 2.5),
})

export const createSceneLights = (props: SvgCanvasProps) => {
  const materialLight =
    props.keyLightIntensity * materialLightMultiplier(props.materialPreset)
  const ambientLight = new THREE.AmbientLight(
    props.ambientColor,
    props.ambientIntensity
  )
  const keyLight = new THREE.DirectionalLight(
    props.keyLightColor,
    materialLight
  )
  keyLight.position.set(
    props.keyLightPosition.x,
    props.keyLightPosition.y,
    props.keyLightPosition.z
  )
  keyLight.castShadow = true
  keyLight.shadow.mapSize.width = 1024
  keyLight.shadow.mapSize.height = 1024

  const softboxLight = new THREE.RectAreaLight(props.keyLightColor, 0, 3.5, 1.6)
  softboxLight.position.set(
    props.keyLightPosition.x,
    props.keyLightPosition.y,
    props.keyLightPosition.z
  )
  softboxLight.lookAt(0, 0, 0)

  const rimLight = new THREE.DirectionalLight(
    props.rimLightColor,
    props.rimLightIntensity
  )
  rimLight.position.set(-6, -3, 3)

  return { ambientLight, keyLight, softboxLight, rimLight }
}

export const updateSceneLights = ({
  props,
  ambientLight,
  keyLight,
  softboxLight,
  rimLight,
  renderer,
}: {
  props: SvgCanvasProps
  ambientLight: THREE.AmbientLight | null
  keyLight: THREE.DirectionalLight | null
  softboxLight: THREE.RectAreaLight | null
  rimLight: THREE.DirectionalLight | null
  renderer: THREE.WebGLRenderer | null
}) => {
  const materialLight =
    props.keyLightIntensity * materialLightMultiplier(props.materialPreset)
  const softness = clamp01Number(props.keyLightSoftness, 0)

  if (ambientLight) {
    ambientLight.color.set(props.ambientColor)
    ambientLight.intensity =
      props.ambientIntensity + materialLight * (0.035 + softness * 0.025)
  }
  if (keyLight) {
    keyLight.color.set(props.keyLightColor)
    keyLight.intensity = materialLight * (1 - softness * 0.48)
    keyLight.position.set(
      props.keyLightPosition.x,
      props.keyLightPosition.y,
      props.keyLightPosition.z
    )
  }
  if (softboxLight) {
    softboxLight.color.set(props.keyLightColor)
    softboxLight.intensity = materialLight * softness * 1.75
    softboxLight.width = 1.4 + softness * 5.2
    softboxLight.height = 0.8 + softness * 2.4
    softboxLight.position.set(
      props.keyLightPosition.x,
      props.keyLightPosition.y,
      props.keyLightPosition.z
    )
    softboxLight.lookAt(0, 0, 0)
  }
  if (rimLight) {
    rimLight.color.set(props.rimLightColor)
    rimLight.intensity = props.rimLightIntensity
  }
  if (renderer) {
    renderer.toneMappingExposure = Math.max(
      0.45,
      Math.min(1.8, 0.75 + materialLight * 0.08)
    )
  }
}

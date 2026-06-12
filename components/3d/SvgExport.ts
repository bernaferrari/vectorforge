import * as THREE from "three"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import { containsInvalidPositions, finiteNumber } from "./SvgGeometry"
import type {
  GradientType,
  SvgCanvasProps,
  SvgExportAnimation,
  SvgExportEasing,
  SvgExportVectorKeyframe,
  Vector3Value,
} from "./SvgTypes"

type FilamentExportProps = {
  materialPreset: string
  enableGradient?: boolean
  gradientType?: GradientType
  rotationOffset: Vector3Value
  objectScale: number
  objectScaleAxes?: Vector3Value
  moveOffset: Vector3Value
  transitionProgress: number
}

const GEOMETRY_EXPORT_GROUP_NAME = "VectorForgeGeometry"

const applyExportEasing = (easing: SvgExportEasing, t: number) => {
  if (easing === "ease-in-out") return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  if (easing === "spring") {
    if (t === 0 || t === 1) return t
    const c4 = (2 * Math.PI) / 3
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  }
  if (easing === "bounce") {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
  return t
}

const keyframePair = <T extends { time: number }>(
  time: number,
  keyframes: T[]
) => {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  if (sorted.length === 0) return null
  if (time <= sorted[0].time)
    return { previous: sorted[0], next: sorted[0], progress: 0 }
  if (time >= sorted[sorted.length - 1].time) {
    const last = sorted[sorted.length - 1]
    return { previous: last, next: last, progress: 1 }
  }
  for (let index = 0; index < sorted.length - 1; index++) {
    const previous = sorted[index]
    const next = sorted[index + 1]
    if (time >= previous.time && time <= next.time) {
      return {
        previous,
        next,
        progress: (time - previous.time) / Math.max(1e-6, next.time - previous.time),
      }
    }
  }
  const last = sorted[sorted.length - 1]
  return { previous: last, next: last, progress: 1 }
}

const interpolateExportScalarTrack = (
  animation: SvgExportAnimation,
  trackId: string,
  time: number,
  fallback: number
) => {
  const track = animation.tracks.find((candidate) => candidate.id === trackId)
  const keyframes = track?.keyframes ?? []
  const pair = keyframePair(time, keyframes)
  if (!pair) return track?.defaultValue ?? fallback
  if (pair.previous === pair.next) return pair.previous.value
  const eased = applyExportEasing(pair.previous.easing, pair.progress)
  return pair.previous.value + (pair.next.value - pair.previous.value) * eased
}

const interpolateExportVectorKeyframes = (
  time: number,
  fallback: Vector3Value,
  keyframes: SvgExportVectorKeyframe[]
) => {
  const pair = keyframePair(time, keyframes)
  if (!pair) return fallback
  if (pair.previous === pair.next) return pair.previous.value
  const eased = applyExportEasing(pair.previous.easing, pair.progress)
  return {
    x:
      pair.previous.value.x +
      (pair.next.value.x - pair.previous.value.x) * eased,
    y:
      pair.previous.value.y +
      (pair.next.value.y - pair.previous.value.y) * eased,
    z:
      pair.previous.value.z +
      (pair.next.value.z - pair.previous.value.z) * eased,
  }
}

const buildExportAnimationClips = (
  rootName: string,
  geometryGroupName: string,
  animation?: SvgExportAnimation
) => {
  if (!animation || animation.duration <= 0) return []

  const hasScaleTrack = Boolean(
    animation.tracks.find((track) => track.id === "scale")?.keyframes.length
  )
  const hasRotationTrack = animation.rotationAxisKeyframes.length > 0
  const hasMoveTrack = animation.moveKeyframes.length > 0
  const hasExtrusionTrack = Boolean(
    animation.tracks.find((track) => track.id === "extrusion")?.keyframes.length
  )
  if (!hasScaleTrack && !hasRotationTrack && !hasMoveTrack && !hasExtrusionTrack)
    return []

  const frameRate = 30
  const frameCount = Math.max(2, Math.ceil(animation.duration * frameRate) + 1)
  const times = Array.from({ length: frameCount }, (_, index) =>
    Math.min(animation.duration, index / frameRate)
  )
  const tracks: THREE.KeyframeTrack[] = []

  if (hasRotationTrack) {
    const values: number[] = []
    for (const time of times) {
      const rotation = interpolateExportVectorKeyframes(
        time,
        animation.rotationOffset,
        animation.rotationAxisKeyframes
      )
      const quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        )
      )
      values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(`${rootName}.quaternion`, times, values)
    )
  }

  if (hasScaleTrack) {
    const values: number[] = []
    const axes = animation.objectScaleAxes ?? { x: 1, y: 1, z: 1 }
    for (const time of times) {
      const scale = Math.max(
        0.05,
        interpolateExportScalarTrack(animation, "scale", time, animation.objectScale)
      )
      values.push(scale * axes.x, scale * axes.y, scale * axes.z)
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${rootName}.scale`, times, values))
  }

  if (hasMoveTrack) {
    const values: number[] = []
    for (const time of times) {
      const move = interpolateExportVectorKeyframes(
        time,
        animation.moveOffset,
        animation.moveKeyframes
      )
      values.push(move.x * 0.02, move.y * 0.02, move.z * 0.02)
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${rootName}.position`, times, values))
  }

  if (hasExtrusionTrack) {
    const values: number[] = []
    const baseDepth = Math.max(0.001, finiteNumber(animation.extrusionDepth, 1))
    for (const time of times) {
      const depth = Math.max(
        0.001,
        interpolateExportScalarTrack(
          animation,
          "extrusion",
          time,
          animation.extrusionDepth
        )
      )
      values.push(1, 1, depth / baseDepth)
    }
    tracks.push(
      new THREE.VectorKeyframeTrack(`${geometryGroupName}.scale`, times, values)
    )
  }

  return [new THREE.AnimationClip("VectorForgeTimeline", animation.duration, tracks)]
}

const createFilamentSafeMaterial = (source: THREE.Material) => {
  const material = source as
    | THREE.MeshStandardMaterial
    | THREE.MeshPhysicalMaterial
  const hasVertexColors = Boolean(material.vertexColors)
  const baseColor = hasVertexColors
    ? new THREE.Color("#ffffff")
    : (material.color?.clone?.() ?? new THREE.Color("#ffffff"))
  const opacity = finiteNumber(material.opacity, 1)
  const transmission = finiteNumber(
    (material as THREE.MeshPhysicalMaterial).transmission,
    0
  )
  const isPhysical =
    source.type === "MeshPhysicalMaterial" ||
    transmission > 0 ||
    finiteNumber((material as THREE.MeshPhysicalMaterial).clearcoat, 0) > 0

  const shared = {
    name: source.name,
    color: baseColor,
    roughness: Math.max(0, Math.min(1, finiteNumber(material.roughness, 0.5))),
    metalness: Math.max(0, Math.min(1, finiteNumber(material.metalness, 0))),
    map: material.map ?? null,
    vertexColors: hasVertexColors,
    transparent: opacity < 0.999 || transmission > 0,
    opacity: Math.max(0, Math.min(1, opacity)),
    side: THREE.DoubleSide,
    depthWrite: opacity >= 0.999,
  }

  const safeMaterial = isPhysical
    ? new THREE.MeshPhysicalMaterial({
        ...shared,
        clearcoat: Math.max(
          0,
          Math.min(
            1,
            finiteNumber((material as THREE.MeshPhysicalMaterial).clearcoat, 0)
          )
        ),
        clearcoatRoughness: Math.max(
          0,
          Math.min(
            1,
            finiteNumber(
              (material as THREE.MeshPhysicalMaterial).clearcoatRoughness,
              0.1
            )
          )
        ),
        transmission: Math.max(0, Math.min(1, transmission)),
        thickness: Math.max(
          0,
          finiteNumber((material as THREE.MeshPhysicalMaterial).thickness, 0)
        ),
        ior: Math.max(
          1,
          Math.min(
            2.333,
            finiteNumber((material as THREE.MeshPhysicalMaterial).ior, 1.5)
          )
        ),
      })
    : new THREE.MeshStandardMaterial(shared)

  if (!hasVertexColors && material.emissive && material.emissiveIntensity > 0) {
    safeMaterial.emissive = material.emissive.clone()
    safeMaterial.emissiveIntensity = Math.max(
      0,
      Math.min(1, finiteNumber(material.emissiveIntensity, 0))
    )
  }

  safeMaterial.clippingPlanes = null
  safeMaterial.clipShadows = false
  safeMaterial.onBeforeCompile = () => {}
  safeMaterial.needsUpdate = true
  return safeMaterial
}

export const prepareFilamentExportObject = (
  group: THREE.Group,
  props: FilamentExportProps,
  sourceGroups: Array<THREE.Group | null>,
  applyModelScale: (group: THREE.Group) => void
) => {
  const root = new THREE.Group()
  root.name = "VectorForgeIcon"
  root.userData = {
    generator: "VectorForge",
    target: "Filament glTF 2.0",
    materialPreset: props.materialPreset,
    colorMode: props.enableGradient
      ? (props.gradientType ?? "linear")
      : "solid",
  }

  root.rotation.set(
    THREE.MathUtils.degToRad(finiteNumber(props.rotationOffset.x, 0)),
    THREE.MathUtils.degToRad(finiteNumber(props.rotationOffset.y, 0)),
    THREE.MathUtils.degToRad(finiteNumber(props.rotationOffset.z, 0))
  )
  const scale = Math.max(0.05, finiteNumber(props.objectScale, 1))
  const scaleAxes = props.objectScaleAxes ?? { x: 1, y: 1, z: 1 }
  root.scale.set(scale * scaleAxes.x, scale * scaleAxes.y, scale * scaleAxes.z)
  root.position.set(
    finiteNumber(props.moveOffset.x, 0) * 0.02,
    finiteNumber(props.moveOffset.y, 0) * 0.02,
    finiteNumber(props.moveOffset.z, 0) * 0.02
  )

  const geometryGroup = new THREE.Group()
  geometryGroup.name = GEOMETRY_EXPORT_GROUP_NAME
  root.add(geometryGroup)

  const progress = Math.max(
    0,
    Math.min(1, finiteNumber(props.transitionProgress, 0))
  )
  const exportIndex = progress >= 0.5 ? 1 : 0
  const selectedGroup = sourceGroups[exportIndex] ?? sourceGroups.find(Boolean)
  if (!selectedGroup) return root

  selectedGroup.updateMatrixWorld(true)
  group.updateMatrixWorld(true)
  const clone = selectedGroup.clone(true)
  clone.name = exportIndex === 1 ? "Icon_B" : "Icon_A"
  clone.visible = true
  clone.position.set(0, 0, 0)
  applyModelScale(clone)

  clone.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry || !mesh.material) return
    mesh.name ||= "IconMesh"
    mesh.geometry = mesh.geometry.clone()
    if (containsInvalidPositions(mesh.geometry)) {
      mesh.visible = false
      return
    }
    mesh.geometry.computeVertexNormals()
    mesh.geometry.computeBoundingBox()
    mesh.geometry.computeBoundingSphere()
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    const safeMaterials = materials.map(createFilamentSafeMaterial)
    mesh.material = Array.isArray(mesh.material)
      ? safeMaterials
      : safeMaterials[0]
    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.frustumCulled = false
  })

  geometryGroup.add(clone)
  return root
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const exportFilamentGltf = ({
  pivotGroup,
  props,
  sourceGroups,
  applyModelScale,
}: {
  pivotGroup: THREE.Group
  props: SvgCanvasProps
  sourceGroups: Array<THREE.Group | null>
  applyModelScale: (group: THREE.Group) => void
}) => {
  const exporter = new GLTFExporter()
  const exportGroup = prepareFilamentExportObject(
    pivotGroup,
    props,
    sourceGroups,
    applyModelScale
  )
  const animations = buildExportAnimationClips(
    exportGroup.name,
    GEOMETRY_EXPORT_GROUP_NAME,
    props.exportAnimation
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
      animations,
    }
  )
}

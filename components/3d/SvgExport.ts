import * as THREE from "three"
import { containsInvalidPositions, finiteNumber } from "./SvgGeometry"
import type { GradientType, Vector3Value } from "./SvgTypes"

type FilamentExportProps = {
  materialPreset: string
  enableGradient?: boolean
  gradientType?: GradientType
  rotationOffset: Vector3Value
  objectScale: number
  moveOffset: Vector3Value
  transitionProgress: number
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
  root.scale.set(scale, scale, scale)
  root.position.set(
    finiteNumber(props.moveOffset.x, 0) * 0.02,
    finiteNumber(props.moveOffset.y, 0) * 0.02,
    finiteNumber(props.moveOffset.z, 0) * 0.02
  )

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

  root.add(clone)
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

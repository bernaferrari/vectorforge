import * as THREE from "three"

export type MaterialPresetId =
  | "frost"
  | "satin"
  | "glass"
  | "chrome"
  | "pearl"
  | "lacquer"
  | "custom"

export interface MaterialProps {
  color: string
  roughness: number
  metalness: number
  reflectance: number
  emissive: string
  emissiveIntensity: number
  opacity: number
  wireframe: boolean
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  thickness: number
  ior: number
  map?: THREE.Texture | null
  vertexColors?: boolean
}

const applySurfaceEmissive = <T extends THREE.Material>(
  material: T,
  intensity: number
): T => {
  if (intensity <= 0) return material

  const surfaceEmissiveUniform = { value: intensity }
  material.userData.surfaceEmissiveUniform = surfaceEmissiveUniform
  material.onBeforeCompile = (shader) => {
    shader.uniforms.surfaceEmissiveIntensity = surfaceEmissiveUniform
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float surfaceEmissiveIntensity;"
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * surfaceEmissiveIntensity;"
      )
  }
  material.customProgramCacheKey = () => "surface-emissive"
  return material
}

const withBaseOpacity = <T extends THREE.Material>(material: T): T => {
  material.userData.baseOpacity =
    "opacity" in material && typeof material.opacity === "number"
      ? material.opacity
      : 1
  material.userData.baseTransparent = material.transparent
  return material
}

export function createThreeMaterial(
  preset: MaterialPresetId,
  props: Partial<MaterialProps>
): THREE.Material {
  const color = new THREE.Color(props.color || "#a48bff")
  const opacity = props.opacity !== undefined ? props.opacity : 1.0
  const wireframe = !!props.wireframe
  const map = props.map || undefined
  const textureProps = map ? { map } : {}
  const vertexColors = !!props.vertexColors
  const usesSurfaceColor = vertexColors || !!map
  const reflectance = props.reflectance !== undefined ? props.reflectance : 0.5
  const emissiveColor = usesSurfaceColor ? new THREE.Color("#000000") : color
  const withSurfaceEmissive = <T extends THREE.Material>(
    material: T,
    intensity: number
  ): T =>
    usesSurfaceColor ? applySurfaceEmissive(material, intensity) : material
  const withReflectance = <T extends THREE.Material>(material: T): T => {
    const envIntensity =
      preset === "chrome" ? Math.max(1.8, reflectance * 2.4) : reflectance
    ;(
      material as T & { reflectivity?: number; envMapIntensity?: number }
    ).reflectivity = reflectance
    ;(
      material as T & { reflectivity?: number; envMapIntensity?: number }
    ).envMapIntensity = envIntensity
    return material
  }

  switch (preset) {
    case "frost":
      const frostMaterial = withSurfaceEmissive(
        withReflectance(
          new THREE.MeshPhysicalMaterial({
            color,
            roughness: props.roughness !== undefined ? props.roughness : 0.72,
            metalness: props.metalness !== undefined ? props.metalness : 0.0,
            transmission:
              props.transmission !== undefined ? props.transmission : 0.28,
            thickness: props.thickness !== undefined ? props.thickness : 0.65,
            ior: 1.42,
            clearcoat: props.clearcoat !== undefined ? props.clearcoat : 0.18,
            clearcoatRoughness:
              props.clearcoatRoughness !== undefined
                ? props.clearcoatRoughness
                : 0.62,
            emissive: emissiveColor,
            emissiveIntensity: usesSurfaceColor
              ? 0
              : props.emissiveIntensity !== undefined
                ? props.emissiveIntensity
                : 0.035,
            wireframe,
            transparent: true,
            opacity,
            depthWrite: true,
            ...textureProps,
            vertexColors,
          })
        ),
        usesSurfaceColor
          ? props.emissiveIntensity !== undefined
            ? props.emissiveIntensity
            : 0.035
          : 0
      )
      return withBaseOpacity(frostMaterial)

    case "satin":
      return withSurfaceEmissive(
        withReflectance(
          new THREE.MeshStandardMaterial({
            color,
            roughness: props.roughness !== undefined ? props.roughness : 0.34,
            metalness: props.metalness !== undefined ? props.metalness : 0.03,
            emissive: emissiveColor,
            emissiveIntensity:
              props.emissiveIntensity !== undefined
                ? props.emissiveIntensity
                : 0.12,
            wireframe,
            transparent: opacity < 1.0,
            opacity,
            ...textureProps,
            vertexColors,
          })
        ),
        props.emissiveIntensity !== undefined ? props.emissiveIntensity : 0.12
      )

    case "glass":
      return withBaseOpacity(
        withReflectance(
          new THREE.MeshPhysicalMaterial({
            color,
            roughness: props.roughness !== undefined ? props.roughness : 0.12,
            metalness: props.metalness !== undefined ? props.metalness : 0.0,
            transmission:
              props.transmission !== undefined ? props.transmission : 0.38,
            thickness: props.thickness !== undefined ? props.thickness : 0.85,
            ior: 1.58,
            transparent: false,
            opacity: 1,
            depthWrite: true,
            clearcoat: props.clearcoat !== undefined ? props.clearcoat : 1.0,
            clearcoatRoughness:
              props.clearcoatRoughness !== undefined
                ? props.clearcoatRoughness
                : 0.08,
            wireframe,
            ...textureProps,
            vertexColors,
          })
        )
      )

    case "chrome":
      const metalColor = usesSurfaceColor
        ? new THREE.Color("#ffffff")
        : color.clone().lerp(new THREE.Color("#ffffff"), 0.18)
      return withSurfaceEmissive(
        withReflectance(
          new THREE.MeshPhysicalMaterial({
            color: metalColor,
            roughness: props.roughness !== undefined ? props.roughness : 0.075,
            metalness:
              props.metalness !== undefined
                ? Math.min(props.metalness, 0.52)
                : 0.48,
            emissive: emissiveColor,
            emissiveIntensity: usesSurfaceColor
              ? 0
              : Math.max(props.emissiveIntensity ?? 0, 0.08),
            clearcoat: props.clearcoat !== undefined ? props.clearcoat : 1.0,
            clearcoatRoughness:
              props.clearcoatRoughness !== undefined
                ? props.clearcoatRoughness
                : 0.02,
            sheen: 0.35,
            sheenRoughness: 0.18,
            sheenColor: new THREE.Color("#ffffff"),
            wireframe,
            transparent: opacity < 1.0,
            opacity,
            ...textureProps,
            vertexColors,
          })
        ),
        usesSurfaceColor ? Math.max(props.emissiveIntensity ?? 0, 0.08) : 0
      )

    case "pearl":
      const pearlBase = usesSurfaceColor
        ? new THREE.Color("#ffffff")
        : color.clone().lerp(new THREE.Color("#ffffff"), 0.38)
      return withSurfaceEmissive(
        withReflectance(
          new THREE.MeshPhysicalMaterial({
            color: pearlBase,
            roughness: props.roughness !== undefined ? props.roughness : 0.42,
            metalness: props.metalness !== undefined ? props.metalness : 0.0,
            clearcoat: props.clearcoat !== undefined ? props.clearcoat : 0.72,
            clearcoatRoughness:
              props.clearcoatRoughness !== undefined
                ? props.clearcoatRoughness
                : 0.22,
            sheen: 0.72,
            sheenRoughness: 0.38,
            sheenColor: color.clone().lerp(new THREE.Color("#c4b5fd"), 0.48),
            emissive: emissiveColor,
            emissiveIntensity: usesSurfaceColor
              ? 0
              : props.emissiveIntensity !== undefined
                ? props.emissiveIntensity
                : 0.035,
            wireframe,
            transparent: opacity < 1.0,
            opacity,
            ...textureProps,
            vertexColors,
          })
        ),
        usesSurfaceColor
          ? props.emissiveIntensity !== undefined
            ? props.emissiveIntensity
            : 0.035
          : 0
      )

    case "lacquer":
      return withSurfaceEmissive(
        withReflectance(
          new THREE.MeshPhysicalMaterial({
            color,
            roughness: props.roughness !== undefined ? props.roughness : 0.2,
            metalness: props.metalness !== undefined ? props.metalness : 0.0,
            clearcoat: props.clearcoat !== undefined ? props.clearcoat : 1.0,
            clearcoatRoughness:
              props.clearcoatRoughness !== undefined
                ? props.clearcoatRoughness
                : 0.03,
            emissive: emissiveColor,
            emissiveIntensity:
              props.emissiveIntensity !== undefined
                ? props.emissiveIntensity
                : 0.04,
            wireframe,
            transparent: opacity < 1.0,
            opacity,
            ...textureProps,
            vertexColors,
          })
        ),
        props.emissiveIntensity !== undefined ? props.emissiveIntensity : 0.04
      )

    case "custom":
      return withReflectance(
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: props.roughness !== undefined ? props.roughness : 0.5,
          metalness: props.metalness !== undefined ? props.metalness : 0.0,
          clearcoat: props.clearcoat !== undefined ? props.clearcoat : 0.0,
          clearcoatRoughness:
            props.clearcoatRoughness !== undefined
              ? props.clearcoatRoughness
              : 0.1,
          transmission:
            props.transmission !== undefined ? props.transmission : 0.0,
          thickness: props.thickness !== undefined ? props.thickness : 1.0,
          ior: props.ior !== undefined ? props.ior : 1.5,
          emissive:
            props.emissive ||
            (props.emissiveIntensity && props.emissiveIntensity > 0
              ? color
              : new THREE.Color("#000000")),
          emissiveIntensity:
            props.emissiveIntensity !== undefined
              ? props.emissiveIntensity
              : 0.0,
          wireframe,
          transparent:
            opacity < 1.0 ||
            (props.transmission !== undefined && props.transmission > 0),
          opacity,
          ...textureProps,
          vertexColors,
        })
      )

    default:
      return withReflectance(
        new THREE.MeshStandardMaterial({
          color,
          wireframe,
          ...textureProps,
          vertexColors,
        })
      )
  }
}

import * as THREE from "three"

export type MaterialPresetId =
  | "frost"
  | "satin"
  | "glass"
  | "aura"
  | "chrome"
  | "pearl"
  | "lacquer"
  | "neon"
  | "holo"
  | "ink"
  | "prismChrome"
  | "gelGlass"
  | "cutInk"
  | "cutInner"
  | "cutOuter"
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

type ShaderDecorator = NonNullable<THREE.Material["onBeforeCompile"]>

const chainBeforeCompile = <T extends THREE.Material>(
  material: T,
  cacheKey: string,
  decorator: ShaderDecorator
): T => {
  const previousBeforeCompile = material.onBeforeCompile

  material.onBeforeCompile = (shader, renderer) => {
    previousBeforeCompile?.call(material, shader, renderer)
    decorator(shader, renderer)
  }
  material.customProgramCacheKey = () => cacheKey
  return material
}

export const isGraphiteCutPreset = (preset: MaterialPresetId) =>
  preset === "cutInk" || preset === "cutInner" || preset === "cutOuter"

const addElevatedReflectionBands = <T extends THREE.Material>(
  material: T,
  variant: "prism" | "gel" | "cut" | "cutInner" | "cutOuter"
): T =>
  chainBeforeCompile(material, `elevated-${variant}`, (shader) => {
    const isCut =
      variant === "cut" || variant === "cutInner" || variant === "cutOuter"
    const bandStrength =
      variant === "prism" ? "1.25" : variant === "gel" ? "0.72" : "0.0"
    const rimStrength =
      variant === "prism"
        ? "0.78"
        : variant === "gel"
          ? "0.92"
          : variant === "cutOuter"
            ? "0.48"
            : variant === "cutInner"
              ? "0.2"
              : "0.34"
    const sideStrength = isCut ? "0.28" : variant === "prism" ? "0.22" : "0.16"
    const rimColor = isCut ? "vec3(0.72, 0.74, 0.76)" : "elevatedColor"
    const faceShade = isCut
      ? `float graphiteFace = abs(normal.z);
float graphiteTop = smoothstep(0.08, 0.92, normal.y * 0.5 + 0.5);
float graphiteInset = smoothstep(0.12, 0.82, 1.0 - graphiteFace);
float graphiteGrain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
diffuseColor.rgb = mix(vec3(0.12), vec3(0.34), graphiteFace * 0.58 + graphiteTop * 0.28);
${variant === "cutInner" ? "diffuseColor.rgb += vec3(0.18) * graphiteInset;" : ""}
${variant === "cutOuter" ? "diffuseColor.rgb += vec3(0.2) * elevatedRim + vec3(0.1) * graphiteTop;" : ""}
diffuseColor.rgb += (graphiteGrain - 0.5) * 0.035;`
      : ""

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
vec3 elevatedBandColor(float band) {
  vec3 cyan = vec3(0.0, 0.78, 1.0);
  vec3 blue = vec3(0.0, 0.24, 1.0);
  vec3 magenta = vec3(1.0, 0.02, 0.78);
  vec3 amber = vec3(1.0, 0.46, 0.02);
  vec3 lime = vec3(0.36, 1.0, 0.58);
  vec3 cool = mix(cyan, blue, smoothstep(0.08, 0.42, band));
  vec3 warm = mix(amber, magenta, smoothstep(0.36, 0.78, band));
  return mix(cool, warm, smoothstep(0.28, 0.88, fract(band + 0.16))) + lime * smoothstep(0.78, 0.96, band) * 0.22;
}`
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
vec3 elevatedViewDir = normalize(vViewPosition);
float elevatedFacing = clamp(1.0 - abs(dot(normal, elevatedViewDir)), 0.0, 1.0);
float elevatedVertical = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
float elevatedBand = fract(elevatedFacing * 1.85 + elevatedVertical * 0.72 + normal.x * 0.18);
float elevatedStripe = pow(smoothstep(0.54, 0.98, elevatedBand), 2.6);
float elevatedRim = pow(elevatedFacing, 3.2);
float elevatedSide = pow(clamp(1.0 - normal.z * 0.5 - 0.5, 0.0, 1.0), 1.4);
vec3 elevatedColor = elevatedBandColor(elevatedBand);
${faceShade}
totalEmissiveRadiance += elevatedColor * elevatedStripe * ${bandStrength};
totalEmissiveRadiance += ${rimColor} * elevatedRim * ${rimStrength};
totalEmissiveRadiance += vec3(0.02, 0.025, 0.035) * elevatedSide * ${sideStrength};`
      )
  })

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
      preset === "chrome"
        ? Math.max(1.8, reflectance * 2.4)
        : preset === "prismChrome"
          ? Math.max(2.6, reflectance * 3.2)
          : preset === "gelGlass"
            ? Math.max(1.45, reflectance * 1.75)
            : preset === "cutInk"
              ? Math.max(0.42, reflectance * 1.4)
              : preset === "holo"
                ? Math.max(0.9, reflectance * 1.15)
                : preset === "aura"
                  ? Math.max(1.05, reflectance * 1.3)
                  : reflectance
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

    case "aura":
      return withBaseOpacity(
        withSurfaceEmissive(
          withReflectance(
            new THREE.MeshPhysicalMaterial({
              color: usesSurfaceColor
                ? new THREE.Color("#f8fbff")
                : color.clone().lerp(new THREE.Color("#f8fbff"), 0.74),
              roughness: props.roughness !== undefined ? props.roughness : 0.24,
              metalness: props.metalness !== undefined ? props.metalness : 0,
              transmission:
                props.transmission !== undefined ? props.transmission : 0.48,
              thickness: props.thickness !== undefined ? props.thickness : 1.15,
              ior: props.ior !== undefined ? props.ior : 1.38,
              clearcoat: props.clearcoat !== undefined ? props.clearcoat : 0.95,
              clearcoatRoughness:
                props.clearcoatRoughness !== undefined
                  ? props.clearcoatRoughness
                  : 0.12,
              emissive: usesSurfaceColor
                ? emissiveColor
                : new THREE.Color("#dbeafe"),
              emissiveIntensity: usesSurfaceColor
                ? 0
                : props.emissiveIntensity !== undefined
                  ? props.emissiveIntensity
                  : 0.46,
              wireframe,
              transparent: false,
              opacity: 1,
              depthWrite: true,
              ...textureProps,
              vertexColors,
            })
          ),
          usesSurfaceColor
            ? props.emissiveIntensity !== undefined
              ? props.emissiveIntensity
              : 0.46
            : 0
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

    case "prismChrome":
      const prismMaterial = withSurfaceEmissive(
        withReflectance(
          new THREE.MeshPhysicalMaterial({
            color: usesSurfaceColor
              ? new THREE.Color("#f8fbff")
              : color.clone().lerp(new THREE.Color("#020617"), 0.82),
            roughness: props.roughness !== undefined ? props.roughness : 0.035,
            metalness:
              props.metalness !== undefined
                ? Math.min(props.metalness, 0.74)
                : 0.68,
            emissive: emissiveColor,
            emissiveIntensity: usesSurfaceColor
              ? 0
              : Math.max(props.emissiveIntensity ?? 0, 0.14),
            clearcoat: props.clearcoat !== undefined ? props.clearcoat : 1,
            clearcoatRoughness:
              props.clearcoatRoughness !== undefined
                ? props.clearcoatRoughness
                : 0.01,
            sheen: 0.62,
            sheenRoughness: 0.08,
            sheenColor: new THREE.Color("#67e8f9"),
            iridescence: 0.78,
            iridescenceIOR: 2.15,
            iridescenceThicknessRange: [120, 920],
            wireframe,
            transparent: opacity < 1.0,
            opacity,
            ...textureProps,
            vertexColors,
          })
        ),
        usesSurfaceColor ? Math.max(props.emissiveIntensity ?? 0, 0.14) : 0
      )
      return addElevatedReflectionBands(prismMaterial, "prism")

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

    case "neon":
      return withSurfaceEmissive(
        withReflectance(
          new THREE.MeshStandardMaterial({
            color,
            roughness: props.roughness !== undefined ? props.roughness : 0.28,
            metalness: props.metalness !== undefined ? props.metalness : 0.0,
            emissive: usesSurfaceColor ? emissiveColor : color,
            emissiveIntensity:
              props.emissiveIntensity !== undefined
                ? props.emissiveIntensity
                : 0.82,
            wireframe,
            transparent: opacity < 1.0,
            opacity,
            ...textureProps,
            vertexColors,
          })
        ),
        props.emissiveIntensity !== undefined ? props.emissiveIntensity : 0.82
      )

    case "holo":
      return withSurfaceEmissive(
        withReflectance(
          new THREE.MeshPhysicalMaterial({
            color: usesSurfaceColor
              ? new THREE.Color("#eefbff")
              : color.clone().lerp(new THREE.Color("#a5f3fc"), 0.42),
            roughness: props.roughness !== undefined ? props.roughness : 0.3,
            metalness: props.metalness !== undefined ? props.metalness : 0.02,
            clearcoat: props.clearcoat !== undefined ? props.clearcoat : 0.82,
            clearcoatRoughness:
              props.clearcoatRoughness !== undefined
                ? props.clearcoatRoughness
                : 0.16,
            sheen: 1,
            sheenRoughness: 0.24,
            sheenColor: new THREE.Color("#f0abfc"),
            iridescence: 1,
            iridescenceIOR: 1.95,
            iridescenceThicknessRange: [80, 720],
            emissive: emissiveColor,
            emissiveIntensity: usesSurfaceColor
              ? 0
              : props.emissiveIntensity !== undefined
                ? props.emissiveIntensity
                : 0.28,
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
            : 0.28
          : 0
      )

    case "gelGlass":
      const gelMaterial = withBaseOpacity(
        withSurfaceEmissive(
          withReflectance(
            new THREE.MeshPhysicalMaterial({
              color: usesSurfaceColor
                ? new THREE.Color("#f6fbff")
                : color.clone().lerp(new THREE.Color("#dff7ff"), 0.56),
              roughness: props.roughness !== undefined ? props.roughness : 0.18,
              metalness: props.metalness !== undefined ? props.metalness : 0,
              transmission:
                props.transmission !== undefined ? props.transmission : 0.34,
              thickness: props.thickness !== undefined ? props.thickness : 1.45,
              ior: props.ior !== undefined ? props.ior : 1.44,
              clearcoat: props.clearcoat !== undefined ? props.clearcoat : 1,
              clearcoatRoughness:
                props.clearcoatRoughness !== undefined
                  ? props.clearcoatRoughness
                  : 0.06,
              sheen: 0.86,
              sheenRoughness: 0.18,
              sheenColor: new THREE.Color("#f0abfc"),
              emissive: usesSurfaceColor
                ? emissiveColor
                : new THREE.Color("#38bdf8"),
              emissiveIntensity: usesSurfaceColor
                ? 0
                : props.emissiveIntensity !== undefined
                  ? props.emissiveIntensity
                  : 0.62,
              wireframe,
              transparent: false,
              opacity: 1,
              depthWrite: true,
              ...textureProps,
              vertexColors,
            })
          ),
          usesSurfaceColor
            ? props.emissiveIntensity !== undefined
              ? props.emissiveIntensity
              : 0.62
            : 0
        )
      )
      return addElevatedReflectionBands(gelMaterial, "gel")

    case "ink":
      return withReflectance(
        new THREE.MeshStandardMaterial({
          color: usesSurfaceColor
            ? new THREE.Color("#ffffff")
            : color.clone().lerp(new THREE.Color("#020617"), 0.22),
          roughness: props.roughness !== undefined ? props.roughness : 0.96,
          metalness: props.metalness !== undefined ? props.metalness : 0,
          emissive: emissiveColor,
          emissiveIntensity:
            props.emissiveIntensity !== undefined
              ? props.emissiveIntensity
              : 0.02,
          wireframe,
          transparent: opacity < 1.0,
          opacity,
          ...textureProps,
          vertexColors,
        })
      )

    case "cutInk":
    case "cutInner":
    case "cutOuter":
      const cutMaterial = withReflectance(
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#2f3031"),
          roughness: props.roughness !== undefined ? props.roughness : 0.76,
          metalness: props.metalness !== undefined ? props.metalness : 0,
          clearcoat: props.clearcoat !== undefined ? props.clearcoat : 0.12,
          clearcoatRoughness:
            props.clearcoatRoughness !== undefined
              ? props.clearcoatRoughness
              : 0.58,
          sheen: 0.42,
          sheenRoughness: 0.54,
          sheenColor: new THREE.Color("#e5e7eb"),
          emissive: new THREE.Color("#111111"),
          emissiveIntensity:
            props.emissiveIntensity !== undefined
              ? props.emissiveIntensity
              : 0.045,
          wireframe,
          transparent: opacity < 1.0,
          opacity,
          ...textureProps,
          vertexColors,
        })
      )
      return addElevatedReflectionBands(
        cutMaterial,
        preset === "cutInner"
          ? "cutInner"
          : preset === "cutOuter"
            ? "cutOuter"
            : "cut"
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

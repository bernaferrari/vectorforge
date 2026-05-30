import * as THREE from "three"
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js"
import { createThreeMaterial } from "./MaterialPresets"
import {
  applyGradientVertexColors,
  fallbackGoogleMeshStops,
  gradientStopsFromFill,
} from "./SvgColor"
import {
  ICON_VIEWBOX_SIZE,
  MAX_BEVEL_SEGMENTS,
  SVG_PATH_LAYER_GAP_MIN,
  SVG_PATH_LAYER_GAP_RATIO,
  VECTORFORGE_SLASH_DEPTH_RATIO,
  VECTORFORGE_SLASH_FORWARD_RATIO,
  applySvgModelScale,
} from "./SvgSceneUtils"
import {
  applyInnerElementScale,
  applyMeshSetScale,
  cacheGroupGeometryAnalysis,
  cacheInnerGeometryElements,
  containsInvalidPositions,
  finiteNumber,
  minContourDimension,
  normalizeSvgToIconViewBox,
} from "./SvgGeometry"
import type { SvgCanvasProps } from "./SvgTypes"

type ParsedSvgPath = ReturnType<SVGLoader["parse"]>["paths"][number]

type ParsedSvgShapes = {
  paths: ParsedSvgPath[]
  shapesByPath: THREE.Shape[][]
}

const PARSED_SVG_SHAPE_CACHE_LIMIT = 48
const parsedSvgShapeCache = new Map<string, ParsedSvgShapes>()

const rememberParsedSvgShapes = (cacheKey: string, parsed: ParsedSvgShapes) => {
  if (parsedSvgShapeCache.size >= PARSED_SVG_SHAPE_CACHE_LIMIT) {
    const oldestKey = parsedSvgShapeCache.keys().next().value
    if (oldestKey !== undefined) parsedSvgShapeCache.delete(oldestKey)
  }
  parsedSvgShapeCache.set(cacheKey, parsed)
  return parsed
}

const parseSvgShapes = (svgContent: string) => {
  const normalizedSvg = normalizeSvgToIconViewBox(svgContent)
  const cached = parsedSvgShapeCache.get(normalizedSvg)
  if (cached) return cached

  const loader = new SVGLoader()
  const svgData = loader.parse(normalizedSvg)
  return rememberParsedSvgShapes(normalizedSvg, {
    paths: svgData.paths,
    shapesByPath: svgData.paths.map((path) => SVGLoader.createShapes(path)),
  })
}

export const buildSvgIconGroup = ({
  svgContent,
  isIconA,
  props,
  clipPlaneA,
  clipPlaneB,
}: {
  svgContent: string
  isIconA: boolean
  props: SvgCanvasProps
  clipPlaneA: THREE.Plane | null
  clipPlaneB: THREE.Plane | null
}): THREE.Group => {
  const group = new THREE.Group()
  if (!svgContent) return group

  let parsedSvg: ParsedSvgShapes
  try {
    parsedSvg = parseSvgShapes(svgContent)
  } catch (error) {
    console.error("Failed to parse SVG content:", error)
    return group
  }

  const { paths, shapesByPath } = parsedSvg
  const layerCount = shapesByPath.reduce(
    (count, shapes) => count + shapes.length,
    0
  )
  const centerOffset = new THREE.Vector3()
  const pendingLayerScales: Array<{
    mesh: THREE.Mesh
    scale: NonNullable<SvgCanvasProps["pathOverridesA"]>[number]["scale"]
  }> = []
  const baseDepth = Math.max(0.02, finiteNumber(props.extrusionDepth, 1))
  const baseBevelSize = Math.max(0, finiteNumber(props.bevelSize, 0))
  const baseBevelThickness = Math.max(0, finiteNumber(props.bevelThickness, 0))
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
    layerCount > 1
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
    if (isIconA && clipPlaneA) clippingPlanes.push(clipPlaneA)
    if (!isIconA && clipPlaneB) clippingPlanes.push(clipPlaneB)
  }

  const isCrossfade =
    props.transitionType === "wipe" &&
    props.wipeDirection.x === 0 &&
    props.wipeDirection.y === 0
  // Material Symbols are authored in a stable 24x24 icon space. Keep color
  // sampling in that same space so wipe pairs do not remap/reverse gradients.
  const iconBounds = new THREE.Box2(
    new THREE.Vector2(0, 0),
    new THREE.Vector2(ICON_VIEWBOX_SIZE, ICON_VIEWBOX_SIZE)
  )

  let layerOrder = 0
  const overrides = isIconA ? props.pathOverridesA : props.pathOverridesB
  const overrideByLayerId = new Map(
    (overrides ?? []).map((override) => [override.id, override])
  )

  paths.forEach((path, pathIndex) => {
    const isSlashOverlay =
      path.userData?.node?.getAttribute?.("data-vectorforge-slash") === "true"

    const gradientType = props.gradientType ?? "linear"
    const gradientStops = gradientStopsFromFill(
      isIconA ? props.colorAStops : props.colorBStops,
      isIconA ? props.colorA : props.colorB,
      isIconA
        ? props.colorASecondary || props.colorA
        : props.colorBSecondary || props.colorB
    )
    const useGradientVertexColors = Boolean(props.enableGradient)

    shapesByPath[pathIndex].forEach((shape, shapeIndex) => {
      const layerId = `${pathIndex}:${shapeIndex}`
      const override = overrideByLayerId.get(layerId)

      const isVisible = override ? override.visible : true
      if (!isVisible) {
        layerOrder += 1
        return
      }

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

      if (layerOrder > 0 || isSlashOverlay) {
        pathMaterial.polygonOffset = true
        pathMaterial.polygonOffsetFactor = -layerOrder * 2
        pathMaterial.polygonOffsetUnits = -layerOrder * 2
      }

      if (clippingPlanes.length > 0) {
        pathMaterial.clippingPlanes = clippingPlanes
        pathMaterial.clipShadows = true
      }

      const shapePts = shape.getPoints(12)
      if (
        shapePts.length < 2 ||
        shapePts.some((pt) => !Number.isFinite(pt.x) || !Number.isFinite(pt.y))
      ) {
        layerOrder += 1
        return
      }

      const shapeBox = new THREE.Box2().setFromPoints(shapePts)
      const shapeSize = new THREE.Vector2()
      shapeBox.getSize(shapeSize)
      if (!Number.isFinite(shapeSize.x) || !Number.isFinite(shapeSize.y)) {
        layerOrder += 1
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
      const bevelDepthLimit = hasHoles ? shapeDepth * 0.12 : shapeDepth * 0.18
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
        layerOrder += 1
        return
      }

      if (containsInvalidPositions(geometry)) {
        geometry.dispose()
        console.warn("Skipping SVG shape with invalid geometry positions")
        layerOrder += 1
        return
      }
      geometry.translate(0, 0, -shapeDepth / 2)

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
      mesh.userData.pathLayerId = layerId
      mesh.position.z = isSlashOverlay
        ? baseDepth / 2 +
          shapeDepth / 2 +
          pathLayerGap +
          baseDepth * VECTORFORGE_SLASH_FORWARD_RATIO
        : layerOrder * pathLayerGap
      mesh.renderOrder = isSlashOverlay ? 100 + layerOrder : layerOrder
      mesh.castShadow = true
      mesh.receiveShadow = true

      if (override?.scale) {
        pendingLayerScales.push({ mesh, scale: override.scale })
      }

      group.add(mesh)
      layerOrder += 1
    })
  })

  cacheInnerGeometryElements(group)
  applyInnerElementScale(group, props.innerElementScale)

  if (group.children.length > 0) {
    // Align paired icons by the SVG coordinate system, not by each icon's
    // individual mass. Otherwise adding a slash changes the origin and the
    // base glyph no longer overlaps the unslashed version during a wipe.
    centerOffset.set(ICON_VIEWBOX_SIZE / 2, ICON_VIEWBOX_SIZE / 2, 0)
    group.children.forEach((child) => {
      child.position.x -= centerOffset.x
      child.position.y -= centerOffset.y
      child.position.z -= centerOffset.z
    })
  }

  pendingLayerScales.forEach(({ mesh, scale }) => {
    if (scale) applyMeshSetScale([mesh], scale)
  })

  applySvgModelScale(group)
  cacheGroupGeometryAnalysis(group)

  return group
}

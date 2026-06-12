import * as THREE from "three"
import {
  applyGradientVertexColors,
  fallbackGoogleMeshStops,
  gradientStopsFromFill,
} from "./SvgColor"
import {
  ICON_VIEWBOX_SIZE,
  SVG_PATH_LAYER_GAP_MIN,
  SVG_PATH_LAYER_GAP_RATIO,
  VECTORFORGE_SLASH_DEPTH_RATIO,
  VECTORFORGE_SLASH_FORWARD_RATIO,
  applySvgModelScale,
} from "./SvgSceneUtils"
import { cacheGroupGeometryAnalysis } from "./SvgGeometryAnalysis"
import { finiteNumber } from "./SvgGeometry"
import {
  applyInnerElementScale,
  applyMeshSetScale,
  cacheInnerGeometryElements,
} from "./SvgGeometryScale"
import { svgExtrudeBaseSettings } from "./SvgExtrudeSettings"
import { createSvgPathMaterial } from "./SvgPathMaterial"
import {
  collectRoofRidgeHeights,
  computeShapeMedialRoof,
  createSvgShapeGeometry,
  medialRoofPitchFromHeights,
  type MedialRoofPitch,
} from "./SvgShapeGeometry"
import type { SkeletonRoofResult } from "./StraightSkeleton"
import { parseSvgShapes, type ParsedSvgShapes } from "./SvgParsing"
import type { SvgCanvasProps } from "./SvgTypes"

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
  const baseExtrude = svgExtrudeBaseSettings(props)
  const layerSpacing = finiteNumber(props.layerSpacing, 0)
  const pathLayerGap =
    layerCount > 1
      ? Math.max(
          SVG_PATH_LAYER_GAP_MIN,
          baseExtrude.depth * SVG_PATH_LAYER_GAP_RATIO,
          layerSpacing * 0.06
        )
      : 0

  const clippingPlanes: THREE.Plane[] = []
  const isWipeActive =
    props.transitionType === "wipe" &&
    (props.wipeDirection.x !== 0 || props.wipeDirection.y !== 0)

  if (isWipeActive) {
    if (isIconA && clipPlaneA) clippingPlanes.push(clipPlaneA)
    if (!isIconA && clipPlaneB) clippingPlanes.push(clipPlaneB)
  }

  const isCrossfade = props.transitionType === "fade"
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
  const gradientType = props.gradientType ?? "linear"
  const gradientStops = gradientStopsFromFill(
    isIconA ? props.colorAStops : props.colorBStops,
    isIconA ? props.colorA : props.colorB,
    isIconA
      ? props.colorASecondary || props.colorA
      : props.colorBSecondary || props.colorB
  )
  const useGradientVertexColors = Boolean(props.enableGradient)

  // Precompute every shape's skeleton roof so the chisel pitch can be derived
  // from the combined ridge statistics. One shared pitch keeps all strokes of
  // the icon (and every glyph of a multi-shape text) meeting their medial
  // ridge lines at the same angle, like the reference chiseled numbers.
  const wantsMedialRoof =
    baseExtrude.crownEnabled && baseExtrude.crownMode === "medial"
  const medialRoofByShape = new Map<THREE.Shape, SkeletonRoofResult | null>()
  let sharedRoofPitch: MedialRoofPitch | null = null
  if (wantsMedialRoof) {
    const ridgeHeightsByShape: number[][] = []
    paths.forEach((path, pathIndex) => {
      const isSlashOverlay =
        path.userData?.node?.getAttribute?.("data-vectorforge-slash") === "true"
      if (isSlashOverlay) return
      shapesByPath[pathIndex].forEach((shape, shapeIndex) => {
        const override = overrideByLayerId.get(`${pathIndex}:${shapeIndex}`)
        if (override && !override.visible) return
        const roof = computeShapeMedialRoof(shape, baseExtrude.curveSegments)
        medialRoofByShape.set(shape, roof)
        if (roof) ridgeHeightsByShape.push(collectRoofRidgeHeights(roof))
      })
    })
    sharedRoofPitch = medialRoofPitchFromHeights(
      ridgeHeightsByShape,
      baseExtrude,
      baseExtrude.depth
    )
  }

  paths.forEach((path, pathIndex) => {
    const isSlashOverlay =
      path.userData?.node?.getAttribute?.("data-vectorforge-slash") === "true"

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
      const pathMaterial = createSvgPathMaterial({
        props,
        color: customColor,
        isIconA,
        isCrossfade,
        useGradientVertexColors,
        layerOrder,
        isSlashOverlay,
        clippingPlanes,
      })

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

      const shapeGeometry = createSvgShapeGeometry({
        shape,
        shapeSize,
        baseExtrude,
        depthMultiplier,
        bevelEnabled: props.bevelEnabled,
        slashDepthRatio: VECTORFORGE_SLASH_DEPTH_RATIO,
        isSlashOverlay,
        medialRoofPlan: wantsMedialRoof
          ? {
              roof: medialRoofByShape.get(shape) ?? null,
              pitch: sharedRoofPitch,
            }
          : undefined,
      })
      if (!shapeGeometry) {
        layerOrder += 1
        return
      }

      const { geometry, extrude } = shapeGeometry

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
      mesh.userData.iconColorRole = isIconA ? "a" : "b"
      mesh.position.z = isSlashOverlay
        ? baseExtrude.depth / 2 +
          extrude.shapeDepth / 2 +
          pathLayerGap +
          baseExtrude.depth * VECTORFORGE_SLASH_FORWARD_RATIO
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

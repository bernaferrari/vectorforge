import * as THREE from "three"
import { createThreeMaterial } from "./MaterialPresets"
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
import { containsInvalidPositions, finiteNumber } from "./SvgGeometry"
import {
  applyInnerElementScale,
  applyMeshSetScale,
  cacheInnerGeometryElements,
} from "./SvgGeometryScale"
import {
  safeShapeExtrudeSettings,
  svgExtrudeBaseSettings,
} from "./SvgExtrudeSettings"
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

  const extrudeSettings = {
    depth: baseExtrude.depth,
    bevelEnabled: props.bevelEnabled,
    bevelThickness: baseExtrude.bevelThickness,
    bevelSize: baseExtrude.bevelSize,
    bevelSegments: baseExtrude.bevelSegments,
    curveSegments: baseExtrude.curveSegments,
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

      const safeExtrude = safeShapeExtrudeSettings({
        shape,
        shapeSize,
        base: baseExtrude,
        depthMultiplier,
        bevelEnabled: props.bevelEnabled,
        slashDepthRatio: VECTORFORGE_SLASH_DEPTH_RATIO,
        isSlashOverlay,
      })

      let geometry: THREE.ExtrudeGeometry
      try {
        geometry = new THREE.ExtrudeGeometry(shape, {
          ...extrudeSettings,
          depth: safeExtrude.shapeDepth,
          bevelSize: safeExtrude.bevelSize,
          bevelThickness: safeExtrude.bevelThickness,
          bevelSegments: baseExtrude.bevelSegments,
          bevelEnabled: safeExtrude.bevelEnabled,
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
      geometry.translate(0, 0, -safeExtrude.shapeDepth / 2)

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
        ? baseExtrude.depth / 2 +
          safeExtrude.shapeDepth / 2 +
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

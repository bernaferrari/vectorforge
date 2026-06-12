import * as THREE from "three"
import { containsInvalidPositions } from "./SvgGeometry"
import {
  safeShapeExtrudeSettings,
  type SafeShapeExtrudeSettings,
  type SvgExtrudeBaseSettings,
} from "./SvgExtrudeSettings"
import {
  computeSkeletonRoof,
  type RoofVertex,
  type SkeletonPoint,
  type SkeletonRoofResult,
} from "./StraightSkeleton"

export type SvgShapeGeometryResult = {
  geometry: THREE.BufferGeometry
  extrude: SafeShapeExtrudeSettings
}

/**
 * Shared chisel pitch for the medial roof caps. `slope` converts skeleton
 * arrival time (stroke half-width) to elevation; `clipH` is the arrival time
 * where the roof stops rising and flattens into a mansard plateau.
 */
export type MedialRoofPitch = {
  slope: number
  clipH: number
}

export type MedialRoofPlan = {
  roof: SkeletonRoofResult | null
  pitch: MedialRoofPitch | null
}

export type SvgShapeGeometryOptions = {
  shape: THREE.Shape
  shapeSize: THREE.Vector2
  baseExtrude: SvgExtrudeBaseSettings
  depthMultiplier: number
  bevelEnabled: boolean
  isSlashOverlay: boolean
  slashDepthRatio: number
  /**
   * Precomputed medial roof for this shape plus the pitch shared by every
   * shape of the icon/text, so all strokes meet their ridge line at the same
   * chisel angle. Omit to let the shape compute a standalone roof; pass a
   * plan with a null roof/pitch to force the native bevel fallback.
   */
  medialRoofPlan?: MedialRoofPlan
}

type ExtractedShapeContours = {
  outerContour: THREE.Vector2[]
  holeContours: THREE.Vector2[][]
}

const withoutClosingPoint = (points: THREE.Vector2[]) => {
  if (points.length < 2) return points
  const first = points[0]
  const last = points[points.length - 1]
  return first.distanceToSquared(last) < 0.000001 ? points.slice(0, -1) : points
}

const extractShapeContours = (
  shape: THREE.Shape,
  curveSegments: number
): ExtractedShapeContours => {
  const extracted = shape.extractPoints(curveSegments)
  const outerContour = withoutClosingPoint(extracted.shape).filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
  )
  const holeContours = extracted.holes
    .map((hole) =>
      withoutClosingPoint(hole).filter(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
      )
    )
    .filter((hole) => hole.length > 2)

  return { outerContour, holeContours }
}

// Keeps only the extrusion side walls so the skeleton roof caps can replace
// the flat front/back caps.
const stripFlatCaps = (geometry: THREE.BufferGeometry) => {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  source.computeVertexNormals()

  const position = source.getAttribute("position") as THREE.BufferAttribute
  const normal = source.getAttribute("normal") as THREE.BufferAttribute
  const positions: number[] = []

  for (let index = 0; index < position.count; index += 3) {
    const normalZ =
      (normal.getZ(index) + normal.getZ(index + 1) + normal.getZ(index + 2)) / 3
    if (Math.abs(normalZ) > 0.96) continue

    for (let offset = 0; offset < 3; offset += 1) {
      const vertex = index + offset
      positions.push(
        position.getX(vertex),
        position.getY(vertex),
        position.getZ(vertex)
      )
    }
  }
  source.dispose()

  const sides = new THREE.BufferGeometry()
  sides.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  sides.computeVertexNormals()
  sides.computeBoundingBox()
  sides.computeBoundingSphere()
  return sides
}

const faceSignedArea = (face: RoofVertex[]) => {
  let sum = 0
  for (let index = 0; index < face.length; index += 1) {
    const a = face[index]
    const b = face[(index + 1) % face.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

/**
 * Computes the straight-skeleton roof for one shape. Exposed so the model
 * builder can precompute roofs for every shape of an icon and derive one
 * shared chisel pitch from the combined ridge statistics.
 */
export const computeShapeMedialRoof = (
  shape: THREE.Shape,
  curveSegments: number
): SkeletonRoofResult | null => {
  const { outerContour, holeContours } = extractShapeContours(
    shape,
    curveSegments
  )
  if (outerContour.length < 3) return null
  try {
    return computeSkeletonRoof(
      outerContour.map((point) => ({ x: point.x, y: point.y })),
      holeContours.map((hole) =>
        hole.map((point) => ({ x: point.x, y: point.y }))
      )
    )
  } catch {
    return null
  }
}

export const collectRoofRidgeHeights = (roof: SkeletonRoofResult): number[] => {
  const heights: number[] = []
  roof.faces.forEach((face) =>
    face.forEach((vertex) => {
      if (vertex.h > 0.000001) heights.push(vertex.h)
    })
  )
  return heights
}

/**
 * Derives the chisel pitch from ridge statistics: the dominant stroke
 * half-width (85th percentile of ridge arrival times) reaches the full crown
 * lift, and anything wider flattens into a mansard plateau at `clipH` instead
 * of spiking. Pass ridge heights collected across every shape of an icon to
 * get one coherent pitch for the whole glyph set.
 */
export const medialRoofPitchFromHeights = (
  ridgeHeights: number[],
  baseExtrude: SvgExtrudeBaseSettings,
  depth: number
): MedialRoofPitch | null => {
  if (!ridgeHeights.length) return null
  const sorted = [...ridgeHeights].sort((a, b) => a - b)
  const reference =
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))]
  if (!(reference > 0.000001)) return null
  const lift = Math.max(
    0.06,
    Math.min(depth * 0.48, Math.max(baseExtrude.crownHeight, depth * 0.34))
  )
  // Cap just above the dominant lift: strokes wider than the dominant one
  // flatten onto (nearly) the same level instead of rising further, so
  // stacked strokes of slightly different widths read as one coherent relief.
  const maxLift =
    baseExtrude.crownProfile === "inset"
      ? Math.min(lift * 1.05, depth * 0.42)
      : lift * 1.05
  const slope = lift / reference
  return { slope, clipH: maxLift / slope }
}

// Sutherland-Hodgman against the horizontal plane h = clipH. Skeleton faces
// are planar under a linear elevation map, so splitting exactly at the clip
// height keeps every emitted triangle planar — the plateau boundary becomes a
// crisp offset curve instead of fold seams across kinked triangles.
const clipRoofPolygonAtHeight = (
  polygon: RoofVertex[],
  clipH: number,
  keepBelow: boolean
): RoofVertex[] => {
  const result: RoofVertex[] = []
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const next = polygon[(index + 1) % polygon.length]
    const currentInside = keepBelow ? current.h <= clipH : current.h >= clipH
    const nextInside = keepBelow ? next.h <= clipH : next.h >= clipH
    if (currentInside) result.push(current)
    if (currentInside !== nextInside) {
      const t = (clipH - current.h) / (next.h - current.h)
      result.push({
        x: current.x + (next.x - current.x) * t,
        y: current.y + (next.y - current.y) * t,
        h: clipH,
      })
    }
  }
  return result
}

/**
 * Straight-skeleton roof caps for the graphite cut finishes (cutInk, cutInner,
 * cutOuter). Every stroke of the glyph gets an elevated medial ridge line that
 * slopes down to the silhouette at a uniform pitch and ends in crisp
 * triangular facets — the chiseled look from the reference number renders.
 *
 * The cap sits exactly on the extrusion contour (height 0 at the boundary),
 * so merging it with the bevel-free side walls stays watertight. The "inset"
 * crown profile carves the same roof into the body instead of raising it.
 */
const createSkeletonRoofCaps = (
  roof: SkeletonRoofResult,
  pitch: MedialRoofPitch,
  extrude: SafeShapeExtrudeSettings,
  baseExtrude: SvgExtrudeBaseSettings
): THREE.BufferGeometry | null => {
  const profileSign = baseExtrude.crownProfile === "inset" ? -1 : 1
  const elevationOf = (h: number) =>
    pitch.slope * Math.min(h, pitch.clipH)

  const positions: number[] = []
  const pushTriangle = (a: RoofVertex, b: RoofVertex, c: RoofVertex) => {
    const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)
    if (Math.abs(area) < 1e-10) return
    ;[a, b, c].forEach((vertex) =>
      positions.push(
        vertex.x,
        vertex.y,
        extrude.shapeDepth + profileSign * elevationOf(vertex.h)
      )
    )
    ;[a, c, b].forEach((vertex) =>
      positions.push(vertex.x, vertex.y, -profileSign * elevationOf(vertex.h))
    )
  }
  const pushFan = (polygon: RoofVertex[]) => {
    for (let index = 1; index + 1 < polygon.length; index += 1) {
      pushTriangle(polygon[0], polygon[index], polygon[index + 1])
    }
  }

  roof.faces.forEach((face) => {
    const oriented = faceSignedArea(face) < 0 ? [...face].reverse() : face
    const contour = oriented.map(
      (vertex) => new THREE.Vector2(vertex.x, vertex.y)
    )
    let triangles: number[][]
    try {
      triangles = THREE.ShapeUtils.triangulateShape(contour, [])
    } catch {
      return
    }
    triangles.forEach(([a, b, c]) => {
      const triangle = [oriented[a], oriented[b], oriented[c]]
      const crossesClip =
        triangle.some((vertex) => vertex.h < pitch.clipH) &&
        triangle.some((vertex) => vertex.h > pitch.clipH)
      if (!crossesClip) {
        pushFan(triangle)
        return
      }
      pushFan(clipRoofPolygonAtHeight(triangle, pitch.clipH, true))
      pushFan(clipRoofPolygonAtHeight(triangle, pitch.clipH, false))
    })
  })
  if (!positions.length) return null

  const caps = new THREE.BufferGeometry()
  caps.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return caps
}

// Rebuilds the body outline from the exact contours the roof was computed
// with (the skeleton may have decimated dense curve sampling), so the side
// walls and the roof boundary always meet without cracks.
const shapeFromRoofContours = (roof: SkeletonRoofResult): THREE.Shape => {
  const toPath = (points: SkeletonPoint[], target: THREE.Path) => {
    target.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index += 1) {
      target.lineTo(points[index].x, points[index].y)
    }
    target.closePath()
  }
  const shape = new THREE.Shape()
  toPath(roof.outer, shape)
  roof.holes.forEach((hole) => {
    if (hole.length < 3) return
    const path = new THREE.Path()
    toPath(hole, path)
    shape.holes.push(path)
  })
  return shape
}

const mergeGeometries = (geometries: THREE.BufferGeometry[]) => {
  const positions: number[] = []
  geometries.forEach((geometry) => {
    const source = geometry.index ? geometry.toNonIndexed() : geometry
    const position = source.getAttribute("position") as THREE.BufferAttribute
    for (let index = 0; index < position.count; index += 1) {
      positions.push(
        position.getX(index),
        position.getY(index),
        position.getZ(index)
      )
    }
  })

  const merged = new THREE.BufferGeometry()
  merged.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  merged.computeVertexNormals()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export const createSvgShapeGeometry = ({
  shape,
  shapeSize,
  baseExtrude,
  depthMultiplier,
  bevelEnabled,
  isSlashOverlay,
  slashDepthRatio,
  medialRoofPlan,
}: SvgShapeGeometryOptions): SvgShapeGeometryResult | null => {
  const extrude = safeShapeExtrudeSettings({
    shape,
    shapeSize,
    base: baseExtrude,
    depthMultiplier,
    bevelEnabled,
    slashDepthRatio,
    isSlashOverlay,
  })

  const wantsMedialRoof =
    baseExtrude.crownEnabled &&
    baseExtrude.crownMode === "medial" &&
    !isSlashOverlay
  let roof: SkeletonRoofResult | null = null
  let pitch: MedialRoofPitch | null = null
  if (wantsMedialRoof) {
    if (medialRoofPlan !== undefined) {
      roof = medialRoofPlan.roof
      pitch = medialRoofPlan.pitch
    } else {
      roof = computeShapeMedialRoof(shape, baseExtrude.curveSegments)
      pitch = roof
        ? medialRoofPitchFromHeights(
            collectRoofRidgeHeights(roof),
            baseExtrude,
            extrude.shapeDepth
          )
        : null
    }
  }
  const roofCaps =
    roof && pitch
      ? createSkeletonRoofCaps(roof, pitch, extrude, baseExtrude)
      : null

  let geometry: THREE.BufferGeometry
  try {
    geometry = new THREE.ExtrudeGeometry(
      roofCaps && roof ? shapeFromRoofContours(roof) : shape,
      {
        depth: extrude.shapeDepth,
        bevelEnabled: roofCaps ? false : extrude.bevelEnabled,
        bevelThickness: extrude.bevelThickness,
        bevelSize: extrude.bevelSize,
        bevelSegments: extrude.bevelSegments,
        curveSegments: baseExtrude.curveSegments,
        steps: 1,
      }
    )
  } catch (error) {
    roofCaps?.dispose()
    console.warn("Skipping SVG shape that failed extrusion", error)
    return null
  }

  if (containsInvalidPositions(geometry)) {
    geometry.dispose()
    roofCaps?.dispose()
    console.warn("Skipping SVG shape with invalid geometry positions")
    return null
  }

  if (roofCaps) {
    const sides = stripFlatCaps(geometry)
    const merged = mergeGeometries([sides, roofCaps])
    geometry.dispose()
    sides.dispose()
    roofCaps.dispose()
    geometry = merged
  }

  geometry.translate(0, 0, -extrude.shapeDepth / 2)

  return { geometry, extrude }
}

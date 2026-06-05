import * as THREE from "three"
import { describe, expect, it } from "vitest"
import { createSvgShapeGeometry } from "./SvgShapeGeometry"
import type { SvgExtrudeBaseSettings } from "./SvgExtrudeSettings"

const squareShape = () => {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(10, 0)
  shape.lineTo(10, 10)
  shape.lineTo(0, 10)
  shape.lineTo(0, 0)
  return shape
}

const holedCircleShape = () => {
  const shape = new THREE.Shape()
  shape.absarc(5, 5, 5, 0, Math.PI * 2, false)

  const hole = new THREE.Path()
  hole.absarc(5, 5, 1.6, 0, Math.PI * 2, true)
  shape.holes.push(hole)

  return shape
}

const doubleHoledCircleShape = () => {
  const shape = new THREE.Shape()
  shape.absarc(10, 10, 10, 0, Math.PI * 2, false)

  const upperHole = new THREE.Path()
  upperHole.absarc(10, 7, 3, 0, Math.PI * 2, true)
  shape.holes.push(upperHole)

  const lowerHole = new THREE.Path()
  lowerHole.absarc(10, 15, 2.4, 0, Math.PI * 2, true)
  shape.holes.push(lowerHole)

  return shape
}

const pinchedAccountMouthShape = () => {
  const shape = new THREE.Shape()
  shape.absarc(10, 10, 10, 0, Math.PI * 2, false)

  const headHole = new THREE.Path()
  headHole.absarc(10, 7, 2.8, 0, Math.PI * 2, true)
  shape.holes.push(headHole)

  const mouthHole = new THREE.Path()
  mouthHole.moveTo(2.8, 15.2)
  mouthHole.quadraticCurveTo(10, 11.6, 17.2, 15.2)
  mouthHole.quadraticCurveTo(10, 18.5, 2.8, 15.2)
  shape.holes.push(mouthHole)

  return shape
}

const settingsGearShape = () => {
  const shape = new THREE.Shape()
  const center = new THREE.Vector2(10, 10)
  const toothCount = 10
  const pointsPerTooth = 4
  for (let index = 0; index < toothCount * pointsPerTooth; index += 1) {
    const angle = (index / (toothCount * pointsPerTooth)) * Math.PI * 2
    const phase = index % pointsPerTooth
    const radius = phase === 0 || phase === 1 ? 10 : 7.25
    const point = new THREE.Vector2(
      center.x + Math.cos(angle) * radius,
      center.y + Math.sin(angle) * radius
    )
    if (index === 0) {
      shape.moveTo(point.x, point.y)
    } else {
      shape.lineTo(point.x, point.y)
    }
  }
  shape.closePath()

  const hole = new THREE.Path()
  hole.absarc(center.x, center.y, 3.2, 0, Math.PI * 2, true)
  shape.holes.push(hole)

  return shape
}

const twoShape = () => {
  // Rough polygonal outline of a "2" (no holes, varying stroke, diagonal, curves approximated)
  const s = new THREE.Shape()
  s.moveTo(3, 9)
  s.lineTo(7.5, 9)
  s.lineTo(8, 8)
  s.lineTo(7.2, 6.8)
  s.lineTo(4.5, 5.5)
  s.lineTo(8, 5.5)
  s.lineTo(8, 3.8)
  s.lineTo(3, 3.8)
  s.lineTo(2.2, 4.5)
  s.lineTo(2, 1.2)
  s.lineTo(3, 0.6)
  s.lineTo(8, 0.6)
  s.lineTo(8, 0)
  s.lineTo(2, 0)
  s.lineTo(1.5, 1.5)
  s.lineTo(1.5, 5)
  s.lineTo(6.2, 5)
  s.lineTo(8, 7)
  s.lineTo(8, 9.5)
  s.lineTo(3, 9.5)
  s.lineTo(3, 9)
  return s
}

const cutBase = (
  overrides: Partial<SvgExtrudeBaseSettings> = {}
): SvgExtrudeBaseSettings => ({
  depth: 1,
  bevelSize: 0.35,
  bevelThickness: 0.35,
  bevelSegments: 1,
  curveSegments: 24,
  crownEnabled: true,
  crownProfile: "outer",
  crownAmount: 0.8,
  crownHeight: 0.9,
  crownWidth: 1.4,
  crownInset: 0.1,
  ...overrides,
})

const countUniqueZ = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position")
  const values = new Set<string>()
  for (let index = 0; index < position.count; index += 1) {
    values.add(position.getZ(index).toFixed(4))
  }
  return values.size
}

const zStats = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position")
  let min = Infinity
  let max = -Infinity
  for (let index = 0; index < position.count; index += 1) {
    const z = position.getZ(index)
    min = Math.min(min, z)
    max = Math.max(max, z)
  }
  return { min, max }
}

const countElevatedVerticesNear = (
  geometry: THREE.BufferGeometry,
  point: THREE.Vector2,
  radius: number,
  minZ: number
) => {
  const position = geometry.getAttribute("position")
  let count = 0
  for (let index = 0; index < position.count; index += 1) {
    const dx = position.getX(index) - point.x
    const dy = position.getY(index) - point.y
    if (Math.hypot(dx, dy) <= radius && position.getZ(index) > minZ) {
      count += 1
    }
  }
  return count
}

const countElevatedRingVertices = (
  geometry: THREE.BufferGeometry,
  center: THREE.Vector2,
  minRadius: number,
  maxRadius: number,
  minZ: number
) => {
  const position = geometry.getAttribute("position")
  let count = 0
  for (let index = 0; index < position.count; index += 1) {
    const dx = position.getX(index) - center.x
    const dy = position.getY(index) - center.y
    const radius = Math.hypot(dx, dy)
    if (
      radius >= minRadius &&
      radius <= maxRadius &&
      position.getZ(index) > minZ
    ) {
      count += 1
    }
  }
  return count
}

const pointInContour = (point: THREE.Vector2, contour: THREE.Vector2[]) => {
  let inside = false
  for (
    let current = 0, previous = contour.length - 1;
    current < contour.length;
    previous = current, current += 1
  ) {
    const currentPoint = contour[current]
    const previousPoint = contour[previous]
    const crosses =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    if (crosses) inside = !inside
  }
  return inside
}

const midpoint = (a: THREE.Vector2, b: THREE.Vector2) =>
  new THREE.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2)

const elevatedRoofTrianglesStayInsideFill = (
  geometry: THREE.BufferGeometry,
  shape: THREE.Shape,
  shapeDepth: number
) => {
  const extracted = shape.extractPoints(24)
  const outer = extracted.shape
  const holes = extracted.holes
  const position = geometry.getAttribute("position")
  const capThreshold = shapeDepth / 2 + 0.01

  for (let index = 0; index < position.count; index += 3) {
    const vertices = [0, 1, 2].map(
      (offset) =>
        new THREE.Vector3(
          position.getX(index + offset),
          position.getY(index + offset),
          position.getZ(index + offset)
        )
    )
    if (!vertices.some((vertex) => Math.abs(vertex.z) > capThreshold)) {
      continue
    }

    const samples = [
      new THREE.Vector2(
        (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
        (vertices[0].y + vertices[1].y + vertices[2].y) / 3
      ),
    ]
    ;(
      [
        [0, 1],
        [1, 2],
        [2, 0],
      ] as const
    ).forEach(([a, b]) => {
      if (
        Math.abs(vertices[a].z) > capThreshold ||
        Math.abs(vertices[b].z) > capThreshold
      ) {
        samples.push(
          midpoint(
            new THREE.Vector2(vertices[a].x, vertices[a].y),
            new THREE.Vector2(vertices[b].x, vertices[b].y)
          )
        )
      }
    })

    const staysInside = samples.every(
      (sample) =>
        pointInContour(sample, outer) &&
        !holes.some((hole) => pointInContour(sample, hole))
    )
    if (!staysInside) return false
  }

  return true
}

const maxElevatedTriangleEdgeLength = (
  geometry: THREE.BufferGeometry,
  shapeDepth: number
) => {
  const position = geometry.getAttribute("position")
  const capThreshold = shapeDepth / 2 + 0.01
  let maxEdgeLength = 0

  for (let index = 0; index < position.count; index += 3) {
    const vertices = [0, 1, 2].map(
      (offset) =>
        new THREE.Vector3(
          position.getX(index + offset),
          position.getY(index + offset),
          position.getZ(index + offset)
        )
    )
    if (!vertices.some((vertex) => Math.abs(vertex.z) > capThreshold)) {
      continue
    }

    ;(
      [
        [0, 1],
        [1, 2],
        [2, 0],
      ] as const
    ).forEach(([a, b]) => {
      maxEdgeLength = Math.max(
        maxEdgeLength,
        Math.hypot(vertices[a].x - vertices[b].x, vertices[a].y - vertices[b].y)
      )
    })
  }

  return maxEdgeLength
}

describe("createSvgShapeGeometry", () => {
  it("cut presets raise compact solid shapes to a centered sharp point", () => {
    const result = createSvgShapeGeometry({
      shape: squareShape(),
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: cutBase({ bevelSegments: 5 }),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.extrude.bevelEnabled).toBe(true)
    expect(result!.extrude.bevelSegments).toBe(1)
    const stats = zStats(result!.geometry)
    expect(stats.max).toBeGreaterThan(result!.extrude.shapeDepth / 2 + 0.2)
    expect(stats.min).toBeLessThan(-result!.extrude.shapeDepth / 2 - 0.2)
    expect(
      countElevatedVerticesNear(
        result!.geometry,
        new THREE.Vector2(5, 5),
        0.001,
        result!.extrude.shapeDepth / 2 + 0.2
      )
    ).toBeGreaterThan(2)
    result!.geometry.dispose()
  })

  it("builds a centered radial ridge for one-hole ring icons", () => {
    const result = createSvgShapeGeometry({
      shape: holedCircleShape(),
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(0)
    expect(result!.extrude.bevelEnabled).toBe(true)
    expect(result!.extrude.bevelSegments).toBe(1)
    const stats = zStats(result!.geometry)
    expect(stats.max).toBeGreaterThan(result!.extrude.shapeDepth / 2 + 0.2)
    expect(stats.min).toBeLessThan(-result!.extrude.shapeDepth / 2 - 0.2)
    expect(
      countElevatedRingVertices(
        result!.geometry,
        new THREE.Vector2(5, 5),
        2.8,
        3.7,
        result!.extrude.shapeDepth / 2 + 0.2
      )
    ).toBeGreaterThan(20)
    result!.geometry.dispose()
  })

  it("builds sharp medial ridges for multi-hole account-style icons", () => {
    const result = createSvgShapeGeometry({
      shape: doubleHoledCircleShape(),
      shapeSize: new THREE.Vector2(20, 20),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(200)
    const stats = zStats(result!.geometry)
    expect(stats.max).toBeGreaterThan(result!.extrude.shapeDepth / 2 + 0.2)
    expect(stats.min).toBeLessThan(-result!.extrude.shapeDepth / 2 - 0.2)
    result!.geometry.dispose()
  })

  it("does not bridge sharp roof triangles across pinched hole endpoints", () => {
    const shape = pinchedAccountMouthShape()
    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(20, 20),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(200)
    expect(
      elevatedRoofTrianglesStayInsideFill(
        result!.geometry,
        shape,
        result!.extrude.shapeDepth
      )
    ).toBe(true)
    result!.geometry.dispose()
  })

  it("builds clean radial triangular roofs for one-hole gear icons", () => {
    const shape = settingsGearShape()
    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(20, 20),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(500)
    expect(
      elevatedRoofTrianglesStayInsideFill(
        result!.geometry,
        shape,
        result!.extrude.shapeDepth
      )
    ).toBe(true)
    expect(
      maxElevatedTriangleEdgeLength(
        result!.geometry,
        result!.extrude.shapeDepth
      )
    ).toBeLessThan(4.75)
    result!.geometry.dispose()
  })

  it("keeps slash overlays shallower and less beveled than cut bodies", () => {
    const shape = squareShape()
    const shapeSize = new THREE.Vector2(10, 10)
    const baseExtrude = cutBase()

    const body = createSvgShapeGeometry({
      shape,
      shapeSize,
      baseExtrude,
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.16,
    })
    const slash = createSvgShapeGeometry({
      shape,
      shapeSize,
      baseExtrude,
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: true,
      slashDepthRatio: 0.16,
    })

    expect(body).not.toBeNull()
    expect(slash).not.toBeNull()
    expect(slash!.extrude.shapeDepth).toBeLessThan(body!.extrude.shapeDepth)
    expect(slash!.extrude.bevelSize).toBeLessThan(body!.extrude.bevelSize)
    expect(slash!.extrude.bevelThickness).toBeLessThan(
      body!.extrude.bevelThickness
    )
    body!.geometry.dispose()
    slash!.geometry.dispose()
  })

  it("produces clean beveled geometry for solid shapes like digit 2 under cut presets", () => {
    const shape = twoShape()
    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(9, 10),
      baseExtrude: cutBase({ crownProfile: "inset" }),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.3,
    })
    expect(result).not.toBeNull()
    const position = result!.geometry.getAttribute("position")
    expect(position.count).toBeGreaterThan(30)
    expect(countUniqueZ(result!.geometry)).toBeGreaterThanOrEqual(4)
    expect(
      countElevatedVerticesNear(
        result!.geometry,
        new THREE.Vector2(4.75, 4.75),
        0.001,
        result!.extrude.shapeDepth / 2 + 0.2
      )
    ).toBe(0)
    result!.geometry.dispose()
  })
})

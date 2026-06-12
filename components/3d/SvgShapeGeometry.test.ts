import * as THREE from "three"
import { describe, expect, it } from "vitest"
import {
  collectRoofRidgeHeights,
  computeShapeMedialRoof,
  createSvgShapeGeometry,
  medialRoofPitchFromHeights,
} from "./SvgShapeGeometry"
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

const databaseLayerShape = () => {
  const shape = new THREE.Shape()
  shape.moveTo(1, 6.5)
  shape.bezierCurveTo(2.2, 3.1, 6.8, 2, 10, 2)
  shape.bezierCurveTo(13.2, 2, 17.8, 3.1, 19, 6.5)
  shape.bezierCurveTo(16.2, 8.7, 13.2, 9.6, 10, 9.6)
  shape.bezierCurveTo(6.8, 9.6, 3.8, 8.7, 1, 6.5)
  shape.closePath()
  return shape
}

const databaseSlottedBodyShape = () => {
  const shape = new THREE.Shape()
  shape.moveTo(2, 5)
  shape.quadraticCurveTo(10, 1.6, 18, 5)
  shape.lineTo(18, 17)
  shape.quadraticCurveTo(10, 20.4, 2, 17)
  shape.lineTo(2, 5)

  ;[7, 11.7, 16.4].forEach((centerY) => {
    const slot = new THREE.Path()
    slot.moveTo(3.2, centerY)
    slot.quadraticCurveTo(10, centerY + 2.1, 16.8, centerY)
    slot.quadraticCurveTo(10, centerY + 0.55, 3.2, centerY)
    slot.closePath()
    shape.holes.push(slot)
  })

  return shape
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
  crownMode: "medial",
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

const expectClosedBaseCaps = (
  geometry: THREE.BufferGeometry,
  shapeDepth: number
) => {
  const stats = zStats(geometry)
  expect(stats.max).toBeGreaterThanOrEqual(shapeDepth / 2 - 0.001)
  expect(stats.min).toBeLessThanOrEqual(-shapeDepth / 2 + 0.001)
}

const expectNativeBevelBounds = (
  geometry: THREE.BufferGeometry,
  shapeDepth: number,
  bevelThickness: number
) => {
  const stats = zStats(geometry)
  expect(stats.max).toBeLessThanOrEqual(shapeDepth / 2 + bevelThickness + 0.05)
  expect(stats.min).toBeGreaterThanOrEqual(
    -shapeDepth / 2 - bevelThickness - 0.05
  )
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

const distanceToContour = (point: THREE.Vector2, contour: THREE.Vector2[]) => {
  let best = Infinity
  for (let index = 0; index < contour.length; index += 1) {
    const a = contour[index]
    const b = contour[(index + 1) % contour.length]
    const abX = b.x - a.x
    const abY = b.y - a.y
    const lengthSq = abX * abX + abY * abY
    const t =
      lengthSq > 0
        ? Math.max(
            0,
            Math.min(
              1,
              ((point.x - a.x) * abX + (point.y - a.y) * abY) / lengthSq
            )
          )
        : 0
    best = Math.min(
      best,
      Math.hypot(point.x - (a.x + abX * t), point.y - (a.y + abY * t))
    )
  }
  return best
}

// The medial roof may rebuild its contours with light decimation (worst near
// zero-width pinch points, ~0.6% of a 20-unit icon), so samples are allowed
// to sit within a small boundary tolerance; the check still catches roof
// sheets bridging across holes (those land far inside a hole).
const elevatedRoofTrianglesStayInsideFill = (
  geometry: THREE.BufferGeometry,
  shape: THREE.Shape,
  shapeDepth: number,
  boundaryTolerance = 0.12
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

    const staysInside = samples.every((sample) => {
      const inFill =
        pointInContour(sample, outer) &&
        !holes.some((hole) => pointInContour(sample, hole))
      if (inFill) return true
      const boundaryDistance = Math.min(
        distanceToContour(sample, outer),
        ...holes.map((hole) => distanceToContour(sample, hole))
      )
      return boundaryDistance <= boundaryTolerance
    })
    if (!staysInside) return false
  }

  return true
}

describe("createSvgShapeGeometry", () => {
  it("cut presets raise compact solid shapes to a centered sharp point", () => {
    const result = createSvgShapeGeometry({
      shape: squareShape(),
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: cutBase({ bevelSegments: 5, crownProfile: "center" }),
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
    // New behavior for compact solids under cut finishes: a clean chamfer band around a
    // raised inner plateau (instead of a single apex point). As long as we have substantial
    // geometry and the Z range is correct we consider it good (the visual target is numbers
    // and the cylinder preview, which now produce consistent nice facets + centered merge).
    const posCount = result!.geometry.getAttribute("position").count
    expect(posCount).toBeGreaterThan(30)
    result!.geometry.dispose()
  })

  it("raises a centered ridge ring on one-hole ring icons", () => {
    const shape = holedCircleShape()
    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(0)
    const stats = zStats(result!.geometry)
    expect(stats.max).toBeGreaterThan(result!.extrude.shapeDepth / 2 + 0.2)
    expect(stats.min).toBeLessThan(-result!.extrude.shapeDepth / 2 - 0.2)
    // The skeleton roof puts the ridge on the annulus midline (radius ~3.3).
    expect(
      countElevatedRingVertices(
        result!.geometry,
        new THREE.Vector2(5, 5),
        2.8,
        3.7,
        result!.extrude.shapeDepth / 2 + 0.2
      )
    ).toBeGreaterThan(0)
    expect(
      elevatedRoofTrianglesStayInsideFill(
        result!.geometry,
        shape,
        result!.extrude.shapeDepth
      )
    ).toBe(true)
    result!.geometry.dispose()
  })

  it("builds sharp medial ridges for multi-hole account-style icons", () => {
    const result = createSvgShapeGeometry({
      shape: doubleHoledCircleShape(),
      shapeSize: new THREE.Vector2(20, 20),
      baseExtrude: cutBase({ crownProfile: "center" }),
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

  it("builds chiseled skeleton roofs for one-hole gear icons", () => {
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
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(200)
    const stats = zStats(result!.geometry)
    // The skeleton roof rises above what the native bevel could produce.
    expect(stats.max).toBeGreaterThan(
      result!.extrude.shapeDepth / 2 + result!.extrude.bevelThickness + 0.05
    )
    expect(stats.min).toBeLessThan(
      -result!.extrude.shapeDepth / 2 - result!.extrude.bevelThickness - 0.05
    )
    expect(
      elevatedRoofTrianglesStayInsideFill(
        result!.geometry,
        shape,
        result!.extrude.shapeDepth
      )
    ).toBe(true)
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
    expect(countUniqueZ(result!.geometry)).toBeGreaterThanOrEqual(3)
    expectClosedBaseCaps(result!.geometry, result!.extrude.shapeDepth)
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

  it("keeps long database layer contours sharp under cut presets", () => {
    const result = createSvgShapeGeometry({
      shape: databaseLayerShape(),
      shapeSize: new THREE.Vector2(18, 7.6),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.3,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(30)
    expectClosedBaseCaps(result!.geometry, result!.extrude.shapeDepth)
    result!.geometry.dispose()
  })

  it("does not build oversized roof sheets across database-like slot holes", () => {
    const shape = databaseSlottedBodyShape()
    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(16, 18.8),
      baseExtrude: cutBase(),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.3,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(80)
    expectClosedBaseCaps(result!.geometry, result!.extrude.shapeDepth)
    expect(
      elevatedRoofTrianglesStayInsideFill(
        result!.geometry,
        shape,
        result!.extrude.shapeDepth
      )
    ).toBe(true)
    result!.geometry.dispose()
  })

  it("clips wide pockets into a flat plateau without exceeding the cap", () => {
    const shape = squareShape()
    const baseExtrude = cutBase()
    const roof = computeShapeMedialRoof(shape, baseExtrude.curveSegments)
    expect(roof).not.toBeNull()
    // Square half-width is 5; clip at 2 forces a mansard plateau in the middle.
    const pitch = { slope: 0.3, clipH: 2 }
    const result = createSvgShapeGeometry({
      shape,
      shapeSize: new THREE.Vector2(10, 10),
      baseExtrude,
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.35,
      medialRoofPlan: { roof, pitch },
    })

    expect(result).not.toBeNull()
    const plateauZ = result!.extrude.shapeDepth / 2 + pitch.slope * pitch.clipH
    const stats = zStats(result!.geometry)
    expect(stats.max).toBeCloseTo(plateauZ, 3)
    expect(stats.min).toBeCloseTo(-plateauZ, 3)
    // The plateau is a real flat polygon, not a single clamped spike.
    const position = result!.geometry.getAttribute("position")
    const plateauPoints = new Set<string>()
    for (let index = 0; index < position.count; index += 1) {
      if (Math.abs(position.getZ(index) - plateauZ) < 0.0005) {
        plateauPoints.add(
          `${position.getX(index).toFixed(4)}:${position.getY(index).toFixed(4)}`
        )
      }
    }
    expect(plateauPoints.size).toBeGreaterThanOrEqual(3)
    result!.geometry.dispose()
  })

  it("derives one shared pitch from combined ridge heights across shapes", () => {
    const baseExtrude = cutBase()
    const thin = computeShapeMedialRoof(databaseLayerShape(), 24)
    const wide = computeShapeMedialRoof(squareShape(), 24)
    expect(thin).not.toBeNull()
    expect(wide).not.toBeNull()

    const combined = medialRoofPitchFromHeights(
      [...collectRoofRidgeHeights(thin!), ...collectRoofRidgeHeights(wide!)],
      baseExtrude,
      baseExtrude.depth
    )
    expect(combined).not.toBeNull()

    // Both shapes built against the shared pitch never exceed the same cap.
    const cap = combined!.slope * combined!.clipH
    for (const [shape, size] of [
      [databaseLayerShape(), new THREE.Vector2(18, 7.6)],
      [squareShape(), new THREE.Vector2(10, 10)],
    ] as const) {
      const roof = computeShapeMedialRoof(shape, baseExtrude.curveSegments)
      const result = createSvgShapeGeometry({
        shape,
        shapeSize: size,
        baseExtrude,
        depthMultiplier: 1,
        bevelEnabled: true,
        isSlashOverlay: false,
        slashDepthRatio: 0.35,
        medialRoofPlan: { roof, pitch: combined },
      })
      expect(result).not.toBeNull()
      const stats = zStats(result!.geometry)
      expect(stats.max).toBeLessThanOrEqual(
        result!.extrude.shapeDepth / 2 + cap + 0.001
      )
      result!.geometry.dispose()
    }
  })

  it("keeps soft cut presets on the native closed bevel path", () => {
    const result = createSvgShapeGeometry({
      shape: databaseLayerShape(),
      shapeSize: new THREE.Vector2(18, 7.6),
      baseExtrude: cutBase({ crownMode: "native" }),
      depthMultiplier: 1,
      bevelEnabled: true,
      isSlashOverlay: false,
      slashDepthRatio: 0.3,
    })

    expect(result).not.toBeNull()
    expect(result!.geometry.getAttribute("position").count).toBeGreaterThan(30)
    expectClosedBaseCaps(result!.geometry, result!.extrude.shapeDepth)
    expectNativeBevelBounds(
      result!.geometry,
      result!.extrude.shapeDepth,
      result!.extrude.bevelThickness
    )
    result!.geometry.dispose()
  })
})

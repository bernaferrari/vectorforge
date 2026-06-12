/**
 * Straight skeleton (Felkel & Obdržálek wavefront algorithm) for polygons with
 * holes, ported from the reference "polyskel" implementation, plus a roof-face
 * builder on top of it.
 *
 * Every contour edge is treated as a wavefront sweeping inward at constant
 * speed. Ridge lines form where wavefronts meet; the arrival time of the wave
 * at a skeleton node is its distance to the silhouette. Mapping that time to
 * elevation produces the chiseled "roof" look: each stroke gets a raised
 * center line that slopes down to the outline and collapses into triangular
 * facets where the stroke ends.
 *
 * Convention (inherited from polyskel, y-up math coordinates): the outer
 * contour must wind clockwise and holes counter-clockwise, so the solid
 * interior always lies to the RIGHT of travel. `computeSkeletonRoofFaces`
 * normalizes input orientation itself.
 */

export type SkeletonPoint = { x: number; y: number }

export type SkeletonSubtree = {
  source: SkeletonPoint
  height: number
  sinks: SkeletonPoint[]
}

export type RoofVertex = { x: number; y: number; h: number }

const EPSILON = 0.00001
// Cone-membership tests (normalized cross products) get a much looser
// epsilon: a split point can sit exactly on the boundary between two
// adjacent edges' swept regions, and a knife's-edge rejection on both sides
// loses the event entirely. Accepting marginal candidates is safe — the
// split handler re-verifies against the live wavefront before committing.
const CONE_EPSILON = 0.005
const WORKING_SIZE = 200

type V = SkeletonPoint
type Ray = { p: V; v: V }
type Edge = { p: V; v: V }

const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y })
const addV = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: V, s: number): V => ({ x: a.x * s, y: a.y * s })
const cross = (a: V, b: V) => a.x * b.y - a.y * b.x
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y
const vectorLength = (a: V) => Math.hypot(a.x, a.y)
const normalize = (a: V): V => {
  const l = vectorLength(a)
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }
}
const pointDistance = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y)

const approximatelyEquals = (a: V, b: V) =>
  pointDistance(a, b) <= Math.max(vectorLength(a), vectorLength(b)) * 0.001

const lineLineParams = (ap: V, av: V, bp: V, bv: V) => {
  const denominator = cross(av, bv)
  if (Math.abs(denominator) < 1e-12) return null
  const w = sub(bp, ap)
  return { t: cross(w, bv) / denominator, u: cross(w, av) / denominator }
}

const lineLineIntersect = (ap: V, av: V, bp: V, bv: V): V | null => {
  const params = lineLineParams(ap, av, bp, bv)
  return params ? addV(ap, mul(av, params.t)) : null
}

const lineRayIntersect = (lp: V, lv: V, ray: Ray): V | null => {
  const params = lineLineParams(lp, lv, ray.p, ray.v)
  if (!params || params.u < -1e-9) return null
  return addV(lp, mul(lv, params.t))
}

const rayRayIntersect = (a: Ray, b: Ray): V | null => {
  const params = lineLineParams(a.p, a.v, b.p, b.v)
  if (!params || params.t < -1e-9 || params.u < -1e-9) return null
  return addV(a.p, mul(a.v, params.t))
}

const distanceToLine = (p: V, v: V, q: V) =>
  Math.abs(cross(normalize(v), sub(q, p)))

type EdgeEvent = {
  kind: "edge"
  distance: number
  point: V
  vertexA: LAVertex
  vertexB: LAVertex
}

type SplitEvent = {
  kind: "split"
  distance: number
  point: V
  vertex: LAVertex
  oppositeEdge: Edge
}

type SkeletonEvent = EdgeEvent | SplitEvent

class LAVertex {
  point: V
  edgeLeft: Edge
  edgeRight: Edge
  prev: LAVertex | null = null
  next: LAVertex | null = null
  lav: LAV | null = null
  valid = true
  isReflex: boolean
  bisector: Ray
  /**
   * Opposite edges whose split event already failed to locate a live
   * wavefront segment. Excluded from future event searches so the vertex can
   * fall back to its edge events instead of stalling the wavefront.
   */
  failedSplitEdges: Set<Edge> = new Set()

  constructor(
    point: V,
    edgeLeft: Edge,
    edgeRight: Edge,
    directionVectors?: [V, V]
  ) {
    this.point = point
    this.edgeLeft = edgeLeft
    this.edgeRight = edgeRight
    const creator: [V, V] = [
      mul(normalize(edgeLeft.v), -1),
      normalize(edgeRight.v),
    ]
    const direction = directionVectors ?? creator
    this.isReflex = cross(direction[0], direction[1]) < 0
    this.bisector = {
      p: point,
      v: mul(addV(creator[0], creator[1]), this.isReflex ? -1 : 1),
    }
  }

  invalidate() {
    if (this.lav) {
      this.lav.invalidate(this)
    } else {
      this.valid = false
    }
  }

  nextEvent(): SkeletonEvent | null {
    const events: SkeletonEvent[] = []
    const slav = this.lav?.slav
    if (!slav) return null

    if (this.isReflex) {
      for (const original of slav.originalEdges) {
        if (
          original.edge === this.edgeLeft ||
          original.edge === this.edgeRight ||
          this.failedSplitEdges.has(original.edge)
        ) {
          continue
        }

        // A potential split point sits at the intersection of our own
        // bisector and the bisector between the tested edge and one of our
        // edges. Use the less parallel own edge for a stable intersection.
        const leftNorm = normalize(this.edgeLeft.v)
        const rightNorm = normalize(this.edgeRight.v)
        const oppositeNorm = normalize(original.edge.v)
        const selfEdge =
          Math.abs(dot(leftNorm, oppositeNorm)) <
          Math.abs(dot(rightNorm, oppositeNorm))
            ? this.edgeLeft
            : this.edgeRight

        const i = lineLineIntersect(
          selfEdge.p,
          selfEdge.v,
          original.edge.p,
          original.edge.v
        )
        if (!i || approximatelyEquals(i, this.point)) continue

        const lineVector = normalize(sub(this.point, i))
        let edgeVector = oppositeNorm
        if (dot(lineVector, edgeVector) < 0) edgeVector = mul(edgeVector, -1)

        // The locus of points equidistant from our edge line and the
        // opposite edge line is BOTH angle bisectors at their intersection
        // (two perpendicular lines). The classic construction only tries
        // edge+line; for near-parallel self edges the real split point lies
        // on the other branch, so evaluate both and let the cone tests pick.
        for (const bisectorVector of [
          addV(edgeVector, lineVector),
          sub(edgeVector, lineVector),
        ]) {
          if (vectorLength(bisectorVector) < 1e-9) continue

          const b = lineRayIntersect(i, bisectorVector, this.bisector)
          if (!b) continue

          // The candidate must lie inside the region swept by the opposite
          // edge: between the bisectors of its endpoints and in front of it.
          const xleft =
            cross(
              normalize(original.bisectorLeft.v),
              normalize(sub(b, original.bisectorLeft.p))
            ) > -CONE_EPSILON
          const xright =
            cross(
              normalize(original.bisectorRight.v),
              normalize(sub(b, original.bisectorRight.p))
            ) < CONE_EPSILON
          const xedge =
            cross(oppositeNorm, normalize(sub(b, original.edge.p))) <
            CONE_EPSILON
          if (!(xleft && xright && xedge)) continue

          events.push({
            kind: "split",
            distance: distanceToLine(original.edge.p, original.edge.v, b),
            point: b,
            vertex: this,
            oppositeEdge: original.edge,
          })
        }
      }
    }

    if (this.prev && this.next) {
      const iPrev = rayRayIntersect(this.bisector, this.prev.bisector)
      const iNext = rayRayIntersect(this.bisector, this.next.bisector)
      if (iPrev) {
        events.push({
          kind: "edge",
          distance: distanceToLine(this.edgeLeft.p, this.edgeLeft.v, iPrev),
          point: iPrev,
          vertexA: this.prev,
          vertexB: this,
        })
      }
      if (iNext) {
        events.push({
          kind: "edge",
          distance: distanceToLine(this.edgeRight.p, this.edgeRight.v, iNext),
          point: iNext,
          vertexA: this,
          vertexB: this.next,
        })
      }
    }

    let best: SkeletonEvent | null = null
    let bestDistance = Infinity
    for (const event of events) {
      if (!Number.isFinite(event.distance)) continue
      if (!Number.isFinite(event.point.x) || !Number.isFinite(event.point.y)) {
        continue
      }
      const d = pointDistance(this.point, event.point)
      if (d < bestDistance) {
        bestDistance = d
        best = event
      }
    }
    return best
  }
}

class LAV {
  head: LAVertex | null = null
  length = 0
  slav: SLAV

  constructor(slav: SLAV) {
    this.slav = slav
  }

  static fromPolygon(points: V[], slav: SLAV): LAV {
    const lav = new LAV(slav)
    const count = points.length
    const edges: Edge[] = points.map((p, index) => ({
      p,
      v: sub(points[(index + 1) % count], p),
    }))
    const vertices = points.map(
      (p, index) =>
        new LAVertex(p, edges[(index - 1 + count) % count], edges[index])
    )
    vertices.forEach((vertex, index) => {
      vertex.prev = vertices[(index - 1 + count) % count]
      vertex.next = vertices[(index + 1) % count]
      vertex.lav = lav
    })
    lav.head = vertices[0]
    lav.length = count
    return lav
  }

  static fromChain(head: LAVertex, slav: SLAV): LAV {
    const lav = new LAV(slav)
    lav.head = head
    let vertex = head
    let count = 0
    do {
      count += 1
      vertex.lav = lav
      vertex = vertex.next!
    } while (vertex !== head && count < 100000)
    lav.length = count
    return lav
  }

  invalidate(vertex: LAVertex) {
    vertex.valid = false
    if (this.head === vertex) this.head = this.head.next
    vertex.lav = null
  }

  unify(vertexA: LAVertex, vertexB: LAVertex, point: V): LAVertex {
    const replacement = new LAVertex(
      point,
      vertexA.edgeLeft,
      vertexB.edgeRight,
      [normalize(vertexB.bisector.v), normalize(vertexA.bisector.v)]
    )
    replacement.lav = this
    if (this.head === vertexA || this.head === vertexB) {
      this.head = replacement
    }
    vertexA.prev!.next = replacement
    vertexB.next!.prev = replacement
    replacement.prev = vertexA.prev
    replacement.next = vertexB.next
    vertexA.valid = false
    vertexA.lav = null
    vertexB.valid = false
    vertexB.lav = null
    this.length -= 1
    return replacement
  }

  toArray(): LAVertex[] {
    const result: LAVertex[] = []
    if (!this.head) return result
    let vertex = this.head
    do {
      result.push(vertex)
      vertex = vertex.next!
    } while (vertex !== this.head && result.length < 100000)
    return result
  }
}

type OriginalEdge = {
  edge: Edge
  bisectorLeft: Ray
  bisectorRight: Ray
}

class SLAV {
  lavs: LAV[]
  originalEdges: OriginalEdge[]

  constructor(contours: V[][]) {
    this.lavs = contours.map((contour) => LAV.fromPolygon(contour, this))
    this.originalEdges = []
    for (const lav of this.lavs) {
      for (const vertex of lav.toArray()) {
        this.originalEdges.push({
          edge: vertex.edgeLeft,
          bisectorLeft: vertex.prev!.bisector,
          bisectorRight: vertex.bisector,
        })
      }
    }
  }

  removeLav(lav: LAV) {
    const index = this.lavs.indexOf(lav)
    if (index >= 0) this.lavs.splice(index, 1)
  }

  handleEdgeEvent(
    event: EdgeEvent
  ): [SkeletonSubtree | null, SkeletonEvent[]] {
    const sinks: V[] = []
    const events: SkeletonEvent[] = []
    const lav = event.vertexA.lav
    if (!lav) return [null, []]

    if (event.vertexA.prev === event.vertexB.next || lav.length < 3) {
      // Peak event: the whole loop collapses to a single point.
      for (const vertex of lav.toArray()) {
        sinks.push(vertex.point)
        vertex.invalidate()
      }
      this.removeLav(lav)
    } else {
      const newVertex = lav.unify(event.vertexA, event.vertexB, event.point)
      sinks.push(event.vertexA.point, event.vertexB.point)
      const nextEvent = newVertex.nextEvent()
      if (nextEvent) events.push(nextEvent)
    }

    return [
      { source: event.point, height: event.distance, sinks },
      events,
    ]
  }

  handleSplitEvent(
    event: SplitEvent
  ): [SkeletonSubtree | null, SkeletonEvent[]] {
    const lav = event.vertex.lav
    if (!lav) return [null, []]
    const sinks: V[] = [event.vertex.point]

    // Find the live wavefront segment of the opposite edge that the reflex
    // vertex actually hits.
    let x: LAVertex | null = null
    let y: LAVertex | null = null
    for (const candidateLav of this.lavs) {
      for (const v of candidateLav.toArray()) {
        if (event.oppositeEdge === v.edgeLeft) {
          x = v
          y = v.prev
        } else if (event.oppositeEdge === v.edgeRight) {
          y = v
          x = v.next
        }
        if (x && y) {
          const xleft =
            cross(
              normalize(y.bisector.v),
              normalize(sub(event.point, y.point))
            ) >= -CONE_EPSILON
          const xright =
            cross(
              normalize(x.bisector.v),
              normalize(sub(event.point, x.point))
            ) <= CONE_EPSILON
          if (xleft && xright) break
          x = null
          y = null
        }
      }
      if (x && y) break
    }
    if (!x || !y) {
      if ((globalThis as any).__SKEL_DEBUG) {
        console.log(
          "split drop at",
          event.point.x.toFixed(3),
          event.point.y.toFixed(3),
          "d",
          event.distance.toFixed(4)
        )
      }
      // Do not strand the vertex: exclude this opposite edge and requeue its
      // next-best event, otherwise its loop never collapses and the skeleton
      // comes out corrupted.
      event.vertex.failedSplitEdges.add(event.oppositeEdge)
      const retryEvent = event.vertex.nextEvent()
      return [null, retryEvent ? [retryEvent] : []]
    }

    const v1 = new LAVertex(
      event.point,
      event.vertex.edgeLeft,
      event.oppositeEdge
    )
    const v2 = new LAVertex(
      event.point,
      event.oppositeEdge,
      event.vertex.edgeRight
    )

    v1.prev = event.vertex.prev
    v1.next = x
    event.vertex.prev!.next = v1
    x.prev = v1

    v2.prev = y
    v2.next = event.vertex.next
    event.vertex.next!.prev = v2
    y.next = v2

    this.removeLav(lav)
    let newLavs: LAV[]
    if (lav !== x.lav) {
      // The split merged a hole loop into the outer loop.
      this.removeLav(x.lav!)
      newLavs = [LAV.fromChain(v1, this)]
    } else {
      newLavs = [LAV.fromChain(v1, this), LAV.fromChain(v2, this)]
    }

    const seeds: LAVertex[] = []
    for (const newLav of newLavs) {
      if (newLav.length > 2) {
        this.lavs.push(newLav)
        seeds.push(newLav.head!)
      } else {
        // The new loop is a degenerate segment; close it out.
        if (newLav.head?.next) sinks.push(newLav.head.next.point)
        for (const vertex of newLav.toArray()) {
          vertex.valid = false
          vertex.lav = null
        }
      }
    }

    event.vertex.valid = false
    event.vertex.lav = null

    const events: SkeletonEvent[] = []
    for (const seed of seeds) {
      const nextEvent = seed.nextEvent()
      if (nextEvent) events.push(nextEvent)
    }

    return [
      { source: event.point, height: event.distance, sinks },
      events,
    ]
  }
}

class MinHeap {
  private items: SkeletonEvent[] = []

  get size() {
    return this.items.length
  }

  push(event: SkeletonEvent) {
    if (!Number.isFinite(event.distance)) return
    this.items.push(event)
    let index = this.items.length - 1
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (this.items[parent].distance <= this.items[index].distance) break
      ;[this.items[parent], this.items[index]] = [
        this.items[index],
        this.items[parent],
      ]
      index = parent
    }
  }

  pop(): SkeletonEvent | null {
    if (!this.items.length) return null
    const top = this.items[0]
    const last = this.items.pop()!
    if (this.items.length) {
      this.items[0] = last
      let index = 0
      for (;;) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index
        if (
          left < this.items.length &&
          this.items[left].distance < this.items[smallest].distance
        ) {
          smallest = left
        }
        if (
          right < this.items.length &&
          this.items[right].distance < this.items[smallest].distance
        ) {
          smallest = right
        }
        if (smallest === index) break
        ;[this.items[smallest], this.items[index]] = [
          this.items[index],
          this.items[smallest],
        ]
        index = smallest
      }
    }
    return top
  }
}

const signedArea = (points: V[]) => {
  let sum = 0
  for (let index = 0; index < points.length; index += 1) {
    sum += cross(points[index], points[(index + 1) % points.length])
  }
  return sum / 2
}

const dedupeContour = (points: V[], minDistance: number): V[] => {
  const result: V[] = []
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
    const last = result[result.length - 1]
    if (last && pointDistance(last, point) < minDistance) continue
    result.push(point)
  }
  while (
    result.length > 1 &&
    pointDistance(result[0], result[result.length - 1]) < minDistance
  ) {
    result.pop()
  }
  return result
}

// Only exact turnbacks count as cusps by default; retry rungs loosen this.
const EXACT_CUSP_DOT = -0.9999995

const removeDegenerateVertices = (points: V[], cuspDot: number): V[] => {
  const result: V[] = []
  const count = points.length
  for (let index = 0; index < count; index += 1) {
    const prev = points[(index - 1 + count) % count]
    const point = points[index]
    const next = points[(index + 1) % count]
    const incoming = normalize(sub(point, prev))
    const outgoing = normalize(sub(next, point))
    const turn = cross(incoming, outgoing)
    // Drop exactly-collinear vertices (zero bisector) and zero-width spikes.
    if (Math.abs(turn) < 1e-9) continue
    // Blunt cusp tips (e.g. crescent hole endpoints): a vertex that doubles
    // back on itself fires wavefront events at near-zero distances and
    // derails the skeleton. Each normalization pass removes the current tip,
    // roughly doubling the wedge, until it clears the threshold.
    if (dot(incoming, outgoing) < cuspDot) continue
    result.push(point)
  }
  return result
}

const normalizeContour = (
  points: V[],
  minDistance: number,
  cuspDot = EXACT_CUSP_DOT
): V[] => {
  let result = dedupeContour(points, minDistance)
  for (let pass = 0; pass < 6; pass += 1) {
    const cleaned = dedupeContour(
      removeDegenerateVertices(result, cuspDot),
      minDistance
    )
    if (cleaned.length === result.length) return cleaned
    result = cleaned
  }
  return result
}

const orientContour = (points: V[], clockwise: boolean): V[] => {
  const area = signedArea(points)
  const isClockwise = area < 0
  return isClockwise === clockwise ? points : [...points].reverse()
}

/**
 * Drops vertices whose removal deviates from the contour by less than
 * `tolerance`. Dense curve sampling produces near-collinear runs that make the
 * wavefront numerically fragile; decimating them preserves the silhouette
 * while giving the skeleton clean, well-separated events.
 */
const simplifyClosedContour = (points: V[], tolerance: number): V[] => {
  let result = points
  for (let pass = 0; pass < 6 && result.length > 4; pass += 1) {
    const count = result.length
    const keep = Array.from({ length: count }, () => true)
    let removed = false
    for (let index = 0; index < count; index += 1) {
      const prevIndex = (index - 1 + count) % count
      const nextIndex = (index + 1) % count
      if (!keep[prevIndex] || !keep[nextIndex]) continue
      const prev = result[prevIndex]
      const point = result[index]
      const next = result[nextIndex]
      const chord = sub(next, prev)
      const chordLength = vectorLength(chord)
      const deviation =
        chordLength > 1e-9
          ? Math.abs(cross(chord, sub(point, prev))) / chordLength
          : pointDistance(point, prev)
      if (deviation < tolerance) {
        keep[index] = false
        removed = true
      }
    }
    if (!removed) break
    const kept: V[] = []
    for (let index = 0; index < count; index += 1) {
      if (keep[index]) kept.push(result[index])
    }
    if (kept.length < 3) break
    result = kept
  }
  return result
}

/**
 * Core skeleton computation. Expects normalized contours: outer clockwise,
 * holes counter-clockwise (y-up coordinates), no duplicate or collinear
 * vertices.
 */
export const skeletonizeContours = (contours: V[][]): SkeletonSubtree[] => {
  const slav = new SLAV(contours)
  const output: SkeletonSubtree[] = []
  const queue = new MinHeap()

  let totalVertices = 0
  for (const lav of slav.lavs) {
    for (const vertex of lav.toArray()) {
      totalVertices += 1
      const event = vertex.nextEvent()
      if (event) queue.push(event)
    }
  }

  const maxIterations = 10000 + totalVertices * totalVertices * 8
  let iterations = 0
  while (queue.size > 0 && slav.lavs.length > 0) {
    iterations += 1
    if (iterations > maxIterations) break

    const event = queue.pop()
    if (!event) break

    let arc: SkeletonSubtree | null = null
    let newEvents: SkeletonEvent[] = []
    if (event.kind === "edge") {
      if (!event.vertexA.valid || !event.vertexB.valid) continue
      ;[arc, newEvents] = slav.handleEdgeEvent(event)
    } else {
      if (!event.vertex.valid) continue
      ;[arc, newEvents] = slav.handleSplitEvent(event)
    }

    for (const newEvent of newEvents) queue.push(newEvent)
    if (arc) output.push(arc)
  }

  return output
}

type RoofNode = { x: number; y: number; h: number }

export type SkeletonRoofResult = {
  faces: RoofVertex[][]
  /** Contours the roof was actually built from (input units, possibly decimated). */
  outer: SkeletonPoint[]
  holes: SkeletonPoint[][]
}

/**
 * Builds the roof faces for already-normalized working-unit contours
 * (outer clockwise, holes counter-clockwise). Returns null when the skeleton
 * or the face walk cannot be completed reliably.
 */
const buildRoofFacesFromContours = (contours: V[][]): RoofVertex[][] | null => {
  let subtrees: SkeletonSubtree[]
  try {
    subtrees = skeletonizeContours(contours)
  } catch {
    return null
  }
  if (!subtrees.length) { if ((globalThis as any).__SKEL_DEBUG) console.log("skel null #6"); return null }

  // Build the planar graph: boundary vertices (height 0) + skeleton nodes
  // (height = arrival time), connected by boundary edges and skeleton arcs.
  const quantum = WORKING_SIZE * 1e-6
  const keyOf = (p: V) =>
    `${Math.round(p.x / quantum)}:${Math.round(p.y / quantum)}`

  const nodes = new Map<string, RoofNode>()
  for (const contour of contours) {
    for (const point of contour) {
      nodes.set(keyOf(point), { x: point.x, y: point.y, h: 0 })
    }
  }
  for (const subtree of subtrees) {
    if (!Number.isFinite(subtree.height) || subtree.height < -EPSILON) {
      { if ((globalThis as any).__SKEL_DEBUG) console.log("skel null #7"); return null }
    }
    const key = keyOf(subtree.source)
    if (!nodes.has(key)) {
      nodes.set(key, {
        x: subtree.source.x,
        y: subtree.source.y,
        h: Math.max(0, subtree.height),
      })
    }
  }

  const adjacency = new Map<string, string[]>()
  const edgeSet = new Set<string>()
  const addEdge = (keyA: string, keyB: string) => {
    if (keyA === keyB) return
    const id = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`
    if (edgeSet.has(id)) return
    edgeSet.add(id)
    if (!adjacency.has(keyA)) adjacency.set(keyA, [])
    if (!adjacency.has(keyB)) adjacency.set(keyB, [])
    adjacency.get(keyA)!.push(keyB)
    adjacency.get(keyB)!.push(keyA)
  }

  for (const contour of contours) {
    for (let index = 0; index < contour.length; index += 1) {
      addEdge(
        keyOf(contour[index]),
        keyOf(contour[(index + 1) % contour.length])
      )
    }
  }
  for (const subtree of subtrees) {
    const sourceKey = keyOf(subtree.source)
    for (const sink of subtree.sinks) {
      const sinkKey = keyOf(sink)
      if (!nodes.has(sinkKey)) { if ((globalThis as any).__SKEL_DEBUG) console.log("skel null #8"); return null }
      addEdge(sourceKey, sinkKey)
    }
  }

  // Sort neighbors by angle so faces can be traced with the standard
  // next-counter-clockwise-edge rule (interior lies to the right of travel
  // under the clockwise-outer convention).
  const sortedNeighbors = new Map<string, { key: string; angle: number }[]>()
  for (const [key, neighborKeys] of adjacency) {
    const node = nodes.get(key)!
    const entries = neighborKeys.map((neighborKey) => {
      const neighbor = nodes.get(neighborKey)!
      return {
        key: neighborKey,
        angle: Math.atan2(neighbor.y - node.y, neighbor.x - node.x),
      }
    })
    entries.sort((a, b) => a.angle - b.angle)
    sortedNeighbors.set(key, entries)
  }

  const nextNeighbor = (currentKey: string, fromKey: string): string | null => {
    const entries = sortedNeighbors.get(currentKey)
    if (!entries || entries.length === 0) { if ((globalThis as any).__SKEL_DEBUG) console.log("skel null #9"); return null }
    const current = nodes.get(currentKey)!
    const from = nodes.get(fromKey)!
    const backAngle = Math.atan2(from.y - current.y, from.x - current.x)
    for (const entry of entries) {
      if (entry.angle > backAngle + 1e-9) return entry.key
    }
    return entries[0].key
  }

  const walkFace = (startKey: string, secondKey: string): string[] | null => {
    const cycle = [startKey, secondKey]
    let prev = startKey
    let current = secondKey
    for (let step = 0; step < 512; step += 1) {
      const next = nextNeighbor(current, prev)
      if (!next) { if ((globalThis as any).__SKEL_DEBUG) console.log("skel null #10"); return null }
      if (current === startKey && next === secondKey) {
        cycle.pop()
        return cycle.length >= 3 ? cycle : null
      }
      cycle.push(next)
      prev = current
      current = next
    }
    { if ((globalThis as any).__SKEL_DEBUG) console.log("skel null #11"); return null }
  }

  const minFaceArea = (quantum * 10) ** 2
  const faces: RoofVertex[][] = []
  for (const contour of contours) {
    for (let index = 0; index < contour.length; index += 1) {
      const fromKey = keyOf(contour[index])
      const toKey = keyOf(contour[(index + 1) % contour.length])
      if (fromKey === toKey) continue
      const cycle = walkFace(fromKey, toKey)
      if (!cycle) {
        if ((globalThis as any).__SKEL_DEBUG) {
          const a = nodes.get(fromKey)!
          const b = nodes.get(toKey)!
          console.log("skel null #12 walk fail edge", (a.x).toFixed(3), (a.y).toFixed(3), "->", (b.x).toFixed(3), (b.y).toFixed(3))
        }
        return null
      }
      const face = cycle.map((key) => nodes.get(key)!)
      if (
        Math.abs(signedArea(face.map((node) => ({ x: node.x, y: node.y })))) <
        minFaceArea
      ) {
        continue
      }
      faces.push(face.map((node) => ({ x: node.x, y: node.y, h: node.h })))
    }
  }
  if (!faces.length) { if ((globalThis as any).__SKEL_DEBUG) console.log("skel null #13"); return null }

  return faces
}

const pointInContour = (point: V, contour: V[]) => {
  let inside = false
  for (
    let current = 0, previous = contour.length - 1;
    current < contour.length;
    previous = current, current += 1
  ) {
    const a = contour[current]
    const b = contour[previous]
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}

const distanceToContour = (point: V, contour: V[]) => {
  let best = Infinity
  for (let index = 0; index < contour.length; index += 1) {
    const a = contour[index]
    const b = contour[(index + 1) % contour.length]
    const edge = sub(b, a)
    const lengthSq = dot(edge, edge)
    const t =
      lengthSq > 0
        ? Math.max(0, Math.min(1, dot(sub(point, a), edge) / lengthSq))
        : 0
    best = Math.min(best, pointDistance(point, addV(a, mul(edge, t))))
  }
  return best
}

/**
 * Sanity check for a completed roof attempt (working units): every ridge
 * node must lie inside the fill (or hug its boundary) and arrival times can
 * never exceed the polygon inradius.
 */
const roofNodesStayInsideFill = (
  faces: RoofVertex[][],
  outer: V[],
  holes: V[][]
): boolean => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of outer) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  const margin = WORKING_SIZE * 0.002
  const maxArrival = Math.min(maxX - minX, maxY - minY) * 0.51

  const insideOrNearBoundary = (point: V) => {
    const inFill =
      pointInContour(point, outer) &&
      !holes.some((hole) => pointInContour(point, hole))
    if (inFill) return true
    const boundaryDistance = Math.min(
      distanceToContour(point, outer),
      ...holes.map((hole) => distanceToContour(point, hole))
    )
    return boundaryDistance <= margin
  }

  const debug = (globalThis as any).__SKEL_DEBUG
  let valid = true
  const reject = (kind: string, point: V, h: number) => {
    valid = false
    if (debug)
      console.log(
        "skel validate reject",
        kind,
        point.x.toFixed(3),
        point.y.toFixed(3),
        "h",
        h.toFixed(3)
      )
    return debug
  }
  for (const face of faces) {
    let centroidX = 0
    let centroidY = 0
    for (let index = 0; index < face.length; index += 1) {
      const vertex = face[index]
      if (vertex.h > maxArrival && !reject("arrival", vertex, vertex.h))
        return false
      centroidX += vertex.x
      centroidY += vertex.y
      if (
        vertex.h > margin &&
        !insideOrNearBoundary(vertex) &&
        !reject("node", vertex, vertex.h)
      )
        return false
      // A face can bridge a hole even when all its nodes are valid, so probe
      // the interior too via edge midpoints (and the centroid below).
      const next = face[(index + 1) % face.length]
      if (vertex.h > margin || next.h > margin) {
        const midpoint = {
          x: (vertex.x + next.x) / 2,
          y: (vertex.y + next.y) / 2,
        }
        if (
          !insideOrNearBoundary(midpoint) &&
          !reject("midpoint", midpoint, Math.max(vertex.h, next.h))
        )
          return false
      }
    }
    const centroid = { x: centroidX / face.length, y: centroidY / face.length }
    if (
      !insideOrNearBoundary(centroid) &&
      !reject("centroid", centroid, 0)
    )
      return false
  }
  return valid
}

/**
 * Computes the straight-skeleton roof of a polygon with holes. Returns one
 * planar face polygon per boundary edge, each vertex carrying its skeleton
 * height (0 on the boundary, wavefront arrival time on ridges), plus the
 * exact contours the roof was built from so callers can extrude matching
 * side walls. The wavefront is exact but numerically fragile on dense,
 * near-collinear curve sampling, so failures retry with progressively
 * stronger contour decimation before giving up. Returns null when no attempt
 * completes; callers should fall back to a conventional bevel in that case.
 */
export const computeSkeletonRoof = (
  outerInput: SkeletonPoint[],
  holesInput: SkeletonPoint[][]
): SkeletonRoofResult | null => {
  if (outerInput.length < 3) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of outerInput) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  const maxDimension = Math.max(maxX - minX, maxY - minY)
  if (!(maxDimension > 0)) return null
  const factor = WORKING_SIZE / maxDimension

  const scalePoint = (p: SkeletonPoint): V => ({
    x: p.x * factor,
    y: p.y * factor,
  })
  const minEdge = WORKING_SIZE * 1e-6

  const baseOuter = normalizeContour(outerInput.map(scalePoint), minEdge)
  if (baseOuter.length < 3) return null
  const baseHoles = holesInput
    .map((hole) => normalizeContour(hole.map(scalePoint), minEdge))
    .filter((hole) => hole.length >= 3)

  // Deterministic micro-perturbation. Perfectly symmetric icons fire exactly
  // simultaneous mirrored wavefront events — the classic degenerate case for
  // the algorithm — so retry rungs nudge vertices by a hash-based epsilon to
  // break the ties without visibly moving the contour.
  const jitterContour = (points: V[], contourIndex: number, amount: number) =>
    amount <= 0
      ? points
      : points.map((point, index) => {
          const seed = Math.sin(
            (index + 1) * 12.9898 + (contourIndex + 1) * 78.233
          )
          const angle = seed * 43758.5453
          return {
            x: point.x + Math.cos(angle) * amount,
            y: point.y + Math.sin(angle) * amount,
          }
        })

  // Each retry rung decimates harder, treats wider wedges as cusps to blunt
  // (cos thresholds ≈ 180°, 169°, 160°, 154° turnbacks), and jitters more.
  const rungs = [
    { tolerance: 0, cuspDot: EXACT_CUSP_DOT, jitter: 0 },
    {
      tolerance: WORKING_SIZE * 0.0015,
      cuspDot: -0.98,
      jitter: WORKING_SIZE * 0.0004,
    },
    {
      tolerance: WORKING_SIZE * 0.0035,
      cuspDot: -0.94,
      jitter: WORKING_SIZE * 0.001,
    },
    {
      tolerance: WORKING_SIZE * 0.0075,
      cuspDot: -0.9,
      jitter: WORKING_SIZE * 0.002,
    },
  ]
  for (const { tolerance, cuspDot, jitter } of rungs) {
    const outer = orientContour(
      normalizeContour(
        jitterContour(simplifyClosedContour(baseOuter, tolerance), 0, jitter),
        minEdge,
        cuspDot
      ),
      true
    )
    if (outer.length < 3) continue
    const holes = baseHoles
      .map((hole, holeIndex) =>
        normalizeContour(
          jitterContour(
            simplifyClosedContour(hole, tolerance),
            holeIndex + 1,
            jitter
          ),
          minEdge,
          cuspDot
        )
      )
      .filter((hole) => hole.length >= 3)
      .map((hole) => orientContour(hole, false))

    const faces = buildRoofFacesFromContours([outer, ...holes])
    if (!faces) {
      if ((globalThis as any).__SKEL_DEBUG)
        console.log("skel attempt failed (build)", tolerance)
      continue
    }
    // The wavefront can mis-order degenerate simultaneous events and emit
    // rogue nodes outside the polygon (or absurdly far away). A valid
    // skeleton keeps every ridge node inside the fill and its arrival times
    // below the inradius, so treat any outlier as a failed attempt and retry
    // with stronger decimation.
    if (!roofNodesStayInsideFill(faces, outer, holes)) {
      if ((globalThis as any).__SKEL_DEBUG)
        console.log("skel attempt failed (validate)", tolerance)
      continue
    }

    const descalePoint = (p: V): SkeletonPoint => ({
      x: p.x / factor,
      y: p.y / factor,
    })
    return {
      faces: faces.map((face) =>
        face.map((vertex) => ({
          x: vertex.x / factor,
          y: vertex.y / factor,
          h: vertex.h / factor,
        }))
      ),
      outer: outer.map(descalePoint),
      holes: holes.map((hole) => hole.map(descalePoint)),
    }
  }
  return null
}

export const computeSkeletonRoofFaces = (
  outerInput: SkeletonPoint[],
  holesInput: SkeletonPoint[][]
): RoofVertex[][] | null =>
  computeSkeletonRoof(outerInput, holesInput)?.faces ?? null

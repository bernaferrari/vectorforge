import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js"
import type * as THREE from "three"
import { normalizeSvgToIconViewBox } from "./SvgGeometry"

export type ParsedSvgPath = ReturnType<SVGLoader["parse"]>["paths"][number]

export type ParsedSvgShapes = {
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

export const parseSvgShapes = (svgContent: string) => {
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

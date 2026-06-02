import { describe, expect, it } from "vitest"
import { extractSvgLayers } from "./SvgLayerModel"

describe("SvgLayerModel", () => {
  it("extracts one layer for each SVG path", () => {
    const layers = extractSvgLayers(`
      <svg viewBox="0 0 24 24">
        <path id="outer" fill="#ff0000" d="M0 0h10v10H0z" />
        <path id="inner" fill="#00ff00" d="M12 0h10v10H12z" />
      </svg>
    `)

    expect(layers).toEqual([
      { id: "0:0", name: "outer", color: "#ff0000" },
      { id: "1:0", name: "inner", color: "#00ff00" },
    ])
  })

  it("splits disconnected subpaths into selectable layer targets", () => {
    const layers = extractSvgLayers(`
      <svg viewBox="0 0 24 24">
        <path data-name="Compound" d="M0 0h10v10H0z M12 0h10v10H12z" />
      </svg>
    `)

    expect(layers.map((layer) => layer.id)).toEqual(["0:0", "0:1"])
    expect(layers.map((layer) => layer.name)).toEqual([
      "Compound 1",
      "Compound 2",
    ])
  })

  it("returns the cached layer model for unchanged SVG content", () => {
    const svg = `<svg><path id="a" d="M0 0h10v10H0z" /></svg>`

    expect(extractSvgLayers(svg)).toBe(extractSvgLayers(svg))
  })
})

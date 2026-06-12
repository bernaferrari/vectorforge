export const extractSvgInner = (svgContent: string) =>
  svgContent
    .replace(/^<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim()

export const normalizeSvgToIconViewBox = (svgContent: string) => {
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i)
  if (!viewBoxMatch) return svgContent

  const [minX, minY, width, height] = viewBoxMatch[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (
    ![minX, minY, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return svgContent
  }

  if (minX === 0 && minY === 0 && width === 24 && height === 24) {
    return svgContent
  }

  const scaleX = 24 / width
  const scaleY = 24 / height
  const translateX = -minX * scaleX
  const translateY = -minY * scaleY

  return `<svg viewBox="0 0 24 24"><g transform="matrix(${scaleX} 0 0 ${scaleY} ${translateX} ${translateY})">${extractSvgInner(svgContent)}</g></svg>`
}

export const appendVectorForgeSlash = (svgContent: string) => {
  const normalized = normalizeSvgToIconViewBox(svgContent)
  return `<svg viewBox="0 0 24 24">${extractSvgInner(normalized)}<path data-vectorforge-slash="true" d="M1.98 3.92 2.92 1.98 21.92 20.98 21.08 22.02z"/></svg>`
}

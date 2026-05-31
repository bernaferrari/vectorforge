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
  return `<svg viewBox="0 0 24 24">${extractSvgInner(normalized)}<path data-vectorforge-slash="true" d="M2.25 3.79 2.79 3.25 20.79 21.25 20.25 21.79z"/></svg>`
}

export const RAIL_WIDTH = 140
export const EDGE_INSET = 12
export const SNAP_THRESHOLD_SECONDS = 0.08
export const PLAYHEAD_SNAP_THRESHOLD_SECONDS = 0.06
export const SECOND_SNAP_THRESHOLD_SECONDS = 0.035
export const TIMELINE_ZOOM_MIN = 1
export const TIMELINE_ZOOM_MAX = 3
export const TIMELINE_ZOOM_STEP = 0.25
export const TIMELINE_FRAME_RATE = 60
export const TIMELINE_EDGE_SCROLL_ZONE = 44
export const TIMELINE_EDGE_SCROLL_MAX = 14

export const xForFrac = (frac: number, offsetPx = 0) =>
  `calc(${EDGE_INSET}px + (100% - ${EDGE_INSET * 2}px) * ${frac}${offsetPx ? ` + ${offsetPx}px` : ""})`

export const widthForSpan = (span: number) =>
  `calc((100% - ${EDGE_INSET * 2}px) * ${span})`

export const formatTimelineTick = (time: number) => time.toFixed(2)

export const quantizeTimeToFrame = (time: number) =>
  Number(
    (Math.round(time * TIMELINE_FRAME_RATE) / TIMELINE_FRAME_RATE).toFixed(3)
  )

export const parseTimelineTimeInput = (value: string) => {
  const cleaned = value.trim().toLowerCase().replace(/s$/, "").replace(",", ".")
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":").map((part) => Number.parseFloat(part))
    if (parts.some((part) => !Number.isFinite(part))) return Number.NaN
    return parts.reduce((total, part) => total * 60 + part, 0)
  }
  return Number.parseFloat(cleaned)
}

export const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  )

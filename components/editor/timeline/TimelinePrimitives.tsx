import type { TimelineTrack } from "../TimelineModel"

export const formatValueLabel = (track: TimelineTrack, value: number) => {
  if (track.id === "transition") return `${Math.round(value * 100)}%`
  if (track.id === "rotation") return `${Math.round(value)}°`
  if (track.id === "scale") return `${value.toFixed(2)}x`
  if (track.id === "lighting") return value.toFixed(1)
  return value.toFixed(2)
}

export const TimelineDiamond = ({
  color,
  borderColor = "rgba(0,0,0,0.85)",
  selected = false,
  className = "",
}: {
  color: string
  borderColor?: string
  selected?: boolean
  className?: string
}) => (
  <svg viewBox="0 0 16 16" className={`size-4 ${className}`} aria-hidden="true">
    {selected && (
      <rect
        x="2.55"
        y="2.55"
        width="10.9"
        height="10.9"
        rx="1.05"
        fill="none"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="1.35"
        transform="rotate(45 8 8)"
        vectorEffect="non-scaling-stroke"
      />
    )}
    <rect
      x="3.35"
      y="3.35"
      width="9.3"
      height="9.3"
      rx="0.9"
      fill={color}
      stroke={selected ? "#ffffff" : borderColor}
      strokeWidth={selected ? "1.25" : "1"}
      transform="rotate(45 8 8)"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
)

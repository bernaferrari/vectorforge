"use client"

import { Diamond } from "lucide-react"

type TimelineRailKeyframeButtonProps = {
  color: string
  isKeyedAtPlayhead: boolean
  isAnimated?: boolean
  addLabel: string
  removeLabel: string
  onToggle: () => void
}

export function TimelineRailKeyframeButton({
  color,
  isKeyedAtPlayhead,
  isAnimated = true,
  addLabel,
  removeLabel,
  onToggle,
}: TimelineRailKeyframeButtonProps) {
  const label = isKeyedAtPlayhead ? removeLabel : addLabel

  return (
    <button
      type="button"
      aria-label={label}
      title={
        isKeyedAtPlayhead
          ? "Remove keyframe at playhead"
          : "Add keyframe at playhead"
      }
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors ${
        isKeyedAtPlayhead
          ? "text-foreground opacity-100"
          : isAnimated
            ? "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
            : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Diamond
        className="size-3"
        style={{
          fill: isKeyedAtPlayhead ? color : "transparent",
          color: isKeyedAtPlayhead ? color : undefined,
        }}
      />
    </button>
  )
}

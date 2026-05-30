"use client"

import React from "react"
import { EDGE_INSET, formatTimelineTick, xForFrac } from "./TimelineGeometry"

type TimelineTick = {
  time: number
  major: boolean
}

type TimelineRulerProps = {
  duration: number
  ticks: TimelineTick[]
  playheadX: string
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void
}

export const TimelineRuler = React.forwardRef<
  HTMLDivElement,
  TimelineRulerProps
>(({ duration, ticks, playheadX, onMouseDown, onContextMenu }, ref) => (
  <div
    ref={ref}
    onMouseDown={onMouseDown}
    onContextMenu={onContextMenu}
    className="sticky top-0 z-40 h-7 cursor-col-resize bg-background"
  >
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
      aria-hidden="true"
    />
    <div
      className="pointer-events-none absolute inset-y-0 left-0 bg-muted/70 dark:bg-muted/35"
      style={{ width: EDGE_INSET }}
      aria-hidden="true"
    />
    <div
      className="pointer-events-none absolute inset-y-0 right-0 bg-muted/70 dark:bg-muted/35"
      style={{ width: EDGE_INSET }}
      aria-hidden="true"
    />
    {ticks.map((tick) => {
      const isFinalTick = Math.abs(tick.time - duration) < 0.001
      return (
        <div
          key={`ruler-${tick.time}`}
          className="pointer-events-none absolute top-0 bottom-0"
          style={{ left: xForFrac(tick.time / duration) }}
        >
          {tick.time > 0 && (
            <div
              className={`absolute top-0 w-px ${
                tick.major ? "bottom-0 bg-border" : "h-2 bg-muted-foreground/25"
              }`}
            />
          )}
          {tick.major && !isFinalTick && (
            <span className="absolute top-[13px] pl-1 font-mono text-[9px] leading-none text-muted-foreground">
              {formatTimelineTick(tick.time)}
            </span>
          )}
        </div>
      )
    })}
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-10 w-px -translate-x-1/2 bg-red-500 dark:bg-red-400"
      style={{ left: playheadX }}
    >
      <div className="absolute top-1 left-1/2 z-20 h-4 w-4 -translate-x-1/2 rounded-[5px] border border-red-600/70 bg-red-500 shadow-[0_2px_6px_rgba(0,0,0,0.28)] dark:border-red-300/70 dark:bg-red-400" />
    </div>
  </div>
))

TimelineRuler.displayName = "TimelineRuler"

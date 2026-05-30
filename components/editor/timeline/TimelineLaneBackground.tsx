"use client"

import { EDGE_INSET, xForFrac } from "./TimelineGeometry"

export function TimelineLaneBackground({
  duration,
  secondGridTicks,
}: {
  duration: number
  secondGridTicks: number[]
}) {
  return (
    <>
      {secondGridTicks.map((time) => (
        <div
          key={`second-grid-${time}`}
          className="pointer-events-none absolute inset-y-0 w-px bg-border/70 dark:bg-muted/45"
          style={{ left: xForFrac(time / duration) }}
          aria-hidden="true"
        />
      ))}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] bg-muted/60 dark:bg-muted/25"
        style={{ width: EDGE_INSET }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] bg-muted/60 dark:bg-muted/25"
        style={{ width: EDGE_INSET }}
        aria-hidden="true"
      />
    </>
  )
}

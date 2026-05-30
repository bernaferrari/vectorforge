"use client"

import { Timeline } from "./Timeline"
import type { TimelineProps } from "./timeline/TimelineTypes"

type TimelineDockProps = {
  zenMode: boolean
  timelineProps: TimelineProps
}

export function TimelineDock({ zenMode, timelineProps }: TimelineDockProps) {
  return (
    <div
      className={`shrink-0 overflow-hidden transition-[height,background-color,border-color] duration-500 ease-in-out ${
        zenMode
          ? "h-0 border-t-0"
          : "h-[184px] border-t border-border bg-background"
      }`}
    >
      <Timeline {...timelineProps} />
    </div>
  )
}

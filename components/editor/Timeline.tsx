"use client"

import React from "react"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { TimelineGoToPopover } from "./timeline/TimelineGoToPopover"
import { TimelineLanesSurface } from "./timeline/TimelineLanesSurface"
import { TimelineLeftRailPanel } from "./timeline/TimelineLeftRailPanel"
import { TimelineContextMenu } from "./timeline/TimelineMenus"
import type { TimelineProps } from "./timeline/TimelineTypes"
import { useTimelineController } from "./timeline/useTimelineController"

export {
  applyEasing,
  DEFAULT_TRANSITION_END,
  DEFAULT_TRANSITION_START,
  interpolateFillKeyframes,
  interpolateKeyframes,
  type EasingType,
  type FillGradientType,
  type FillKeyframe,
  type FillStop,
  type Keyframe,
  type ShapeStop,
  type TimelinePropertyRow,
  type TimelineTrack,
} from "./TimelineModel"
export type {
  ShapeOption,
  TimelineProps,
  WipeDirectionOption,
} from "./timeline/TimelineTypes"

export const Timeline: React.FC<TimelineProps> = (props) => {
  const {
    contextMenu,
    setContextMenu,
    goToPopoverProps,
    leftRailProps,
    lanesSurfaceProps,
  } = useTimelineController(props)

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) setContextMenu(null)
      }}
    >
      <ContextMenuTrigger className="contents">
        <div className="flex h-full flex-col overflow-hidden bg-background font-sans select-none">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <TimelineLeftRailPanel {...leftRailProps} />
            <TimelineLanesSurface {...lanesSurfaceProps} />
          </div>
          <TimelineGoToPopover {...goToPopoverProps} />
        </div>
      </ContextMenuTrigger>
      <TimelineContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
      />
    </ContextMenu>
  )
}

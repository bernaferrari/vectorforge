"use client"

import React from "react"
import type { EasingType, ShapeStop } from "../TimelineModel"
import type { MorphWindow } from "./TimelineLayoutModel"
import type { WipeDirectionOption } from "./TimelineTypes"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import { TimelineMorphWindow } from "./TimelineMorphWindow"
import type { TransitionEdge } from "./TimelineTransitionModel"

type TimelineMorphWindowsProps = {
  duration: number
  morphWindows: MorphWindow[]
  openClipEditor: string | null
  wipeDirections: WipeDirectionOption[]
  onOpenClipEditorChange: (shapeId: string | null) => void
  onShapeBlendChange: (
    id: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => void
  onShapeEasingChange: (id: string, easing: EasingType) => void
  onMorphEdgeDrag: (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: TransitionEdge,
    fromTime: number,
    toTime: number
  ) => void
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => void
  createGoToMenuItem: (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ) => TimelineMenuItem
  shapeLabel: (stop: ShapeStop) => string
  timeFromClientX: (
    clientX: number,
    options?: { bypass?: boolean; clampToViewport?: boolean }
  ) => number
}

export function TimelineMorphWindows({
  duration,
  morphWindows,
  openClipEditor,
  wipeDirections,
  onOpenClipEditorChange,
  onShapeBlendChange,
  onShapeEasingChange,
  onMorphEdgeDrag,
  onOpenContextMenu,
  createGoToMenuItem,
  shapeLabel,
  timeFromClientX,
}: TimelineMorphWindowsProps) {
  return (
    <>
      {morphWindows.map((window) => (
        <TimelineMorphWindow
          key={`transition-${window.stop.id}`}
          duration={duration}
          window={window}
          openClipEditor={openClipEditor}
          wipeDirections={wipeDirections}
          onOpenClipEditorChange={onOpenClipEditorChange}
          onShapeBlendChange={onShapeBlendChange}
          onShapeEasingChange={onShapeEasingChange}
          onMorphEdgeDrag={onMorphEdgeDrag}
          onOpenContextMenu={onOpenContextMenu}
          createGoToMenuItem={createGoToMenuItem}
          shapeLabel={shapeLabel}
          timeFromClientX={timeFromClientX}
        />
      ))}
    </>
  )
}

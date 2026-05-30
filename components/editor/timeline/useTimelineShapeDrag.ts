"use client"

import { MutableRefObject, RefObject, useRef } from "react"
import {
  bindWindowPointerDrag,
  safelyReleasePointerCapture,
  safelySetPointerCapture,
} from "@/lib/drag-events"
import type { ShapeStop } from "../TimelineModel"
import type { SnapTimeOptions } from "./TimelineSnapping"
import { moveShapeStop, setShapeTransitionFraction } from "./TimelineShapeModel"
import type { SelectedTimelineKeyframe } from "./TimelineTypes"

type RawTimeFromClientX = (clientX: number) => number
type SnapTime = (rawTime: number, options?: SnapTimeOptions) => number

type TimelineShapeDragOptions = {
  duration: number
  shapes: ShapeStop[]
  laneRef: RefObject<HTMLDivElement | null>
  rawTimeFromClientX: RawTimeFromClientX
  snapTime: SnapTime
  onScrubStart?: () => void
  onSelectShape: (id: string) => void
  onShapesChange: (shapes: ShapeStop[]) => void
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
}

type ShapeRetimeOptions = {
  select?: boolean
}

export function useTimelineShapeDrag({
  duration,
  shapes,
  laneRef,
  rawTimeFromClientX,
  snapTime,
  onScrubStart,
  onSelectShape,
  onShapesChange,
  onSelectKeyframe,
}: TimelineShapeDragOptions) {
  const shapeDraggedRef = useRef(false)
  const morphResizedRef = useRef(false)

  const retimeShapeByDrag = (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string,
    draggedRef: MutableRefObject<boolean>,
    options: ShapeRetimeOptions = {}
  ) => {
    event.stopPropagation()
    event.preventDefault()
    if (!laneRef.current) return
    safelySetPointerCapture(event.currentTarget, event.pointerId)
    if (options.select) {
      onSelectShape(shapeId)
      onSelectKeyframe(null)
    }
    draggedRef.current = false
    const startX = event.clientX
    const startTime = shapes.find((shape) => shape.id === shapeId)?.time ?? 0
    const grabOffset = rawTimeFromClientX(event.clientX) - startTime
    bindWindowPointerDrag({
      onMove: (moveEvent) => {
        if (Math.abs(moveEvent.clientX - startX) > 3) {
          if (!draggedRef.current) onScrubStart?.()
          draggedRef.current = true
        }
        const snapped = snapTime(
          rawTimeFromClientX(moveEvent.clientX) - grabOffset,
          {
            bypass: moveEvent.altKey,
            excludeShapeId: shapeId,
            snapToPlayhead: true,
          }
        )
        onShapesChange(
          moveShapeStop({
            shapes,
            shapeId,
            time: snapped,
            duration,
          })
        )
      },
      onEnd: (endEvent) => {
        if (endEvent instanceof PointerEvent) {
          safelyReleasePointerCapture(event.currentTarget, endEvent.pointerId)
        }
      },
    })
  }

  const handleShapeDrag = (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string
  ) => retimeShapeByDrag(event, shapeId, shapeDraggedRef, { select: true })

  const handleMorphEdgeDrag = (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: "start" | "end",
    fromTime: number,
    toTime: number
  ) => {
    event.stopPropagation()
    event.preventDefault()
    if (!laneRef.current) return
    safelySetPointerCapture(event.currentTarget, event.pointerId)
    morphResizedRef.current = false
    const startX = event.clientX
    const gap = Math.max(1e-6, toTime - fromTime)
    bindWindowPointerDrag({
      onMove: (moveEvent) => {
        if (Math.abs(moveEvent.clientX - startX) > 3) {
          if (!morphResizedRef.current) onScrubStart?.()
          morphResizedRef.current = true
        }
        const fraction = Math.max(
          0,
          Math.min(1, (rawTimeFromClientX(moveEvent.clientX) - fromTime) / gap)
        )
        onShapesChange(
          setShapeTransitionFraction({
            shapes,
            shapeId,
            edge,
            fraction,
          })
        )
      },
      onEnd: (endEvent) => {
        if (endEvent instanceof PointerEvent) {
          safelyReleasePointerCapture(event.currentTarget, endEvent.pointerId)
        }
      },
    })
  }

  return {
    shapeDraggedRef,
    handleShapeDrag,
    handleMorphEdgeDrag,
  }
}

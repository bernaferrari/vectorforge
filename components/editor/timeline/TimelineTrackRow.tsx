"use client"

import React from "react"
import type { EasingType, TimelineTrack } from "../TimelineModel"
import { easingMenuItems } from "./TimelineEasingControls"
import { widthForSpan, xForFrac } from "./TimelineGeometry"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import { formatValueLabel } from "./TimelinePrimitives"
import { TimelineTrackKeyframeButton } from "./TimelineTrackKeyframeButton"
import type { SelectedTimelineKeyframe, TrackTimeEditor } from "./TimelineTypes"

export type TimelineTrackRowProps = {
  duration: number
  track: TimelineTrack
  isActive: boolean
  selectedKeyframe: SelectedTimelineKeyframe
  timeEditor: TrackTimeEditor | null
  keyframeDraggedRef: React.MutableRefObject<boolean>
  onSelectTrack: (trackId: string) => void
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
  onTimeEditorChange: React.Dispatch<
    React.SetStateAction<TrackTimeEditor | null>
  >
  onCommitTimeEditor: () => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
  onAddTrackKeyframeAtTime: (trackId: string, time: number) => void
  onRemoveTrackKeyframe: (trackId: string, keyframeId: string) => void
  onClearTrackKeyframes?: (trackId: string) => void
  onSetTrackEasing: (trackId: string, easing: EasingType) => void
  onSetSingleKeyframeEasing: (
    trackId: string,
    keyframeId: string,
    easing: EasingType
  ) => void
  onBlockDrag: (event: React.MouseEvent, trackId: string) => void
  onKeyframeDrag: (
    event: React.MouseEvent,
    trackId: string,
    keyframeId: string
  ) => void
  timeFromClientX: (
    clientX: number,
    options?: { bypass?: boolean; clampToViewport?: boolean }
  ) => number
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
}

export function TimelineTrackRow({
  duration,
  track,
  isActive,
  selectedKeyframe,
  timeEditor,
  keyframeDraggedRef,
  onSelectTrack,
  onSelectKeyframe,
  onTimeEditorChange,
  onCommitTimeEditor,
  onScrubStart,
  onTimeChange,
  onAddTrackKeyframeAtTime,
  onRemoveTrackKeyframe,
  onClearTrackKeyframes,
  onSetTrackEasing,
  onSetSingleKeyframeEasing,
  onBlockDrag,
  onKeyframeDrag,
  timeFromClientX,
  onOpenContextMenu,
  createGoToMenuItem,
}: TimelineTrackRowProps) {
  const animated = track.keyframes.length > 0
  const sortedKeyframes = [...track.keyframes].sort((a, b) => a.time - b.time)
  const firstKeyframe = sortedKeyframes[0]
  const lastKeyframe = sortedKeyframes[sortedKeyframes.length - 1]

  return (
    <div
      className={`relative h-9 border-b border-border transition-colors ${
        isActive ? "bg-muted/45" : "hover:bg-muted/35"
      }`}
      onMouseDown={(event) => {
        if (event.button !== 0) return
        onSelectKeyframe(null)
        onScrubStart?.()
        onSelectTrack(track.id)
        onTimeChange(timeFromClientX(event.clientX))
      }}
      onContextMenu={(event) => {
        const time = timeFromClientX(event.clientX, {
          bypass: event.altKey,
        })
        onOpenContextMenu(event, track.name, [
          {
            label: "Add keyframe",
            shortcut: `${time.toFixed(2)}s`,
            onSelect: () => onAddTrackKeyframeAtTime(track.id, time),
          },
          createGoToMenuItem(event, time, () => onSelectTrack(track.id)),
          ...(animated
            ? [
                ...easingMenuItems(
                  track.keyframes[0]?.easing ?? "ease-in-out",
                  (easing) => onSetTrackEasing(track.id, easing)
                ),
                { type: "separator" as const },
                {
                  label: "Clear keyframes",
                  danger: true,
                  onSelect: () => onClearTrackKeyframes?.(track.id),
                },
              ]
            : []),
        ])
      }}
      onDoubleClick={(event) => {
        event.preventDefault()
        onAddTrackKeyframeAtTime(track.id, timeFromClientX(event.clientX))
      }}
    >
      {animated &&
        firstKeyframe &&
        lastKeyframe &&
        lastKeyframe.time > firstKeyframe.time && (
          <div
            title="Drag to move - drag the diamonds to resize"
            className="absolute top-1/2 h-2 -translate-y-1/2 cursor-grab rounded-full opacity-55 transition-opacity hover:opacity-80 active:cursor-grabbing"
            style={{
              left: xForFrac(firstKeyframe.time / duration),
              width: widthForSpan(
                (lastKeyframe.time - firstKeyframe.time) / duration
              ),
              backgroundColor: track.color,
            }}
            onMouseDown={(event) => onBlockDrag(event, track.id)}
          />
        )}

      {!animated && (
        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
          <span className="rounded bg-background/95 px-1 text-[10px] text-muted-foreground">
            {formatValueLabel(track, track.defaultValue)} · constant
          </span>
        </div>
      )}

      {track.keyframes.map((keyframe) => (
        <TimelineTrackKeyframeButton
          key={keyframe.id}
          track={track}
          keyframe={keyframe}
          duration={duration}
          selectedKeyframe={selectedKeyframe}
          timeEditor={timeEditor}
          keyframeDraggedRef={keyframeDraggedRef}
          onSelectTrack={onSelectTrack}
          onSelectKeyframe={onSelectKeyframe}
          onTimeEditorChange={onTimeEditorChange}
          onCommitTimeEditor={onCommitTimeEditor}
          onTimeChange={onTimeChange}
          onRemoveTrackKeyframe={onRemoveTrackKeyframe}
          onSetSingleKeyframeEasing={onSetSingleKeyframeEasing}
          onKeyframeDrag={onKeyframeDrag}
          onOpenContextMenu={onOpenContextMenu}
          createGoToMenuItem={createGoToMenuItem}
        />
      ))}
    </div>
  )
}

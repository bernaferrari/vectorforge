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
  isRevealed: boolean
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
  isRevealed,
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
  const firstEasing = track.keyframes[0]?.easing

  return (
    <div
      className={`relative h-9 border-b border-border transition-colors ${
        isRevealed
          ? "bg-primary/10 ring-1 ring-primary/20 ring-inset"
          : isActive
            ? "bg-muted/45"
            : "hover:bg-muted/35"
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
      {animated && firstKeyframe && (
        <div
          className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 opacity-45"
          style={{ backgroundColor: track.color }}
        />
      )}

      {animated &&
        firstKeyframe &&
        lastKeyframe &&
        lastKeyframe.time > firstKeyframe.time && (
          <div
            title="Drag to move - drag the diamonds to resize"
            className="absolute top-1/2 h-2 -translate-y-1/2 cursor-grab rounded-full opacity-75 transition-opacity hover:opacity-95 active:cursor-grabbing"
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
        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center gap-1.5">
          <span className="rounded-md border border-border/55 bg-background/85 px-1.5 py-0.5 font-mono text-[10px] text-foreground tabular-nums">
            {formatValueLabel(track, track.defaultValue)}
          </span>
          <span className="rounded-md bg-muted/65 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            static
          </span>
        </div>
      )}

      {animated && (
        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center gap-1.5">
          <span
            className="size-2 rounded-full ring-1 ring-background/70"
            style={{ backgroundColor: track.color }}
          />
          {firstEasing ? (
            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {firstEasing}
            </span>
          ) : null}
        </div>
      )}

      {animated &&
        firstKeyframe &&
        lastKeyframe?.time === firstKeyframe.time && (
          <div
            className="absolute top-1/2 h-2 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45"
            style={{
              left: xForFrac(firstKeyframe.time / duration),
              backgroundColor: track.color,
            }}
          />
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

"use client"

import React from "react"
import type { EasingType, TimelineTrack } from "../TimelineModel"
import { TimelineTrackRow } from "./TimelineTrackRow"
import type { SelectedTimelineKeyframe, TrackTimeEditor } from "./TimelineTypes"
import type { TimelineMenuItem } from "./TimelineMenuModel"

type TimelineTrackRowsProps = {
  duration: number
  tracks: TimelineTrack[]
  revealedRowId: string | null
  activeTrackId?: string | null
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

export function TimelineTrackRows({
  duration,
  tracks,
  revealedRowId,
  activeTrackId,
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
}: TimelineTrackRowsProps) {
  return (
    <>
      {tracks.map((track) => (
        <TimelineTrackRow
          key={track.id}
          duration={duration}
          track={track}
          isRevealed={revealedRowId === `track:${track.id}`}
          isActive={activeTrackId === track.id}
          selectedKeyframe={selectedKeyframe}
          timeEditor={timeEditor}
          keyframeDraggedRef={keyframeDraggedRef}
          onSelectTrack={onSelectTrack}
          onSelectKeyframe={onSelectKeyframe}
          onTimeEditorChange={onTimeEditorChange}
          onCommitTimeEditor={onCommitTimeEditor}
          onScrubStart={onScrubStart}
          onTimeChange={onTimeChange}
          onAddTrackKeyframeAtTime={onAddTrackKeyframeAtTime}
          onRemoveTrackKeyframe={onRemoveTrackKeyframe}
          onClearTrackKeyframes={onClearTrackKeyframes}
          onSetTrackEasing={onSetTrackEasing}
          onSetSingleKeyframeEasing={onSetSingleKeyframeEasing}
          onBlockDrag={onBlockDrag}
          onKeyframeDrag={onKeyframeDrag}
          timeFromClientX={timeFromClientX}
          onOpenContextMenu={onOpenContextMenu}
          createGoToMenuItem={createGoToMenuItem}
        />
      ))}
    </>
  )
}

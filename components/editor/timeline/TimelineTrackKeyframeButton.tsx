"use client"

import React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { EasingType, TimelineTrack } from "../TimelineModel"
import type { SelectedTimelineKeyframe, TrackTimeEditor } from "./TimelineTypes"
import { easingMenuItems } from "./TimelineEasingControls"
import { xForFrac } from "./TimelineGeometry"
import { TIMELINE_LAYER } from "./TimelineLayering"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import { formatValueLabel, TimelineDiamond } from "./TimelinePrimitives"

type TimelineTrackKeyframeButtonProps = {
  track: TimelineTrack
  keyframe: TimelineTrack["keyframes"][number]
  duration: number
  selectedKeyframe: SelectedTimelineKeyframe
  timeEditor: TrackTimeEditor | null
  keyframeDraggedRef: React.MutableRefObject<boolean>
  onSelectTrack: (trackId: string) => void
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
  onTimeEditorChange: React.Dispatch<
    React.SetStateAction<TrackTimeEditor | null>
  >
  onCommitTimeEditor: () => void
  onTimeChange: (time: number) => void
  onRemoveTrackKeyframe: (trackId: string, keyframeId: string) => void
  onSetSingleKeyframeEasing: (
    trackId: string,
    keyframeId: string,
    easing: EasingType
  ) => void
  onKeyframeDrag: (
    event: React.MouseEvent,
    trackId: string,
    keyframeId: string
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
}

export function TimelineTrackKeyframeButton({
  track,
  keyframe,
  duration,
  selectedKeyframe,
  timeEditor,
  keyframeDraggedRef,
  onSelectTrack,
  onSelectKeyframe,
  onTimeEditorChange,
  onCommitTimeEditor,
  onTimeChange,
  onRemoveTrackKeyframe,
  onSetSingleKeyframeEasing,
  onKeyframeDrag,
  onOpenContextMenu,
  createGoToMenuItem,
}: TimelineTrackKeyframeButtonProps) {
  const selected =
    selectedKeyframe?.type === "track" &&
    selectedKeyframe.trackId === track.id &&
    selectedKeyframe.kfId === keyframe.id
  const editingTime =
    timeEditor?.trackId === track.id && timeEditor.kfId === keyframe.id
  const selection: SelectedTimelineKeyframe = {
    type: "track",
    trackId: track.id,
    kfId: keyframe.id,
  }

  const selectKeyframe = () => {
    onSelectTrack(track.id)
    onSelectKeyframe(selection)
    onTimeChange(keyframe.time)
  }

  return (
    <Popover
      open={editingTime}
      onOpenChange={(open) => {
        if (open) return
        if (editingTime) onCommitTimeEditor()
      }}
    >
      <PopoverTrigger
        type="button"
        title={`${track.name} · ${formatValueLabel(track, keyframe.value)} @ ${keyframe.time.toFixed(2)}s`}
        className={`absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center transition-transform hover:scale-110 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none active:cursor-grabbing ${selected ? "scale-110" : ""}`}
        style={{
          left: xForFrac(keyframe.time / duration),
          zIndex: selected
            ? TIMELINE_LAYER.selectedKeyframe
            : TIMELINE_LAYER.trackKeyframe,
        }}
        onMouseDown={(event) => {
          event.stopPropagation()
          selectKeyframe()
          if (event.button !== 0) return
          onKeyframeDrag(event, track.id, keyframe.id)
        }}
        onContextMenu={(event) => {
          event.stopPropagation()
          selectKeyframe()
          onOpenContextMenu(event, track.name, [
            {
              label: "Edit time",
              shortcut: `${keyframe.time.toFixed(2)}s`,
              onSelect: () =>
                onTimeEditorChange({
                  trackId: track.id,
                  kfId: keyframe.id,
                  draft: keyframe.time.toFixed(2),
                }),
            },
            createGoToMenuItem(event, keyframe.time, selectKeyframe),
            ...easingMenuItems(keyframe.easing, (easing) =>
              onSetSingleKeyframeEasing(track.id, keyframe.id, easing)
            ),
            { type: "separator" },
            {
              label: "Remove keyframe",
              danger: true,
              onSelect: () => onRemoveTrackKeyframe(track.id, keyframe.id),
            },
          ])
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (keyframeDraggedRef.current) {
            keyframeDraggedRef.current = false
            return
          }
          selectKeyframe()
          onTimeChange(keyframe.time)
        }}
      >
        <TimelineDiamond
          color={track.color}
          borderColor="rgba(0,0,0,0.85)"
          selected={selected}
        />
      </PopoverTrigger>
      {editingTime && timeEditor && (
        <PopoverContent
          side="top"
          align="center"
          sideOffset={8}
          className="w-32 border-border bg-popover p-2 text-popover-foreground"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <label className="mb-1 block text-left text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Time
          </label>
          <div className="flex h-8 items-center rounded-md bg-muted/70 ring-1 ring-border">
            <input
              autoFocus
              value={timeEditor.draft}
              onChange={(event) =>
                onTimeEditorChange((current) =>
                  current
                    ? {
                        ...current,
                        draft: event.target.value,
                      }
                    : current
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onCommitTimeEditor()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  onTimeEditorChange(null)
                }
              }}
              className="min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-[12px] text-foreground outline-none"
            />
            <span className="pr-2 text-[10px] text-muted-foreground">s</span>
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}

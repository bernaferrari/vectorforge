"use client"

import {
  MutableRefObject,
  type MouseEvent,
  RefObject,
  useRef,
  useState,
} from "react"
import { bindWindowMouseDrag } from "@/lib/drag-events"
import type { EasingType, TimelineTrack } from "../TimelineModel"
import { EDGE_INSET, quantizeTimeToFrame } from "./TimelineGeometry"
import {
  PLAYHEAD_SNAP_THRESHOLD_SECONDS,
  SNAP_THRESHOLD_SECONDS,
  type SnapTimeOptions,
} from "./TimelineSnapping"
import {
  addTrackKeyframeAtTime,
  clampTrackKeyframeBlockDelta,
  createTrackKeyframeBlockSnapTargets,
  moveTrackKeyframe,
  offsetTrackKeyframeBlock,
  removeTrackKeyframeById,
  setSingleKeyframeEasing as applySingleKeyframeEasing,
  setTrackEasing as applyTrackEasing,
  setTrackKeyframeTime as applyTrackKeyframeTime,
  snapTrackKeyframeBlockDelta,
  toggleTrackKeyframeAtTime,
} from "./TimelineKeyframeModel"
import type { SelectedTimelineKeyframe } from "./TimelineTypes"
import type { TrackTimeEditor } from "./TimelineTypes"

interface TimelineTrackKeyframesOptions {
  duration: number
  currentTime: number
  tracks: TimelineTrack[]
  snapEnabled: boolean
  frameSnapActive: boolean
  laneRef: RefObject<HTMLDivElement | null>
  setSelectedKeyframe: (keyframe: SelectedTimelineKeyframe) => void
  breakpointTimes: (options: SnapTimeOptions) => number[]
  snapTime: (rawTime: number, options?: SnapTimeOptions) => number
  onTracksChange: (tracks: TimelineTrack[]) => void
  onTimeChange: (time: number) => void
  onScrubStart?: () => void
  onActiveTrackChange?: (trackId: string) => void
}

export function useTimelineTrackKeyframes({
  duration,
  currentTime,
  tracks,
  snapEnabled,
  frameSnapActive,
  laneRef,
  setSelectedKeyframe,
  breakpointTimes,
  snapTime,
  onTracksChange,
  onTimeChange,
  onScrubStart,
  onActiveTrackChange,
}: TimelineTrackKeyframesOptions) {
  const [timeEditor, setTimeEditor] = useState<TrackTimeEditor | null>(null)
  const keyframeDraggedRef = useRef(false)

  const selectTrack = (trackId: string) => {
    onActiveTrackChange?.(trackId)
  }

  const toggleKeyframeAtPlayhead = (trackId: string) => {
    const t = quantizeTimeToFrame(currentTime)
    const { tracks: updated, selected } = toggleTrackKeyframeAtTime({
      tracks,
      trackId,
      time: t,
    })
    selectTrack(trackId)
    setSelectedKeyframe(selected)
    onTracksChange(updated)
  }

  const addTrackKeyframe = (trackId: string, time: number) => {
    const result = addTrackKeyframeAtTime({
      tracks,
      trackId,
      time,
      duration,
      frameSnapActive,
    })
    selectTrack(trackId)
    setSelectedKeyframe(result.selected)
    onTimeChange(result.time)
    onTracksChange(result.tracks)
  }

  const removeTrackKeyframe = (trackId: string, kfId: string) => {
    setSelectedKeyframe(null)
    onTracksChange(removeTrackKeyframeById(tracks, trackId, kfId))
  }

  const handleKeyframeDrag = (e: MouseEvent, trackId: string, kfId: string) => {
    e.stopPropagation()
    if (!laneRef.current) return
    onScrubStart?.()
    keyframeDraggedRef.current = false
    const rect = laneRef.current.getBoundingClientRect()
    const usable = Math.max(1, rect.width - EDGE_INSET * 2)
    const startX = e.clientX
    const startY = e.clientY
    bindWindowMouseDrag({
      onMove: (ev) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 3) {
          keyframeDraggedRef.current = true
        }
        const x = Math.max(
          0,
          Math.min(ev.clientX - rect.left - EDGE_INSET, usable)
        )
        const rawTime = (x / usable) * duration
        const newTime = Number(
          snapTime(rawTime, {
            bypass: ev.altKey,
            excludeKeyframe: { trackId, kfId },
            snapToPlayhead: true,
          }).toFixed(3)
        )
        onTimeChange(newTime)
        onTracksChange(
          moveTrackKeyframe({
            tracks,
            trackId,
            keyframeId: kfId,
            time: newTime,
          })
        )
      },
    })
  }

  const setTrackKeyframeTime = (
    trackId: string,
    kfId: string,
    time: number
  ) => {
    selectTrack(trackId)
    onTracksChange(
      applyTrackKeyframeTime({
        tracks,
        trackId,
        keyframeId: kfId,
        time,
        duration,
        frameSnapActive,
      })
    )
  }

  const commitTimeEditor = () => {
    if (!timeEditor) return
    const parsed = Number.parseFloat(timeEditor.draft)
    if (!Number.isFinite(parsed)) return
    setTrackKeyframeTime(timeEditor.trackId, timeEditor.kfId, parsed)
    setTimeEditor(null)
  }

  const handleBlockDrag = (e: MouseEvent, trackId: string) => {
    e.stopPropagation()
    if (!laneRef.current) return
    onScrubStart?.()
    selectTrack(trackId)
    const rect = laneRef.current.getBoundingClientRect()
    const usable = Math.max(1, rect.width - EDGE_INSET * 2)
    const startX = e.clientX
    const track = tracks.find((t) => t.id === trackId)
    if (!track || track.keyframes.length === 0) return
    const initial = track.keyframes.map((k) => ({ id: k.id, time: k.time }))

    bindWindowMouseDrag({
      onMove: (ev) => {
        let delta = clampTrackKeyframeBlockDelta({
          initial,
          delta: ((ev.clientX - startX) / usable) * duration,
          duration,
        })
        if (snapEnabled && !ev.altKey) {
          const playheadTime = frameSnapActive
            ? quantizeTimeToFrame(currentTime)
            : currentTime
          const targets = createTrackKeyframeBlockSnapTargets({
            breakpointTimes: breakpointTimes({ excludeTrackId: trackId }),
            playheadTime,
            duration,
            snapThreshold: SNAP_THRESHOLD_SECONDS,
            playheadSnapThreshold: PLAYHEAD_SNAP_THRESHOLD_SECONDS,
          })
          delta = snapTrackKeyframeBlockDelta({
            initial,
            delta,
            targets,
            duration,
          })
        }
        onTracksChange(
          offsetTrackKeyframeBlock({
            tracks,
            trackId,
            initial,
            delta,
            duration,
            frameSnapActive,
          })
        )
      },
    })
  }

  const setTrackEasing = (trackId: string, easing: EasingType) => {
    onTracksChange(applyTrackEasing(tracks, trackId, easing))
  }

  const setSingleKeyframeEasing = (
    trackId: string,
    kfId: string,
    easing: EasingType
  ) => {
    onTracksChange(applySingleKeyframeEasing(tracks, trackId, kfId, easing))
  }

  return {
    timeEditor,
    setTimeEditor,
    keyframeDraggedRef: keyframeDraggedRef as MutableRefObject<boolean>,
    selectTrack,
    toggleKeyframeAtPlayhead,
    addTrackKeyframe,
    removeTrackKeyframe,
    handleKeyframeDrag,
    handleBlockDrag,
    commitTimeEditor,
    setTrackEasing,
    setSingleKeyframeEasing,
  }
}

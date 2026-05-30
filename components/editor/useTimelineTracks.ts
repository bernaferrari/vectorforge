"use client"

import { useState } from "react"
import type { TimelineTrack } from "./TimelineModel"
import {
  createInitialTimelineTracks,
  timelineTrackById,
} from "./PropertyRegistry"

export function useTimelineTracks() {
  const [tracks, setTracks] = useState<TimelineTrack[]>(
    createInitialTimelineTracks
  )

  return {
    tracks,
    setTracks,
    extrusionTrack: timelineTrackById(tracks, "extrusion") ?? tracks[0],
    scaleTrack: timelineTrackById(tracks, "scale") ?? tracks[1],
    lightingTrack: timelineTrackById(tracks, "lighting") ?? tracks[2],
  }
}

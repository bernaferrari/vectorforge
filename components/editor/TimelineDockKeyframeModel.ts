import type { TimelineTrack } from "./TimelineModel"

export const clearTrackKeyframes = (tracks: TimelineTrack[], trackId: string) =>
  tracks.map((track) =>
    track.id === trackId ? { ...track, keyframes: [] } : track
  )

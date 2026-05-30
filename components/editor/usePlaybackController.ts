"use client"

import { MutableRefObject, useCallback, useEffect, useRef } from "react"
import { clampNumber, quantizeTimeToFrame } from "./EditorModel"

export const usePlaybackController = ({
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  duration,
  loop,
  isVideoExportPendingRef,
  stopVideoExportRecording,
}: {
  currentTime: number
  setCurrentTime: (updater: number | ((time: number) => number)) => void
  isPlaying: boolean
  setIsPlaying: (isPlaying: boolean) => void
  duration: number
  loop: boolean
  isVideoExportPendingRef: MutableRefObject<(() => void) | null>
  stopVideoExportRecording: () => void
}) => {
  const playheadRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)
  const playbackTimeRef = useRef(0)
  const currentTimeRef = useRef(0)

  useEffect(() => {
    currentTimeRef.current = currentTime
    if (!isPlaying) playbackTimeRef.current = currentTime
  }, [currentTime, isPlaying])

  useEffect(() => {
    if (!isPlaying) {
      if (playheadRef.current) {
        cancelAnimationFrame(playheadRef.current)
        playheadRef.current = null
      }
      playbackTimeRef.current = currentTimeRef.current
      return
    }

    playbackTimeRef.current = clampNumber(currentTimeRef.current, 0, duration)
    lastTimeRef.current = performance.now()

    const tick = () => {
      const now = performance.now()
      const delta = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      setCurrentTime((previousTime) => {
        let nextTime = playbackTimeRef.current + delta
        if (nextTime >= duration) {
          if (loop) {
            nextTime %= duration
          } else {
            nextTime = duration
            setIsPlaying(false)
            if (isVideoExportPendingRef.current) {
              window.requestAnimationFrame(stopVideoExportRecording)
            }
          }
        }

        playbackTimeRef.current = nextTime
        const quantized = quantizeTimeToFrame(nextTime)
        return quantized === previousTime ? previousTime : quantized
      })

      playheadRef.current = requestAnimationFrame(tick)
    }

    playheadRef.current = requestAnimationFrame(tick)

    return () => {
      if (playheadRef.current) {
        cancelAnimationFrame(playheadRef.current)
        playheadRef.current = null
      }
    }
  }, [
    duration,
    isPlaying,
    isVideoExportPendingRef,
    loop,
    setCurrentTime,
    setIsPlaying,
    stopVideoExportRecording,
  ])

  const stopPlayback = useCallback(() => {
    setIsPlaying(false)
  }, [setIsPlaying])

  const togglePlayback = useCallback(() => {
    if (!isPlaying && currentTime >= duration - 0.001) {
      setCurrentTime(0)
    }
    setIsPlaying(!isPlaying)
  }, [currentTime, duration, isPlaying, setCurrentTime, setIsPlaying])

  return {
    stopPlayback,
    togglePlayback,
  }
}

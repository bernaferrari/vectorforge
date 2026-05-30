"use client"

import { useRef, useState } from "react"
import type { SvgCanvasRef } from "../3d/SvgCanvas"
import { useAnimatedTimeSeek } from "./useAnimatedTimeSeek"
import { usePlaybackController } from "./usePlaybackController"
import { useVideoExport } from "./useVideoExport"

export function useEditorPlaybackState() {
  const [duration, setDuration] = useState<number>(5)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const [isPreviewModelReady, setIsPreviewModelReady] = useState(false)
  const canvas3DRef = useRef<SvgCanvasRef>(null)

  const {
    isVideoExportPendingRef,
    exportTimelineVideo,
    stopVideoExportRecording,
  } = useVideoExport({
    canvasRef: canvas3DRef,
    duration,
    setLoop,
    setIsPlaying,
    setCurrentTime,
  })

  const { stopPlayback, togglePlayback: togglePlaybackNow } =
    usePlaybackController({
      currentTime,
      setCurrentTime,
      isPlaying,
      setIsPlaying,
      duration,
      loop,
      isVideoExportPendingRef,
      stopVideoExportRecording,
    })

  const {
    animatedSeekEnabled,
    setAnimatedSeekEnabled,
    cancelAnimatedSeek,
    seekToTime,
  } = useAnimatedTimeSeek({
    currentTime,
    duration,
    setCurrentTime,
    stopPlayback,
  })

  const resetPlayback = () => {
    seekToTime(0)
  }

  const togglePlayback = () => {
    cancelAnimatedSeek()
    togglePlaybackNow()
  }

  return {
    canvas3DRef,
    duration,
    setDuration,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    loop,
    setLoop,
    isPreviewModelReady,
    setIsPreviewModelReady,
    exportTimelineVideo,
    stopPlayback,
    togglePlayback,
    resetPlayback,
    animatedSeekEnabled,
    setAnimatedSeekEnabled,
    cancelAnimatedSeek,
    seekToTime,
  }
}

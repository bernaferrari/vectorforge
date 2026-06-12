import { RefObject, useRef, useState } from "react"
import type { SvgCanvasRef } from "../3d/SvgCanvas"
import { quantizeTimeToFrame } from "./EditorModel"

const VIDEO_EXPORT_FRAME_RATE = 30
const VIDEO_EXPORT_TIMEOUT_BUFFER_MS = 5000

const downloadVideoBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "vectorforge-timeline.webm"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const useVideoExport = ({
  canvasRef,
  duration,
  setLoop,
  setIsPlaying,
  setCurrentTime,
}: {
  canvasRef: RefObject<SvgCanvasRef | null>
  duration: number
  setLoop: (loop: boolean) => void
  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
}) => {
  const resolveRef = useRef<(() => void) | null>(null)
  const rejectRef = useRef<((error: Error) => void) | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const activeExportIdRef = useRef(0)
  const recordingStartedRef = useRef(false)
  const [videoExportProgress, setVideoExportProgress] = useState(0)
  const [isVideoExporting, setIsVideoExporting] = useState(false)

  const clearExportTimeout = () => {
    if (timeoutRef.current === null) return
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }

  const clearExportFrame = () => {
    if (frameRef.current === null) return
    window.cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }

  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null
          resolve()
        })
      })
    })

  const finishVideoExport = (blob: Blob) => {
    activeExportIdRef.current += 1
    clearExportTimeout()
    clearExportFrame()
    setCurrentTime(duration)
    setVideoExportProgress(1)
    setIsVideoExporting(false)
    recordingStartedRef.current = false
    downloadVideoBlob(blob)
    resolveRef.current?.()
    resolveRef.current = null
    rejectRef.current = null
  }

  const failVideoExport = (error: unknown) => {
    activeExportIdRef.current += 1
    clearExportTimeout()
    clearExportFrame()
    setVideoExportProgress(0)
    setIsVideoExporting(false)
    recordingStartedRef.current = false
    rejectRef.current?.(
      error instanceof Error ? error : new Error("Video export failed.")
    )
    resolveRef.current = null
    rejectRef.current = null
  }

  const stopVideoExportRecording = () => {
    clearExportTimeout()
    clearExportFrame()
    if (!recordingStartedRef.current) {
      failVideoExport(new Error("Video export stopped before recording started."))
      return
    }
    try {
      canvasRef.current?.stopRecording(finishVideoExport)
    } catch (error) {
      failVideoExport(error)
    }
  }

  const exportTimelineVideo = () =>
    new Promise<void>((resolve, reject) => {
      if (!canvasRef.current) {
        reject(new Error("Canvas is not ready."))
        return
      }
      if (resolveRef.current) {
        reject(new Error("Video export is already running."))
        return
      }

      resolveRef.current = resolve
      rejectRef.current = reject
      setLoop(false)
      setIsPlaying(false)
      setCurrentTime(0)
      setVideoExportProgress(0)
      setIsVideoExporting(true)
      recordingStartedRef.current = false

      const exportId = activeExportIdRef.current + 1
      activeExportIdRef.current = exportId
      const frameCount = Math.max(
        1,
        Math.round(Math.max(0, duration) * VIDEO_EXPORT_FRAME_RATE)
      )
      const lastFrameIndex = Math.max(0, frameCount - 1)

      timeoutRef.current = window.setTimeout(
        () => failVideoExport(new Error("Video export timed out.")),
        Math.ceil((frameCount / VIDEO_EXPORT_FRAME_RATE) * 1000) * 4 +
          VIDEO_EXPORT_TIMEOUT_BUFFER_MS
      )

      const renderFrame = async (frameIndex: number) => {
        if (activeExportIdRef.current !== exportId) return

        const progress =
          lastFrameIndex === 0 ? 1 : frameIndex / Math.max(1, lastFrameIndex)
        const nextTime = quantizeTimeToFrame(duration * progress)
        setCurrentTime(nextTime)
        setVideoExportProgress(progress)

        await waitForPaint()
        if (activeExportIdRef.current !== exportId) return

        canvasRef.current?.requestRecordingFrame()

        if (frameIndex >= lastFrameIndex) {
          setCurrentTime(duration)
          setVideoExportProgress(1)
          frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null
            stopVideoExportRecording()
          })
          return
        }

        void renderFrame(frameIndex + 1).catch(failVideoExport)
      }

      void (async () => {
        try {
          await waitForPaint()
          if (activeExportIdRef.current !== exportId) return
          canvasRef.current?.startRecording({
            frameRate: VIDEO_EXPORT_FRAME_RATE,
            manualFrames: true,
          })
          recordingStartedRef.current = true
          setCurrentTime(0)
          setIsPlaying(false)
          await renderFrame(0)
        } catch (error) {
          failVideoExport(error)
        }
      })()
    })

  return {
    isVideoExportPendingRef: resolveRef,
    isVideoExporting,
    videoExportProgress,
    exportTimelineVideo,
    stopVideoExportRecording,
  }
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { clampNumber, quantizeTimeToFrame } from "./EditorModel"

const SEEK_DURATION_MS = 180

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export function useAnimatedTimeSeek({
  currentTime,
  duration,
  setCurrentTime,
  stopPlayback,
}: {
  currentTime: number
  duration: number
  setCurrentTime: (updater: number | ((time: number) => number)) => void
  stopPlayback: () => void
}) {
  const [animatedSeekEnabled, setAnimatedSeekEnabled] = useState(true)
  const animationRef = useRef<number | null>(null)
  const currentTimeRef = useRef(currentTime)

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const cancelAnimatedSeek = useCallback(() => {
    if (animationRef.current === null) return
    cancelAnimationFrame(animationRef.current)
    animationRef.current = null
  }, [])

  useEffect(() => cancelAnimatedSeek, [cancelAnimatedSeek])

  const seekToTime = useCallback(
    (time: number, options?: { animated?: boolean }) => {
      stopPlayback()
      cancelAnimatedSeek()

      const target = quantizeTimeToFrame(clampNumber(time, 0, duration))
      const start = currentTimeRef.current
      const shouldAnimate =
        (options?.animated ?? animatedSeekEnabled) &&
        !prefersReducedMotion() &&
        Math.abs(target - start) > 0.001

      if (!shouldAnimate) {
        currentTimeRef.current = target
        setCurrentTime(target)
        return
      }

      const startedAt = performance.now()
      const tick = (now: number) => {
        const progress = clampNumber((now - startedAt) / SEEK_DURATION_MS, 0, 1)
        const eased = easeInOutCubic(progress)
        const next = quantizeTimeToFrame(start + (target - start) * eased)
        currentTimeRef.current = next
        setCurrentTime(next)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(tick)
        } else {
          animationRef.current = null
          currentTimeRef.current = target
          setCurrentTime(target)
        }
      }

      animationRef.current = requestAnimationFrame(tick)
    },
    [
      animatedSeekEnabled,
      cancelAnimatedSeek,
      duration,
      setCurrentTime,
      stopPlayback,
    ]
  )

  return {
    animatedSeekEnabled,
    setAnimatedSeekEnabled,
    cancelAnimatedSeek,
    seekToTime,
  }
}

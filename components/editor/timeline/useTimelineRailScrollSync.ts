"use client"

import {
  useCallback,
  useLayoutEffect,
  type RefObject,
  type WheelEvent,
} from "react"

export function useTimelineRailScrollSync({
  leftRailBodyRef,
  timelineScrollRef,
}: {
  leftRailBodyRef: RefObject<HTMLDivElement | null>
  timelineScrollRef: RefObject<HTMLDivElement | null>
}) {
  const resetHiddenLeftRailScroll = useCallback(() => {
    const viewport = leftRailBodyRef.current?.parentElement
    if (viewport && viewport.scrollTop !== 0) viewport.scrollTop = 0
  }, [leftRailBodyRef])

  useLayoutEffect(() => {
    resetHiddenLeftRailScroll()
  }, [resetHiddenLeftRailScroll])

  const handleLeftRailWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const scroller = timelineScrollRef.current
      if (!scroller) return

      event.preventDefault()
      resetHiddenLeftRailScroll()
      scroller.scrollTop += event.deltaY
      scroller.scrollLeft += event.deltaX
    },
    [resetHiddenLeftRailScroll, timelineScrollRef]
  )

  const syncLeftRailScroll = useCallback(
    (scrollTop: number) => {
      if (!leftRailBodyRef.current) return
      resetHiddenLeftRailScroll()
      leftRailBodyRef.current.style.transform = `translateY(${-scrollTop}px)`
    },
    [leftRailBodyRef, resetHiddenLeftRailScroll]
  )

  return { handleLeftRailWheel, syncLeftRailScroll }
}

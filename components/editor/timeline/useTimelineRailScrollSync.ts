"use client"

import { useCallback, type RefObject, type WheelEvent } from "react"

export function useTimelineRailScrollSync({
  leftRailBodyRef,
  timelineScrollRef,
}: {
  leftRailBodyRef: RefObject<HTMLDivElement | null>
  timelineScrollRef: RefObject<HTMLDivElement | null>
}) {
  const handleLeftRailWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const scroller = timelineScrollRef.current
      if (!scroller) return

      event.preventDefault()
      scroller.scrollTop += event.deltaY
      scroller.scrollLeft += event.deltaX
    },
    [timelineScrollRef]
  )

  const syncLeftRailScroll = useCallback(
    (scrollTop: number) => {
      if (!leftRailBodyRef.current) return
      leftRailBodyRef.current.style.transform = `translateY(${-scrollTop}px)`
    },
    [leftRailBodyRef]
  )

  return { handleLeftRailWheel, syncLeftRailScroll }
}

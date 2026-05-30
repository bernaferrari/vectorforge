import { ChevronLeft, ChevronRight } from "lucide-react"
import { ReactNode } from "react"
import { TimeKeyframe, clampNumber } from "./EditorModel"

const keyframeNavButtonClass =
  "flex size-3.5 shrink-0 items-center justify-center rounded text-muted-foreground/45 transition-colors duration-100 hover:bg-muted/50 hover:text-foreground focus-visible:outline-none"

const getAdjacentKeyframeTimes = (
  keyframes: TimeKeyframe[],
  currentTime: number,
  duration: number
) => {
  const sortedTimes = Array.from(
    new Set(
      keyframes
        .map((keyframe) =>
          Number(clampNumber(keyframe.time, 0, duration).toFixed(2))
        )
        .filter(Number.isFinite)
    )
  ).sort((a, b) => a - b)

  let previous: number | undefined
  let next: number | undefined
  for (const time of sortedTimes) {
    if (time < currentTime - 0.04) {
      previous = time
    } else if (time > currentTime + 0.04) {
      next = time
      break
    }
  }

  return {
    previous,
    next,
  }
}

const PropertyKeyframeNavButton = ({
  direction,
  time,
  label,
  onJump,
}: {
  direction: "previous" | "next"
  time: number | undefined
  label: string
  onJump: (time: number) => void
}) => {
  const title =
    time !== undefined ? `${direction} ${label} keyframe` : undefined
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      aria-label={`${direction} ${label} keyframe`}
      title={title}
      disabled={time === undefined}
      onClick={(event) => {
        event.stopPropagation()
        if (time !== undefined) onJump(time)
      }}
      className={`${keyframeNavButtonClass} ${
        time === undefined ? "invisible" : "opacity-60 hover:opacity-100"
      }`}
    >
      <Icon className="size-2.5" />
    </button>
  )
}

export const KeyframeNavigator = ({
  keyframes,
  label,
  currentTime,
  duration,
  onJump,
  children,
}: {
  keyframes: TimeKeyframe[]
  label: string
  currentTime: number
  duration: number
  onJump: (time: number) => void
  children: ReactNode
}) => {
  const { previous, next } =
    keyframes.length === 0
      ? { previous: undefined, next: undefined }
      : getAdjacentKeyframeTimes(keyframes, currentTime, duration)

  return (
    <div className="-mr-2.5 flex w-[44px] shrink-0 items-center justify-end gap-0">
      <PropertyKeyframeNavButton
        direction="previous"
        time={previous}
        label={label}
        onJump={onJump}
      />
      {children}
      <PropertyKeyframeNavButton
        direction="next"
        time={next}
        label={label}
        onJump={onJump}
      />
    </div>
  )
}

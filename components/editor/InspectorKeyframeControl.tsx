"use client"

import { KeyframeNavigator } from "./KeyframeNavigator"
import type { TimeKeyframe } from "./EditorModel"

const KeyframeDiamond = ({
  active,
  color,
}: {
  active: boolean
  color: string
}) => (
  <span
    className={`size-[7px] rotate-45 rounded-[1px] border transition-[background-color,border-color] ${
      active ? "border-transparent" : "border-muted-foreground/40"
    }`}
    style={{ backgroundColor: active ? color : "transparent" }}
  />
)

const KeyframeButton = ({
  isKeyedHere,
  label,
  color,
  onToggle,
}: {
  isKeyedHere: boolean
  label: string
  color: string
  onToggle: () => void
}) => (
  <button
    type="button"
    aria-label={`${isKeyedHere ? "Remove" : "Add"} ${label} keyframe at current time`}
    title={`${isKeyedHere ? "Remove" : "Add"} ${label} keyframe`}
    onPointerDown={(event) => event.stopPropagation()}
    onMouseDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation()
      onToggle()
    }}
    className={`flex size-4 shrink-0 items-center justify-center rounded transition-colors duration-100 focus-visible:outline-none ${
      isKeyedHere ? "" : "hover:bg-muted/40"
    }`}
  >
    <KeyframeDiamond active={isKeyedHere} color={color} />
  </button>
)

export function InspectorKeyframeControl({
  keyframes,
  label,
  currentTime,
  duration,
  isKeyedHere,
  color,
  onToggle,
  onJump,
}: {
  keyframes: TimeKeyframe[]
  label: string
  currentTime: number
  duration: number
  isKeyedHere: boolean
  color: string
  onToggle: () => void
  onJump: (time: number) => void
}) {
  return (
    <KeyframeNavigator
      keyframes={keyframes}
      label={label}
      currentTime={currentTime}
      duration={duration}
      onJump={onJump}
    >
      <KeyframeButton
        isKeyedHere={isKeyedHere}
        label={label}
        color={color}
        onToggle={onToggle}
      />
    </KeyframeNavigator>
  )
}

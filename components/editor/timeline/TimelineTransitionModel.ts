import { ArrowRight, Blend, SquareSplitHorizontal } from "lucide-react"
import type { ShapeStop } from "../TimelineModel"

export type TransitionMode = "fade" | "wipe" | "none"
export type MorphEdge = "start" | "end"

export const transitionModeForShape = (stop: ShapeStop): TransitionMode => {
  if (stop.transitionType === "none") return "none"
  return stop.wipeDirection.x === 0 && stop.wipeDirection.y === 0
    ? "fade"
    : "wipe"
}

export const transitionIconForMode = (mode: TransitionMode) => {
  if (mode === "none") return SquareSplitHorizontal
  if (mode === "fade") return Blend
  return ArrowRight
}

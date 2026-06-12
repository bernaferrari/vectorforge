import { ArrowRight, Blend, SquareSplitHorizontal } from "lucide-react"
import { shapeTransitionType, type ShapeStop } from "../TimelineModel"

export type TransitionMode = "cut" | "fade" | "wipe"
export type TransitionEdge = "start" | "end"

export const transitionModeForShape = (stop: ShapeStop): TransitionMode =>
  shapeTransitionType(stop)

export const transitionIconForMode = (mode: TransitionMode) => {
  if (mode === "cut") return SquareSplitHorizontal
  if (mode === "fade") return Blend
  return ArrowRight
}

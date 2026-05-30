import type { MouseEvent } from "react"
import type {
  EasingType,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"
import { easingMenuItems } from "./TimelineEasingControls"
import { quantizeTimeToFrame } from "./TimelineGeometry"
import type { TimelineMenuItem } from "./TimelineMenuModel"

export type TimelineLeftRailMenuProps = {
  currentTime: number
  onOpenContextMenu: (
    event: MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => void
  createGoToMenuItem: (
    event: MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ) => TimelineMenuItem
}

export const isTrackKeyedAtPlayhead = (
  track: TimelineTrack,
  currentTime: number
) =>
  track.keyframes.some(
    (keyframe) =>
      Math.abs(keyframe.time - quantizeTimeToFrame(currentTime)) < 0.05
  )

export const propertyRowKeyframeAtPlayhead = (
  row: TimelinePropertyRow,
  currentTime: number
) =>
  row.keyframes.find(
    (keyframe) =>
      Math.abs(keyframe.time - quantizeTimeToFrame(currentTime)) < 0.05
  ) ?? null

export const createPropertyRailMenuItems = ({
  event,
  row,
  menu,
  onActivePropertyRowChange,
  onClearPropertyRow,
  onSetPropertyEasing,
}: {
  event: MouseEvent
  row: TimelinePropertyRow
  menu: TimelineLeftRailMenuProps
  onActivePropertyRowChange?: (rowId: string) => void
  onClearPropertyRow?: (rowId: string) => void
  onSetPropertyEasing?: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
}) => [
  menu.createGoToMenuItem(event, menu.currentTime, () =>
    onActivePropertyRowChange?.(row.id)
  ),
  { type: "separator" as const },
  {
    label: "Select property",
    onSelect: () => onActivePropertyRowChange?.(row.id),
  },
  ...(row.keyframes.length && onSetPropertyEasing
    ? easingMenuItems(row.keyframes[0]?.easing ?? "ease-in-out", (easing) =>
        onSetPropertyEasing(row.id, null, easing)
      )
    : []),
  { type: "separator" as const },
  {
    label: "Clear keyframes",
    danger: true,
    disabled: row.keyframes.length === 0,
    onSelect: () => onClearPropertyRow?.(row.id),
  },
]

export const createTrackRailMenuItems = ({
  event,
  track,
  menu,
  keyedAtPlayhead,
  onSelectTrack,
  onClearTrackKeyframes,
  onToggleTrackKeyframe,
  onSetTrackEasing,
}: {
  event: MouseEvent
  track: TimelineTrack
  menu: TimelineLeftRailMenuProps
  keyedAtPlayhead: boolean
  onSelectTrack: (trackId: string) => void
  onClearTrackKeyframes?: (trackId: string) => void
  onToggleTrackKeyframe: (trackId: string) => void
  onSetTrackEasing: (
    trackId: string,
    easing: TimelineTrack["keyframes"][number]["easing"]
  ) => void
}) => [
  menu.createGoToMenuItem(event, menu.currentTime, () =>
    onSelectTrack(track.id)
  ),
  { type: "separator" as const },
  {
    label: "Select property",
    onSelect: () => onSelectTrack(track.id),
  },
  {
    label: keyedAtPlayhead ? "Remove keyframe here" : "Add keyframe here",
    shortcut: menu.currentTime.toFixed(2),
    onSelect: () => onToggleTrackKeyframe(track.id),
  },
  ...(track.keyframes.length > 0
    ? [
        ...easingMenuItems(
          track.keyframes[0]?.easing ?? "ease-in-out",
          (easing) => onSetTrackEasing(track.id, easing)
        ),
        { type: "separator" as const },
        {
          label: "Clear keyframes",
          danger: true,
          onSelect: () => onClearTrackKeyframes?.(track.id),
        },
      ]
    : []),
]

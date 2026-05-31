import type React from "react"
import type { ShapeClipBounds, MorphWindow } from "./TimelineLayoutModel"
import type { TimelineMenuItem } from "./TimelineMenuModel"
import type {
  SelectedTimelineKeyframe,
  ShapeOption,
  TrackTimeEditor,
  WipeDirectionOption,
} from "./TimelineTypes"
import type { useShapePickerCatalog } from "./useShapePickerCatalog"
import type {
  EasingType,
  ShapeStop,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"

export type TimelineTimeFromClientX = (
  clientX: number,
  options?: { bypass?: boolean; clampToViewport?: boolean }
) => number

export type TimelineTick = {
  time: number
  major: boolean
}

export type TimelineViewportProps = {
  duration: number
  timelineZoom: number
  playheadX: string
  timelineTicks: TimelineTick[]
  secondGridTicks: number[]
  laneRef: React.RefObject<HTMLDivElement | null>
  timelineScrollRef: React.RefObject<HTMLDivElement | null>
  timeFromClientX: TimelineTimeFromClientX
  handleScrubStart: (event: React.MouseEvent<HTMLElement>) => void
  syncLeftRailScroll: (scrollTop: number) => void
  onAdjustTimelineZoom: (direction: number) => void
  onFitTimeline: () => void
}

export type TimelineShapeLaneProps = {
  shapes: ShapeStop[]
  sortedShapes: ShapeStop[]
  selectedShapeId: string | null
  openShapePicker: string | null
  openClipEditor: string | null
  wipeDirections: WipeDirectionOption[]
  morphWindows: MorphWindow[]
  clipBounds: ShapeClipBounds[]
  shapePicker: ReturnType<typeof useShapePickerCatalog>
  shapeDraggedRef: React.MutableRefObject<boolean>
  shapeLabel: (stop: ShapeStop) => string
  onClearSelectedKeyframe: () => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
  onOpenClipEditorChange: (shapeId: string | null) => void
  onShapeBlendChange: (
    id: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => void
  onShapeEasingChange: (id: string, easing: EasingType) => void
  onMorphEdgeDrag: (
    event: React.PointerEvent<HTMLElement>,
    shapeId: string,
    edge: "start" | "end",
    fromTime: number,
    toTime: number
  ) => void
  onSelectShape: (id: string) => void
  onOpenShapePicker: (id: string | null) => void
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onUploadShape: (id: string) => void
  onRemoveShape: (id: string) => void
  onShapeDrag: (event: React.PointerEvent<HTMLElement>, shapeId: string) => void
  onAddShape: () => void
}

export type TimelinePropertyLaneProps = {
  visiblePropertyRows: TimelinePropertyRow[]
  selectedKeyframe: SelectedTimelineKeyframe
  onActivePropertyRowChange?: (rowId: string) => void
  onRemovePropertyKeyframe?: (rowId: string, keyframeId: string) => void
  onMovePropertyKeyframe?: (
    rowId: string,
    keyframeId: string,
    time: number
  ) => void
  onSetPropertyEasing?: (
    rowId: string,
    keyframeId: string | null,
    easing: EasingType
  ) => void
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
}

export type TimelineTrackLaneProps = {
  tracks: TimelineTrack[]
  activeTrackId?: string | null
  selectedKeyframe: SelectedTimelineKeyframe
  timeEditor: TrackTimeEditor | null
  keyframeDraggedRef: React.MutableRefObject<boolean>
  onSelectTrack: (trackId: string) => void
  onSelectKeyframe: (keyframe: SelectedTimelineKeyframe) => void
  onTimeEditorChange: React.Dispatch<
    React.SetStateAction<TrackTimeEditor | null>
  >
  onCommitTimeEditor: () => void
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
  onAddTrackKeyframeAtTime: (trackId: string, time: number) => void
  onRemoveTrackKeyframe: (trackId: string, keyframeId: string) => void
  onClearTrackKeyframes?: (trackId: string) => void
  onSetTrackEasing: (trackId: string, easing: EasingType) => void
  onSetSingleKeyframeEasing: (
    trackId: string,
    keyframeId: string,
    easing: EasingType
  ) => void
  onBlockDrag: (event: React.MouseEvent, trackId: string) => void
  onKeyframeDrag: (
    event: React.MouseEvent,
    trackId: string,
    keyframeId: string
  ) => void
}

export type TimelineMenuActions = {
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => void
  createGoToMenuItem: (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ) => TimelineMenuItem
}

export type TimelineLanesSurfaceProps = {
  viewport: TimelineViewportProps
  shapeLane: TimelineShapeLaneProps
  propertyLane: TimelinePropertyLaneProps
  trackLane: TimelineTrackLaneProps
  menu: TimelineMenuActions
}

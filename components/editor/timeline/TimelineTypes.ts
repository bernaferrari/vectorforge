import type {
  EasingType,
  ShapeStop,
  TimelinePropertyRow,
  TimelineTrack,
} from "../TimelineModel"

export interface ShapeOption {
  id: string
  name: string
  svgContent: string
  defaultTint: string
  category?: string
  tags?: string[]
}

export interface WipeDirectionOption {
  label: string
  x: number
  y: number
  tooltip: string
}

export type TimelinePlaybackProps = {
  duration: number
  onDurationChange: (duration: number) => void
  currentTime: number
  onTimeChange: (time: number) => void
  onScrubStart?: () => void
  isPlaying?: boolean
  isPreviewLoading?: boolean
  loop: boolean
  onLoopChange: (loop: boolean) => void
}

export type TimelineTrackProps = {
  tracks: TimelineTrack[]
  onTracksChange: (tracks: TimelineTrack[]) => void
  propertyRows?: TimelinePropertyRow[]
  onClearTrackKeyframes?: (trackId: string) => void
  onClearPropertyRow?: (rowId: string) => void
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
  onActivePropertyRowChange?: (rowId: string) => void
  activeTrackId?: string | null
  onActiveTrackChange?: (trackId: string) => void
}

export type TimelineShapeProps = {
  shapes: ShapeStop[]
  selectedShapeId: string | null
  onSelectShape: (id: string) => void
  onShapesChange: (shapes: ShapeStop[]) => void
  onAddShape: () => void
  onRemoveShape: (id: string) => void
  onShapeEasingChange: (id: string, easing: EasingType) => void
  shapeOptions: ShapeOption[]
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onShapeWipePairChange: (
    id: string,
    enabled: ShapeOption,
    disabled: ShapeOption
  ) => void
  onUploadShape: (id: string) => void
  onShapeBlendChange: (
    id: string,
    patch: Partial<Pick<ShapeStop, "transitionType" | "wipeDirection">>
  ) => void
}

export type TimelineShapePickerProps = {
  openShapePicker: string | null
  onOpenShapePicker: (id: string | null) => void
  wipeDirections: WipeDirectionOption[]
}

export type TimelineProps = TimelinePlaybackProps &
  TimelineTrackProps &
  TimelineShapeProps &
  TimelineShapePickerProps

export type SelectedTimelineKeyframe =
  | { type: "track"; trackId: string; kfId: string }
  | { type: "property"; rowId: string; kfId: string }
  | null

export type TrackTimeEditor = {
  trackId: string
  kfId: string
  draft: string
}

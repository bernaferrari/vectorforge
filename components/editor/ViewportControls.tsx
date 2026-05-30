"use client"

import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ViewOptionsPopoverProps = {
  viewInertiaEnabled: boolean
  showCenterPoint: boolean
  showTransformGizmo: boolean
  animatedSeekEnabled: boolean
  onResetView: () => void
  onViewInertiaChange: (enabled: boolean) => void
  onShowCenterPointChange: (visible: boolean) => void
  onShowTransformGizmoChange: (visible: boolean) => void
  onAnimatedSeekChange: (enabled: boolean) => void
}

export function ViewOptionsPopover({
  viewInertiaEnabled,
  showCenterPoint,
  showTransformGizmo,
  animatedSeekEnabled,
  onResetView,
  onViewInertiaChange,
  onShowCenterPointChange,
  onShowTransformGizmoChange,
  onAnimatedSeekChange,
}: ViewOptionsPopoverProps) {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          aria-label="View options"
          title="View options"
          className="flex h-7 w-8 items-center justify-center rounded-lg border border-border bg-background/70 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <MoreHorizontal className="size-4" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="w-44 border-border bg-popover p-1.5 text-popover-foreground"
        >
          <button
            type="button"
            onClick={onResetView}
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <span className="text-[11px] text-foreground">Reset view</span>
          </button>
          <ViewportToggleRow
            label="Inertia"
            checked={viewInertiaEnabled}
            onCheckedChange={onViewInertiaChange}
          />
          <ViewportToggleRow
            label="Center point"
            checked={showCenterPoint}
            onCheckedChange={onShowCenterPointChange}
          />
          <ViewportToggleRow
            label="Transform gizmo"
            checked={showTransformGizmo}
            onCheckedChange={onShowTransformGizmoChange}
          />
          <ViewportToggleRow
            label="Animated seek"
            checked={animatedSeekEnabled}
            onCheckedChange={onAnimatedSeekChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface ViewportToggleRowProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function ViewportToggleRow({
  label,
  checked,
  onCheckedChange,
}: ViewportToggleRowProps) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <span className="text-[11px] text-foreground">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        onClick={(event) => event.stopPropagation()}
        size="sm"
      />
    </button>
  )
}

export type PlaybackControlsProps = {
  zenMode: boolean
  isPlaying: boolean
  playbackProgress: number
  atTimelineStart: boolean
  atTimelineEnd: boolean
  hasPreviousBreakpoint: boolean
  hasNextBreakpoint: boolean
  onReset: () => void
  onPreviousBreakpoint: () => void
  onPlayToggle: () => void
  onNextBreakpoint: () => void
  onGoToEnd: () => void
  onExitZenMode: () => void
}

export function PlaybackControls({
  zenMode,
  isPlaying,
  playbackProgress,
  atTimelineStart,
  atTimelineEnd,
  hasPreviousBreakpoint,
  hasNextBreakpoint,
  onReset,
  onPreviousBreakpoint,
  onPlayToggle,
  onNextBreakpoint,
  onGoToEnd,
  onExitZenMode,
}: PlaybackControlsProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/75 px-3 py-2 shadow-2xl backdrop-blur-xl transition-colors hover:border-border">
      <Button
        size="icon"
        variant="ghost"
        onClick={onReset}
        disabled={atTimelineStart}
        aria-label="Go to start"
        title="Go to start"
        className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <SkipBack size={14} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onPreviousBreakpoint}
        disabled={!hasPreviousBreakpoint}
        aria-label="Previous breakpoint"
        title="Previous breakpoint"
        className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </Button>
      <div className="relative grid size-11 place-items-center">
        {zenMode && (
          <svg
            className="pointer-events-none absolute inset-0 -rotate-90"
            viewBox="0 0 44 44"
            aria-hidden="true"
          >
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="var(--border)"
              strokeOpacity="0.5"
              strokeWidth="1.5"
            />
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={`${(playbackProgress * 125.66).toFixed(2)} 125.66`}
            />
          </svg>
        )}
        <Button
          size="icon"
          onClick={onPlayToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="size-10 rounded-full bg-foreground text-background hover:bg-foreground/85"
        >
          {isPlaying ? (
            <Pause size={16} className="fill-current" />
          ) : (
            <Play size={16} className="fill-current" />
          )}
        </Button>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onNextBreakpoint}
        disabled={!hasNextBreakpoint}
        aria-label="Next breakpoint"
        title="Next breakpoint"
        className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onGoToEnd}
        disabled={atTimelineEnd}
        aria-label="Go to end"
        title="Go to end"
        className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <SkipForward size={14} />
      </Button>
      {zenMode && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onExitZenMode}
          className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Exit
        </Button>
      )}
    </div>
  )
}

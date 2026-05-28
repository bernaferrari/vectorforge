"use client"

import { Magnet, RotateCw } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TimelineHeaderProps {
  currentTime: number
  duration: number
  durationEditor: string | null
  snapEnabled: boolean
  loop: boolean
  onDurationEditorChange: (value: string | null) => void
  onOpenDurationEditor: () => void
  onCommitDurationEditor: () => void
  onApplyDuration: (value: number) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onLoopChange: (enabled: boolean) => void
}

export function TimelineHeader({
  currentTime,
  duration,
  durationEditor,
  snapEnabled,
  loop,
  onDurationEditorChange,
  onOpenDurationEditor,
  onCommitDurationEditor,
  onApplyDuration,
  onSnapEnabledChange,
  onLoopChange,
}: TimelineHeaderProps) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-2 border-b border-border bg-background py-0 pr-1 pl-2 font-mono text-[10px] tabular-nums">
      <Popover
        open={durationEditor !== null}
        onOpenChange={(open) => {
          if (open) onOpenDurationEditor()
          else onCommitDurationEditor()
        }}
      >
        <PopoverTrigger
          title="Timeline duration"
          className="flex min-w-0 flex-1 items-center rounded px-1 text-left transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <span className="text-foreground">{currentTime.toFixed(2)}</span>
          <span className="px-1 text-muted-foreground">/</span>
          <span className="text-muted-foreground">{duration.toFixed(1)}s</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-52 border-border bg-popover p-3 text-popover-foreground shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Duration
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              0.5-30s
            </span>
          </div>
          <div className="flex h-9 items-center rounded-lg border border-border bg-muted/55 focus-within:border-ring/50">
            <input
              autoFocus
              value={durationEditor ?? duration.toFixed(1)}
              onChange={(event) =>
                onDurationEditorChange(event.currentTarget.value)
              }
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onCommitDurationEditor()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  onDurationEditorChange(null)
                }
              }}
              className="min-w-0 flex-1 bg-transparent px-2 text-right font-mono text-[13px] text-foreground outline-none"
            />
            <span className="pr-2 text-[11px] text-muted-foreground">s</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {[3, 5, 10].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onApplyDuration(value)}
                className="h-7 rounded-md text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                {value}s
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex shrink-0 items-center gap-1">
        <TimelineToggle
          active={snapEnabled}
          activeLabel="Disable timeline snapping"
          inactiveLabel="Enable timeline snapping"
          tooltip="Snap to keyframes"
          onClick={() => onSnapEnabledChange(!snapEnabled)}
        >
          <Magnet className="size-3" />
        </TimelineToggle>
        <TimelineToggle
          active={loop}
          activeLabel="Disable loop playback"
          inactiveLabel="Enable loop playback"
          tooltip="Loop playback"
          onClick={() => onLoopChange(!loop)}
        >
          <RotateCw className="size-3" />
        </TimelineToggle>
      </div>
    </div>
  )
}

interface TimelineToggleProps {
  active: boolean
  activeLabel: string
  inactiveLabel: string
  tooltip: string
  onClick: () => void
  children: React.ReactNode
}

function TimelineToggle({
  active,
  activeLabel,
  inactiveLabel,
  tooltip,
  onClick,
  children,
}: TimelineToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={active ? activeLabel : inactiveLabel}
        aria-pressed={active}
        onClick={onClick}
        className={`flex size-5 shrink-0 items-center justify-center rounded transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none ${
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

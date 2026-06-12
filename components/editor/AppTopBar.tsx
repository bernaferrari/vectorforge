"use client"

import {
  CircleDot,
  Download,
  FolderOpen,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppTopBarProps {
  zenMode: boolean
  themeMounted: boolean
  isLightTheme: boolean
  themeToggleLabel: string
  autoKeyEnabled: boolean
  onZenModeChange: (enabled: boolean) => void
  onThemeChange: (theme: "dark" | "light") => void
  onAutoKeyChange: (enabled: boolean) => void
  onProjectOpen: () => void
  onProjectSave: () => void
  onExportOpen: () => void
}

export function AppTopBar({
  zenMode,
  themeMounted,
  isLightTheme,
  themeToggleLabel,
  autoKeyEnabled,
  onZenModeChange,
  onThemeChange,
  onAutoKeyChange,
  onProjectOpen,
  onProjectSave,
  onExportOpen,
}: AppTopBarProps) {
  return (
    <div className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={zenMode ? "Show panels" : "Hide panels"}
          onClick={() => onZenModeChange(!zenMode)}
          className="size-9 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          {zenMode ? (
            <PanelLeftOpen className="mx-auto size-4" />
          ) : (
            <PanelLeftClose className="mx-auto size-4" />
          )}
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                VectorForge
              </span>
              <span className="hidden text-[10px] tracking-[0.18em] text-muted-foreground uppercase sm:inline">
                3D Motion Studio
              </span>
            </div>
          </div>
        </div>
      </div>

      <div />

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Open project"
          title="Open project"
          onClick={onProjectOpen}
          className="h-8 gap-1.5 rounded-lg border border-border bg-muted/50 px-2 text-xs font-medium"
        >
          <FolderOpen className="size-3.5" />
          <span className="hidden sm:inline">Open</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Save project"
          title="Save project"
          onClick={onProjectSave}
          className="h-8 gap-1.5 rounded-lg border border-border bg-muted/50 px-2 text-xs font-medium"
        >
          <Save className="size-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        <Button
          size="sm"
          variant={autoKeyEnabled ? "destructive" : "ghost"}
          aria-pressed={autoKeyEnabled}
          aria-label={autoKeyEnabled ? "Disable auto-key" : "Enable auto-key"}
          title={
            autoKeyEnabled
              ? "Auto-key is on: edits create keyframes at the playhead"
              : "Auto-key is off: edits stay static unless a keyframe is selected"
          }
          onClick={() => onAutoKeyChange(!autoKeyEnabled)}
          className="h-8 gap-1.5 rounded-lg border border-border bg-muted/50 px-2 text-xs font-medium"
        >
          <CircleDot className="size-3.5" />
          Auto-key
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
          onClick={() => {
            if (!themeMounted) return
            onThemeChange(isLightTheme ? "dark" : "light")
          }}
          className="size-8 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isLightTheme ? (
            <Moon className="size-3.5" />
          ) : (
            <Sun className="size-3.5" />
          )}
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-lg bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={onExportOpen}
        >
          <Download className="size-3.5" />
          Export
        </Button>
      </div>
    </div>
  )
}

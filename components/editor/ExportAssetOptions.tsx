"use client"

import { Box, Download, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

type ExportAssetOptionsProps = {
  isRecording: boolean
  onExportGltf: () => void
  onExportVideo: () => void
}

export function ExportAssetOptions({
  isRecording,
  onExportGltf,
  onExportVideo,
}: ExportAssetOptionsProps) {
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-muted/35">
      <div className="flex items-center gap-3 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
          <Box className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">3D model</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Export the current icon as a Filament-ready binary glTF asset.
          </p>
        </div>
        <Button
          variant="secondary"
          className="shrink-0 gap-1.5"
          onClick={onExportGltf}
        >
          <Download className="size-3.5" />
          GLB
        </Button>
      </div>

      <div className="flex items-center gap-3 p-3">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-md border ${
            isRecording
              ? "border-red-500/25 bg-red-500/10 text-red-500"
              : "border-border bg-background text-muted-foreground"
          }`}
        >
          <Video className={`size-4 ${isRecording ? "animate-pulse" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">Video</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Render the full timeline from 0s to the end as a WebM video.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={isRecording}
          onClick={onExportVideo}
          className="shrink-0 gap-1.5"
        >
          <Video className="size-3.5" />
          {isRecording ? "Rendering" : "WebM"}
        </Button>
      </div>
    </div>
  )
}

"use client"

import type { ComponentProps, RefObject } from "react"
import type { SvgCanvasRef } from "../3d/SvgCanvas"
import { AppTopBar } from "./AppTopBar"
import { ExportModal } from "./ExportModal"
import { InspectorSidebar } from "./InspectorSidebar"
import { TimelineDock } from "./TimelineDock"
import { ViewportStage } from "./ViewportStage"

type AppLayoutViewProps = {
  topBarProps: ComponentProps<typeof AppTopBar>
  viewportProps: Omit<ComponentProps<typeof ViewportStage>, "ref">
  inspectorProps: ComponentProps<typeof InspectorSidebar>
  timelineProps: ComponentProps<typeof TimelineDock>
  exportModalProps: ComponentProps<typeof ExportModal>
  uploadFileRef: RefObject<HTMLInputElement | null>
  canvas3DRef: RefObject<SvgCanvasRef | null>
  onUploadInputChange: ComponentProps<"input">["onChange"]
}

export function AppLayoutView({
  topBarProps,
  viewportProps,
  inspectorProps,
  timelineProps,
  exportModalProps,
  uploadFileRef,
  canvas3DRef,
  onUploadInputChange,
}: AppLayoutViewProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased select-none">
      <AppTopBar {...topBarProps} />

      <div className="flex min-h-0 flex-1 bg-muted/40">
        <ViewportStage ref={canvas3DRef} {...viewportProps} />
        <InspectorSidebar {...inspectorProps} />
      </div>

      <TimelineDock {...timelineProps} />

      <input
        ref={uploadFileRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={onUploadInputChange}
      />

      <ExportModal {...exportModalProps} />
    </div>
  )
}

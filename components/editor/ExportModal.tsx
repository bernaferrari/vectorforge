"use client"

import React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExportAssetOptions } from "./ExportAssetOptions"
import { ExportAndroidCodeTab, ExportReactCodeTab } from "./ExportCodeTabs"
import type { ExportSceneSnapshot } from "./ExportSceneSnapshot"
import { useExportModalController } from "./useExportModalController"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExportGltf: () => void
  onExportVideo: () => Promise<void>
  scene: ExportSceneSnapshot
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportGltf,
  onExportVideo,
  scene,
}) => {
  const {
    activeTab,
    androidFilamentCode,
    androidGradleCode,
    handleCopyCode,
    handleTabChange,
    handleVideoExport,
    isCopied,
    isRecording,
    r3fCode,
  } = useExportModalController({ scene, onExportVideo })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[calc(100vh-40px)] w-[640px] max-w-[calc(100vw-32px)] gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-[640px]">
        <DialogHeader className="border-b border-border px-4 py-3 pr-11">
          <DialogTitle className="text-sm font-semibold text-foreground">
            Export
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="min-h-0 min-w-0 gap-0"
        >
          <div className="border-b border-border px-4 py-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="options">Assets</TabsTrigger>
              <TabsTrigger value="r3f">React</TabsTrigger>
              <TabsTrigger value="android">Android</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 min-w-0 overflow-hidden bg-background">
            <TabsContent value="options" className="min-w-0 p-4 outline-none">
              <ExportAssetOptions
                isRecording={isRecording}
                onExportGltf={onExportGltf}
                onExportVideo={handleVideoExport}
              />
            </TabsContent>

            <TabsContent value="r3f" className="min-w-0 outline-none">
              <ExportReactCodeTab
                code={r3fCode}
                copied={isCopied}
                onCopy={handleCopyCode}
              />
            </TabsContent>

            <TabsContent value="android" className="min-w-0 outline-none">
              <ExportAndroidCodeTab
                gradleCode={androidGradleCode}
                filamentCode={androidFilamentCode}
                copied={isCopied}
                onCopy={handleCopyCode}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

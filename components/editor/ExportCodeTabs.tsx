"use client"

import { ExportCodeBlock } from "./ExportCodeBlock"
import { ExportCopyButton } from "./ExportCopyButton"

type ExportReactCodeTabProps = {
  code: string
  copied: boolean
  onCopy: (text: string) => void
}

export function ExportReactCodeTab({
  code,
  copied,
  onCopy,
}: ExportReactCodeTabProps) {
  return (
    <div className="relative min-w-0 p-4 outline-none">
      <div className="absolute top-6 right-6 z-10">
        <ExportCopyButton copied={copied} onCopy={() => onCopy(code)} />
      </div>
      <ExportCodeBlock code={code} lang="tsx" />
    </div>
  )
}

type ExportAndroidCodeTabProps = {
  gradleCode: string
  filamentCode: string
  copied: boolean
  onCopy: (text: string) => void
}

export function ExportAndroidCodeTab({
  gradleCode,
  filamentCode,
  copied,
  onCopy,
}: ExportAndroidCodeTabProps) {
  return (
    <div className="relative min-w-0 p-4 outline-none">
      <div className="absolute top-6 right-6 z-10">
        <ExportCopyButton
          copied={copied}
          onCopy={() => onCopy(`${gradleCode}\n\n${filamentCode}`)}
        />
      </div>
      <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Place the exported GLB at{" "}
        <span className="font-mono text-foreground">
          app/src/main/assets/exports/icon.glb
        </span>
        .
      </div>
      <div className="flex max-h-[52vh] min-w-0 flex-col gap-3 overflow-auto">
        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Gradle
          </div>
          <ExportCodeBlock
            code={gradleCode}
            lang="kotlin"
            className="max-h-none"
          />
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Kotlin
          </div>
          <ExportCodeBlock
            code={filamentCode}
            lang="kotlin"
            className="max-h-none"
          />
        </div>
      </div>
    </div>
  )
}

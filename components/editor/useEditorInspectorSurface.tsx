"use client"

import type { UseInspectorSidebarPropsArgs } from "./InspectorSidebarPropsModel"
import { useInspectorKeyframeControls } from "./useInspectorKeyframeControls"
import { useInspectorSidebarProps } from "./useInspectorSidebarProps"

type InspectorControlProps =
  | "renderKeyframeControl"
  | "styleKeyframeControl"
  | "transformKeyframeControl"
  | "lightPositionKeyframeControl"

type UseEditorInspectorSurfaceArgs = Parameters<
  typeof useInspectorKeyframeControls
>[0] &
  Omit<UseInspectorSidebarPropsArgs, InspectorControlProps>

export function useEditorInspectorSurface(args: UseEditorInspectorSurfaceArgs) {
  const {
    renderKeyframeControl,
    renderLightPositionKeyframeControl,
    renderStyleKeyframeControl,
    renderTransformKeyframeControl,
  } = useInspectorKeyframeControls(args)

  return useInspectorSidebarProps({
    ...args,
    renderKeyframeControl,
    styleKeyframeControl: renderStyleKeyframeControl(),
    transformKeyframeControl: renderTransformKeyframeControl(),
    lightPositionKeyframeControl: renderLightPositionKeyframeControl(),
  })
}

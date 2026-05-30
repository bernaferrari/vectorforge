"use client"

import {
  ForwardedRef,
  MutableRefObject,
  RefObject,
  useImperativeHandle,
} from "react"
import * as THREE from "three"
import { applySvgModelScale } from "./SvgSceneUtils"
import { exportFilamentGltf } from "./SvgExport"
import { animateSvgViewReset } from "./SvgViewReset"
import type { SvgCanvasLiveRenderProps } from "./useSvgCanvasLiveRefs"
import type { SvgCanvasProps, SvgCanvasRef } from "./SvgTypes"

type CanvasRecorder = {
  startRecording: (canvas: HTMLCanvasElement | null) => void
  stopRecording: (callback: (blob: Blob) => void) => void
}

type SvgCanvasImperativeHandleOptions = {
  ref: ForwardedRef<SvgCanvasRef>
  props: SvgCanvasProps
  canvasRef: RefObject<HTMLCanvasElement | null>
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>
  pivotGroupRef: MutableRefObject<THREE.Group | null>
  iconAGroupRef: MutableRefObject<THREE.Group | null>
  iconBGroupRef: MutableRefObject<THREE.Group | null>
  canvasRecorder: CanvasRecorder
  resetViewFrameRef: MutableRefObject<number | null>
  viewNudgeFrameRef: MutableRefObject<number | null>
  isInertiaActiveRef: MutableRefObject<boolean>
  rotationVelocityRef: MutableRefObject<{ x: number; y: number }>
  liveRenderPropsRef: MutableRefObject<SvgCanvasLiveRenderProps>
  currentZoomRef: MutableRefObject<number>
  targetZoomRef: MutableRefObject<number>
  animationStartRef: MutableRefObject<number>
  onViewRotationSet: SvgCanvasProps["onViewRotationSet"]
}

export function useSvgCanvasImperativeHandle({
  ref,
  props,
  canvasRef,
  rendererRef,
  pivotGroupRef,
  iconAGroupRef,
  iconBGroupRef,
  canvasRecorder,
  resetViewFrameRef,
  viewNudgeFrameRef,
  isInertiaActiveRef,
  rotationVelocityRef,
  liveRenderPropsRef,
  currentZoomRef,
  targetZoomRef,
  animationStartRef,
  onViewRotationSet,
}: SvgCanvasImperativeHandleOptions) {
  useImperativeHandle(ref, () => ({
    exportGltf() {
      if (!pivotGroupRef.current) return
      exportFilamentGltf({
        pivotGroup: pivotGroupRef.current,
        props,
        sourceGroups: [iconAGroupRef.current, iconBGroupRef.current],
        applyModelScale: applySvgModelScale,
      })
    },

    startRecording() {
      if (!rendererRef.current) return
      canvasRecorder.startRecording(canvasRef.current)
    },

    stopRecording(callback: (blob: Blob) => void) {
      canvasRecorder.stopRecording(callback)
    },

    resetRotation() {
      animateSvgViewReset({
        resetViewFrameRef,
        viewNudgeFrameRef,
        isInertiaActiveRef,
        rotationVelocityRef,
        liveRotation: liveRenderPropsRef.current.rotationOffset,
        currentZoomRef,
        targetZoomRef,
        animationStartRef,
        onZoomChange: props.onZoomChange,
        onViewRotationSet,
      })
    },
  }))
}

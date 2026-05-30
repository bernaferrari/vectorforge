"use client"

import { useRef } from "react"
import { useLatestRef } from "@/lib/use-latest-ref"
import type { SvgCanvasProps } from "./SvgTypes"

export type SvgCanvasLiveRenderProps = {
  transitionType: SvgCanvasProps["transitionType"]
  transitionProgress: number
  wipeDirection: SvgCanvasProps["wipeDirection"]
  rotationOffset: SvgCanvasProps["rotationOffset"]
  innerElementScale: SvgCanvasProps["innerElementScale"]
  objectScale: number
  objectScaleAxes: NonNullable<SvgCanvasProps["objectScaleAxes"]>
  moveOffset: SvgCanvasProps["moveOffset"]
  showCenterPoint: SvgCanvasProps["showCenterPoint"]
  showTransformGizmo: SvgCanvasProps["showTransformGizmo"]
  selectedLayerId: SvgCanvasProps["selectedLayerId"]
  isPlaying: boolean
  keyLightIntensity: number
}

const getLiveRenderProps = (
  props: SvgCanvasProps
): SvgCanvasLiveRenderProps => ({
  transitionType: props.transitionType,
  transitionProgress: props.transitionProgress,
  wipeDirection: props.wipeDirection,
  rotationOffset: props.rotationOffset,
  innerElementScale: props.innerElementScale,
  objectScale: props.objectScale,
  objectScaleAxes: props.objectScaleAxes ?? { x: 1, y: 1, z: 1 },
  moveOffset: props.moveOffset,
  showCenterPoint: props.showCenterPoint,
  showTransformGizmo: props.showTransformGizmo,
  selectedLayerId: props.selectedLayerId,
  isPlaying: props.isPlaying,
  keyLightIntensity: props.keyLightIntensity,
})

export function useSvgCanvasLiveRefs(props: SvgCanvasProps) {
  const onViewRotationCommitRef = useLatestRef(props.onViewRotationCommit)
  const onViewRotationSetRef = useLatestRef(props.onViewRotationSet)
  const onObjectScaleChangeRef = useLatestRef(props.onObjectScaleChange)
  const onObjectScaleAxisChangeRef = useLatestRef(props.onObjectScaleAxisChange)
  const onMoveOffsetChangeRef = useLatestRef(props.onMoveOffsetChange)
  const onRotationAxisChangeRef = useLatestRef(props.onRotationAxisChange)
  const liveRenderPropsRef = useRef(getLiveRenderProps(props))
  const viewInertiaEnabledRef = useRef(props.viewInertiaEnabled ?? true)

  liveRenderPropsRef.current = getLiveRenderProps(props)
  viewInertiaEnabledRef.current = props.viewInertiaEnabled ?? true

  return {
    liveRenderPropsRef,
    viewInertiaEnabledRef,
    onViewRotationCommitRef,
    onViewRotationSetRef,
    onObjectScaleChangeRef,
    onObjectScaleAxisChangeRef,
    onMoveOffsetChangeRef,
    onRotationAxisChangeRef,
  }
}

"use client"

import { useRef } from "react"
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
  const onViewRotationCommitRef = useRef(props.onViewRotationCommit)
  const onViewRotationSetRef = useRef(props.onViewRotationSet)
  const onObjectScaleChangeRef = useRef(props.onObjectScaleChange)
  const onObjectScaleAxisChangeRef = useRef(props.onObjectScaleAxisChange)
  const onMoveOffsetChangeRef = useRef(props.onMoveOffsetChange)
  const onRotationAxisChangeRef = useRef(props.onRotationAxisChange)
  const liveRenderPropsRef = useRef(getLiveRenderProps(props))
  const viewInertiaEnabledRef = useRef(props.viewInertiaEnabled ?? true)

  liveRenderPropsRef.current = getLiveRenderProps(props)
  onViewRotationCommitRef.current = props.onViewRotationCommit
  onViewRotationSetRef.current = props.onViewRotationSet
  onObjectScaleChangeRef.current = props.onObjectScaleChange
  onObjectScaleAxisChangeRef.current = props.onObjectScaleAxisChange
  onMoveOffsetChangeRef.current = props.onMoveOffsetChange
  onRotationAxisChangeRef.current = props.onRotationAxisChange
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

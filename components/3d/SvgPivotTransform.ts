import * as THREE from "three"
import type { SvgCanvasLiveRenderProps } from "./useSvgCanvasLiveRefs"
import { applyInnerElementScale, finiteNumber } from "./SvgGeometry"

export const svgDisplayRotationFromDegrees = (
  rotationOffset: SvgCanvasLiveRenderProps["rotationOffset"]
) => ({
  x: THREE.MathUtils.degToRad(rotationOffset.x),
  y: THREE.MathUtils.degToRad(rotationOffset.y),
  z: THREE.MathUtils.degToRad(rotationOffset.z),
})

export const applySvgPivotTransform = ({
  pivot,
  iconA,
  iconB,
  liveProps,
  displayRotation,
}: {
  pivot: THREE.Group
  iconA: THREE.Group | null
  iconB: THREE.Group | null
  liveProps: SvgCanvasLiveRenderProps
  displayRotation: { x: number; y: number; z: number }
}) => {
  if (iconA) applyInnerElementScale(iconA, liveProps.innerElementScale)
  if (iconB) applyInnerElementScale(iconB, liveProps.innerElementScale)

  pivot.rotation.x = displayRotation.x
  pivot.rotation.y = displayRotation.y
  pivot.rotation.z = displayRotation.z

  const baseScale = Math.max(0.05, finiteNumber(liveProps.objectScale, 1))
  const axisScale = liveProps.objectScaleAxes
  pivot.scale.set(
    baseScale * finiteNumber(axisScale.x, 1),
    baseScale * finiteNumber(axisScale.y, 1),
    baseScale * finiteNumber(axisScale.z, 1)
  )
  pivot.position.set(
    finiteNumber(liveProps.moveOffset.x, 0) * 0.02,
    finiteNumber(liveProps.moveOffset.y, 0) * 0.02,
    finiteNumber(liveProps.moveOffset.z, 0) * 0.02
  )
  pivot.updateMatrixWorld(true)
}

import { useEffect, type Dispatch, type MutableRefObject } from "react"
import * as THREE from "three"
import { buildSvgIconGroup } from "./SvgModelBuilder"
import { disposeObjectTree } from "./SvgSceneUtils"
import type { SvgCanvasProps } from "./SvgTypes"

export const useSvgModelGroups = ({
  props,
  pivotGroupRef,
  iconAGroupRef,
  iconBGroupRef,
  clipPlaneARef,
  clipPlaneBRef,
  setModelReady,
  pathOverridesASignature,
  pathOverridesBSignature,
  colorAStopsKey,
  colorBStopsKey,
}: {
  props: SvgCanvasProps
  pivotGroupRef: MutableRefObject<THREE.Group | null>
  iconAGroupRef: MutableRefObject<THREE.Group | null>
  iconBGroupRef: MutableRefObject<THREE.Group | null>
  clipPlaneARef: MutableRefObject<THREE.Plane | null>
  clipPlaneBRef: MutableRefObject<THREE.Plane | null>
  setModelReady: Dispatch<boolean>
  pathOverridesASignature: string
  pathOverridesBSignature: string
  colorAStopsKey: string
  colorBStopsKey: string
}) => {
  useEffect(() => {
    const pivot = pivotGroupRef.current
    if (!pivot) return

    const previousA = iconAGroupRef.current
    const previousB = iconBGroupRef.current
    const hadModel = Boolean(previousA || previousB)
    if (!hadModel) setModelReady(false)

    if (previousA) {
      pivot.remove(previousA)
      disposeObjectTree(previousA)
    }
    if (previousB) {
      pivot.remove(previousB)
      disposeObjectTree(previousB)
    }

    const groupA = buildSvgIconGroup({
      svgContent: props.iconAContent,
      isIconA: true,
      props,
      clipPlaneA: clipPlaneARef.current,
      clipPlaneB: clipPlaneBRef.current,
    })
    const groupB = buildSvgIconGroup({
      svgContent: props.iconBContent,
      isIconA: false,
      props,
      clipPlaneA: clipPlaneARef.current,
      clipPlaneB: clipPlaneBRef.current,
    })

    pivot.add(groupA)
    pivot.add(groupB)
    iconAGroupRef.current = groupA
    iconBGroupRef.current = groupB
    setModelReady(groupA.children.length > 0 || groupB.children.length > 0)
  }, [
    props.iconAContent,
    props.iconBContent,
    props.extrusionDepth,
    props.bevelEnabled,
    props.bevelThickness,
    props.bevelSize,
    props.bevelSegments,
    props.geometryQuality,
    props.layerSpacing,
    props.materialPreset,
    props.colorA,
    props.colorB,
    props.colorASecondary,
    props.colorBSecondary,
    colorAStopsKey,
    colorBStopsKey,
    props.enableGradient,
    props.gradientType,
    props.transitionType,
    props.wipeDirection,
    pathOverridesASignature,
    pathOverridesBSignature,
    pivotGroupRef,
    iconAGroupRef,
    iconBGroupRef,
    clipPlaneARef,
    clipPlaneBRef,
    setModelReady,
  ])
}

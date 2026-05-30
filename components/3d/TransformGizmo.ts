"use client"

import * as THREE from "three"
import {
  createTransformGizmoHitMaterial,
  createTransformGizmoMaterial,
} from "./TransformGizmoMaterial"

export const TRANSFORM_GIZMO_SIZE = 0.74

export const TRANSFORM_GIZMO_COLORS = {
  x: 0xfb7185,
  y: 0x34d399,
  z: 0x38bdf8,
} satisfies Record<"x" | "y" | "z", number>

export const TRANSFORM_GIZMO_ARC_COLORS = {
  x: 0xff5f87,
  y: 0x1dd8c2,
  z: 0x0ea5ff,
} satisfies Record<"x" | "y" | "z", number>

export type TransformAxis = keyof typeof TRANSFORM_GIZMO_COLORS

export const TRANSFORM_AXES = [
  "x",
  "y",
  "z",
] as const satisfies readonly TransformAxis[]

export type TransformGizmoHandle = {
  kind: "move" | "rotate" | "scale"
  axis?: TransformAxis
}

const orientObjectToAxis = (object: THREE.Object3D, axis: TransformAxis) => {
  if (axis === "x") object.rotation.z = -Math.PI / 2
  if (axis === "z") object.rotation.x = Math.PI / 2
}

export const createTransformGizmo = () => {
  const group = new THREE.Group()
  group.name = "transform-gizmo"
  group.visible = false
  group.renderOrder = 2000

  const hitObjects: THREE.Object3D[] = []
  const hitMaterial = createTransformGizmoHitMaterial()
  const axisLength = TRANSFORM_GIZMO_SIZE
  const rodRadius = 0.014
  const coneRadius = 0.066
  const coneHeight = 0.2
  const coneStemLength = 0.18
  const scaleBallRadius = 0.072
  const coneCenterOffset = axisLength + coneStemLength + coneHeight / 2
  const arcEndpointDistance = axisLength * 0.985
  const axisEnd: Record<TransformAxis, THREE.Vector3> = {
    x: new THREE.Vector3(axisLength, 0, 0),
    y: new THREE.Vector3(0, axisLength, 0),
    z: new THREE.Vector3(0, 0, axisLength),
  }
  const scaleBallPosition: Record<TransformAxis, THREE.Vector3> = {
    x: new THREE.Vector3(arcEndpointDistance, 0, 0),
    y: new THREE.Vector3(0, arcEndpointDistance, 0),
    z: new THREE.Vector3(0, 0, arcEndpointDistance),
  }
  const scaleBallMaterial = createTransformGizmoMaterial(0x22d3ee, 1)

  TRANSFORM_AXES.forEach((axis) => {
    const material = createTransformGizmoMaterial(
      TRANSFORM_GIZMO_COLORS[axis],
      1
    )
    const rodMaterial = createTransformGizmoMaterial(0xfacc15, 1)

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(
        rodRadius,
        rodRadius,
        axisLength + scaleBallRadius * 0.75,
        16
      ),
      rodMaterial
    )
    orientObjectToAxis(rod, axis)
    rod.position.set(
      axis === "x" ? (axisLength + scaleBallRadius * 0.75) / 2 : 0,
      axis === "y" ? (axisLength + scaleBallRadius * 0.75) / 2 : 0,
      axis === "z" ? (axisLength + scaleBallRadius * 0.75) / 2 : 0
    )
    rod.renderOrder = 2002
    rod.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(rod)
    group.add(rod)

    const coneStem = new THREE.Mesh(
      new THREE.CylinderGeometry(rodRadius, rodRadius, coneStemLength, 16),
      rodMaterial
    )
    orientObjectToAxis(coneStem, axis)
    coneStem.position.set(
      axis === "x" ? axisLength + coneStemLength / 2 : 0,
      axis === "y" ? axisLength + coneStemLength / 2 : 0,
      axis === "z" ? axisLength + coneStemLength / 2 : 0
    )
    coneStem.renderOrder = 2007
    coneStem.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(coneStem)
    group.add(coneStem)

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(coneRadius, coneHeight, 28),
      material
    )
    orientObjectToAxis(cone, axis)
    cone.position.set(
      axis === "x" ? coneCenterOffset : 0,
      axis === "y" ? coneCenterOffset : 0,
      axis === "z" ? coneCenterOffset : 0
    )
    cone.renderOrder = 2008
    cone.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(cone)
    group.add(cone)

    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(scaleBallRadius, 22, 14),
      scaleBallMaterial.clone()
    )
    joint.position.copy(scaleBallPosition[axis])
    joint.renderOrder = 2010
    joint.userData.transformGizmo = {
      kind: "scale",
      axis,
    } satisfies TransformGizmoHandle
    joint.userData.transformGizmoPart = "joint"
    hitObjects.push(joint)
    group.add(joint)

    const jointHit = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 16, 10),
      hitMaterial.clone()
    )
    jointHit.position.copy(joint.position)
    jointHit.userData.transformGizmo = {
      kind: "scale",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(jointHit)
    group.add(jointHit)

    const arrowHitLength = coneStemLength + coneHeight
    const moveHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, arrowHitLength, 12),
      hitMaterial.clone()
    )
    orientObjectToAxis(moveHit, axis)
    moveHit.position.set(
      axis === "x" ? axisLength + arrowHitLength / 2 : 0,
      axis === "y" ? axisLength + arrowHitLength / 2 : 0,
      axis === "z" ? axisLength + arrowHitLength / 2 : 0
    )
    moveHit.userData.transformGizmo = {
      kind: "move",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(moveHit)
    group.add(moveHit)
  })

  const arcPairs: Array<{
    axis: TransformAxis
    from: TransformAxis
    to: TransformAxis
  }> = [
    { axis: "x", from: "y", to: "z" },
    { axis: "y", from: "z", to: "x" },
    { axis: "z", from: "x", to: "y" },
  ]

  arcPairs.forEach(({ axis, from, to }) => {
    const fromPoint = axisEnd[from].clone().multiplyScalar(0.985)
    const toPoint = axisEnd[to].clone().multiplyScalar(0.985)
    const controlPoint = fromPoint
      .clone()
      .add(toPoint)
      .normalize()
      .multiplyScalar(axisLength * 1.08)
    const curve = new THREE.QuadraticBezierCurve3(
      fromPoint,
      controlPoint,
      toPoint
    )
    const material = createTransformGizmoMaterial(
      TRANSFORM_GIZMO_ARC_COLORS[axis],
      1
    )
    const arc = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 42, 0.014, 10, false),
      material
    )
    arc.renderOrder = 2000
    arc.userData.transformGizmo = {
      kind: "rotate",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(arc)
    group.add(arc)

    const arcHit = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 28, 0.065, 8, false),
      hitMaterial.clone()
    )
    arcHit.userData.transformGizmo = {
      kind: "rotate",
      axis,
    } satisfies TransformGizmoHandle
    hitObjects.push(arcHit)
    group.add(arcHit)
  })

  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.frustumCulled = false
  })

  return { group, hitObjects }
}

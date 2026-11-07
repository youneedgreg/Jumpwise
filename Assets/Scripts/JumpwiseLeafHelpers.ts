/**
 * JumpwiseLeafHelpers — shared helpers for the Jumpwise LEAF scenarios (test code).
 *
 * Owns: finding the live Jumpwise components, pointing the user's head (camera)
 * at things, and the "do one clamp step" macro.
 * Must not: change Jumpwise state except through input (buttons, grabs) and the
 * camera pose, which stands in for the user's head.
 */

import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseMain} from "./JumpwiseMain"
import {ClampId, ZoneId} from "./JumpwiseSteps"
import {CarryOptions, JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"

export const CLAMP_OBJECT: Record<ClampId, string> = {
  redA: "Clamp_RedA",
  redB: "Clamp_RedB",
  blackB: "Clamp_BlackB",
  blackA: "Clamp_BlackA",
}

export function note(msg: string): void {
  print("[JumpwiseLeaf] " + msg)
}

export async function frames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) await nextFrame()
}

export async function getMain(): Promise<JumpwiseMain> {
  const so = findSceneObjectByName("Jumpwise")
  if (!so) throw new Error("SceneObject 'Jumpwise' not found")
  const main = so.getComponent(JumpwiseMain.getTypeName()) as JumpwiseMain
  if (!main) throw new Error("JumpwiseMain component not found on 'Jumpwise'")
  for (let i = 0; i < 300 && !main.isReady(); i++) await nextFrame()
  if (!main.isReady()) throw new Error("JumpwiseMain never became ready (inputs not wired?)")
  return main
}

function cameraObject(): SceneObject {
  const cam = findSceneObjectByName("Camera Object")
  if (!cam) throw new Error("SceneObject 'Camera Object' not found")
  return cam
}

/**
 * Stop device tracking from driving the camera so the test can turn the
 * user's head. Only lasts for this preview run.
 */
export function holdHead(): void {
  const dt = cameraObject().getComponent("Component.DeviceTracking") as DeviceTracking
  if (dt) dt.enabled = false
}

export function eye(): vec3 {
  return cameraObject().getTransform().getWorldPosition()
}

/** View direction (cameras look down their local -Z). */
export function viewDir(): vec3 {
  return cameraObject().getTransform().forward.uniformScale(-1)
}

/** Turn the head to look straight at `p`. */
export function lookAt(p: vec3): void {
  const t = cameraObject().getTransform()
  const d = p.sub(t.getWorldPosition()).normalize()
  const yaw = Math.atan2(-d.x, -d.z)
  const pitch = Math.asin(Math.max(-1, Math.min(1, d.y)))
  t.setWorldRotation(quat.angleAxis(yaw, vec3.up()).multiply(quat.angleAxis(pitch, vec3.right())))
}

/** Yaw (about +Y, 0 = looking down -Z) and pitch (+ = up) of a view direction, in radians. */
export function yawPitchOf(d: vec3): {yaw: number; pitch: number} {
  const n = d.normalize()
  return {yaw: Math.atan2(-n.x, -n.z), pitch: Math.asin(Math.max(-1, Math.min(1, n.y)))}
}

/** Turn the head to a yaw/pitch (radians). */
export function lookYawPitch(yaw: number, pitch: number): void {
  const t = cameraObject().getTransform()
  t.setWorldRotation(quat.angleAxis(yaw, vec3.up()).multiply(quat.angleAxis(pitch, vec3.right())))
}

/** Shortest signed yaw difference b - a in (-PI, PI]. */
export function yawDelta(a: number, b: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d <= -Math.PI) d += 2 * Math.PI
  return d
}

export function zonePos(main: JumpwiseMain, zone: ZoneId): vec3 {
  return main.getMarker(zone).getTransform().getWorldPosition()
}

export function litZones(main: JumpwiseMain): ZoneId[] {
  return main.getZoneIds().filter((z) => main.getMarker(z).isLit())
}

export function glowingClamps(main: JumpwiseMain): ClampId[] {
  return main.getClampIds().filter((c) => main.getClamp(c).isGlowing())
}

export function grabbableClamps(): ClampId[] {
  return (Object.keys(CLAMP_OBJECT) as ClampId[]).filter(
    (c) => findInteractableByName(CLAMP_OBJECT[c], undefined, true) !== undefined,
  )
}

export function clampInteractable(clamp: ClampId): Interactable {
  const i = findInteractableByName(CLAMP_OBJECT[clamp], undefined, true)
  if (!i) throw new Error(`${CLAMP_OBJECT[clamp]} is not grabbable right now`)
  return i
}

export async function pressButton(ix: JumpwiseLeafInteractor, name: string): Promise<void> {
  let btn = findInteractableByName(name, undefined, true)
  for (let i = 0; i < 60 && !btn; i++) {
    await nextFrame()
    btn = findInteractableByName(name, undefined, true)
  }
  if (!btn) throw new Error(`Button "${name}" not found or not enabled`)
  await ix.trigger(btn)
  await sleep(300)
}

/** Grab `clamp`, carry its tip onto `zone` and let go. Returns the final aim error (degrees). */
export async function placeClamp(
  ix: JumpwiseLeafInteractor,
  main: JumpwiseMain,
  clamp: ClampId,
  zone: ZoneId,
  opts: CarryOptions = {},
): Promise<number> {
  const target = clampInteractable(clamp)
  const c = main.getClamp(clamp)
  await ix.grab(target)
  const err = await ix.carryTipTo(() => c.getTipPosition(), zonePos(main, zone), opts)
  await ix.release(target)
  await frames(3)
  const errDeg = (err * 180) / Math.PI
  note(`placed ${clamp} on ${zone} (aim error ${errDeg.toFixed(2)} deg)`)
  return errDeg
}

export function textOf(name: string, parentName?: string): Text | null {
  const root = parentName ? findSceneObjectByName(parentName) : undefined
  const so = findSceneObjectByName(name, root)
  return so ? (so.getComponent("Component.Text") as Text) : null
}

/**
 * Run the whole connect flow through input: "Found battery", the four clamps in
 * the safe order, then "Start donor car" and "Dead car started". Used by the removal scenario.
 */
export async function connectAndStartDonor(ix: JumpwiseLeafInteractor, main: JumpwiseMain): Promise<void> {
  await pressButton(ix, "FoundBatteryButton")
  await frames(5)
  const order: [ClampId, ZoneId][] = [["redA", "deadPlus"], ["redB", "donorPlus"], ["blackB", "donorMinus"],
    ["blackA", "ground"]]
  for (const [clamp, zone] of order) {
    lookAt(zonePos(main, zone))
    await placeClamp(ix, main, clamp, zone)
  }
  if (main.getPhase() !== "startDonor") throw new Error("connect flow did not finish: phase " + main.getPhase())
  await frames(5)
  lookAt(main.stepCard.getTransform().getWorldPosition())
  await frames(3)
  await pressButton(ix, "NextButton")
  await frames(5)
  if (main.getPhase() !== "donorStarted") throw new Error("donor car not started: phase " + main.getPhase())
  await frames(3)
  await pressButton(ix, "NextButton") // "Dead car started"
  await frames(5)
  if (main.getPhase() !== "deadStarted") throw new Error("dead car not started: phase " + main.getPhase())
}

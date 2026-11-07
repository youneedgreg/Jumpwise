/**
 * JumpwiseLeafInteractor — LEAF test interactor for Jumpwise (test code, not shipped behaviour).
 *
 * Owns: a scripted far-field "hand ray" that can grab a clamp, carry it so the
 * clamp tip lines up with a world point (closed-loop steering), optionally turn
 * the user's head with it, and let go.
 * Why custom: DefaultLeafInteractor.drag() only pushes the ray by a fixed vector,
 * so it cannot land a clamp on a terminal or sweep 180 degrees round the user.
 * Must not: change Jumpwise state directly — it only drives SIK input, like a hand.
 */

import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {awaitEventOnce, nextFrame, sleep, withTimeout} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

export type CarryOptions = {
  /** World points the clamp tip passes through on the way (avoids ambiguous 180 degree sweeps). */
  via?: vec3[]
  /** Milliseconds per leg of the path. */
  legMs?: number
  /** Max milliseconds to keep steering at the goal until the tip lines up. */
  settleMs?: number
  /** Turn the camera (the user's head) to follow the carried clamp, like a user turning round. */
  turnHead?: boolean
  /** Called once per frame while the clamp is held. */
  onFrame?: () => void
}

const STEER_GAIN = 0.35
const ALIGN_TOLERANCE_RAD = 0.006 // ~0.35 degrees

export class JumpwiseLeafInteractor extends DefaultLeafInteractor {
  private cam = WorldCameraFinderProvider.getInstance()
  private rayDir: vec3 = new vec3(0, 0, -1)

  constructor() {
    super("JumpwiseLeafInteractor")
  }

  /** Eye position (camera world position). */
  eye(): vec3 {
    return this.cam.getTransform().getWorldPosition()
  }

  /** Pinch-hold an interactable (trigger starts, stays held). */
  async grab(target: Interactable): Promise<void> {
    const started = awaitEventOnce(target.onTriggerStart)
    await this.enterHover(target)
    await nextFrame()
    await nextFrame()
    this.startSelecting()
    await withTimeout(started, 3000, `grab: trigger never started on "${target.getSceneObject().name}"`)
    await nextFrame()
    this.rayDir = this.endPoint.sub(this.startPoint).normalize()
  }

  /** Let go of the held interactable. */
  async release(target: Interactable): Promise<void> {
    const ended = awaitEventOnce(target.onTriggerEnd)
    this.stopSelecting()
    await withTimeout(ended, 3000, `release: trigger never ended on "${target.getSceneObject().name}"`)
    this.resetStartEndPoint()
    this.overrideDragVector = undefined
    await this.exitHover()
    await sleep(250)
  }

  /**
   * Try to grab a clamp the way a hand would (aim, pinch, pull away for a moment, let go),
   * with timeouts, so a clamp that refuses the grab does not hang the test.
   * Reports whether hover and the pinch trigger reached it; the caller checks
   * that the clamp did not move.
   */
  async tryGrab(target: Interactable, tip: () => vec3, pullToward: vec3, timeoutMs: number = 800):
      Promise<{hovered: boolean; triggered: boolean}> {
    let hovered = false
    let triggered = false
    awaitEventOnce(target.onHoverEnter).then(() => { hovered = true })
    awaitEventOnce(target.onTriggerStart).then(() => { triggered = true })
    await this.setTarget(target)
    const tHover = getTime() + timeoutMs / 1000
    while (!hovered && getTime() < tHover) await nextFrame()
    this.startSelecting()
    const tTrig = getTime() + timeoutMs / 1000
    while (!triggered && getTime() < tTrig) await nextFrame()
    this.rayDir = this.endPoint.sub(this.startPoint).normalize()
    const away = pullToward.sub(this.eye()).normalize()
    for (let i = 0; i < 20; i++) {
      this.steer(tip, away)
      await nextFrame()
    }
    this.stopSelecting()
    for (let i = 0; i < 3; i++) await nextFrame()
    this.resetStartEndPoint()
    this.overrideDragVector = undefined
    this.overrideInteractable = undefined
    await sleep(250)
    return {hovered, triggered}
  }

  /**
   * While holding, steer the ray so the clamp tip lines up (as seen from the eye)
   * with `goal`, passing `via` points first. Returns the final angle error in radians.
   */
  async carryTipTo(tip: () => vec3, goal: vec3, opts: CarryOptions = {}): Promise<number> {
    const legMs = opts.legMs ?? 700
    const points = (opts.via ?? []).concat([goal])
    for (const p of points) {
      const fromDir = tip().sub(this.eye()).normalize()
      const toDir = p.sub(this.eye()).normalize()
      const t0 = getTime()
      let k = 0
      while (k < 1) {
        k = Math.min(1, ((getTime() - t0) * 1000) / legMs)
        const want = slerpDir(fromDir, toDir, k)
        this.steer(tip, want)
        if (opts.turnHead) this.turnHeadToward(want)
        if (opts.onFrame) opts.onFrame()
        await nextFrame()
      }
    }
    const goalDir = goal.sub(this.eye()).normalize()
    const tEnd = getTime() + (opts.settleMs ?? 1500) / 1000
    let err = angleBetween(tip().sub(this.eye()).normalize(), goalDir)
    while (err > ALIGN_TOLERANCE_RAD && getTime() < tEnd) {
      this.steer(tip, goalDir)
      if (opts.turnHead) this.turnHeadToward(goalDir)
      if (opts.onFrame) opts.onFrame()
      await nextFrame()
      err = angleBetween(tip().sub(this.eye()).normalize(), goalDir)
    }
    return err
  }

  /** One closed-loop step: nudge the ray so the tip direction moves toward `want`. */
  private steer(tip: () => vec3, want: vec3): void {
    const eye = this.eye()
    const tipDir = tip().sub(eye).normalize()
    this.rayDir = this.rayDir.add(want.sub(tipDir).uniformScale(STEER_GAIN)).normalize()
    this.startPoint = eye
    this.endPoint = eye.add(this.rayDir.uniformScale(100))
  }

  /** Yaw the camera (head) to face the horizontal part of `dir`, keeping it level. */
  private turnHeadToward(dir: vec3): void {
    const flat = new vec3(dir.x, 0, dir.z)
    if (flat.length < 0.001) return
    const d = flat.normalize()
    const yaw = Math.atan2(-d.x, -d.z)
    this.cam.getTransform().setWorldRotation(quat.angleAxis(yaw, vec3.up()))
  }
}

export function angleBetween(a: vec3, b: vec3): number {
  return Math.acos(Math.max(-1, Math.min(1, a.dot(b))))
}

/** Spherical interpolation between two unit directions. */
export function slerpDir(a: vec3, b: vec3, t: number): vec3 {
  const ang = angleBetween(a, b)
  if (ang < 1e-4) return b
  const s = Math.sin(ang)
  if (s < 1e-3) return vec3.lerp(a, b, t).normalize() // near-opposite: caller should add a via point
  const wa = Math.sin((1 - t) * ang) / s
  const wb = Math.sin(t * ang) / s
  return a.uniformScale(wa).add(b.uniformScale(wb)).normalize()
}

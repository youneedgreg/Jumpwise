/**
 * LEAF helper scenario jw-demo-walkthrough — plays the whole jump-start at viewing
 * speed for the demo video (test code; asserts nothing).
 *
 * Owns: a paced run through the real flow, driven only by input like the other
 * scenarios: "Found battery", the four clamps in the safe order with the chime and
 * arrow, one wrong drop of the last black clamp on the dead battery's - terminal,
 * "Start donor car", "Dead car started", removal in reverse, and the "Done" card.
 * The head (camera) turns smoothly and follows the carried clamp, like a person.
 * Each beat is logged as "[JumpwiseLeaf] DEMO t=<seconds> <beat>" so the video edit
 * can line the voiceover up with the footage.
 * Must not: change Jumpwise state except through input and the head pose.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseMain} from "./JumpwiseMain"
import {ClampId, ZoneId} from "./JumpwiseSteps"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {clampInteractable, eye, getMain, holdHead, lookAt, lookYawPitch, note, pressButton, viewDir, yawDelta,
  yawPitchOf, zonePos} from "./JumpwiseLeafHelpers"

const CONNECT: [ClampId, ZoneId][] = [
  ["redA", "deadPlus"],
  ["redB", "donorPlus"],
  ["blackB", "donorMinus"],
  ["blackA", "ground"],
]

const REMOVE: [ClampId, ZoneId][] = [
  ["blackA", "ground"],
  ["blackB", "donorMinus"],
  ["redB", "donorPlus"],
  ["redA", "deadPlus"],
]

/** Milliseconds the carried clamp takes from pick-up to the drop point. */
const CARRY_MS = 2200

function easeInOut(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
}

/** Turn the head smoothly to look at `p` over `ms` milliseconds. */
async function smoothLook(p: vec3, ms: number): Promise<void> {
  const a = yawPitchOf(viewDir())
  const b = yawPitchOf(p.sub(eye()))
  const dYaw = yawDelta(a.yaw, b.yaw)
  const t0 = getTime()
  let k = 0
  while (k < 1) {
    k = Math.min(1, ((getTime() - t0) * 1000) / ms)
    const e = easeInOut(k)
    lookYawPitch(a.yaw + dYaw * e, a.pitch + (b.pitch - a.pitch) * e)
    await nextFrame()
  }
}

/** One frame of the head drifting toward `p` (used while a clamp is carried). */
let lastFollowTime = 0
function followLook(p: vec3): void {
  const now = getTime()
  const dt = lastFollowTime > 0 ? Math.min(0.1, now - lastFollowTime) : 1 / 30
  lastFollowTime = now
  const a = yawPitchOf(viewDir())
  const b = yawPitchOf(p.sub(eye()))
  const w = 1 - Math.exp(-dt * 3.5)
  lookYawPitch(a.yaw + yawDelta(a.yaw, b.yaw) * w, a.pitch + (b.pitch - a.pitch) * w)
}

@component
export class JumpwiseLeafDemoWalkthrough extends Scenario {
  private t0 = 0

  private beat(name: string): void {
    note(`DEMO t=${(getTime() - this.t0).toFixed(1)} ${name}`)
  }

  /** Look at the clamp, pick it up and carry it onto `goal` with the head following, then let go. */
  private async carry(ix: JumpwiseLeafInteractor, main: JumpwiseMain, clamp: ClampId, goal: vec3): Promise<void> {
    const c = main.getClamp(clamp)
    await smoothLook(c.getTipPosition(), 1100)
    await sleep(500)
    const target = clampInteractable(clamp)
    await ix.grab(target)
    lastFollowTime = 0
    await ix.carryTipTo(() => c.getTipPosition(), goal, {
      legMs: CARRY_MS,
      settleMs: 1500,
      onFrame: () => followLook(c.getTipPosition()),
    })
    await ix.release(target)
  }

  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    this.t0 = getTime()

    // Opening: the "Found battery" panel in front of the dead car.
    lookAt(findSceneObjectByName("FoundBatteryPanel")!.getTransform().getWorldPosition())
    this.beat("start: Found battery panel")
    await sleep(3000)
    await pressButton(ix, "FoundBatteryButton")
    this.beat("pinched Found battery")
    await smoothLook(zonePos(main, "deadPlus"), 1200)
    await sleep(1800)

    for (let i = 0; i < CONNECT.length; i++) {
      const [clamp, zone] = CONNECT[i]

      if (i === 3) {
        // The easy mistake: the last black clamp onto the dead battery's - terminal.
        this.beat("wrong clamp: blackA toward dead -")
        await this.carry(ix, main, clamp, zonePos(main, "deadMinus"))
        this.beat("wrong clamp dropped: warning + spark")
        // The warning shows on the step card, which sits by the ground point: frame
        // the flashing - terminal and the card together.
        const cardPos = main.stepCard.getTransform().getWorldPosition()
        await smoothLook(vec3.lerp(zonePos(main, "deadMinus"), cardPos, 0.6), 700)
        await sleep(main.warningSeconds * 1000 + 600)
      }

      this.beat(`step ${i + 1}: ${clamp} to ${zone}`)
      await this.carry(ix, main, clamp, zonePos(main, zone))
      this.beat(`step ${i + 1} placed`)

      if (i === 0 || i === 2) {
        // Next target is on the other car: stay facing this car so the chime and arrow show.
        await smoothLook(zonePos(main, zone), 700)
        this.beat("chime + arrow")
        await sleep(2500)
      } else {
        await sleep(1200)
      }
    }

    // Both cars started, then "Remove clamps".
    await smoothLook(main.stepCard.getTransform().getWorldPosition(), 1200)
    this.beat("card: Start the donor car")
    await sleep(2500)
    await pressButton(ix, "NextButton")
    this.beat("pinched Start donor car")
    await sleep(3500)
    await pressButton(ix, "NextButton")
    this.beat("pinched Dead car started")
    await sleep(2500)
    await pressButton(ix, "NextButton")
    this.beat("pinched Remove clamps")
    await sleep(1200)

    for (let i = 0; i < REMOVE.length; i++) {
      const [clamp, zone] = REMOVE[i]
      const c = main.getClamp(clamp)
      this.beat(`remove ${i + 1}: ${clamp} off ${zone}`)
      await smoothLook(zonePos(main, zone), 1000)
      await sleep(700)
      const tipOffset = c.getTipPosition().sub(c.getTransform().getWorldPosition())
      await this.carry(ix, main, clamp, c.getHomePosition().add(tipOffset))
      this.beat(`remove ${i + 1}: back on the rack`)
      await sleep(i === 0 || i === 2 ? 2000 : 1000)
    }

    await smoothLook(main.stepCard.getTransform().getWorldPosition(), 1200)
    this.beat("Done card")
    await sleep(6000)
    this.beat("end")
  }
}

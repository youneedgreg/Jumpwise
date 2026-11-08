/**
 * LEAF scenario — done criterion 3 (test code).
 *
 * After step 1, a chime plays and an arrow points to the donor car until it is
 * in view. The user's head (camera) is held facing the dead car, then turned
 * round in steps toward the donor battery.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseEdgeArrowUI} from "./JumpwiseEdgeArrowUI"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {eye, frames, getMain, holdHead, lookAt, lookYawPitch, note, placeClamp, pressButton, viewDir, yawDelta, yawPitchOf,
  zonePos} from "./JumpwiseLeafHelpers"

@component
export class JumpwiseLeafC3ChimeArrow extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    await pressButton(ix, "FoundBatteryButton")
    await frames(5)

    // Looking at the dead battery: step 1 target is in view, so no arrow.
    lookAt(zonePos(main, "deadPlus"))
    await frames(5)
    expect(main.guidance.isArrowShown()).toBe(false)

    const arrowObj = findSceneObjectByName("EdgeArrow")!
    const arrow = arrowObj.getComponent(JumpwiseEdgeArrowUI.getTypeName()) as JumpwiseEdgeArrowUI
    const chimesBefore = main.audio.getCounts().chime
    expect(chimesBefore).toBe(0) // no chime before step 1 is done

    await placeClamp(ix, main, "redA", "deadPlus")
    lookAt(zonePos(main, "deadPlus")) // still facing the dead car
    await frames(5)

    // Step 2 target (donor +) is behind: one chime, arrow on.
    expect(main.getStepIndex()).toBe(1)
    expect(main.audio.getCounts().chime).toBe(chimesBefore + 1)
    expect(main.guidance.isArrowShown()).toBe(true)
    expect(arrow.isShown()).toBe(true)
    note("C3 chime count after step 1: " + main.audio.getCounts().chime + ", arrow shown: " + arrow.isShown())

    // It stays while the donor car is still out of view.
    await sleep(1500)
    expect(arrow.isShown()).toBe(true)
    expect(main.audio.getCounts().chime).toBe(chimesBefore + 1) // plays once, not on repeat

    // Turn round in 15 degree steps toward the donor battery; the arrow stays
    // on until the target is in view, then goes away.
    const target = zonePos(main, "donorPlus")
    const a = yawPitchOf(viewDir())
    const b = yawPitchOf(target.sub(eye()))
    const dYaw = yawDelta(a.yaw, b.yaw)
    note(`C3 head turn needed: ${(Math.abs(dYaw) * 180 / Math.PI).toFixed(0)} deg of yaw`)
    let shownWhileOut = 0
    let hiddenWhileOut = 0
    for (let i = 1; i <= 12; i++) {
      const k = i / 12
      lookYawPitch(a.yaw + dYaw * k, a.pitch + (b.pitch - a.pitch) * k)
      await frames(3)
      if (!main.guidance.isInView(target)) {
        if (arrow.isShown()) shownWhileOut++
        else hiddenWhileOut++
      }
    }
    lookAt(target)
    await frames(5)
    note(`C3 turning: arrow shown on ${shownWhileOut} out-of-view frames, hidden on ${hiddenWhileOut}`)
    expect(hiddenWhileOut).toBe(0)
    expect(shownWhileOut).toBeGreaterThan(3)
    expect(main.guidance.isInView(target)).toBe(true)
    expect(arrow.isShown()).toBe(false)
    expect(main.audio.getCounts().chime).toBe(chimesBefore + 1)
    note("C3 done")
  }
}

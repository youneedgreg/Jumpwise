/**
 * LEAF scenario — known risk from the brief (test code).
 *
 * The drag must keep going while the user turns about 180 degrees to reach the
 * donor bay about 1.5 m behind. After step 1 the user takes the second red
 * clamp, brings it in front of them (facing the dead car), then turns round
 * through their right while still holding it, and drops it on the donor +.
 *
 * What this proves: SIK keeps the grab (no release, no cancel) through a ~180
 * degree sweep of head and hand ray, the clamp follows, and the drop counts.
 * What it cannot prove: how a real hand or a preview mouse feels doing it.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {clampInteractable, eye, frames, getMain, holdHead, lookAt, note, placeClamp, pressButton, viewDir, yawDelta,
  yawPitchOf, zonePos} from "./JumpwiseLeafHelpers"

@component
export class JumpwiseLeafRiskTurnDrag extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    await pressButton(ix, "FoundBatteryButton")
    await frames(5)
    lookAt(zonePos(main, "deadPlus"))
    await frames(3)
    await placeClamp(ix, main, "redA", "deadPlus")
    expect(main.getStepIndex()).toBe(1)

    // Take the second red clamp from the rack.
    const clamp = main.getClamp("redB")
    lookAt(clamp.getTransform().getWorldPosition())
    await frames(3)
    const target = clampInteractable("redB")
    let releases = 0
    const unsub = clamp.onReleased.add(() => releases++)
    await ix.grab(target)
    expect(clamp.isHeld()).toBe(true)

    // Bring it round in front, facing the dead car.
    const tip = () => clamp.getTipPosition()
    const front = eye().add(new vec3(0, -45, -80))
    await ix.carryTipTo(tip, front, {legMs: 900, turnHead: true, settleMs: 600})
    const faceFront = yawPitchOf(viewDir()).yaw

    // Turn round through the right while holding it, onto the donor battery's +.
    let lastYaw = faceFront
    let turned = 0
    let framesHeld = 0
    let framesNotHeld = 0
    const side = eye().add(new vec3(85, -45, 0))
    const err = await ix.carryTipTo(tip, zonePos(main, "donorPlus"), {
      via: [side],
      legMs: 1500,
      turnHead: true,
      onFrame: () => {
        const y = yawPitchOf(viewDir()).yaw
        turned += Math.abs(yawDelta(lastYaw, y))
        lastYaw = y
        if (clamp.isHeld()) framesHeld++
        else framesNotHeld++
      },
    })
    const turnedDeg = (turned * 180) / Math.PI
    const netDeg = (Math.abs(yawDelta(faceFront, yawPitchOf(viewDir()).yaw)) * 180) / Math.PI
    note(`RISK turn while holding: swept ${turnedDeg.toFixed(0)} deg (net ${netDeg.toFixed(0)} deg), held on ${framesHeld} frames, not held on ${framesNotHeld}, releases during carry ${releases}, final aim error ${((err * 180) / Math.PI).toFixed(2)} deg`)
    expect(turnedDeg).toBeGreaterThan(160)
    expect(netDeg).toBeGreaterThan(160)
    expect(framesNotHeld).toBe(0)
    expect(releases).toBe(0)
    expect(main.getSubState()).toBe("carry")
    expect(main.getMarker("donorPlus").getState()).toBe("pulse")

    await ix.release(target)
    unsub()
    await sleep(300)
    expect(main.getStepIndex()).toBe(2)
    expect(main.getMarker("donorPlus").getState()).toBe("done")
    note("RISK done: drop after the turn counted as correct")
  }
}

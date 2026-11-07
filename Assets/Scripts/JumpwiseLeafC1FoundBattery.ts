/**
 * LEAF scenario — done criterion 1 (test code).
 *
 * Pinching "Found battery" hides the button and shows a steady "1" on the dead
 * battery's +, the card "Take the red clamp" and a soft glow on the red clamp,
 * with nothing else lit. Grabbing the clamp makes the "1" brighten and pulse as
 * the only target, removes the glow, and changes the card to
 * "Red clamp to + on the dead battery".
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {clampInteractable, frames, getMain, glowingClamps, grabbableClamps, holdHead, litZones, lookAt, note,
  pressButton, textOf, zonePos} from "./JumpwiseLeafHelpers"

@component
export class JumpwiseLeafC1FoundBattery extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    lookAt(findSceneObjectByName("FoundBatteryPanel")!.getTransform().getWorldPosition())
    await frames(5)

    // Before: only the "Found battery" button is up, nothing lit, nothing grabbable.
    expect(main.getPhase()).toBe("findBattery")
    expect(main.foundBatteryUI.isShown()).toBe(true)
    expect(litZones(main).length).toBe(0)
    expect(grabbableClamps().length).toBe(0)

    await pressButton(ix, "FoundBatteryButton")
    await frames(5)

    // After the pinch.
    expect(main.getPhase()).toBe("connect")
    expect(main.getStepIndex()).toBe(0)
    expect(main.foundBatteryUI.isShown()).toBe(false)
    expect(findSceneObjectByName("FoundBatteryButton")!.isEnabledInHierarchy).toBe(false)
    expect(findSceneObjectByName("ManualCard")!.isEnabledInHierarchy).toBe(false)

    const deadPlus = main.getMarker("deadPlus")
    expect(deadPlus.getState()).toBe("steady")
    expect(litZones(main).join(",")).toBe("deadPlus") // nothing else lit
    const number = textOf("Number", "Marker_DeadPlus")!
    expect(number.text).toBe("1")
    expect(number.getSceneObject().isEnabledInHierarchy).toBe(true)
    const steadyNumberColor = number.textFill.color

    expect(main.stepCard.isShown()).toBe(true)
    expect(main.stepCard.getMessage()).toBe("Take the red clamp")
    expect(glowingClamps(main).join(",")).toBe("redA")
    expect(findSceneObjectByName("Glow_RedA")!.isEnabledInHierarchy).toBe(true)
    expect(grabbableClamps().join(",")).toBe("redA") // only the current clamp can be grabbed
    expect(main.stepCard.isNextShown()).toBe(false)
    note("C1 after Found battery: steady 1 on dead +, card and glow OK, nothing else lit")

    // Grab the red clamp (pinch and hold, no move yet).
    const red = clampInteractable("redA")
    lookAt(main.getClamp("redA").getTransform().getWorldPosition())
    await ix.grab(red)
    await frames(8)

    expect(main.getSubState()).toBe("carry")
    expect(main.getClamp("redA").isHeld()).toBe(true)
    expect(deadPlus.getState()).toBe("pulse")
    expect(litZones(main).join(",")).toBe("deadPlus") // the only target
    const pulseNumberColor = number.textFill.color
    // "brighten": the pulse colour is brighter than the steady colour
    const bright = (c: vec4) => c.x + c.y + c.z
    expect(bright(pulseNumberColor)).toBeGreaterThan(bright(steadyNumberColor))
    expect(main.getClamp("redA").isGlowing()).toBe(false)
    expect(findSceneObjectByName("Glow_RedA")!.isEnabledInHierarchy).toBe(false)
    expect(main.stepCard.getMessage()).toBe("Red clamp to + on the dead battery")
    note(`C1 after grab: pulse, brighter (${bright(steadyNumberColor).toFixed(2)} -> ${bright(pulseNumberColor).toFixed(2)}), glow off, card OK`)

    // Aiming at the marker makes it the aimed (bigger) target.
    await ix.carryTipTo(() => main.getClamp("redA").getTipPosition(), zonePos(main, "deadPlus"), {legMs: 600})
    await frames(3)
    expect(deadPlus.isAimed()).toBe(true)
    await ix.release(red)
    await sleep(300)
    expect(main.getStepIndex()).toBe(1)
    note("C1 done")
  }
}

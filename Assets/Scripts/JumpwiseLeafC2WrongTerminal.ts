/**
 * LEAF scenario — done criterion 2 (test code).
 *
 * A wrong-terminal drop shows the warning and returns the clamp to the rack.
 * Step 1's red clamp is dropped on the dead battery's - terminal.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {frames, getMain, glowingClamps, holdHead, lookAt, note, placeClamp, pressButton, zonePos} from "./JumpwiseLeafHelpers"

@component
export class JumpwiseLeafC2WrongTerminal extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    await pressButton(ix, "FoundBatteryButton")
    await frames(5)
    lookAt(zonePos(main, "deadPlus"))
    await frames(3)

    const sparksBefore = main.audio.getCounts().spark
    const clamp = main.getClamp("redA")
    const home = clamp.getHomePosition()

    const err = await placeClamp(ix, main, "redA", "deadMinus")
    expect(err).toBeLessThan(2)

    // Warning shown, spark cue, the - marker flashes, the step does not advance.
    expect(main.stepCard.isWarningShown()).toBe(true)
    const msg = main.stepCard.getMessage()
    note(`C2 warning text: "${msg}"`)
    expect(msg).toBe("Not here: red goes on +, never on -.")
    expect(main.getMarker("deadMinus").isFlashing()).toBe(true)
    expect(main.audio.getCounts().spark).toBe(sparksBefore + 1)
    expect(main.getStepIndex()).toBe(0)
    expect(main.getSubState()).toBe("take")
    expect(main.getMarker("deadPlus").getState()).toBe("steady")
    expect(main.getMarker("deadMinus").getState()).toBe("hidden")

    // The clamp slides back to its rack spot and is offered again.
    await sleep(700)
    const dist = clamp.getTransform().getWorldPosition().distance(home)
    note(`C2 clamp distance from rack spot after return: ${dist.toFixed(2)} cm`)
    expect(dist).toBeLessThan(0.5)
    expect(clamp.isGrabbable()).toBe(true)
    expect(glowingClamps(main).join(",")).toBe("redA")

    // The warning clears after its time and the step text comes back.
    await sleep(main.warningSeconds * 1000)
    expect(main.stepCard.isWarningShown()).toBe(false)
    expect(main.stepCard.getMessage()).toBe("Take the red clamp")
    note("C2 done")
  }
}

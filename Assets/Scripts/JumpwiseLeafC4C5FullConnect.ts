/**
 * LEAF scenario — done criteria 4 and 5 (connect half) (test code).
 *
 * 4: the last black clamp accepts only the bare-metal ground point, not the
 *    dead battery's - terminal.
 * 5 (connect half): "Start donor car" appears only after four correct clamps.
 * Removal (the other half of 5) is phase 2 and is not tested here.
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {SPARK_REASON} from "./JumpwiseSteps"
import {JumpwiseMain} from "./JumpwiseMain"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {frames, getMain, holdHead, lookAt, note, placeClamp, pressButton, zonePos} from "./JumpwiseLeafHelpers"

function expectNoStartButton(main: JumpwiseMain, when: string): void {
  expect(main.stepCard.isNextShown()).toBe(false)
  expect(findInteractableByName("NextButton", undefined, true) === undefined).toBe(true)
  note(`C5 no "Start donor car" ${when}`)
}

@component
export class JumpwiseLeafC4C5FullConnect extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    await frames(3)
    expectNoStartButton(main, "before Found battery")
    await pressButton(ix, "FoundBatteryButton")
    await frames(5)
    expectNoStartButton(main, "after Found battery")

    lookAt(zonePos(main, "deadPlus"))
    await placeClamp(ix, main, "redA", "deadPlus")
    expect(main.getStepIndex()).toBe(1)
    await frames(3)
    expectNoStartButton(main, "after 1 clamp")

    lookAt(zonePos(main, "donorPlus"))
    await placeClamp(ix, main, "redB", "donorPlus")
    expect(main.getStepIndex()).toBe(2)
    await frames(3)
    expectNoStartButton(main, "after 2 clamps")

    await placeClamp(ix, main, "blackB", "donorMinus")
    expect(main.getStepIndex()).toBe(3)
    await frames(3)
    expectNoStartButton(main, "after 3 clamps")

    // Criterion 4: the last black clamp on the dead battery's - is refused.
    lookAt(zonePos(main, "deadMinus"))
    const sparks = main.audio.getCounts().spark
    await placeClamp(ix, main, "blackA", "deadMinus")
    expect(main.getStepIndex()).toBe(3)
    expect(main.stepCard.isWarningShown()).toBe(true)
    expect(main.stepCard.getMessage()).toBe(SPARK_REASON)
    expect(main.audio.getCounts().spark).toBe(sparks + 1)
    expect(main.getMarker("deadMinus").isFlashing()).toBe(true)
    await sleep(700)
    const blackA = main.getClamp("blackA")
    expect(blackA.getTransform().getWorldPosition().distance(blackA.getHomePosition())).toBeLessThan(0.5)
    expectNoStartButton(main, "after the refused drop on dead -")
    note(`C4 dead - refused with: "${SPARK_REASON}"`)

    // ...and the bare-metal ground point is accepted.
    lookAt(zonePos(main, "ground"))
    await placeClamp(ix, main, "blackA", "ground")
    expect(main.getPhase()).toBe("startDonor")
    expect(main.getMarker("ground").getState()).toBe("done")
    note("C4 ground point accepted")

    // Criterion 5 (connect half): now and only now the button shows.
    await frames(5)
    expect(main.stepCard.getMessage()).toBe("Start the donor car")
    expect(main.stepCard.isNextShown()).toBe(true)
    const next = findInteractableByName("NextButton", undefined, true)
    expect(next !== undefined).toBe(true)
    note("C5 \"Start donor car\" shown after four correct clamps")
    for (const z of ["deadPlus", "donorPlus", "donorMinus", "ground"]) {
      expect(main.getMarker(z as any).getState()).toBe("done")
    }
    expect(main.getMarker("deadMinus").getState()).toBe("hidden")

    lookAt(main.stepCard.getTransform().getWorldPosition())
    await frames(3)
    await pressButton(ix, "NextButton")
    await frames(5)
    expect(main.getPhase()).toBe("donorStarted")
    expect(main.stepCard.getMessage()).toBe("Donor car started")
    expect(main.stepCard.isNextShown()).toBe(false)
    note("C5 connect half done")
  }
}

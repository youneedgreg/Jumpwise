/**
 * LEAF helper scenario jw-view-long-text — puts the two longest lines on the step
 * card (the dead-car step, then the bare-metal warning) and holds the head on the
 * card for 20 s each, so the preview can be captured to check the text fits the
 * 15 x 8 cm card (test code; asserts nothing).
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {frames, getMain, holdHead, lookAt, note, pressButton} from "./JumpwiseLeafHelpers"
import {SPARK_REASON, START_DEAD_TEXT} from "./JumpwiseSteps"

@component
export class JumpwiseLeafViewLongText extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    await pressButton(ix, "FoundBatteryButton")
    await frames(5)
    main.stepCard.setMessage(START_DEAD_TEXT)
    main.stepCard.showNext("Dead car started")
    await frames(3)
    lookAt(main.stepCard.getTransform().getWorldPosition())
    note("view-long-text: dead-car line + Next button")
    await sleep(20000)
    main.stepCard.showWarning(SPARK_REASON, 25)
    note("view-long-text: bare-metal warning")
    await sleep(20000)
  }
}

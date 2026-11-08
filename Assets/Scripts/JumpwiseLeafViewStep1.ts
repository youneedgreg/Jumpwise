/**
 * LEAF helper scenario jw-view-step1 — presses "Found battery" and holds the head on
 * the dead battery for 60 s so the preview can be captured (test code; asserts nothing).
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {JumpwiseLeafInteractor} from "./JumpwiseLeafInteractor"
import {frames, getMain, holdHead, lookAt, note, pressButton, zonePos} from "./JumpwiseLeafHelpers"

@component
export class JumpwiseLeafViewStep1 extends Scenario {
  async run(): Promise<void> {
    const main = await getMain()
    const ix = new JumpwiseLeafInteractor()
    holdHead()
    await pressButton(ix, "FoundBatteryButton")
    await frames(5)
    // look between the battery and its card
    const p = zonePos(main, "deadPlus").add(new vec3(8, 4, 0))
    lookAt(p)
    note("view-step1: looking at the dead battery")
    await sleep(60000)
  }
}

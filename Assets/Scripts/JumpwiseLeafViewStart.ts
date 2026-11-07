/**
 * LEAF helper scenario jw-view-start — holds the head on the "Found battery" panel
 * for 60 s so the preview can be captured (test code; asserts nothing).
 */

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {eye, getMain, holdHead, lookAt, note} from "./JumpwiseLeafHelpers"

@component
export class JumpwiseLeafViewStart extends Scenario {
  async run(): Promise<void> {
    await getMain()
    holdHead()
    lookAt(findSceneObjectByName("FoundBatteryPanel")!.getTransform().getWorldPosition())
    const e = eye()
    note(`view-start: eye at (${e.x.toFixed(1)}, ${e.y.toFixed(1)}, ${e.z.toFixed(1)})`)
    await sleep(60000)
  }
}

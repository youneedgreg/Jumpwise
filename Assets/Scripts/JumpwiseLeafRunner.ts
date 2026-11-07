/**
 * JumpwiseLeafRunner — runs one LEAF scenario when the preview starts (test code).
 *
 * Owns: nothing in the guide. With `scenarioId` empty (the default) it does nothing,
 * so the Lens behaves normally. Set it to a scenario id from JumpwiseLeafIndex to
 * run that scenario on a fresh preview; the result is printed as
 * "[JumpwiseLeaf] RESULT <id> PASSED" or "... FAILED <reason>".
 * Why it exists: each scenario needs a fresh Lens, and LEAF does not reset state
 * between scenarios on its own.
 */

import {DefaultScenarioManager} from "Leaf.lspkg/Scenarios/scenario/manager/DefaultLeafScenarioManager"

@component
export class JumpwiseLeafRunner extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseLeafRunner – run one LEAF scenario on preview start</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Scenario id to run when the preview starts (e.g. jw-c1-found-battery). Leave empty for normal use.")
  scenarioId: string = ""

  @input
  @widget(new SliderWidget(0.5, 5, 0.5))
  @hint("Seconds to wait after start before running, so the scene can settle.")
  startDelaySec: number = 1.5
  @ui.group_end

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      if (!this.scenarioId) return
      const delayed = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
      delayed.bind(() => this.runScenario(this.scenarioId))
      delayed.reset(this.startDelaySec)
    })
  }

  private runScenario(id: string): void {
    print("[JumpwiseLeaf] START " + id)
    try {
      DefaultScenarioManager.getInstance()
        .startScenario(id)
        .then(() => print("[JumpwiseLeaf] RESULT " + id + " PASSED"))
        .catch((e) => print("[JumpwiseLeaf] RESULT " + id + " FAILED " + e))
    } catch (e) {
      print("[JumpwiseLeaf] RESULT " + id + " FAILED to start: " + e)
    }
  }
}

/**
 * JumpwiseLeafIndex — registers the Jumpwise LEAF scenarios (test code).
 * Lives on the "LeafIndex" SceneObject. The LEAF panel (LeafPlugin) lists and runs
 * these; JumpwiseLeafRunner can also run one when the preview starts.
 */

import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {JumpwiseLeafC1FoundBattery} from "./JumpwiseLeafC1FoundBattery"
import {JumpwiseLeafC2WrongTerminal} from "./JumpwiseLeafC2WrongTerminal"
import {JumpwiseLeafC3ChimeArrow} from "./JumpwiseLeafC3ChimeArrow"
import {JumpwiseLeafC4C5FullConnect} from "./JumpwiseLeafC4C5FullConnect"
import {JumpwiseLeafRiskTurnDrag} from "./JumpwiseLeafRiskTurnDrag"
import {JumpwiseLeafViewStart} from "./JumpwiseLeafViewStart"
import {JumpwiseLeafViewStep1} from "./JumpwiseLeafViewStep1"

@component
export class JumpwiseLeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "jw-c1-found-battery", typename: JumpwiseLeafC1FoundBattery.getTypeName()},
    {id: "jw-c2-wrong-terminal", typename: JumpwiseLeafC2WrongTerminal.getTypeName()},
    {id: "jw-c3-chime-arrow", typename: JumpwiseLeafC3ChimeArrow.getTypeName()},
    {id: "jw-c4-c5-full-connect", typename: JumpwiseLeafC4C5FullConnect.getTypeName()},
    {id: "jw-risk-turn-drag", typename: JumpwiseLeafRiskTurnDrag.getTypeName()},
    // view poses for screenshots (no assertions)
    {id: "jw-view-start", typename: JumpwiseLeafViewStart.getTypeName()},
    {id: "jw-view-step1", typename: JumpwiseLeafViewStep1.getTypeName()},
  ]
}

/**
 * JumpwiseFoundBatteryUI — the big "Found battery" button and the owner's manual card (passive view).
 *
 * Stand-in for the real version's battery recognition: the user pinches
 * "Found battery" before the first marker appears. The owner's manual card sits
 * beside it and leaves with it.
 * API (Main -> view): show, hide. Events (view -> Main): onFoundBattery.
 * Must not: start the steps itself — Main does that when onFoundBattery fires.
 */

import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material
const ICON_BATTERY = requireAsset("../Icons/battery_full.png") as Texture
const ICON_MANUAL = requireAsset("../Icons/menu_book.png") as Texture

// ── Type scale (canonical table from /specs-build-ui)
const FONT_SIZE_SCALE = 1.0
type TextRole =
  | "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2"
  | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700}, Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700}, Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700}, Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500}, Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500},
}
function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

const LAYOUT_Z_LIFT = 0.02
const BUTTON_LABEL_Z = 0.08
const CARD_CONTENT_Z = 0.6
const READ_DISTANCE_CM = 80 // the panel sits about 80 cm from your eyes

@component
export class JumpwiseFoundBatteryUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseFoundBatteryUI – "Found battery" button + owner\'s manual card</span>')
  @ui.separator

  @ui.group_start("Settings")
  @input
  @hint("Label on the big button.")
  buttonLabel: string = "Found battery"

  @input
  @widget(new TextAreaWidget())
  @hint("Owner's manual line shown beside the button (brief wording).")
  manualText: string = "Some cars have remote jump points: check your owner's manual"

  @input
  @widget(new SliderWidget(12, 40, 0.5))
  @hint("Button width in cm (big target). Button + card must fit the view (~45 cm wide at this distance).")
  buttonWidthCm: number = 18

  @input
  @widget(new SliderWidget(4, 15, 0.5))
  @hint("Button height in cm.")
  buttonHeightCm: number = 8

  @input('vec4', '{1,1,1,1}')
  @widget(new ColorWidget())
  @hint("Text color (keep it light: the display is additive).")
  textColor: vec4
  @ui.group_end

  private _onFoundBattery = new Event<void>()
  get onFoundBattery(): PublicApi<void> { return this._onFoundBattery.publicApi() }

  private row!: SceneObject
  private visible = true
  private frames = 0

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const bb = this.sceneObject.createComponent(Billboard.getTypeName()) as Billboard
    bb.xAxisEnabled = true
    bb.yAxisEnabled = true

    const cardW = 18
    const cardH = 9
    const gap = 1.5
    this.row = this.obj(this.sceneObject, "Row")
    const flex = this.row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false // children are registered with addItems below
    flex.onInitialized.add(() => {
      flex.width = this.buttonWidthCm + gap + cardW
      flex.height = Math.max(this.buttonHeightCm, cardH)
      flex.direction = FlexDirection.Row
      flex.columnGap = gap
      flex.justifyContent = FlexJustify.Center
      flex.alignItems = FlexAlign.Center
    })

    // Big "Found battery" button: battery icon + label
    this.flexChild(this.row, "FoundBatteryButton", {w: this.buttonWidthCm, h: this.buttonHeightCm}, (so) => {
      const btn = so.createComponent(Button.getTypeName()) as Button
      btn.size = new vec3(this.buttonWidthCm, this.buttonHeightCm, 1)
      const face = this.obj(so, "Face", new vec3(0, 0, BUTTON_LABEL_Z))
      const faceFlex = face.createComponent(FlexLayout.getTypeName()) as FlexLayout
      faceFlex.autoDiscoverItemsOnStart = false // children are registered with addItems below
      faceFlex.onInitialized.add(() => {
        faceFlex.width = this.buttonWidthCm - 0.5
        faceFlex.height = this.buttonHeightCm - 0.5
        faceFlex.direction = FlexDirection.Row
        faceFlex.columnGap = 0.6
        faceFlex.justifyContent = FlexJustify.Center
        faceFlex.alignItems = FlexAlign.Center
      })
      this.addIcon(face, ICON_BATTERY, 3.6)
      // label cell sized to the text so icon + label sit together, centered
      this.addRowText(face, this.buttonLabel, "Headline2", Math.min(11.5, this.buttonWidthCm - 6))
      btn.onTriggerUp.add(() => {
        if (this.visible) this._onFoundBattery.invoke()
      })
    })

    // Owner's manual card: book icon + one line
    this.flexChild(this.row, "ManualCard", {w: cardW, h: cardH}, (card) => {
      const plate = card.createComponent(BackPlate.getTypeName()) as BackPlate
      plate.size = new vec2(cardW, cardH)
      const content = this.obj(card, "Content", new vec3(0, 0, CARD_CONTENT_Z))
      const cflex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
      cflex.autoDiscoverItemsOnStart = false // children are registered with addItems below
      cflex.onInitialized.add(() => {
        cflex.width = cardW - 1.5
        cflex.height = cardH - 1
        cflex.direction = FlexDirection.Row
        cflex.columnGap = 0.8
        cflex.justifyContent = FlexJustify.Center
        cflex.alignItems = FlexAlign.Center
      })
      this.addIcon(content, ICON_MANUAL, 3.2)
      const textW = cardW - 1.5 - 3.2 - 0.8
      const so = global.scene.createSceneObject("ManualText")
      so.setParent(content)
      const t = so.createComponent("Component.Text") as Text
      t.text = this.manualText
      t.depthTest = true
      applyTextRole(t, "Body", READ_DISTANCE_CM)
      t.horizontalAlignment = HorizontalAlignment.Left
      t.verticalAlignment = VerticalAlignment.Center
      t.horizontalOverflow = HorizontalOverflow.Wrap
      t.verticalOverflow = VerticalOverflow.Overflow
      t.layoutRect = Rect.create(-textW / 2, textW / 2, -(cardH - 1.5) / 2, (cardH - 1.5) / 2)
      t.textFill.color = this.textColor
      const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideWidth = textW
      item.overrideHeight = cardH - 1.5
      cflex.addItems([item])
    })

    this.createEvent("UpdateEvent").bind(() => {
      this.frames++
      // Toggle UIKit objects only after they have initialized (they init on OnStart).
      if (this.frames > 2 && this.row.enabled !== this.visible) this.row.enabled = this.visible
    })
  }

  show(): void { this.visible = true }
  hide(): void { this.visible = false }
  isShown(): boolean { return this.visible }

  // ── Layout helpers (from /specs-build-ui references/helpers.md)

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    if (position) so.getTransform().setLocalPosition(position)
    return so
  }

  private flexChild(parent: SceneObject, name: string, size: {w?: number; h?: number; grow?: number},
      builder: (child: SceneObject) => void): SceneObject {
    const child = this.obj(parent, name, new vec3(0, 0, LAYOUT_Z_LIFT))
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    if (size.w !== undefined && size.w > 0) item.overrideWidth = size.w
    if (size.h !== undefined && size.h > 0) item.overrideHeight = size.h
    item.flexGrow = size.grow ?? 0
    item.flexShrink = 0
    builder(child)
    const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (parentFlex) parentFlex.addItems([item])
    return child
  }

  private addRowText(parent: SceneObject, text: string, role: TextRole, widthCM: number): Text {
    const so = global.scene.createSceneObject("RowText")
    so.setParent(parent)
    const t = so.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    applyTextRole(t, role, READ_DISTANCE_CM)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-widthCM / 2, widthCM / 2, -1.5, 1.5)
    t.textFill.color = this.textColor
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = widthCM
    item.overrideHeight = 3
    const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (parentFlex) parentFlex.addItems([item])
    return t
  }

  private addIcon(parent: SceneObject, texture: Texture, sizeCM: number): void {
    const so = global.scene.createSceneObject("Icon")
    so.setParent(parent)
    const img = so.createComponent("Component.Image") as Image
    const mat = imageMaterial.clone()
    mat.mainPass.baseTex = texture
    mat.mainPass.depthTest = true
    mat.mainPass.depthWrite = false
    img.clearMaterials()
    img.addMaterial(mat)
    so.getTransform().setLocalScale(new vec3(sizeCM, sizeCM, 1))
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = sizeCM
    item.overrideHeight = sizeCM
    const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (parentFlex) parentFlex.addItems([item])
  }
}

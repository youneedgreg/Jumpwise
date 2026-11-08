/**
 * JumpwiseStepCardUI — the step card (~15 x 8 cm) and the big Next button beside it (passive view).
 *
 * Owns: one light-outlined card with one short line, an optional warning line style,
 * the Next button ("Start donor car"), and keeping the card beside an anchor
 * point (the current marker), turned to face you.
 * API (Main -> view): setMessage, showWarning, showNext, hideNext, setAnchor.
 * Events (view -> Main): onNext.
 * Must not: hold step state or decide what to say — Main pushes the text in.
 */

import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {addLightPlate} from "./JumpwiseLightPlate"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material
const ICON_NEXT = requireAsset("../Icons/arrow_forward.png") as Texture

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
const READ_DISTANCE_CM = 100 // the card sits about 1 m from your eyes

@component
export class JumpwiseStepCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseStepCardUI – step card + Next button</span>')
  @ui.separator

  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(10, 30, 0.5))
  @hint("Card width in cm (brief: about 15).")
  cardWidthCm: number = 15

  @input
  @widget(new SliderWidget(5, 16, 0.5))
  @hint("Card height in cm (brief: about 8).")
  cardHeightCm: number = 8

  @input
  @widget(new SliderWidget(0, 40, 0.5))
  @hint("How far to the right of the marker the card sits, in cm.")
  offsetRightCm: number = 19

  @input
  @widget(new SliderWidget(-20, 30, 0.5))
  @hint("How far above the marker the card sits, in cm.")
  offsetUpCm: number = 7

  @input('vec4', '{1,1,1,1}')
  @widget(new ColorWidget())
  @hint("Step text color (keep it light: the display is additive).")
  textColor: vec4

  @input('vec4', '{1,0.62,0.55,1}')
  @widget(new ColorWidget())
  @hint("Warning text color (light red).")
  warningColor: vec4
  @ui.group_end

  private _onNext = new Event<void>()
  get onNext(): PublicApi<void> { return this._onNext.publicApi() }

  private row!: SceneObject
  private nextItem!: SceneObject
  private messageText!: Text
  private nextLabel!: Text
  private camera = WorldCameraFinderProvider.getInstance()

  private anchor: vec3 | null = null
  private message = ""
  private warning: string | null = null
  private warningUntil = -1
  private nextVisible = false
  private frames = 0

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const bb = this.sceneObject.createComponent(Billboard.getTypeName()) as Billboard
    bb.xAxisEnabled = true
    bb.yAxisEnabled = true

    const nextW = 16
    const nextH = 7
    const gap = 1.5
    this.row = this.obj(this.sceneObject, "Row")
    const flex = this.row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.autoDiscoverItemsOnStart = false // children are registered with addItems below
    flex.onInitialized.add(() => {
      flex.width = this.cardWidthCm + gap + nextW
      flex.height = this.cardHeightCm
      flex.direction = FlexDirection.Row
      flex.columnGap = gap
      flex.justifyContent = FlexJustify.Start
      flex.alignItems = FlexAlign.Center
    })

    // Card
    this.flexChild(this.row, "Card", {w: this.cardWidthCm, h: this.cardHeightCm}, (card) => {
      // light outline plate (UIKit's BackPlate is dark grey: wrong for an additive display)
      addLightPlate(card, "Plate", this.cardWidthCm, this.cardHeightCm, 0.06)
      const content = this.obj(card, "Content", new vec3(0, 0, CARD_CONTENT_Z))
      const t = content.createComponent("Component.Text") as Text
      t.text = ""
      t.depthTest = true
      applyTextRole(t, "HeadlineXL", READ_DISTANCE_CM)
      t.horizontalAlignment = HorizontalAlignment.Center
      t.verticalAlignment = VerticalAlignment.Center
      t.horizontalOverflow = HorizontalOverflow.Wrap
      t.verticalOverflow = VerticalOverflow.Overflow
      const w = this.cardWidthCm - 2
      const h = this.cardHeightCm - 1.5
      t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
      t.textFill.color = this.textColor
      this.messageText = t
    })

    // Next button (hidden until Main asks for it)
    this.nextItem = this.flexChild(this.row, "NextButton", {w: nextW, h: nextH}, (so) => {
      const btn = so.createComponent(Button.getTypeName()) as Button
      // Ghost = clear face that only lights its edge on hover/press; the light outline below is the resting look
      btn.setVariant({theme: "SnapOS2", style: "Ghost"})
      btn.size = new vec3(nextW, nextH, 1)
      addLightPlate(so, "Outline", nextW, nextH, 0.1, 0.03) // in front of the Ghost face (it writes depth), behind the label
      const face = this.obj(so, "Face", new vec3(0, 0, BUTTON_LABEL_Z))
      const faceFlex = face.createComponent(FlexLayout.getTypeName()) as FlexLayout
      faceFlex.autoDiscoverItemsOnStart = false // children are registered with addItems below
      faceFlex.onInitialized.add(() => {
        faceFlex.width = nextW - 0.5
        faceFlex.height = nextH - 0.5
        faceFlex.direction = FlexDirection.Row
        faceFlex.columnGap = 0.4
        faceFlex.justifyContent = FlexJustify.Center
        faceFlex.alignItems = FlexAlign.Center
      })
      this.nextLabel = this.addRowText(face, "Start donor car", "Headline1", nextW - 3.6)
      this.addIcon(face, ICON_NEXT, 2.6)
      btn.onTriggerUp.add(() => {
        if (this.nextVisible) this._onNext.invoke()
      })
    })

    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  /** Main -> view: the one short line on the card. */
  setMessage(text: string): void {
    this.message = text
    this.warning = null
    this.refreshText()
  }

  /** Main -> view: a warning line for `seconds`, then back to the current message. */
  showWarning(text: string, seconds: number): void {
    this.warning = text
    this.warningUntil = getTime() + seconds
    this.refreshText()
  }

  showNext(label: string): void {
    this.nextVisible = true
    if (this.nextLabel) this.nextLabel.text = label
  }

  hideNext(): void {
    this.nextVisible = false
  }

  /** Main -> view: keep the card beside this point; null hides the card. */
  setAnchor(worldPos: vec3 | null): void {
    this.anchor = worldPos
    this.place()
  }

  getMessage(): string { return this.messageText ? this.messageText.text : "" }
  isWarningShown(): boolean { return this.warning !== null }
  isNextShown(): boolean { return this.nextVisible && this.anchor !== null }
  isShown(): boolean { return this.anchor !== null }
  getNextLabel(): string { return this.nextLabel ? this.nextLabel.text : "" }

  private refreshText(): void {
    if (!this.messageText) return
    if (this.warning !== null) {
      this.messageText.text = this.warning
      this.messageText.textFill.color = this.warningColor
    } else {
      this.messageText.text = this.message
      this.messageText.textFill.color = this.textColor
    }
  }

  private onUpdate(): void {
    this.frames++
    if (this.warning !== null && getTime() >= this.warningUntil) {
      this.warning = null
      this.refreshText()
    }
    // Toggle UIKit objects only after they have initialized (they init on OnStart).
    if (this.frames > 2) {
      const showRow = this.anchor !== null
      if (this.row.enabled !== showRow) this.row.enabled = showRow
      if (this.nextItem.enabled !== this.nextVisible) this.nextItem.enabled = this.nextVisible
    }
    this.place()
  }

  private place(): void {
    if (this.anchor === null) return
    const eye = this.camera.getTransform().getWorldPosition()
    let view = this.anchor.sub(eye)
    view = new vec3(view.x, 0, view.z)
    if (view.length < 0.001) view = new vec3(0, 0, -1)
    const right = view.normalize().cross(vec3.up()).normalize()
    const pos = this.anchor.add(right.uniformScale(this.offsetRightCm)).add(vec3.up().uniformScale(this.offsetUpCm))
    this.getTransform().setWorldPosition(pos)
  }

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
    t.horizontalOverflow = HorizontalOverflow.Shrink // long labels ("Dead car started") shrink to fit
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-widthCM / 2, widthCM / 2, -1.2, 1.2)
    t.textFill.color = this.textColor
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = widthCM
    item.overrideHeight = 2.4
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

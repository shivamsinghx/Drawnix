"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  DefaultStylePanel,
  StylePanelArrowheadPicker,
  StylePanelArrowKindPicker,
  StylePanelButtonPicker,
  StylePanelFillPicker,
  StylePanelFontPicker,
  StylePanelGeoShapePicker,
  StylePanelLabelAlignPicker,
  StylePanelOpacityPicker,
  StylePanelSection,
  StylePanelSizePicker,
  StylePanelSplinePicker,
  StylePanelSubheading,
  StylePanelTextAlignPicker,
  getColorStyleItems,
  useEditor,
  useStylePanelContext,
  useValue,
  type TLUiStylePanelProps,
} from "tldraw"

import { cn } from "@/lib/utils"
import {
  MIX_COLOR_NAMES,
  PALETTE_MIXES,
  createDrawnixTheme,
  getSavedPaletteMix,
  savePaletteMix,
  type PaletteMixId,
} from "@/components/canvas/drawnix-theme"

const MIX_COLOR_SET = new Set<string>(MIX_COLOR_NAMES)

const STROKE_STYLE_ITEMS = [
  { value: "solid", icon: "dash-solid" },
  { value: "dashed", icon: "dash-dashed" },
  { value: "dotted", icon: "dash-dotted" },
] as const

const SLOPPINESS_ITEMS = [
  { value: "solid", icon: "dash-solid" },
  { value: "draw", icon: "dash-draw" },
] as const

function DrawnixColorPicker() {
  const editor = useEditor()
  const { styles } = useStylePanelContext()
  const color = styles.get(DefaultColorStyle)
  const items = useValue(
    "drawnix color items",
    () => getColorStyleItems(editor.getCurrentTheme().colors[editor.getColorMode()]),
    [editor]
  )

  if (color === undefined) return null

  const classic = items.filter((item) => !MIX_COLOR_SET.has(item.value))
  const mix = items.filter((item) => MIX_COLOR_SET.has(item.value))

  return (
    <>
      <StylePanelSubheading>Color</StylePanelSubheading>
      <StylePanelButtonPicker
        title="Color"
        uiType="color"
        style={DefaultColorStyle}
        items={classic}
        value={color}
      />
      {mix.length > 0 ? (
        <>
          <StylePanelSubheading>Mix</StylePanelSubheading>
          <StylePanelButtonPicker
            title="Mix color"
            uiType="color"
            style={DefaultColorStyle}
            items={mix}
            value={color}
          />
        </>
      ) : null}
      <DrawnixPaletteMixes />
    </>
  )
}

function DrawnixPaletteMixes() {
  const editor = useEditor()
  const [mix, setMix] = useState<PaletteMixId>("classic")

  useEffect(() => {
    setMix(getSavedPaletteMix())
  }, [])

  const applyMix = useCallback(
    (next: PaletteMixId) => {
      setMix(next)
      savePaletteMix(next)
      editor.updateTheme(createDrawnixTheme(next))
    },
    [editor]
  )

  return (
    <div className="drawnix-palette-mixes">
      {PALETTE_MIXES.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn("drawnix-palette-mix", mix === option.id && "is-active")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => applyMix(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function DrawnixStrokeStylePicker() {
  const { styles } = useStylePanelContext()
  const dash = styles.get(DefaultDashStyle)
  if (dash === undefined) return null

  return (
    <>
      <StylePanelSubheading>Stroke style</StylePanelSubheading>
      <StylePanelButtonPicker
        title="Stroke style"
        uiType="dash"
        style={DefaultDashStyle}
        items={STROKE_STYLE_ITEMS}
        value={dash}
      />
    </>
  )
}

function DrawnixSloppinessPicker() {
  const { styles } = useStylePanelContext()
  const dash = styles.get(DefaultDashStyle)
  if (dash === undefined) return null

  return (
    <>
      <StylePanelSubheading>Sloppiness</StylePanelSubheading>
      <StylePanelButtonPicker
        title="Sloppiness"
        uiType="dash"
        style={DefaultDashStyle}
        items={SLOPPINESS_ITEMS}
        value={dash}
      />
    </>
  )
}

function DrawnixFillPicker() {
  const { styles } = useStylePanelContext()
  if (styles.get(DefaultFillStyle) === undefined) return null

  return (
    <>
      <StylePanelSubheading>Background</StylePanelSubheading>
      <StylePanelFillPicker />
    </>
  )
}

function DrawnixSizePicker() {
  const { styles } = useStylePanelContext()
  if (styles.get(DefaultSizeStyle) === undefined) return null
  const isStroke = styles.get(DefaultDashStyle) !== undefined

  return (
    <>
      <StylePanelSubheading>{isStroke ? "Stroke width" : "Size"}</StylePanelSubheading>
      <StylePanelSizePicker />
    </>
  )
}

function DrawnixFontPicker() {
  const { styles } = useStylePanelContext()
  if (styles.get(DefaultFontStyle) === undefined) return null

  return (
    <>
      <StylePanelSubheading>Font</StylePanelSubheading>
      <StylePanelFontPicker />
    </>
  )
}

export function DrawnixStylePanel(props: TLUiStylePanelProps) {
  return (
    <DefaultStylePanel {...props}>
      <StylePanelSection>
        <DrawnixColorPicker />
        <StylePanelOpacityPicker />
      </StylePanelSection>
      <StylePanelSection>
        <DrawnixFillPicker />
        <DrawnixStrokeStylePicker />
        <DrawnixSizePicker />
        <DrawnixSloppinessPicker />
      </StylePanelSection>
      <StylePanelSection>
        <DrawnixFontPicker />
        <StylePanelTextAlignPicker />
        <StylePanelLabelAlignPicker />
      </StylePanelSection>
      <StylePanelSection>
        <StylePanelGeoShapePicker />
        <StylePanelArrowKindPicker />
        <StylePanelArrowheadPicker />
        <StylePanelSplinePicker />
      </StylePanelSection>
    </DefaultStylePanel>
  )
}

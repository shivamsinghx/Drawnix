import type { TLDefaultColor, TLThemeFont } from "@tldraw/tlschema"

declare module "@tldraw/tlschema" {
  interface TLThemeDefaultColors {
    teal: TLDefaultColor
    coral: TLDefaultColor
    gold: TLDefaultColor
    navy: TLDefaultColor
    rose: TLDefaultColor
    indigo: TLDefaultColor
    mint: TLDefaultColor
    brown: TLDefaultColor
  }

  interface TLThemeFonts {
    hand: TLThemeFont
    rounded: TLThemeFont
    comic: TLThemeFont
    display: TLThemeFont
  }
}

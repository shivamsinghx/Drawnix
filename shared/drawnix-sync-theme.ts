import type { TLDefaultColor, TLThemes } from "@tldraw/tlschema"

const dummyColor: TLDefaultColor = {
  solid: "#111111",
  fill: "#111111",
  linedFill: "#dddddd",
  semi: "#dddddd",
  pattern: "#111111",
  frameHeadingStroke: "#111111",
  frameHeadingFill: "#dddddd",
  frameStroke: "#111111",
  frameFill: "#dddddd",
  frameText: "#111111",
  noteFill: "#dddddd",
  noteText: "#111111",
  highlightSrgb: "#111111",
  highlightP3: "#111111",
}

const dummyFont = { fontFamily: "sans-serif", icon: "Aa" }

const colorNames = [
  "black",
  "grey",
  "light-violet",
  "violet",
  "blue",
  "light-blue",
  "yellow",
  "orange",
  "green",
  "light-green",
  "light-red",
  "red",
  "white",
  "teal",
  "coral",
  "gold",
  "navy",
  "rose",
  "indigo",
  "mint",
  "brown",
] as const

function colorPalette() {
  return Object.fromEntries(colorNames.map((name) => [name, dummyColor]))
}

export const drawnixSyncThemes = {
  default: {
    id: "default",
    fonts: {
      draw: dummyFont,
      sans: dummyFont,
      serif: dummyFont,
      mono: dummyFont,
      hand: dummyFont,
      rounded: dummyFont,
      comic: dummyFont,
      display: dummyFont,
    },
    colors: {
      light: colorPalette(),
      dark: colorPalette(),
    },
  },
} as unknown as TLThemes

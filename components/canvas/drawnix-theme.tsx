"use client"

import { Caveat, Comic_Neue, Nunito, Oswald } from "next/font/google"
import {
  DEFAULT_THEME,
  type TLDefaultColor,
  type TLTheme,
  type TLThemeFont,
  type TLThemes,
  type TLUiOverrides,
} from "tldraw"

const caveat = Caveat({ subsets: ["latin"], weight: ["400", "700"] })
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "700"] })
const comicNeue = Comic_Neue({ subsets: ["latin"], weight: ["400", "700"] })
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "700"] })

export const MIX_COLOR_NAMES = [
  "teal",
  "coral",
  "gold",
  "navy",
  "rose",
  "indigo",
  "mint",
  "brown",
] as const

export type PaletteMixId = "classic" | "pastel" | "vibrant" | "earth"

export const PALETTE_MIXES: { id: PaletteMixId; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "pastel", label: "Pastel" },
  { id: "vibrant", label: "Vibrant" },
  { id: "earth", label: "Earth" },
]

const PALETTE_STORAGE_KEY = "drawnix:palette-mix"

export function getSavedPaletteMix(): PaletteMixId {
  if (typeof window === "undefined") return "classic"
  try {
    const saved = window.localStorage.getItem(PALETTE_STORAGE_KEY)
    if (saved === "classic" || saved === "pastel" || saved === "vibrant" || saved === "earth") {
      return saved
    }
  } catch {
    // ignore storage failures
  }
  return "classic"
}

export function savePaletteMix(mix: PaletteMixId) {
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, mix)
  } catch {
    // ignore storage failures
  }
}

function makeColor(solid: string, muted: string): TLDefaultColor {
  return {
    solid,
    fill: solid,
    linedFill: muted,
    semi: muted,
    pattern: solid,
    frameHeadingStroke: solid,
    frameHeadingFill: muted,
    frameStroke: solid,
    frameFill: muted,
    frameText: solid,
    noteFill: muted,
    noteText: solid,
    highlightSrgb: solid,
    highlightP3: solid,
  }
}

function fontIcon(fontFamily: string): TLThemeFont["icon"] {
  return (
    <span style={{ fontFamily, fontSize: 15, lineHeight: 1, fontWeight: 600 }}>
      Aa
    </span>
  )
}

function themeFont(fontFamily: string): TLThemeFont {
  return {
    fontFamily: `${fontFamily}, sans-serif`,
    icon: fontIcon(fontFamily),
  }
}

const extraFonts = {
  hand: {
    fontFamily: `${caveat.style.fontFamily}, cursive`,
    icon: fontIcon(caveat.style.fontFamily),
  },
  rounded: themeFont(nunito.style.fontFamily),
  comic: {
    fontFamily: `${comicNeue.style.fontFamily}, cursive`,
    icon: fontIcon(comicNeue.style.fontFamily),
  },
  display: themeFont(oswald.style.fontFamily),
} satisfies Pick<TLTheme["fonts"], "hand" | "rounded" | "comic" | "display">

const classicMix = {
  light: {
    teal: makeColor("#0f766e", "#ccfbf1"),
    coral: makeColor("#f43f5e", "#ffe4e6"),
    gold: makeColor("#ca8a04", "#fef9c3"),
    navy: makeColor("#1e3a8a", "#dbeafe"),
    rose: makeColor("#e11d48", "#ffe4e6"),
    indigo: makeColor("#4f46e5", "#e0e7ff"),
    mint: makeColor("#10b981", "#d1fae5"),
    brown: makeColor("#92400e", "#fde68a"),
  },
  dark: {
    teal: makeColor("#2dd4bf", "#134e4a"),
    coral: makeColor("#fb7185", "#4c0519"),
    gold: makeColor("#facc15", "#422006"),
    navy: makeColor("#93c5fd", "#1e3a8a"),
    rose: makeColor("#fb7185", "#4c0519"),
    indigo: makeColor("#a5b4fc", "#312e81"),
    mint: makeColor("#6ee7b7", "#064e3b"),
    brown: makeColor("#fbbf24", "#451a03"),
  },
}

const pastelOverrides = {
  light: {
    black: makeColor("#6b7280", "#f3f4f6"),
    grey: makeColor("#d1d5db", "#f9fafb"),
    "light-violet": makeColor("#e9d5ff", "#faf5ff"),
    violet: makeColor("#c4b5fd", "#f5f3ff"),
    blue: makeColor("#93c5fd", "#eff6ff"),
    "light-blue": makeColor("#bae6fd", "#f0f9ff"),
    yellow: makeColor("#fde68a", "#fffbeb"),
    orange: makeColor("#fdba74", "#fff7ed"),
    green: makeColor("#86efac", "#ecfdf5"),
    "light-green": makeColor("#bbf7d0", "#f0fdf4"),
    "light-red": makeColor("#fecaca", "#fef2f2"),
    red: makeColor("#fca5a5", "#fef2f2"),
    teal: makeColor("#99f6e4", "#f0fdfa"),
    coral: makeColor("#fda4af", "#fff1f2"),
    gold: makeColor("#fde68a", "#fffbeb"),
    navy: makeColor("#a5b4fc", "#eef2ff"),
    rose: makeColor("#f9a8d4", "#fdf2f8"),
    indigo: makeColor("#c7d2fe", "#eef2ff"),
    mint: makeColor("#a7f3d0", "#ecfdf5"),
    brown: makeColor("#d6b48a", "#faf6f1"),
  },
  dark: {
    black: makeColor("#d1d5db", "#374151"),
    grey: makeColor("#9ca3af", "#1f2937"),
    "light-violet": makeColor("#e9d5ff", "#3b0764"),
    violet: makeColor("#ddd6fe", "#2e1065"),
    blue: makeColor("#bfdbfe", "#1e3a8a"),
    "light-blue": makeColor("#bae6fd", "#0c4a6e"),
    yellow: makeColor("#fde68a", "#422006"),
    orange: makeColor("#fdba74", "#7c2d12"),
    green: makeColor("#bbf7d0", "#14532d"),
    "light-green": makeColor("#dcfce7", "#14532d"),
    "light-red": makeColor("#fecaca", "#7f1d1d"),
    red: makeColor("#fca5a5", "#7f1d1d"),
    teal: makeColor("#99f6e4", "#134e4a"),
    coral: makeColor("#fda4af", "#4c0519"),
    gold: makeColor("#fde68a", "#422006"),
    navy: makeColor("#c7d2fe", "#1e3a8a"),
    rose: makeColor("#f9a8d4", "#831843"),
    indigo: makeColor("#c7d2fe", "#312e81"),
    mint: makeColor("#a7f3d0", "#064e3b"),
    brown: makeColor("#e7d3b4", "#451a03"),
  },
}

const vibrantOverrides = {
  light: {
    black: makeColor("#111827", "#e5e7eb"),
    grey: makeColor("#4b5563", "#e5e7eb"),
    "light-violet": makeColor("#d946ef", "#fae8ff"),
    violet: makeColor("#7c3aed", "#ede9fe"),
    blue: makeColor("#2563eb", "#dbeafe"),
    "light-blue": makeColor("#06b6d4", "#cffafe"),
    yellow: makeColor("#eab308", "#fef9c3"),
    orange: makeColor("#f97316", "#ffedd5"),
    green: makeColor("#16a34a", "#dcfce7"),
    "light-green": makeColor("#22c55e", "#dcfce7"),
    "light-red": makeColor("#fb7185", "#ffe4e6"),
    red: makeColor("#dc2626", "#fee2e2"),
    teal: makeColor("#14b8a6", "#ccfbf1"),
    coral: makeColor("#ff2d55", "#ffe4e6"),
    gold: makeColor("#f59e0b", "#fef3c7"),
    navy: makeColor("#1d4ed8", "#dbeafe"),
    rose: makeColor("#e11d48", "#ffe4e6"),
    indigo: makeColor("#4f46e5", "#e0e7ff"),
    mint: makeColor("#10b981", "#d1fae5"),
    brown: makeColor("#b45309", "#fde68a"),
  },
  dark: {
    black: makeColor("#f8fafc", "#334155"),
    grey: makeColor("#cbd5e1", "#1e293b"),
    "light-violet": makeColor("#e879f9", "#4a044e"),
    violet: makeColor("#a78bfa", "#3b0764"),
    blue: makeColor("#60a5fa", "#1e3a8a"),
    "light-blue": makeColor("#22d3ee", "#164e63"),
    yellow: makeColor("#facc15", "#713f12"),
    orange: makeColor("#fb923c", "#7c2d12"),
    green: makeColor("#4ade80", "#14532d"),
    "light-green": makeColor("#86efac", "#14532d"),
    "light-red": makeColor("#fb7185", "#881337"),
    red: makeColor("#f87171", "#7f1d1d"),
    teal: makeColor("#2dd4bf", "#115e59"),
    coral: makeColor("#ff4d6d", "#4c0519"),
    gold: makeColor("#fbbf24", "#78350f"),
    navy: makeColor("#93c5fd", "#1e3a8a"),
    rose: makeColor("#fb7185", "#4c0519"),
    indigo: makeColor("#818cf8", "#312e81"),
    mint: makeColor("#34d399", "#064e3b"),
    brown: makeColor("#f59e0b", "#451a03"),
  },
}

const earthOverrides = {
  light: {
    black: makeColor("#44403c", "#e7e5e4"),
    grey: makeColor("#a8a29e", "#f5f5f4"),
    "light-violet": makeColor("#a8a29e", "#f5f5f4"),
    violet: makeColor("#78716c", "#e7e5e4"),
    blue: makeColor("#57534e", "#e7e5e4"),
    "light-blue": makeColor("#0f766e", "#ccfbf1"),
    yellow: makeColor("#ca8a04", "#fef9c3"),
    orange: makeColor("#b45309", "#ffedd5"),
    green: makeColor("#3f6212", "#ecfccb"),
    "light-green": makeColor("#65a30d", "#ecfccb"),
    "light-red": makeColor("#c2410c", "#ffedd5"),
    red: makeColor("#9a3412", "#ffedd5"),
    teal: makeColor("#115e59", "#ccfbf1"),
    coral: makeColor("#c2410c", "#ffedd5"),
    gold: makeColor("#a16207", "#fef9c3"),
    navy: makeColor("#44403c", "#e7e5e4"),
    rose: makeColor("#9f1239", "#ffe4e6"),
    indigo: makeColor("#57534e", "#e7e5e4"),
    mint: makeColor("#4d7c0f", "#ecfccb"),
    brown: makeColor("#7c2d12", "#fed7aa"),
  },
  dark: {
    black: makeColor("#e7e5e4", "#292524"),
    grey: makeColor("#a8a29e", "#1c1917"),
    "light-violet": makeColor("#d6d3d1", "#292524"),
    violet: makeColor("#a8a29e", "#1c1917"),
    blue: makeColor("#d6d3d1", "#292524"),
    "light-blue": makeColor("#5eead4", "#134e4a"),
    yellow: makeColor("#facc15", "#422006"),
    orange: makeColor("#fb923c", "#7c2d12"),
    green: makeColor("#a3e635", "#365314"),
    "light-green": makeColor("#bef264", "#365314"),
    "light-red": makeColor("#fb923c", "#7c2d12"),
    red: makeColor("#f97316", "#7c2d12"),
    teal: makeColor("#2dd4bf", "#134e4a"),
    coral: makeColor("#fb923c", "#7c2d12"),
    gold: makeColor("#fbbf24", "#422006"),
    navy: makeColor("#d6d3d1", "#1c1917"),
    rose: makeColor("#fb7185", "#4c0519"),
    indigo: makeColor("#a8a29e", "#1c1917"),
    mint: makeColor("#a3e635", "#365314"),
    brown: makeColor("#fdba74", "#431407"),
  },
}

function mixOverrides(mix: PaletteMixId) {
  if (mix === "pastel") return pastelOverrides
  if (mix === "vibrant") return vibrantOverrides
  if (mix === "earth") return earthOverrides
  return classicMix
}

export function createDrawnixTheme(mix: PaletteMixId = "classic"): TLTheme {
  const overlay = mixOverrides(mix)
  return {
    ...DEFAULT_THEME,
    id: "default",
    fonts: {
      ...DEFAULT_THEME.fonts,
      ...extraFonts,
    },
    colors: {
      light: {
        ...DEFAULT_THEME.colors.light,
        ...classicMix.light,
        ...overlay.light,
      },
      dark: {
        ...DEFAULT_THEME.colors.dark,
        ...classicMix.dark,
        ...overlay.dark,
      },
    },
  }
}

export const drawnixThemes: Partial<TLThemes> = {
  default: createDrawnixTheme("classic"),
}

export const drawnixUiOverrides: TLUiOverrides = {
  translations: {
    en: {
      "style-panel.fill": "Background",
      "style-panel.dash": "Stroke style",
      "style-panel.size": "Stroke width",
      "style-panel.opacity": "Opacity",
      "style-panel.font": "Font",
      "dash-style.draw": "Sketchy",
      "dash-style.solid": "Solid",
      "dash-style.dashed": "Dashed",
      "dash-style.dotted": "Dotted",
      "fill-style.none": "None",
      "fill-style.semi": "Tint",
      "fill-style.solid": "Solid",
      "fill-style.pattern": "Hatch",
      "fill-style.lined-fill": "Lined",
      "fill-style.fill": "Filled",
      "color-style.teal": "Teal",
      "color-style.coral": "Coral",
      "color-style.gold": "Gold",
      "color-style.navy": "Navy",
      "color-style.rose": "Rose",
      "color-style.indigo": "Indigo",
      "color-style.mint": "Mint",
      "color-style.brown": "Brown",
      "font-style.hand": "Hand",
      "font-style.rounded": "Rounded",
      "font-style.comic": "Comic",
      "font-style.display": "Display",
    },
  },
}

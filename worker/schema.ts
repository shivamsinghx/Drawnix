import {
  createTLSchema,
  defaultBindingSchemas,
  defaultShapeSchemas,
  registerColorsFromThemes,
  registerFontsFromThemes,
} from "@tldraw/tlschema"

import { drawnixSyncThemes } from "../shared/drawnix-sync-theme"

registerColorsFromThemes(drawnixSyncThemes)
registerFontsFromThemes(drawnixSyncThemes)

export const drawnixSyncSchema = createTLSchema({
  shapes: defaultShapeSchemas,
  bindings: defaultBindingSchemas,
})

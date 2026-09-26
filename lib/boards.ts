export const BOARD_NAME_MAX_LENGTH = 80

export function parseBoardName(
  value: unknown
): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "A board name is required" }
  }
  const name = value.trim()
  if (!name) {
    return { ok: false, error: "A board name is required" }
  }
  if (name.length > BOARD_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Board name must be ${BOARD_NAME_MAX_LENGTH} characters or fewer`,
    }
  }
  return { ok: true, name }
}

export type Board = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type SharedBoard = Board & {
  sharedBy: string
}

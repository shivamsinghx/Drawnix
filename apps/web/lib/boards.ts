export type Board = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

function storageKey(userId: string) {
  return `drawnix.boards.${userId}`
}

function readBoards(userId: string): Board[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Board[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeBoards(userId: string, boards: Board[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(boards))
}

export function listBoards(userId: string) {
  return readBoards(userId).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  )
}

export function getBoard(userId: string, boardId: string) {
  return readBoards(userId).find((board) => board.id === boardId) ?? null
}

export function createBoard(userId: string, title = "Untitled board") {
  const now = new Date().toISOString()
  const board: Board = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
  }
  writeBoards(userId, [board, ...readBoards(userId)])
  return board
}

export function touchBoard(userId: string, boardId: string) {
  const boards = readBoards(userId).map((board) =>
    board.id === boardId ? { ...board, updatedAt: new Date().toISOString() } : board
  )
  writeBoards(userId, boards)
}

function canvasKey(userId: string, boardId: string) {
  return `drawnix.canvas.${userId}.${boardId}`
}

export function deleteBoards(userId: string, boardIds: string[]) {
  if (boardIds.length === 0) return listBoards(userId)

  const remove = new Set(boardIds)
  writeBoards(
    userId,
    readBoards(userId).filter((board) => !remove.has(board.id))
  )

  for (const boardId of boardIds) {
    try {
      window.localStorage.removeItem(canvasKey(userId, boardId))
    } catch {
      // Ignore storage errors so the board list still updates.
    }
  }

  return listBoards(userId)
}

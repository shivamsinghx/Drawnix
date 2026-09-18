import { Prisma } from "@/generated/prisma/client"
import {
  accessibleBoardWhere,
  getBoardAccess,
} from "@/lib/board-access"
import type { Board } from "@/lib/boards"
import { prisma } from "@/lib/prisma"
import { canEditRole, type BoardRole } from "@/shared/sync-token"

export type BoardCollaborationAccess = {
  board: {
    id: string
    name: string
  }
  role: BoardRole
  canEdit: boolean
  hasLegacySnapshot: boolean
}

function toBoard(row: {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}): Board {
  return {
    id: row.id,
    title: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function jsonHasLegacySnapshot(data: Prisma.JsonValue): boolean {
  if (data == null) return false
  if (typeof data === "object" && !Array.isArray(data)) {
    return Object.keys(data).length > 0
  }
  return true
}

async function getOrCreateWorkspace(userId: string) {
  const existing = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  })
  if (existing) return existing

  return prisma.workspace.create({
    data: {
      name: "My workspace",
      ownerId: userId,
    },
  })
}

export async function listBoards(userId: string): Promise<Board[]> {
  const rows = await prisma.board.findMany({
    where: accessibleBoardWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return rows.map(toBoard)
}

export async function createBoard(userId: string, name: string): Promise<Board> {
  const workspace = await getOrCreateWorkspace(userId)

  const row = await prisma.board.create({
    data: {
      name,
      data: {},
      createdBy: userId,
      workspaceId: workspace.id,
      members: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return toBoard(row)
}

export async function getAccessibleBoard(userId: string, boardId: string) {
  const access = await getBoardAccess(boardId, userId)
  if (!access.allowed) return null

  return prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: {
      id: true,
      name: true,
      data: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getBoardCollaborationAccess(
  userId: string,
  boardId: string
): Promise<BoardCollaborationAccess | null> {
  const access = await getBoardAccess(boardId, userId)
  if (!access.allowed) return null

  const board = await prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: {
      id: true,
      name: true,
      data: true,
    },
  })
  if (!board) return null

  return {
    board: { id: board.id, name: board.name },
    role: access.role,
    canEdit: canEditRole(access.role),
    hasLegacySnapshot: jsonHasLegacySnapshot(board.data),
  }
}

export async function getBoardSnapshot(boardId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: { id: true, data: true },
  })
}

export async function cacheBoardSnapshot(
  boardId: string,
  data: Prisma.InputJsonValue
) {
  const existing = await prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: { id: true },
  })
  if (!existing) return null

  return prisma.board.update({
    where: { id: boardId },
    data: { data },
    select: { id: true, updatedAt: true },
  })
}

export async function saveBoardData(
  userId: string,
  boardId: string,
  data: Prisma.InputJsonValue
) {
  const access = await getBoardAccess(boardId, userId)
  if (!access.allowed) return null
  if (!canEditRole(access.role)) return "forbidden" as const

  return prisma.board.update({
    where: { id: boardId },
    data: { data },
    select: { id: true, updatedAt: true },
  })
}

export async function deleteBoards(userId: string, boardIds: string[]) {
  if (boardIds.length === 0) return listBoards(userId)

  await prisma.board.updateMany({
    where: {
      id: { in: boardIds },
      ...accessibleBoardWhere(userId),
    },
    data: { deletedAt: new Date() },
  })

  return listBoards(userId)
}

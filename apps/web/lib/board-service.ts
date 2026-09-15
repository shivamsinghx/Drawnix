import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { Board } from "@/lib/boards"

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

const accessibleWhere = (userId: string) => ({
  deletedAt: null,
  OR: [
    { workspace: { ownerId: userId } },
    { members: { some: { userId } } },
  ],
})

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
    where: accessibleWhere(userId),
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
  return prisma.board.findFirst({
    where: {
      id: boardId,
      ...accessibleWhere(userId),
    },
    select: {
      id: true,
      name: true,
      data: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function saveBoardData(
  userId: string,
  boardId: string,
  data: Prisma.InputJsonValue
) {
  const existing = await prisma.board.findFirst({
    where: {
      id: boardId,
      ...accessibleWhere(userId),
    },
    select: { id: true },
  })

  if (!existing) return null

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
      ...accessibleWhere(userId),
    },
    data: { deletedAt: new Date() },
  })

  return listBoards(userId)
}

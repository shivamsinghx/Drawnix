import { Prisma } from "@/generated/prisma/client"
import {
  accessibleBoardWhere,
  effectiveBoardRole,
  getBoardAccess,
  ownedBoardWhere,
  sharedWithMeBoardWhere,
} from "@/lib/board-access"
import { parseBoardName, type Board, type SharedBoard } from "@/lib/boards"
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

function sharerLabel(owner: { name: string | null; email: string | null }) {
  const name = owner.name?.trim()
  if (name) return name
  const email = owner.email?.trim()
  if (email) return email
  return "Someone"
}

const boardListSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * Same result as inspecting Board.data in process:
 * null is absent, an empty object is absent, any other JSON value is present.
 * Evaluated in SQL so the document is not returned to the app.
 */
function legacySnapshotSql() {
  return Prisma.sql`
    CASE
      WHEN b.data IS NULL THEN false
      WHEN jsonb_typeof(b.data) = 'object' THEN (b.data <> '{}'::jsonb)
      ELSE true
    END
  `
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
    select: boardListSelect,
  })

  return rows.map(toBoard)
}

export async function listOwnedBoards(userId: string): Promise<Board[]> {
  const rows = await prisma.board.findMany({
    where: ownedBoardWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: boardListSelect,
  })

  return rows.map(toBoard)
}

export async function listSharedBoards(userId: string): Promise<SharedBoard[]> {
  const rows = await prisma.board.findMany({
    where: sharedWithMeBoardWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: {
      ...boardListSelect,
      workspace: {
        select: {
          owner: {
            select: { name: true, email: true },
          },
        },
      },
    },
  })

  return rows.map((row) => ({
    ...toBoard(row),
    sharedBy: sharerLabel(row.workspace.owner),
  }))
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
  if (!boardId || !userId) return null

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      name: string
      ownerId: string
      memberRole: string | null
      hasLegacySnapshot: boolean
    }>
  >`
    SELECT
      b.id,
      b.name,
      w."ownerId" AS "ownerId",
      m.role AS "memberRole",
      ${legacySnapshotSql()} AS "hasLegacySnapshot"
    FROM "Board" b
    INNER JOIN "Workspace" w ON w.id = b."workspaceId"
    LEFT JOIN "BoardMember" m
      ON m."boardId" = b.id AND m."userId" = ${userId}
    WHERE b.id = ${boardId}
      AND b."deletedAt" IS NULL
    LIMIT 1
  `
  const board = rows[0]
  if (!board) return null

  const role = effectiveBoardRole({
    userId,
    workspaceOwnerId: board.ownerId,
    memberRole: board.memberRole,
  })
  if (!role) return null

  return {
    board: { id: board.id, name: board.name },
    role,
    canEdit: canEditRole(role),
    hasLegacySnapshot: Boolean(board.hasLegacySnapshot),
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

export async function renameBoard(userId: string, boardId: string, nameInput: unknown) {
  const access = await getBoardAccess(boardId, userId)
  if (!access.allowed) {
    return { ok: false as const, status: 404 as const, error: "Not found" }
  }
  if (access.role !== "owner") {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Only the board owner can rename this board",
    }
  }

  const parsed = parseBoardName(nameInput)
  if (!parsed.ok) {
    return { ok: false as const, status: 400 as const, error: parsed.error }
  }

  await prisma.board.update({
    where: { id: boardId },
    data: { name: parsed.name },
  })

  return { ok: true as const, name: parsed.name }
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
      ...ownedBoardWhere(userId),
    },
    data: { deletedAt: new Date() },
  })

  return listBoards(userId)
}

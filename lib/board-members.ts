import { Prisma } from "@/generated/prisma/client"
import { getBoardAccess, type BoardRole } from "@/lib/board-access"
import { prisma } from "@/lib/prisma"

export type AssignableBoardRole = "editor" | "viewer"

export type PublicBoardMember = {
  userId: string
  role: BoardRole
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

export type BoardMemberOk<T> = {
  ok: true
  status: 200 | 201
  data: T
}

export type BoardMemberError = {
  ok: false
  status: 400 | 403 | 404 | 409
  error: string
}

export type BoardMemberResult<T> = BoardMemberOk<T> | BoardMemberError

const memberSelect = {
  userId: true,
  role: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
} as const

const ROLE_ORDER: Record<BoardRole, number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return email.length > 0 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function parseAssignableBoardRole(
  value: unknown
): AssignableBoardRole | null {
  if (value === "editor" || value === "viewer") return value
  return null
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

function toPublicMember(row: {
  userId: string
  role: string
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}): PublicBoardMember {
  const role: BoardRole =
    row.role === "owner" || row.role === "editor" || row.role === "viewer"
      ? row.role
      : "viewer"

  return {
    userId: row.userId,
    role,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
    },
  }
}

async function authorizeOwner(
  actorUserId: string,
  boardId: string
): Promise<BoardMemberError | { ok: true }> {
  const access = await getBoardAccess(boardId, actorUserId)
  if (!access.allowed) {
    return { ok: false, status: 404, error: "Not found" }
  }
  if (access.role !== "owner") {
    return {
      ok: false,
      status: 403,
      error: "Only the board owner can manage members",
    }
  }
  return { ok: true }
}

async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  })
}

async function findMember(boardId: string, userId: string) {
  return prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
    select: memberSelect,
  })
}

/**
 * List members of a board. `actorUserId` must be the Auth.js session user id.
 */
export async function listBoardMembers(
  actorUserId: string,
  boardId: string
): Promise<BoardMemberResult<{ members: PublicBoardMember[] }>> {
  const authz = await authorizeOwner(actorUserId, boardId)
  if (!authz.ok) return authz

  const rows = await prisma.boardMember.findMany({
    where: { boardId },
    select: memberSelect,
  })

  const members = rows
    .map(toPublicMember)
    .sort((left, right) => {
      const roleDelta = ROLE_ORDER[left.role] - ROLE_ORDER[right.role]
      if (roleDelta !== 0) return roleDelta
      return (left.user.email ?? "").localeCompare(right.user.email ?? "")
    })

  return { ok: true, status: 200, data: { members } }
}

/**
 * Add an existing Drawnix user by email. `actorUserId` must be the session user id.
 * `role` is validated server-side; "owner" is never accepted.
 */
export async function addBoardMember(
  actorUserId: string,
  boardId: string,
  emailInput: string,
  roleInput: unknown
): Promise<BoardMemberResult<{ member: PublicBoardMember }>> {
  const authz = await authorizeOwner(actorUserId, boardId)
  if (!authz.ok) return authz

  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: "A valid email is required" }
  }

  const role = parseAssignableBoardRole(roleInput)
  if (!role) {
    return {
      ok: false,
      status: 400,
      error: "Role must be editor or viewer",
    }
  }

  const target = await findUserByEmail(email)
  if (!target) {
    return {
      ok: false,
      status: 404,
      error: "No Drawnix user with that email",
    }
  }

  const existing = await findMember(boardId, target.id)
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "This user is already a member of the board",
    }
  }

  const targetAccess = await getBoardAccess(boardId, target.id)
  if (targetAccess.allowed && targetAccess.role === "owner") {
    return {
      ok: false,
      status: 409,
      error: "This user is already the board owner",
    }
  }

  try {
    const created = await prisma.boardMember.create({
      data: {
        boardId,
        userId: target.id,
        role,
      },
      select: memberSelect,
    })
    return { ok: true, status: 201, data: { member: toPublicMember(created) } }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        status: 409,
        error: "This user is already a member of the board",
      }
    }
    throw error
  }
}

/**
 * Change a member's role. Target `userId` is the member resource, not the actor.
 */
export async function updateBoardMemberRole(
  actorUserId: string,
  boardId: string,
  targetUserId: string,
  roleInput: unknown
): Promise<BoardMemberResult<{ member: PublicBoardMember }>> {
  const authz = await authorizeOwner(actorUserId, boardId)
  if (!authz.ok) return authz

  const role = parseAssignableBoardRole(roleInput)
  if (!role) {
    return {
      ok: false,
      status: 400,
      error: "Role must be editor or viewer",
    }
  }

  const member = await findMember(boardId, targetUserId)
  if (!member) {
    return { ok: false, status: 404, error: "Member not found" }
  }

  const targetAccess = await getBoardAccess(boardId, targetUserId)
  if (targetAccess.allowed && targetAccess.role === "owner") {
    return {
      ok: false,
      status: 400,
      error: "The board owner role cannot be changed",
    }
  }

  const updated = await prisma.boardMember.update({
    where: {
      boardId_userId: { boardId, userId: targetUserId },
    },
    data: { role },
    select: memberSelect,
  })

  return { ok: true, status: 200, data: { member: toPublicMember(updated) } }
}

/**
 * Remove a BoardMember row only. Does not delete User, Board, or OAuth accounts.
 */
export async function removeBoardMember(
  actorUserId: string,
  boardId: string,
  targetUserId: string
): Promise<BoardMemberResult<{ ok: true }>> {
  const authz = await authorizeOwner(actorUserId, boardId)
  if (!authz.ok) return authz

  const member = await findMember(boardId, targetUserId)
  if (!member) {
    return { ok: false, status: 404, error: "Member not found" }
  }

  if (targetUserId === actorUserId) {
    return {
      ok: false,
      status: 400,
      error: "The board owner cannot remove themselves",
    }
  }

  const targetAccess = await getBoardAccess(boardId, targetUserId)
  if (targetAccess.allowed && targetAccess.role === "owner") {
    return {
      ok: false,
      status: 400,
      error: "The board owner cannot be removed",
    }
  }

  await prisma.boardMember.delete({
    where: {
      boardId_userId: { boardId, userId: targetUserId },
    },
  })

  return { ok: true, status: 200, data: { ok: true } }
}

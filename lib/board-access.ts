import type { Prisma } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import {
  normalizeBoardRole,
  type BoardRole,
} from "@/shared/sync-token"

export type { BoardRole }

export type BoardAccess =
  | {
      allowed: true
      role: BoardRole
    }
  | {
      allowed: false
    }

export type CurrentUserBoardAccess = {
  user: Awaited<ReturnType<typeof getCurrentUser>>
  access: BoardAccess
}

/**
 * Prisma filter for boards the user may access: workspace owner or BoardMember.
 * Matches {@link getBoardAccess} allow/deny rules, including soft-deleted boards.
 */
export function accessibleBoardWhere(userId: string): Prisma.BoardWhereInput {
  return {
    deletedAt: null,
    OR: [{ workspace: { ownerId: userId } }, { members: { some: { userId } } }],
  }
}

function effectiveBoardRole(input: {
  userId: string
  workspaceOwnerId: string
  memberRole: string | null
}): BoardRole | null {
  const isWorkspaceOwner = input.workspaceOwnerId === input.userId
  if (!isWorkspaceOwner && input.memberRole == null) return null
  return isWorkspaceOwner ? "owner" : normalizeBoardRole(input.memberRole)
}

/**
 * Resolves whether `userId` may access `boardId` and their effective role.
 *
 * `userId` must be the authenticated Auth.js session user id. Do not pass a
 * client-supplied id.
 */
export async function getBoardAccess(
  boardId: string,
  userId: string
): Promise<BoardAccess> {
  if (!boardId || !userId) return { allowed: false }

  const board = await prisma.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: {
      workspace: {
        select: { ownerId: true },
      },
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  })

  if (!board) return { allowed: false }

  const role = effectiveBoardRole({
    userId,
    workspaceOwnerId: board.workspace.ownerId,
    memberRole: board.members[0]?.role ?? null,
  })
  if (!role) return { allowed: false }

  return { allowed: true, role }
}

/**
 * Same as {@link getBoardAccess}, but the user always comes from the Auth.js
 * session via {@link getCurrentUser}.
 */
export async function getBoardAccessForCurrentUser(
  boardId: string
): Promise<CurrentUserBoardAccess> {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, access: { allowed: false } }
  }

  return {
    user,
    access: await getBoardAccess(boardId, user.id),
  }
}

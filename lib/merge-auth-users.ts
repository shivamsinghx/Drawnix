import { prisma } from "@/lib/prisma"

const ROLE_RANK: Record<string, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
}

function normalizeEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase()
  return value ? value : null
}

function preferredRole(left: string, right: string) {
  const leftRank = ROLE_RANK[left] ?? 0
  const rightRank = ROLE_RANK[right] ?? 0
  return leftRank >= rightRank ? left : right
}

export function emailsAllowMerge(
  leftEmail: string | null | undefined,
  rightEmail: string | null | undefined,
  incomingEmail?: string | null
) {
  const emails = [
    normalizeEmail(leftEmail),
    normalizeEmail(rightEmail),
    normalizeEmail(incomingEmail),
  ].filter((email): email is string => Boolean(email))

  return new Set(emails).size <= 1
}

export async function mergeAuthUsers(keepUserId: string, dropUserId: string) {
  if (keepUserId === dropUserId) return keepUserId

  const [keep, drop] = await Promise.all([
    prisma.user.findUnique({ where: { id: keepUserId } }),
    prisma.user.findUnique({ where: { id: dropUserId } }),
  ])
  if (!keep) return dropUserId
  if (!drop) return keepUserId

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: dropUserId },
      data: { email: null },
    })

    await tx.account.updateMany({
      where: { userId: dropUserId },
      data: { userId: keepUserId },
    })
    await tx.session.updateMany({
      where: { userId: dropUserId },
      data: { userId: keepUserId },
    })
    await tx.workspace.updateMany({
      where: { ownerId: dropUserId },
      data: { ownerId: keepUserId },
    })
    await tx.board.updateMany({
      where: { createdBy: dropUserId },
      data: { createdBy: keepUserId },
    })
    await tx.boardContent.updateMany({
      where: { userId: dropUserId },
      data: { userId: keepUserId },
    })

    const dropMembers = await tx.boardMember.findMany({
      where: { userId: dropUserId },
    })
    for (const member of dropMembers) {
      const existing = await tx.boardMember.findUnique({
        where: {
          boardId_userId: {
            boardId: member.boardId,
            userId: keepUserId,
          },
        },
      })
      if (existing) {
        await tx.boardMember.update({
          where: {
            boardId_userId: {
              boardId: member.boardId,
              userId: keepUserId,
            },
          },
          data: { role: preferredRole(existing.role, member.role) },
        })
        await tx.boardMember.delete({
          where: {
            boardId_userId: {
              boardId: member.boardId,
              userId: dropUserId,
            },
          },
        })
        continue
      }

      await tx.boardMember.delete({
        where: {
          boardId_userId: {
            boardId: member.boardId,
            userId: dropUserId,
          },
        },
      })
      await tx.boardMember.create({
        data: {
          boardId: member.boardId,
          userId: keepUserId,
          role: member.role,
        },
      })
    }

    if (!keep.email && drop.email) {
      await tx.user.update({
        where: { id: keepUserId },
        data: {
          email: drop.email,
          emailVerified: keep.emailVerified ?? drop.emailVerified,
          name: keep.name ?? drop.name,
          image: keep.image ?? drop.image,
        },
      })
    }

    await tx.user.delete({ where: { id: dropUserId } })
  })

  return keepUserId
}

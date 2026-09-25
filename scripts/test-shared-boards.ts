import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env" })
loadEnv({ path: ".env.local", override: true })

function assert(name: string, condition: unknown, detail?: unknown) {
  if (condition) {
    console.log(`PASS  ${name}`)
    return
  }
  console.error(`FAIL  ${name}`, detail ?? "")
  throw new Error(name)
}

async function main() {
  const { createBoard, listOwnedBoards, listSharedBoards } = await import(
    "@/lib/board-service"
  )
  const { addBoardMember } = await import("@/lib/board-members")
  const { prisma } = await import("@/lib/prisma")

  async function createTestUser(label: string, name: string) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return prisma.user.create({
      data: {
        name,
        email: `drawnix-m4-${label}-${suffix}@example.com`,
      },
      select: { id: true, email: true, name: true },
    })
  }

  const alice = await createTestUser("alice", "Alice")
  const bob = await createTestUser("bob", "Bob")
  const outsider = await createTestUser("outsider", "Outsider")

  let boardId = ""

  try {
    const board = await createBoard(alice.id, "Project Architecture")
    boardId = board.id

    const ownedByAlice = await listOwnedBoards(alice.id)
    assert(
      "Owner sees the board under My Boards",
      ownedByAlice.some((item) => item.id === boardId && item.title === "Project Architecture")
    )

    const sharedWithAlice = await listSharedBoards(alice.id)
    assert(
      "Owner does not see their own board under Shared with me",
      sharedWithAlice.every((item) => item.id !== boardId)
    )

    const beforeShare = await listSharedBoards(bob.id)
    assert(
      "Recipient does not see the board before they are a member",
      beforeShare.every((item) => item.id !== boardId)
    )

    const added = await addBoardMember(alice.id, boardId, bob.email!, "editor")
    assert("Owner can share the board", added.ok)

    const ownedByBob = await listOwnedBoards(bob.id)
    assert(
      "Recipient does not get a duplicate owned board",
      ownedByBob.every((item) => item.id !== boardId)
    )

    const sharedWithBob = await listSharedBoards(bob.id)
    const shared = sharedWithBob.find((item) => item.id === boardId)
    assert("Recipient sees the shared board", Boolean(shared))
    assert("Shared by the owner name", shared?.sharedBy === "Alice", shared)

    const ownedStillAlice = await listOwnedBoards(alice.id)
    assert(
      "Sharing does not remove the board from the owner",
      ownedStillAlice.some((item) => item.id === boardId)
    )

    const outsiderOwned = await listOwnedBoards(outsider.id)
    const outsiderShared = await listSharedBoards(outsider.id)
    assert(
      "Outsider does not see the board as owned",
      outsiderOwned.every((item) => item.id !== boardId)
    )
    assert(
      "Outsider does not see the board as shared",
      outsiderShared.every((item) => item.id !== boardId)
    )

    await prisma.board.update({
      where: { id: boardId },
      data: { deletedAt: new Date() },
    })
    const afterDelete = await listSharedBoards(bob.id)
    assert(
      "Soft-deleted boards are hidden from Shared with me",
      afterDelete.every((item) => item.id !== boardId)
    )
  } finally {
    if (boardId) {
      await prisma.boardMember.deleteMany({ where: { boardId } })
      await prisma.board.deleteMany({ where: { id: boardId } })
    }
    await prisma.workspace.deleteMany({
      where: { ownerId: { in: [alice.id, bob.id, outsider.id] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [alice.id, bob.id, outsider.id] } },
    })
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log("\nAll shared-board tests passed.")
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })

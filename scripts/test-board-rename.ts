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
  const { createBoard, listOwnedBoards, listSharedBoards, renameBoard } =
    await import("@/lib/board-service")
  const { addBoardMember } = await import("@/lib/board-members")
  const { getBoardAccess } = await import("@/lib/board-access")
  const { prisma } = await import("@/lib/prisma")

  async function createTestUser(label: string, name: string) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return prisma.user.create({
      data: {
        name,
        email: `drawnix-m6-${label}-${suffix}@example.com`,
      },
      select: { id: true, email: true, name: true },
    })
  }

  const owner = await createTestUser("owner", "Owner")
  const editor = await createTestUser("editor", "Editor")
  const viewer = await createTestUser("viewer", "Viewer")
  const outsider = await createTestUser("outsider", "Outsider")

  let boardId = ""

  try {
    const board = await createBoard(owner.id, "brainrot")
    boardId = board.id
    await prisma.board.update({
      where: { id: boardId },
      data: { data: { shapes: ["keep-me"] } },
    })
    const addedEditor = await addBoardMember(owner.id, boardId, editor.email!, "editor")
    const addedViewer = await addBoardMember(owner.id, boardId, viewer.email!, "viewer")
    assert("Setup shares the board", addedEditor.ok && addedViewer.ok)

    const membersBefore = await prisma.boardMember.findMany({
      where: { boardId },
      select: { userId: true, role: true },
      orderBy: { userId: "asc" },
    })

    const editorRename = await renameBoard(editor.id, boardId, "Stolen name")
    const viewerRename = await renameBoard(viewer.id, boardId, "Stolen name")
    assert("Editor cannot rename", editorRename.ok === false && editorRename.status === 403)
    assert("Viewer cannot rename", viewerRename.ok === false && viewerRename.status === 403)

    const empty = await renameBoard(owner.id, boardId, "   ")
    const blank = await renameBoard(owner.id, boardId, "")
    const missing = await renameBoard(owner.id, boardId, null)
    assert("Whitespace-only name is rejected", empty.ok === false && empty.status === 400)
    assert("Empty name is rejected", blank.ok === false && blank.status === 400)
    assert("Non-string name is rejected", missing.ok === false && missing.status === 400)

    const tooLong = await renameBoard(owner.id, boardId, "a".repeat(81))
    assert("Overlong name is rejected", tooLong.ok === false && tooLong.status === 400)

    const renamed = await renameBoard(owner.id, boardId, "  My Architecture Board  ")
    assert("Owner can rename", renamed.ok && renamed.name === "My Architecture Board")

    const stored = await prisma.board.findUnique({
      where: { id: boardId },
      select: { name: true, data: true, deletedAt: true },
    })
    assert("Renamed name persists", stored?.name === "My Architecture Board")
    assert(
      "Board content is unchanged",
      JSON.stringify(stored?.data) === JSON.stringify({ shapes: ["keep-me"] })
    )

    const membersAfter = await prisma.boardMember.findMany({
      where: { boardId },
      select: { userId: true, role: true },
      orderBy: { userId: "asc" },
    })
    assert("Board members are unchanged", JSON.stringify(membersBefore) === JSON.stringify(membersAfter))

    const ownerAccess = await getBoardAccess(boardId, owner.id)
    assert("Owner remains the owner", ownerAccess.allowed && ownerAccess.role === "owner")

    const owned = await listOwnedBoards(owner.id)
    assert(
      "Dashboard owned list uses the new name",
      owned.some((item) => item.id === boardId && item.title === "My Architecture Board")
    )
    const shared = await listSharedBoards(editor.id)
    assert(
      "Shared list uses the new name",
      shared.some((item) => item.id === boardId && item.title === "My Architecture Board")
    )

    const outsiderRename = await renameBoard(outsider.id, boardId, "Nope")
    assert("Outsider cannot rename", outsiderRename.ok === false && outsiderRename.status === 404)

    const response = await fetch(`http://127.0.0.1:3000/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Anonymous" }),
    })
    assert("Unauthenticated rename is rejected", response.status === 401, response.status)
  } finally {
    if (boardId) {
      await prisma.boardMember.deleteMany({ where: { boardId } })
      await prisma.board.deleteMany({ where: { id: boardId } })
    }
    await prisma.workspace.deleteMany({
      where: { ownerId: { in: [owner.id, editor.id, viewer.id, outsider.id] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, editor.id, viewer.id, outsider.id] } },
    })
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log("\nAll board rename tests passed.")
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })

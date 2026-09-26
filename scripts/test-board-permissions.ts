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
  const { createBoard, deleteBoards, getBoardCollaborationAccess } =
    await import("@/lib/board-service")
  const { addBoardMember, updateBoardMemberRole } = await import(
    "@/lib/board-members"
  )
  const { getBoardAccess } = await import("@/lib/board-access")
  const { issueBoardSyncToken } = await import("@/lib/issue-sync-token")
  const { verifySyncToken } = await import("@/shared/sync-token")
  const { prisma } = await import("@/lib/prisma")

  async function createTestUser(label: string, name: string) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return prisma.user.create({
      data: {
        name,
        email: `drawnix-m5-${label}-${suffix}@example.com`,
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
    const board = await createBoard(owner.id, "Permission board")
    boardId = board.id

    const addedEditor = await addBoardMember(
      owner.id,
      boardId,
      editor.email!,
      "editor"
    )
    const addedViewer = await addBoardMember(
      owner.id,
      boardId,
      viewer.email!,
      "viewer"
    )
    assert("Setup shares editor and viewer", addedEditor.ok && addedViewer.ok)

    const ownerAccess = await getBoardCollaborationAccess(owner.id, boardId)
    const editorAccess = await getBoardCollaborationAccess(editor.id, boardId)
    const viewerAccess = await getBoardCollaborationAccess(viewer.id, boardId)
    const outsiderAccess = await getBoardCollaborationAccess(outsider.id, boardId)

    assert("Owner can open and edit", ownerAccess?.role === "owner" && ownerAccess.canEdit)
    assert("Editor can open and edit", editorAccess?.role === "editor" && editorAccess.canEdit)
    assert(
      "Viewer can open but cannot edit",
      viewerAccess?.role === "viewer" && viewerAccess.canEdit === false
    )
    assert("Outsider cannot open the board", outsiderAccess === null)

    const outsiderBoardAccess = await getBoardAccess(boardId, outsider.id)
    assert("Outsider access check denies the board", outsiderBoardAccess.allowed === false)

    const secret = process.env.TLDRAW_SYNC_SECRET?.trim()
    assert("Sync secret is configured for token tests", Boolean(secret))
    if (!secret) return

    async function tokenFor(userId: string) {
      const access = await getBoardCollaborationAccess(userId, boardId)
      if (!access) return null
      const token = await issueBoardSyncToken({
        userId,
        userName: "Collaborator",
        boardId: access.board.id,
        role: access.role,
        canEdit: access.canEdit,
        hasLegacySnapshot: access.hasLegacySnapshot,
      })
      if (!token) return null
      return verifySyncToken(token, secret!)
    }

    const ownerToken = await tokenFor(owner.id)
    const editorToken = await tokenFor(editor.id)
    const viewerToken = await tokenFor(viewer.id)
    assert(
      "Owner token is an editing session",
      ownerToken?.role === "owner" && ownerToken.readonly === false && ownerToken.sub === owner.id
    )
    assert(
      "Editor token is an editing session",
      editorToken?.role === "editor" &&
        editorToken.readonly === false &&
        editorToken.sub === editor.id
    )
    assert(
      "Viewer token is read-only and bound to the viewer",
      viewerToken?.role === "viewer" &&
        viewerToken.readonly === true &&
        viewerToken.sub === viewer.id &&
        viewerToken.boardId === boardId
    )

    if (viewerToken) {
      const issued = await issueBoardSyncToken({
        userId: viewer.id,
        boardId,
        role: viewerAccess!.role,
        canEdit: viewerAccess!.canEdit,
        hasLegacySnapshot: false,
      })
      assert("Viewer token can be signed from server access", Boolean(issued))
      const [body, signature] = issued!.split(".")
      const tampered = JSON.parse(
        Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
      ) as { role: string; readonly: boolean }
      tampered.role = "editor"
      tampered.readonly = false
      const tamperedBody = Buffer.from(JSON.stringify(tampered)).toString("base64url")
      const accepted = await verifySyncToken(`${tamperedBody}.${signature}`, secret)
      assert("Tampered viewer token is rejected", accepted === null)
    }

    const editorDelete = await deleteBoards(editor.id, [boardId])
    const viewerDelete = await deleteBoards(viewer.id, [boardId])
    const stillThere = await prisma.board.findUnique({
      where: { id: boardId },
      select: { deletedAt: true },
    })
    assert(
      "Editor delete leaves the shared board in place",
      editorDelete.some((item) => item.id === boardId) && stillThere?.deletedAt === null
    )
    assert(
      "Viewer delete leaves the shared board in place",
      viewerDelete.some((item) => item.id === boardId) && stillThere?.deletedAt === null
    )

    const editorShare = await addBoardMember(
      editor.id,
      boardId,
      outsider.email!,
      "editor"
    )
    const viewerShare = await updateBoardMemberRole(
      viewer.id,
      boardId,
      editor.id,
      "viewer"
    )
    assert("Editor cannot manage members", editorShare.ok === false && editorShare.status === 403)
    assert("Viewer cannot manage members", viewerShare.ok === false && viewerShare.status === 403)

    const ownerDelete = await deleteBoards(owner.id, [boardId])
    const afterOwnerDelete = await prisma.board.findUnique({
      where: { id: boardId },
      select: { deletedAt: true },
    })
    assert(
      "Owner can delete the board",
      afterOwnerDelete?.deletedAt instanceof Date &&
        ownerDelete.every((item) => item.id !== boardId)
    )
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
    console.log("\nAll board permission tests passed.")
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })

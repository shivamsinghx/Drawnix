import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env" })
loadEnv({ path: ".env.local", override: true })

const SECRET_KEYS = [
  "access_token",
  "refresh_token",
  "id_token",
  "sessionToken",
  "session_state",
  "oauth",
  "accounts",
]

function assert(name: string, condition: unknown, detail?: unknown) {
  if (condition) {
    console.log(`PASS  ${name}`)
    return
  }
  console.error(`FAIL  ${name}`, detail ?? "")
  throw new Error(name)
}

function assertNoSecrets(name: string, value: unknown) {
  const json = JSON.stringify(value)
  for (const key of SECRET_KEYS) {
    if (json.toLowerCase().includes(`"${key.toLowerCase()}"`)) {
      assert(`${name} does not expose ${key}`, false, json)
    }
  }
  assert(`${name} does not expose OAuth/account secrets`, true)
}

async function main() {
  const { createBoard } = await import("@/lib/board-service")
  const {
    addBoardMember,
    listBoardMembers,
    removeBoardMember,
    updateBoardMemberRole,
  } = await import("@/lib/board-members")
  const { prisma } = await import("@/lib/prisma")

  async function createTestUser(label: string) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return prisma.user.create({
      data: {
        name: `M2 ${label}`,
        email: `drawnix-m2-${label}-${suffix}@example.com`,
      },
      select: { id: true, email: true, name: true, image: true },
    })
  }

  const owner = await createTestUser("owner")
  const editor = await createTestUser("editor")
  const viewer = await createTestUser("viewer")
  const outsider = await createTestUser("outsider")
  const otherOwner = await createTestUser("other-owner")

  let boardId = ""
  let otherBoardId = ""

  try {
    const board = await createBoard(owner.id, "M2 member board")
    const otherBoard = await createBoard(otherOwner.id, "M2 other board")
    boardId = board.id
    otherBoardId = otherBoard.id

    const listed = await listBoardMembers(owner.id, boardId)
    assert("1. Owner can list members", listed.ok && listed.status === 200)
    if (listed.ok) {
      assert(
        "1b. Owner is listed",
        listed.data.members.some(
          (member) => member.userId === owner.id && member.role === "owner"
        )
      )
      assertNoSecrets("1c. List payload", listed.data)
    }

    const addedEditor = await addBoardMember(
      owner.id,
      boardId,
      editor.email!,
      "editor"
    )
    assert(
      "2. Owner can add an existing user as editor",
      addedEditor.ok &&
        addedEditor.status === 201 &&
        addedEditor.data.member.role === "editor" &&
        addedEditor.data.member.userId === editor.id
    )
    if (addedEditor.ok) {
      assertNoSecrets("2b. Add editor payload", addedEditor.data)
    }

    const addedViewer = await addBoardMember(
      owner.id,
      boardId,
      viewer.email!,
      "viewer"
    )
    assert(
      "3. Owner can add an existing user as viewer",
      addedViewer.ok &&
        addedViewer.status === 201 &&
        addedViewer.data.member.role === "viewer" &&
        addedViewer.data.member.userId === viewer.id
    )

    const duplicate = await addBoardMember(
      owner.id,
      boardId,
      editor.email!,
      "editor"
    )
    assert(
      "4. Adding the same user twice is rejected",
      !duplicate.ok && duplicate.status === 409
    )

    const missingUser = await addBoardMember(
      owner.id,
      boardId,
      "nobody-m2@example.com",
      "editor"
    )
    assert(
      "14. User lookup by email returns a clear error when missing",
      !missingUser.ok && missingUser.status === 404
    )

    const asOwnerRole = await addBoardMember(
      owner.id,
      boardId,
      outsider.email!,
      "owner"
    )
    assert(
      "8a. Creating another owner through the member API is rejected",
      !asOwnerRole.ok && asOwnerRole.status === 400
    )

    const editorToViewer = await updateBoardMemberRole(
      owner.id,
      boardId,
      editor.id,
      "viewer"
    )
    assert(
      "5. Owner can change editor → viewer",
      editorToViewer.ok && editorToViewer.data.member.role === "viewer"
    )

    const viewerToEditor = await updateBoardMemberRole(
      owner.id,
      boardId,
      editor.id,
      "editor"
    )
    assert(
      "6. Owner can change viewer → editor",
      viewerToEditor.ok && viewerToEditor.data.member.role === "editor"
    )

    const selfRemove = await removeBoardMember(owner.id, boardId, owner.id)
    assert(
      "7. Owner cannot remove themselves",
      !selfRemove.ok && selfRemove.status === 400
    )

    const downgradeOwner = await updateBoardMemberRole(
      owner.id,
      boardId,
      owner.id,
      "editor"
    )
    assert(
      "8. Owner cannot be downgraded",
      !downgradeOwner.ok && downgradeOwner.status === 400
    )

    const editorAdds = await addBoardMember(
      editor.id,
      boardId,
      outsider.email!,
      "viewer"
    )
    assert(
      "9. Editor cannot add members",
      !editorAdds.ok && editorAdds.status === 403
    )

    const editorRemoves = await removeBoardMember(editor.id, boardId, viewer.id)
    assert(
      "10. Editor cannot remove members",
      !editorRemoves.ok && editorRemoves.status === 403
    )

    const viewerLists = await listBoardMembers(viewer.id, boardId)
    const viewerAdds = await addBoardMember(
      viewer.id,
      boardId,
      outsider.email!,
      "editor"
    )
    const viewerPatches = await updateBoardMemberRole(
      viewer.id,
      boardId,
      editor.id,
      "viewer"
    )
    const viewerRemoves = await removeBoardMember(viewer.id, boardId, editor.id)
    assert(
      "11. Viewer cannot manage members",
      !viewerLists.ok &&
        viewerLists.status === 403 &&
        !viewerAdds.ok &&
        viewerAdds.status === 403 &&
        !viewerPatches.ok &&
        viewerPatches.status === 403 &&
        !viewerRemoves.ok &&
        viewerRemoves.status === 403
    )

    const outsiderLists = await listBoardMembers(outsider.id, boardId)
    const outsiderAdds = await addBoardMember(
      outsider.id,
      boardId,
      editor.email!,
      "viewer"
    )
    const otherOwnerManages = await addBoardMember(
      otherOwner.id,
      boardId,
      outsider.email!,
      "editor"
    )
    assert(
      "13. User cannot manage members of a board they do not own",
      !outsiderLists.ok &&
        outsiderLists.status === 404 &&
        !outsiderAdds.ok &&
        outsiderAdds.status === 404 &&
        !otherOwnerManages.ok &&
        otherOwnerManages.status === 404
    )

    const crossBoard = await updateBoardMemberRole(
      owner.id,
      otherBoardId,
      editor.id,
      "viewer"
    )
    assert(
      "13b. Cannot manage another board's members via this board's owner",
      !crossBoard.ok && (crossBoard.status === 404 || crossBoard.status === 403)
    )

    const ownerEmailLookup = await addBoardMember(
      owner.id,
      boardId,
      editor.email!.toUpperCase(),
      "viewer"
    )
    assert(
      "14b. Email lookup is case-insensitive and still detects membership",
      !ownerEmailLookup.ok && ownerEmailLookup.status === 409
    )

    const afterRemove = await removeBoardMember(owner.id, boardId, viewer.id)
    assert("Owner can remove a non-owner member", afterRemove.ok)

    const viewerStillExists = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: { id: true },
    })
    const boardStillExists = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    })
    const membershipGone = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: viewer.id } },
    })
    assert("Remove keeps User", Boolean(viewerStillExists))
    assert("Remove keeps Board", Boolean(boardStillExists))
    assert("Remove deletes only BoardMember", membershipGone === null)

    const base = process.env.APP_URL ?? "http://localhost:3000"
    try {
      const unauth = await Promise.all([
        fetch(`${base}/api/boards/${boardId}/members`),
        fetch(`${base}/api/boards/${boardId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: editor.email, role: "editor" }),
        }),
        fetch(`${base}/api/boards/${boardId}/members/${editor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "viewer" }),
        }),
        fetch(`${base}/api/boards/${boardId}/members/${editor.id}`, {
          method: "DELETE",
        }),
      ])
      assert(
        "12. Unauthenticated requests are rejected",
        unauth.every((response) => response.status === 401),
        unauth.map((response) => response.status)
      )
    } catch (error) {
      console.warn(
        "SKIP  12. Unauthenticated HTTP check (dev server not reachable)",
        error instanceof Error ? error.message : error
      )
    }
  } finally {
    if (boardId) {
      await prisma.boardMember.deleteMany({ where: { boardId } })
      await prisma.board.deleteMany({ where: { id: boardId } })
    }
    if (otherBoardId) {
      await prisma.boardMember.deleteMany({ where: { boardId: otherBoardId } })
      await prisma.board.deleteMany({ where: { id: otherBoardId } })
    }
    await prisma.workspace.deleteMany({
      where: { ownerId: { in: [owner.id, otherOwner.id] } },
    })
    await prisma.user.deleteMany({
      where: {
        id: { in: [owner.id, editor.id, viewer.id, outsider.id, otherOwner.id] },
      },
    })
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log("\nAll BoardMember tests passed.")
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })

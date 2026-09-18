import { NextResponse } from "next/server"

import { getBoardAccessForCurrentUser } from "@/lib/board-access"
import { getBoardCollaborationAccess } from "@/lib/board-service"
import { issueBoardSyncToken } from "@/lib/issue-sync-token"
import { isBoardId } from "@/shared/sync-token"

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params
  if (!isBoardId(boardId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { user, access } = await getBoardAccessForCurrentUser(boardId)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!access.allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const collaboration = await getBoardCollaborationAccess(user.id, boardId)
  if (!collaboration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const token = await issueBoardSyncToken({
    userId: user.id,
    userName: user.name,
    boardId: collaboration.board.id,
    role: collaboration.role,
    canEdit: collaboration.canEdit,
    hasLegacySnapshot: collaboration.hasLegacySnapshot,
  })
  if (!token) {
    return NextResponse.json(
      { error: "Sync is not configured" },
      { status: 500 }
    )
  }

  return NextResponse.json({ token })
}

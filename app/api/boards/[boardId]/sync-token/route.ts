import { NextResponse } from "next/server"

import { getBoardCollaborationAccess } from "@/lib/board-service"
import { getCurrentUser } from "@/lib/current-user"
import { issueBoardSyncToken } from "@/lib/issue-sync-token"
import { isBoardId } from "@/shared/sync-token"

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId } = await context.params
  if (!isBoardId(boardId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const access = await getBoardCollaborationAccess(user.id, boardId)
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const token = await issueBoardSyncToken({
    userId: user.id,
    userName: user.name,
    boardId: access.board.id,
    role: access.role,
    canEdit: access.canEdit,
    hasLegacySnapshot: access.hasLegacySnapshot,
  })
  if (!token) {
    return NextResponse.json(
      { error: "Sync is not configured" },
      { status: 500 }
    )
  }

  return NextResponse.json({ token })
}

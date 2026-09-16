import { NextResponse } from "next/server"

import { getBoardCollaborationAccess } from "@/lib/board-service"
import { getCurrentUser } from "@/lib/current-user"
import { getTldrawSyncSecret } from "@/lib/sync-config"
import {
  SYNC_TOKEN_TTL_SECONDS,
  isBoardId,
  signSyncToken,
} from "@/shared/sync-token"

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

  const secret = getTldrawSyncSecret()
  if (!secret) {
    return NextResponse.json(
      { error: "Sync is not configured" },
      { status: 500 }
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const token = await signSyncToken(
    {
      v: 1,
      sub: user.id,
      boardId: access.board.id,
      role: access.role,
      readonly: !access.canEdit,
      name: user.name?.trim() || "Collaborator",
      iat: now,
      exp: now + SYNC_TOKEN_TTL_SECONDS,
    },
    secret
  )

  return NextResponse.json({ token })
}

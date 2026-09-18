import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import {
  removeBoardMember,
  updateBoardMemberRole,
  type BoardMemberResult,
} from "@/lib/board-members"

function jsonResult<T>(result: BoardMemberResult<T>) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ boardId: string; userId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId, userId: targetUserId } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  return jsonResult(
    await updateBoardMemberRole(user.id, boardId, targetUserId, record.role)
  )
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ boardId: string; userId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId, userId: targetUserId } = await context.params
  return jsonResult(await removeBoardMember(user.id, boardId, targetUserId))
}

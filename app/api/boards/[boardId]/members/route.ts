import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import {
  addBoardMember,
  listBoardMembers,
  type BoardMemberResult,
} from "@/lib/board-members"

function jsonResult<T>(result: BoardMemberResult<T>) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId } = await context.params
  return jsonResult(await listBoardMembers(user.id, boardId))
}

export async function POST(
  request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId } = await context.params

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
  const email = typeof record.email === "string" ? record.email : ""

  return jsonResult(await addBoardMember(user.id, boardId, email, record.role))
}

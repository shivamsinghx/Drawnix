import { NextResponse } from "next/server"

import { Prisma } from "@/generated/prisma/client"
import { getBoardAccessForCurrentUser } from "@/lib/board-access"
import { getAccessibleBoard, renameBoard, saveBoardData } from "@/lib/board-service"

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params
  const { user, access } = await getBoardAccessForCurrentUser(boardId)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!access.allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const board = await getAccessibleBoard(user.id, boardId)
  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ board })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params
  const { user, access } = await getBoardAccessForCurrentUser(boardId)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!access.allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const record =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null

  if (record && "name" in record) {
    if ("data" in record) {
      return NextResponse.json(
        { error: "Send a board name or a snapshot, not both" },
        { status: 400 }
      )
    }
    const renamed = await renameBoard(user.id, boardId, record.name)
    if (!renamed.ok) {
      return NextResponse.json({ error: renamed.error }, { status: renamed.status })
    }
    return NextResponse.json({ name: renamed.name })
  }

  const data =
    record &&
    "data" in record &&
    typeof record.data === "object" &&
    record.data !== null &&
    !Array.isArray(record.data)
      ? (record.data as Prisma.InputJsonValue)
      : null

  if (!data) {
    return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 })
  }

  const updated = await saveBoardData(user.id, boardId, data)
  if (updated === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

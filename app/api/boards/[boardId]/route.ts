import { NextResponse } from "next/server"

import { Prisma } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/current-user"
import { getAccessibleBoard, saveBoardData } from "@/lib/board-service"

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId } = await context.params
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

  const data =
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof body.data === "object" &&
    body.data !== null &&
    !Array.isArray(body.data)
      ? (body.data as Prisma.InputJsonValue)
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

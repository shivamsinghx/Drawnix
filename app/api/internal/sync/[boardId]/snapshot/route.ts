import { NextResponse } from "next/server"

import { Prisma } from "@/generated/prisma/client"
import { cacheBoardSnapshot, getBoardSnapshot } from "@/lib/board-service"
import { isSyncServiceRequest, getTldrawSyncSecret } from "@/lib/sync-config"
import { toTldrawSyncSnapshot } from "@/lib/sync-snapshot"
import { isBoardId } from "@/shared/sync-token"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET(
  request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const secret = getTldrawSyncSecret()
  if (!secret || !isSyncServiceRequest(request, secret)) {
    return unauthorized()
  }

  const { boardId } = await context.params
  if (!isBoardId(boardId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const board = await getBoardSnapshot(boardId)
  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    snapshot: toTldrawSyncSnapshot(board.data) ?? null,
  })
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const secret = getTldrawSyncSecret()
  if (!secret || !isSyncServiceRequest(request, secret)) {
    return unauthorized()
  }

  const { boardId } = await context.params
  if (!isBoardId(boardId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const snapshot =
    typeof body === "object" &&
    body !== null &&
    "snapshot" in body &&
    typeof body.snapshot === "object" &&
    body.snapshot !== null &&
    !Array.isArray(body.snapshot)
      ? (body.snapshot as Prisma.InputJsonValue)
      : null

  if (!snapshot) {
    return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 })
  }

  const updated = await cacheBoardSnapshot(boardId, snapshot)
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

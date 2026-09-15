import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { createBoard, deleteBoards, listBoards } from "@/lib/board-service"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const boards = await listBoards(user.id)
  return NextResponse.json({ boards })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string"
      ? body.name.trim()
      : ""

  if (!name || name.length > 80) {
    return NextResponse.json({ error: "A board name is required" }, { status: 400 })
  }

  const board = await createBoard(user.id, name)
  return NextResponse.json({ board }, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const ids =
    typeof body === "object" &&
    body !== null &&
    "ids" in body &&
    Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : []

  const boards = await deleteBoards(user.id, ids)
  return NextResponse.json({ boards })
}

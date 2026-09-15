import { redirect } from "next/navigation"

import { CanvasClient } from "@/components/canvas/canvas-client"
import { getAccessibleBoard } from "@/lib/board-service"
import { getCurrentUser } from "@/lib/current-user"

function toSnapshot(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined
  if (!("document" in data)) return undefined
  return data
}

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/dashboard")
  }

  const { boardId } = await params
  const board = await getAccessibleBoard(user.id, boardId)
  if (!board) {
    redirect("/dashboard")
  }

  return (
    <CanvasClient
      boardId={board.id}
      boardName={board.name}
      snapshot={toSnapshot(board.data)}
    />
  )
}

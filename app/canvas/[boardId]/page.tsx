import { redirect } from "next/navigation"

import { CanvasClient } from "@/components/canvas/canvas-client"
import { getBoardCollaborationAccess } from "@/lib/board-service"
import { getCurrentUser } from "@/lib/current-user"
import { issueBoardSyncToken } from "@/lib/issue-sync-token"
import { presenceColorForUser } from "@/lib/presence-color"
import { getPublicTldrawSyncUrl } from "@/lib/sync-config"

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = await params
  const user = await getCurrentUser()
  if (!user) {
    redirect("/dashboard")
  }

  const collaboration = await getBoardCollaborationAccess(user.id, boardId)
  if (!collaboration) {
    redirect("/dashboard")
  }

  const token = await issueBoardSyncToken({
    userId: user.id,
    userName: user.name,
    boardId: collaboration.board.id,
    role: collaboration.role,
    canEdit: collaboration.canEdit,
    hasLegacySnapshot: collaboration.hasLegacySnapshot,
  })

  return (
    <CanvasClient
      boardId={collaboration.board.id}
      boardName={collaboration.board.name}
      userId={user.id}
      userName={user.name?.trim() || user.email?.trim() || "Collaborator"}
      userColor={presenceColorForUser(user.id)}
      role={collaboration.role}
      canEdit={collaboration.canEdit}
      syncUrl={getPublicTldrawSyncUrl()}
      initialToken={token}
    />
  )
}

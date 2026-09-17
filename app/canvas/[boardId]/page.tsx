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
  const [{ boardId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user) {
    redirect("/dashboard")
  }

  const access = await getBoardCollaborationAccess(user.id, boardId)
  if (!access) {
    redirect("/dashboard")
  }

  const token = await issueBoardSyncToken({
    userId: user.id,
    userName: user.name,
    boardId: access.board.id,
    role: access.role,
    canEdit: access.canEdit,
    hasLegacySnapshot: access.hasLegacySnapshot,
  })

  return (
    <CanvasClient
      boardId={access.board.id}
      boardName={access.board.name}
      userId={user.id}
      userName={user.name?.trim() || user.email?.trim() || "Collaborator"}
      userColor={presenceColorForUser(user.id)}
      role={access.role}
      canEdit={access.canEdit}
      syncUrl={getPublicTldrawSyncUrl()}
      initialToken={token}
    />
  )
}

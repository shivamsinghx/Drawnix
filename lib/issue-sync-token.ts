import {
  SYNC_TOKEN_TTL_SECONDS,
  signSyncToken,
  type BoardRole,
} from "@/shared/sync-token"
import { getTldrawSyncSecret } from "@/lib/sync-config"

export async function issueBoardSyncToken(input: {
  userId: string
  userName?: string | null
  boardId: string
  role: BoardRole
  canEdit: boolean
  hasLegacySnapshot: boolean
}) {
  const secret = getTldrawSyncSecret()
  if (!secret) return null

  const now = Math.floor(Date.now() / 1000)
  return signSyncToken(
    {
      v: 1,
      sub: input.userId,
      boardId: input.boardId,
      role: input.role,
      readonly: !input.canEdit,
      legacy: input.hasLegacySnapshot,
      name: input.userName?.trim() || "Collaborator",
      iat: now,
      exp: now + SYNC_TOKEN_TTL_SECONDS,
    },
    secret
  )
}

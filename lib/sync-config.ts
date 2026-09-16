import { secretsEqual } from "@/shared/sync-token"

export function getTldrawSyncSecret(): string | null {
  const secret = process.env.TLDRAW_SYNC_SECRET?.trim()
  return secret ? secret : null
}

export function getPublicTldrawSyncUrl(): string {
  return (
    process.env.NEXT_PUBLIC_TLDRAW_SYNC_URL?.replace(/\/$/, "") ||
    "http://localhost:8787"
  )
}

export function isSyncServiceRequest(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return false
  return secretsEqual(header.slice("Bearer ".length), secret)
}

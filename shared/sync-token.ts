const encoder = new TextEncoder()

export const SYNC_TOKEN_TTL_SECONDS = 90

export type BoardRole = "owner" | "editor" | "viewer"

export type SyncTokenPayload = {
  v: 1
  sub: string
  boardId: string
  role: BoardRole
  readonly: boolean
  name: string
  /** When false, the worker can skip the Postgres snapshot fetch. */
  legacy?: boolean
  iat: number
  exp: number
}

export function isBoardId(value: string): boolean {
  return /^[a-z0-9_-]{8,64}$/i.test(value)
}

export function canEditRole(role: BoardRole): boolean {
  return role === "owner" || role === "editor"
}

export function normalizeBoardRole(role: string | null | undefined): BoardRole {
  if (role === "owner" || role === "editor" || role === "viewer") return role
  return "viewer"
}

export function secretsEqual(left: string, right: string): boolean {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  const max = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < max; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

export async function signSyncToken(
  payload: SyncTokenPayload,
  secret: string
): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await hmacSha256(secret, body)
  return `${body}.${signature}`
}

export async function verifySyncToken(
  token: string,
  secret: string
): Promise<SyncTokenPayload | null> {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [body, signature] = parts
  if (!body || !signature) return null

  const expected = await hmacSha256(secret, body)
  if (!secretsEqual(signature, expected)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(body)))
  } catch {
    return null
  }

  if (!isSyncTokenPayload(parsed)) return null
  const now = Math.floor(Date.now() / 1000)
  if (parsed.exp <= now || parsed.iat > now + 30) return null
  if (!isBoardId(parsed.boardId) || !parsed.sub) return null
  return parsed
}

function isSyncTokenPayload(value: unknown): value is SyncTokenPayload {
  if (!value || typeof value !== "object") return false
  const token = value as Record<string, unknown>
  return (
    token.v === 1 &&
    typeof token.sub === "string" &&
    typeof token.boardId === "string" &&
    (token.role === "owner" || token.role === "editor" || token.role === "viewer") &&
    typeof token.readonly === "boolean" &&
    typeof token.name === "string" &&
    (token.legacy === undefined || typeof token.legacy === "boolean") &&
    typeof token.iat === "number" &&
    typeof token.exp === "number"
  )
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message))
  return bytesToBase64Url(new Uint8Array(signature))
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

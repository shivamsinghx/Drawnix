import { isBoardId, verifySyncToken } from "../shared/sync-token"
import { corsHeaders, jsonResponse } from "./http"

function objectKey(boardId: string, uploadId: string) {
  return `uploads/${boardId}/${uploadId.replace(/[^a-zA-Z0-9._-]+/g, "_")}`
}

export async function handleAssetUpload(
  request: Request,
  env: Env,
  boardId: string,
  uploadId: string
): Promise<Response> {
  if (!isBoardId(boardId) || !uploadId) {
    return jsonResponse({ error: "Not found" }, 404, request, env)
  }

  const header = request.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null
  const claims = token ? await verifySyncToken(token, env.TLDRAW_SYNC_SECRET) : null
  if (!claims) {
    return jsonResponse({ error: "Unauthorized" }, 401, request, env)
  }
  if (claims.boardId !== boardId || claims.readonly) {
    return jsonResponse({ error: "Forbidden" }, 403, request, env)
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return jsonResponse({ error: "Invalid content type" }, 400, request, env)
  }

  const key = objectKey(boardId, uploadId)
  if (await env.TLDRAW_BUCKET.head(key)) {
    return jsonResponse({ error: "Upload already exists" }, 409, request, env)
  }

  await env.TLDRAW_BUCKET.put(key, request.body, {
    httpMetadata: { contentType },
  })

  return jsonResponse({ ok: true }, 200, request, env)
}

export async function handleAssetDownload(
  request: Request,
  env: Env,
  boardId: string,
  uploadId: string
): Promise<Response> {
  if (!isBoardId(boardId) || !uploadId) {
    return jsonResponse({ error: "Not found" }, 404, request, env)
  }

  const object = await env.TLDRAW_BUCKET.get(objectKey(boardId, uploadId))
  if (!object) {
    return jsonResponse({ error: "Not found" }, 404, request, env)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set("cache-control", "public, max-age=31536000, immutable")
  headers.set("content-security-policy", "default-src 'none'")
  headers.set("x-content-type-options", "nosniff")
  for (const [key, value] of Object.entries(corsHeaders(request, env))) {
    headers.set(key, value)
  }

  return new Response(object.body, { headers })
}

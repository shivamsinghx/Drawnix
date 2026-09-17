import { isBoardId, verifySyncToken } from "../shared/sync-token"
import { handleAssetDownload, handleAssetUpload } from "./assets"
import { TldrawDurableObject } from "./durable-object"
import { corsHeaders, jsonResponse, rejectIfBadOrigin } from "./http"

export { TldrawDurableObject }

function matchUpload(pathname: string) {
  const match = pathname.match(/^\/api\/uploads\/([^/]+)\/([^/]+)$/)
  if (!match) return null
  return { boardId: decodeURIComponent(match[1]), uploadId: decodeURIComponent(match[2]) }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.TLDRAW_SYNC_SECRET || !env.APP_URL || !env.APP_ORIGIN) {
      return new Response("Sync worker is not configured", { status: 500 })
    }

    const url = new URL(request.url)
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok", { status: 200 })
    }

    if (request.method === "OPTIONS") {
      const originError = rejectIfBadOrigin(request, env)
      if (originError) return originError
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/connect/")) {
      const originError = rejectIfBadOrigin(request, env)
      if (originError) return originError

      const roomId = url.pathname.slice("/api/connect/".length)
      if (!isBoardId(roomId)) {
        return new Response("Not found", { status: 404 })
      }

      const token = url.searchParams.get("access_token")
      const claims = token ? await verifySyncToken(token, env.TLDRAW_SYNC_SECRET) : null
      if (!claims) {
        return new Response("Unauthorized", { status: 401 })
      }
      if (claims.boardId !== roomId) {
        return new Response("Forbidden", { status: 403 })
      }

      const id = env.TLDRAW_DURABLE_OBJECT.idFromName(roomId)
      const room = env.TLDRAW_DURABLE_OBJECT.get(id)
      return room.fetch(request)
    }

    const upload = matchUpload(url.pathname)
    if (upload) {
      if (request.method === "POST") {
        const originError = rejectIfBadOrigin(request, env)
        if (originError) return originError
        return handleAssetUpload(request, env, upload.boardId, upload.uploadId)
      }
      if (request.method === "GET") {
        return handleAssetDownload(request, env, upload.boardId, upload.uploadId)
      }
    }

    return jsonResponse({ error: "Not found" }, 404, request, env)
  },
}

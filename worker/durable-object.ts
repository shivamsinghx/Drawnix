import {
  DurableObjectSqliteSyncWrapper,
  SQLiteSyncStorage,
  TLSocketRoom,
  type RoomSnapshot,
  type SessionStateSnapshot,
} from "@tldraw/sync-core"
import type { TLRecord } from "@tldraw/tlschema"
import { DurableObject } from "cloudflare:workers"

import { isBoardId, verifySyncToken } from "../shared/sync-token"
import { drawnixSyncSchema } from "./schema"

interface SocketAttachment {
  sessionId: string
  snapshot: SessionStateSnapshot | null
  isReadonly: boolean
}

function getAttachment(ws: WebSocket): SocketAttachment | null {
  const attachment = ws.deserializeAttachment() as SocketAttachment | null
  return attachment?.sessionId ? attachment : null
}

export class TldrawDurableObject extends DurableObject<Env> {
  private roomPromise: Promise<TLSocketRoom<TLRecord, void>> | null = null
  private roomId: string | null = null
  private readonly sessionIdToWs = new Map<string, WebSocket>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}')
    )
    this.ctx.blockConcurrencyWhile(async () => {
      this.roomId = ((await this.ctx.storage.get("roomId")) as string | null) ?? null
    })
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const prefix = "/api/connect/"
    if (request.method !== "GET" || !url.pathname.startsWith(prefix)) {
      return new Response("Not found", { status: 404 })
    }

    const roomId = url.pathname.slice(prefix.length)
    if (!isBoardId(roomId)) {
      return new Response("Not found", { status: 404 })
    }

    const sessionId = url.searchParams.get("sessionId")
    if (!sessionId) {
      return new Response("Missing sessionId", { status: 400 })
    }

    const token = url.searchParams.get("access_token")
    const claims = token
      ? await verifySyncToken(token, this.env.TLDRAW_SYNC_SECRET)
      : null
    if (!claims) {
      return new Response("Unauthorized", { status: 401 })
    }
    if (claims.boardId !== roomId) {
      return new Response("Forbidden", { status: 403 })
    }

    if (this.roomId && this.roomId !== roomId) {
      return new Response("Forbidden", { status: 403 })
    }
    this.roomId = roomId

    let room: TLSocketRoom<TLRecord, void>
    try {
      room = await this.getOrCreateRoom()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync unavailable"
      if (message === "Board not found") {
        return new Response("Not found", { status: 404 })
      }
      console.error("Failed to load sync room", error)
      return new Response("Sync unavailable", { status: 503 })
    }

    await this.ctx.storage.put("roomId", roomId)
    const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
    this.ctx.acceptWebSocket(serverWebSocket)

    const attachment: SocketAttachment = {
      sessionId,
      snapshot: null,
      isReadonly: claims.readonly,
    }
    serverWebSocket.serializeAttachment(attachment)
    this.sessionIdToWs.set(sessionId, serverWebSocket)

    room.handleSocketConnect({
      sessionId,
      socket: serverWebSocket,
      isReadonly: claims.readonly,
    })

    return new Response(null, { status: 101, webSocket: clientWebSocket })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const attachment = getAttachment(ws)
    if (!attachment) return
    this.sessionIdToWs.set(attachment.sessionId, ws)
    const room = await this.getOrCreateRoom()
    room.handleSocketMessage(attachment.sessionId, message)
  }

  override async webSocketClose(ws: WebSocket) {
    await this.handleWebSocketEnd(ws, "handleSocketClose")
  }

  override async webSocketError(ws: WebSocket) {
    await this.handleWebSocketEnd(ws, "handleSocketError")
  }

  private async handleWebSocketEnd(
    ws: WebSocket,
    method: "handleSocketClose" | "handleSocketError"
  ) {
    const attachment = getAttachment(ws)
    if (!attachment) return

    this.sessionIdToWs.delete(attachment.sessionId)
    const room = await this.getOrCreateRoom()

    if (attachment.snapshot && !room.getSessionSnapshot(attachment.sessionId)) {
      room.handleSocketResume({
        sessionId: attachment.sessionId,
        socket: ws,
        snapshot: attachment.snapshot,
      })
    }

    room[method](attachment.sessionId)
  }

  private getOrCreateRoom() {
    if (!this.roomPromise) {
      this.roomPromise = this.loadRoom().catch((error) => {
        this.roomPromise = null
        throw error
      })
    }
    return this.roomPromise
  }

  private async loadRoom(): Promise<TLSocketRoom<TLRecord, void>> {
    if (!this.roomId) {
      throw new Error("Room id is not available")
    }

    const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage)
    const initialized = SQLiteSyncStorage.hasBeenInitialized(sql)
    const snapshot = initialized ? undefined : await this.fetchLegacySnapshot(this.roomId)
    const storage = new SQLiteSyncStorage<TLRecord>({
      sql,
      snapshot: snapshot as RoomSnapshot | undefined,
    })

    const room = new TLSocketRoom<TLRecord, void>({
      schema: drawnixSyncSchema,
      storage,
      clientTimeout: Infinity,
      onSessionSnapshot: (sessionId, sessionSnapshot) => {
        const ws = this.sessionIdToWs.get(sessionId)
        if (!ws) return
        const current = getAttachment(ws)
        ws.serializeAttachment({
          sessionId,
          snapshot: sessionSnapshot,
          isReadonly: current?.isReadonly ?? false,
        })
      },
      onSessionRemoved: (activeRoom, { numSessionsRemaining }) => {
        if (numSessionsRemaining === 0) {
          this.ctx.waitUntil(this.persistSnapshotCache(activeRoom))
        }
      },
    })

    for (const ws of this.ctx.getWebSockets()) {
      const attachment = getAttachment(ws)
      if (!attachment?.snapshot) continue
      room.handleSocketResume({
        sessionId: attachment.sessionId,
        socket: ws,
        snapshot: attachment.snapshot,
      })
    }

    return room
  }

  private async fetchLegacySnapshot(roomId: string): Promise<unknown | undefined> {
    const response = await fetch(
      `${this.env.APP_URL.replace(/\/$/, "")}/api/internal/sync/${roomId}/snapshot`,
      {
        headers: {
          Authorization: `Bearer ${this.env.TLDRAW_SYNC_SECRET}`,
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (response.status === 404) {
      throw new Error("Board not found")
    }
    if (!response.ok) {
      throw new Error(`Snapshot service unavailable (${response.status})`)
    }

    const payload = (await response.json()) as { snapshot?: unknown }
    return payload.snapshot ?? undefined
  }

  private async persistSnapshotCache(room: TLSocketRoom<TLRecord, void>) {
    if (!this.roomId) return
    try {
      await fetch(
        `${this.env.APP_URL.replace(/\/$/, "")}/api/internal/sync/${this.roomId}/snapshot`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.env.TLDRAW_SYNC_SECRET}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ snapshot: room.getCurrentSnapshot() }),
          signal: AbortSignal.timeout(8000),
        }
      )
    } catch (error) {
      console.error("Failed to cache board snapshot", error)
    }
  }
}

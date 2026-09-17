"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSync } from "@tldraw/sync"
import {
  Tldraw,
  UserRecordType,
  computed,
  createUserId,
  type Editor,
} from "tldraw"
import "tldraw/tldraw.css"

import { DrawnixStylePanel } from "@/components/canvas/drawnix-style-panel"
import { DrawnixToolbar } from "@/components/canvas/drawnix-toolbar"
import {
  createDrawnixTheme,
  drawnixThemes,
  drawnixUiOverrides,
  getSavedPaletteMix,
} from "@/components/canvas/drawnix-theme"
import { createSyncAssetStore } from "@/components/canvas/sync-asset-store"

const canvasComponents = {
  Toolbar: DrawnixToolbar,
  StylePanel: DrawnixStylePanel,
}

const CONNECT_TIMEOUT_MS = 4000

export function CanvasEditor({
  boardId,
  userId,
  userName,
  userColor,
  syncUrl,
  initialToken,
  onStatus,
}: {
  boardId: string
  userId: string
  userName: string
  userColor: string
  syncUrl: string
  initialToken?: string | null
  onStatus?: (status: "connecting" | "live" | "reconnecting" | "error") => void
}) {
  const tokenRef = useRef(initialToken ?? null)
  const assets = useMemo(
    () => createSyncAssetStore(syncUrl, boardId),
    [boardId, syncUrl]
  )
  const users = useMemo(
    () => ({
      currentUser: computed("drawnix-user", () =>
        UserRecordType.create({
          id: createUserId(userId),
          name: userName,
          color: userColor,
        })
      ),
    }),
    [userColor, userId, userName]
  )

  const getConnectUri = useCallback(async () => {
    let token = tokenRef.current
    tokenRef.current = null
    if (!token) {
      const response = await fetch(`/api/boards/${boardId}/sync-token`, {
        cache: "no-store",
      })
      const payload = (await response.json().catch(() => null)) as
        | { token?: string; error?: string }
        | null
      if (!response.ok || !payload?.token) {
        throw new Error(payload?.error ?? "Could not authorize canvas sync")
      }
      token = payload.token
    }

    const url = new URL(`/api/connect/${boardId}`, syncUrl)
    url.searchParams.set("access_token", token)
    return url.toString()
  }, [boardId, syncUrl])

  const store = useSync({
    uri: getConnectUri,
    assets,
    users,
    themes: drawnixThemes,
  })

  const [timedOut, setTimedOut] = useState(false)

  const status = store.status
  const connectionStatus =
    store.status === "synced-remote" ? store.connectionStatus : undefined

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const disconnected = status === "error" || (status === "loading" && timedOut)

  useEffect(() => {
    if (disconnected) {
      onStatus?.("error")
      return
    }
    if (status === "loading") {
      onStatus?.("connecting")
      return
    }
    onStatus?.(connectionStatus === "online" ? "live" : "reconnecting")
  }, [connectionStatus, disconnected, onStatus, status])

  if (disconnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Could not join this board</p>
        <p className="max-w-md text-sm text-muted-foreground">
          The canvas sync worker is not reachable. Keep both{" "}
          <code>npm run dev</code> processes running, or start{" "}
          <code>npm run sync:dev</code> on port 8787.
        </p>
      </div>
    )
  }

  if (store.status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Joining board…</p>
      </div>
    )
  }

  return (
    <Tldraw
      store={store}
      components={canvasComponents}
      themes={drawnixThemes}
      overrides={drawnixUiOverrides}
      onMount={(editor: Editor) => {
        const mix = getSavedPaletteMix()
        if (mix !== "classic") {
          editor.updateTheme(createDrawnixTheme(mix))
        }
      }}
    />
  )
}

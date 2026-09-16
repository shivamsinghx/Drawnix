"use client"

import { useCallback, useMemo } from "react"
import Link from "next/link"
import { useSync } from "@tldraw/sync"
import {
  Tldraw,
  UserRecordType,
  computed,
  createUserId,
  type Editor,
} from "tldraw"
import { ArrowLeft } from "lucide-react"
import { motion } from "motion/react"
import "tldraw/tldraw.css"

import { buttonVariants } from "@/components/ui/button"
import { DrawnixStylePanel } from "@/components/canvas/drawnix-style-panel"
import { DrawnixToolbar } from "@/components/canvas/drawnix-toolbar"
import {
  createDrawnixTheme,
  drawnixThemes,
  drawnixUiOverrides,
  getSavedPaletteMix,
} from "@/components/canvas/drawnix-theme"
import { createSyncAssetStore } from "@/components/canvas/sync-asset-store"
import type { BoardRole } from "@/shared/sync-token"

const canvasComponents = {
  Toolbar: DrawnixToolbar,
  StylePanel: DrawnixStylePanel,
}

export function CanvasClient({
  boardId,
  boardName,
  userId,
  userName,
  userColor,
  role,
  canEdit,
  syncUrl,
}: {
  boardId: string
  boardName: string
  userId: string
  userName: string
  userColor: string
  role: BoardRole
  canEdit: boolean
  syncUrl: string
}) {
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
    const response = await fetch(`/api/boards/${boardId}/sync-token`, {
      cache: "no-store",
    })
    const payload = (await response.json().catch(() => null)) as
      | { token?: string; error?: string }
      | null

    if (!response.ok || !payload?.token) {
      throw new Error(payload?.error ?? "Could not authorize canvas sync")
    }

    const url = new URL(`/api/connect/${boardId}`, syncUrl)
    url.searchParams.set("access_token", payload.token)
    return url.toString()
  }, [boardId, syncUrl])

  const store = useSync({
    uri: getConnectUri,
    assets,
    users,
    themes: drawnixThemes,
  })

  const connectionLabel =
    store.status === "synced-remote"
      ? store.connectionStatus === "online"
        ? "Live"
        : "Reconnecting"
      : store.status === "error"
        ? "Disconnected"
        : "Connecting"

  return (
    <div className="flex h-svh flex-col bg-background">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-20 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
          <div>
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Board
            </p>
            <h1 className="text-sm font-medium">{boardName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2 py-1 capitalize">{role}</span>
          {!canEdit ? (
            <span className="rounded-full border px-2 py-1">View only</span>
          ) : null}
          <span className="rounded-full border px-2 py-1">{connectionLabel}</span>
        </div>
      </motion.header>
      <div className="drawnix-dock relative min-h-0 flex-1">
        {store.status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium">Could not join this board</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Real-time sync needs an authenticated connection to this board.
              Check that the sync worker is running and that you still have
              access.
            </p>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}

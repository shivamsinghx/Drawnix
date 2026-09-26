"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { ShareBoardButton } from "@/components/canvas/share-board-button"
import type { BoardRole } from "@/shared/sync-token"

const CanvasEditor = dynamic(
  () =>
    import("@/components/canvas/canvas-editor").then((mod) => mod.CanvasEditor),
  {
    ssr: false,
    loading: () => <CanvasPlaceholder label="Loading editor" />,
  }
)

function CanvasPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">{label}…</p>
    </div>
  )
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
  initialToken,
}: {
  boardId: string
  boardName: string
  userId: string
  userName: string
  userColor: string
  role: BoardRole
  canEdit: boolean
  syncUrl: string
  initialToken?: string | null
}) {
  const [status, setStatus] = useState<
    "connecting" | "live" | "reconnecting" | "error"
  >("connecting")

  const connectionLabel =
    status === "live"
      ? "Live"
      : status === "reconnecting"
        ? "Reconnecting"
        : status === "error"
          ? "Disconnected"
          : "Connecting"

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="z-20 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
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
        <div className="flex items-center gap-2">
          {role === "owner" ? (
            <ShareBoardButton boardId={boardId} boardName={boardName} />
          ) : null}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-2 py-1 capitalize">{role}</span>
            {!canEdit ? (
              <span className="rounded-full border px-2 py-1">View only</span>
            ) : null}
            <span className="rounded-full border px-2 py-1">{connectionLabel}</span>
          </div>
        </div>
      </header>
      <div className="drawnix-dock relative min-h-0 flex-1">
        <CanvasEditor
          boardId={boardId}
          userId={userId}
          userName={userName}
          userColor={userColor}
          syncUrl={syncUrl}
          initialToken={initialToken}
          canEdit={canEdit}
          onStatus={setStatus}
        />
      </div>
    </div>
  )
}

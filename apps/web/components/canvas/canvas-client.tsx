"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Tldraw } from "tldraw"
import { ArrowLeft } from "lucide-react"
import { motion } from "motion/react"
import "tldraw/tldraw.css"

import { getBoard, touchBoard, type Board } from "@/lib/boards"
import { buttonVariants } from "@/components/ui/button"
import { DrawnixToolbar } from "@/components/canvas/drawnix-toolbar"

export function CanvasClient({
  boardId,
  userId,
}: {
  boardId: string
  userId: string
}) {
  const router = useRouter()
  const [board, setBoard] = useState<Board | null>(null)

  useEffect(() => {
    const found = getBoard(userId, boardId)
    if (!found) {
      router.replace("/dashboard")
      return
    }
    touchBoard(userId, boardId)
    setBoard(found)
  }, [boardId, router, userId])

  const persistenceKey = useMemo(
    () => `drawnix.canvas.${userId}.${boardId}`,
    [boardId, userId]
  )

  if (!board) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-50 text-sm text-muted-foreground dark:bg-black">
        Opening board...
      </div>
    )
  }

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
            <h1 className="text-sm font-medium">{board.title}</h1>
          </div>
        </div>
      </motion.header>
      <div className="drawnix-dock relative min-h-0 flex-1">
        <Tldraw
          persistenceKey={persistenceKey}
          components={{ Toolbar: DrawnixToolbar }}
        />
      </div>
    </div>
  )
}

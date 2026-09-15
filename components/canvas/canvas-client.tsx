"use client"

import { useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { Tldraw, type Editor, type TLEditorSnapshot } from "tldraw"
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

const canvasComponents = {
  Toolbar: DrawnixToolbar,
  StylePanel: DrawnixStylePanel,
}

const SAVE_DELAY_MS = 800

export function CanvasClient({
  boardId,
  boardName,
  snapshot,
}: {
  boardId: string
  boardName: string
  snapshot?: TLEditorSnapshot | Record<string, unknown>
}) {
  const editorRef = useRef<Editor | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string | null>(null)

  const persist = useCallback(
    async (editor: Editor, keepalive = false) => {
      const next = editor.getSnapshot()
      const serialized = JSON.stringify(next)
      if (serialized === lastSaved.current) return
      lastSaved.current = serialized

      try {
        await fetch(`/api/boards/${boardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: next }),
          keepalive,
        })
      } catch {
        lastSaved.current = null
      }
    },
    [boardId]
  )

  const scheduleSave = useCallback(
    (editor: Editor) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void persist(editor)
      }, SAVE_DELAY_MS)
    },
    [persist]
  )

  useEffect(() => {
    const flush = () => {
      const editor = editorRef.current
      if (!editor) return
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      void persist(editor, true)
    }

    window.addEventListener("pagehide", flush)
    window.addEventListener("beforeunload", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("beforeunload", flush)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [persist])

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
      </motion.header>
      <div className="drawnix-dock relative min-h-0 flex-1">
        <Tldraw
          snapshot={snapshot as TLEditorSnapshot | undefined}
          components={canvasComponents}
          themes={drawnixThemes}
          overrides={drawnixUiOverrides}
          onMount={(editor) => {
            editorRef.current = editor
            const mix = getSavedPaletteMix()
            if (mix !== "classic") {
              editor.updateTheme(createDrawnixTheme(mix))
            }
            lastSaved.current = JSON.stringify(editor.getSnapshot())
            editor.store.listen(
              () => {
                scheduleSave(editor)
              },
              { source: "user", scope: "document" }
            )
          }}
        />
      </div>
    </div>
  )
}

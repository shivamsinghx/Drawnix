"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function NewBoardButton({
  size = "default",
  className,
}: {
  userId?: string
  size?: "default" | "lg"
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTitle("")
    setPending(false)
    setError(null)
  }

  const create = async () => {
    const name = title.trim()
    if (!name || pending) return

    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { board?: { id: string }; error?: string }
        | null

      if (!response.ok || !payload?.board?.id) {
        setError(payload?.error ?? "Could not create board")
        setPending(false)
        return
      }

      setOpen(false)
      reset()
      router.push(`/canvas/${payload.board.id}`)
      router.refresh()
    } catch {
      setError("Could not create board")
      setPending(false)
    }
  }

  return (
    <>
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          disabled={pending}
          className={cn(
            "rounded-full shadow-lg shadow-foreground/10",
            size === "lg" && "h-12 px-6 text-base",
            className
          )}
        >
          <Plus className={size === "lg" ? "size-5" : "size-4"} />
          New Board
        </Button>
      </motion.div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) reset()
        }}
      >
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <DialogHeader>
              <DialogTitle>Name your board</DialogTitle>
              <DialogDescription>
                Give this canvas a name before you start drawing.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Product brainstorm"
                aria-label="Board name"
                disabled={pending}
                maxLength={80}
              />
              {error ? (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !title.trim()}>
                {pending ? "Opening board..." : "Create board"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

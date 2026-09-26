"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { parseBoardName } from "@/lib/boards"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function RenameBoardDialog({
  boardId,
  boardName,
  open,
  onOpenChange,
  onRenamed,
}: {
  boardId: string
  boardName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRenamed: (name: string) => void
}) {
  const [title, setTitle] = useState(boardName)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTitle(boardName)
      setError(null)
      setPending(false)
    }
  }

  const close = () => {
    if (pending) return
    onOpenChange(false)
  }

  const save = async () => {
    const parsed = parseBoardName(title)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    if (pending) return

    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.name }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { name?: string; error?: string }
        | null
      if (!response.ok || !payload?.name) {
        setError(payload?.error ?? "Could not rename this board")
        setPending(false)
        return
      }
      onRenamed(payload.name)
      setPending(false)
      onOpenChange(false)
    } catch {
      setError("Could not rename this board")
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setTitle(boardName)
          setError(null)
          setPending(false)
        }
        if (!nextOpen && pending) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename board</DialogTitle>
            <DialogDescription>
              This name is shown on your dashboard and in the canvas header.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label htmlFor={`rename-${boardId}`} className="sr-only">
              Board name
            </label>
            <Input
              id={`rename-${boardId}`}
              autoFocus
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return
                event.preventDefault()
                void save()
              }}
              aria-label="Board name"
              disabled={pending}
            />
            {error ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RenameBoardButton({
  className,
  label = "Rename board",
  onClick,
}: {
  className?: string
  label?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      onClick={onClick}
    >
      <Pencil className="size-3.5" />
    </button>
  )
}

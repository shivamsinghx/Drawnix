"use client"

import { useMemo, useState } from "react"
import { signOut } from "next-auth/react"
import { motion } from "motion/react"
import { CheckSquare, LogOut, Trash2 } from "lucide-react"

import { type Board, type SharedBoard } from "@/lib/boards"
import { LightRays } from "@/components/ui/light-rays"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyBoards } from "@/components/dashboard/empty-boards"
import { BoardCard } from "@/components/dashboard/board-card"
import { NewBoardButton } from "@/components/dashboard/new-board-button"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type DashboardUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export function DashboardHome({
  user,
  initialBoards,
  sharedBoards,
}: {
  user: DashboardUser
  initialBoards: Board[]
  sharedBoards: SharedBoard[]
}) {
  const [boards, setBoards] = useState<Board[]>(initialBoards)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const initials = useMemo(() => {
    const source = user.name?.trim() || user.email?.trim() || "D"
    return source.slice(0, 1).toUpperCase()
  }, [user.email, user.name])

  const selectedCount = selectedIds.length
  const selectedTitles = useMemo(
    () =>
      (boards ?? [])
        .filter((board) => selectedIds.includes(board.id))
        .map((board) => board.title),
    [boards, selectedIds]
  )

  const toggleBoard = (boardId: string) => {
    setSelectedIds((current) =>
      current.includes(boardId)
        ? current.filter((id) => id !== boardId)
        : [...current, boardId]
    )
  }

  const exitSelecting = () => {
    setSelecting(false)
    setSelectedIds([])
    setConfirmOpen(false)
  }

  const confirmDelete = async () => {
    const response = await fetch("/api/boards", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    })
    const payload = (await response.json().catch(() => null)) as
      | { boards?: Board[] }
      | null
    if (response.ok && payload?.boards) {
      const sharedIds = new Set(sharedBoards.map((board) => board.id))
      setBoards(payload.boards.filter((board) => !sharedIds.has(board.id)))
    }
    exitSelecting()
  }

  return (
    <div className="relative min-h-svh overflow-hidden">
      <LightRays length="80vh" color="rgba(160, 210, 255, 0.16)" />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-muted-foreground uppercase">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome to Drawnix
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {user.name ? `Signed in as ${user.name}` : user.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatedThemeToggler className="rounded-full p-2 hover:bg-muted" />
            <Avatar size="lg">
              {user.image ? <AvatarImage src={user.image} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </motion.header>

        <main className="flex flex-1 flex-col justify-center gap-12 py-12">
          {boards.length === 0 && sharedBoards.length === 0 ? (
            <EmptyBoards />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-medium">My Boards</h2>
                  <p className="text-sm text-muted-foreground">
                    {selecting
                      ? selectedCount > 0
                        ? `${selectedCount} board${selectedCount === 1 ? "" : "s"} selected`
                        : "Select the boards you want to delete."
                      : "Pick up where you left off, or start another one."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {boards.length === 0 ? null : selecting ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={exitSelecting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-full"
                        disabled={selectedCount === 0}
                        onClick={() => setConfirmOpen(true)}
                      >
                        <Trash2 className="size-4" />
                        Delete{selectedCount > 0 ? ` (${selectedCount})` : ""}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setSelecting(true)}
                    >
                      <CheckSquare className="size-4" />
                      Select
                    </Button>
                  )}
                  <NewBoardButton />
                </div>
              </div>
              {boards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have not created a board yet.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {boards.map((board, index) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      index={index}
                      selecting={selecting}
                      selected={selectedIds.includes(board.id)}
                      onToggle={toggleBoard}
                      onDelete={(boardId) => {
                        setSelectedIds([boardId])
                        setConfirmOpen(true)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {boards.length > 0 || sharedBoards.length > 0 ? (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-medium">Shared with me</h2>
                <p className="text-sm text-muted-foreground">
                  Boards other people have shared with you.
                </p>
              </div>
              {sharedBoards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing has been shared with you yet.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sharedBoards.map((board, index) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      index={index}
                      sharedBy={board.sharedBy}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </main>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open && !selecting) setSelectedIds([])
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedCount} board{selectedCount === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              This removes the selected board
              {selectedCount === 1 ? "" : "s"} and their drawings from your
              workspace. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTitles.length > 0 ? (
            <ul className="max-h-36 list-disc overflow-auto pl-5 text-sm text-muted-foreground">
              {selectedTitles.map((title, index) => (
                <li key={`${title}-${index}`}>{title}</li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

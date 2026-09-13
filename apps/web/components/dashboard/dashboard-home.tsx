"use client"

import { useEffect, useMemo, useState } from "react"
import { signOut } from "next-auth/react"
import { motion } from "motion/react"
import { CheckSquare, LogOut, Trash2 } from "lucide-react"

import { deleteBoards, listBoards, type Board } from "@/lib/boards"
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

export function DashboardHome({ user }: { user: DashboardUser }) {
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setBoards(listBoards(user.id))
  }, [user.id])

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

  const confirmDelete = () => {
    const remaining = deleteBoards(user.id, selectedIds)
    setBoards(remaining)
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

        <main className="flex flex-1 flex-col justify-center py-12">
          {boards === null ? (
            <div className="h-64 animate-pulse rounded-3xl bg-muted/60" />
          ) : boards.length === 0 ? (
            <EmptyBoards userId={user.id} />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-medium">Your boards</h2>
                  <p className="text-sm text-muted-foreground">
                    {selecting
                      ? selectedCount > 0
                        ? `${selectedCount} board${selectedCount === 1 ? "" : "s"} selected`
                        : "Select the boards you want to delete."
                      : "Pick up where you left off, or start another one."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selecting ? (
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
                  <NewBoardButton userId={user.id} />
                </div>
              </div>
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
            </div>
          )}
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
              {selectedCount === 1 ? "" : "s"} and their drawings from this
              browser. This cannot be undone.
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

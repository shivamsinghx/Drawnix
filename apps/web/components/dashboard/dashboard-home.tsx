"use client"

import { useEffect, useMemo, useState } from "react"
import { signOut } from "next-auth/react"
import { motion } from "motion/react"
import { LogOut } from "lucide-react"

import { listBoards, type Board } from "@/lib/boards"
import { LightRays } from "@/components/ui/light-rays"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyBoards } from "@/components/dashboard/empty-boards"
import { BoardCard } from "@/components/dashboard/board-card"
import { NewBoardButton } from "@/components/dashboard/new-board-button"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

type DashboardUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export function DashboardHome({ user }: { user: DashboardUser }) {
  const [boards, setBoards] = useState<Board[] | null>(null)

  useEffect(() => {
    setBoards(listBoards(user.id))
  }, [user.id])
  const initials = useMemo(() => {
    const source = user.name?.trim() || user.email?.trim() || "D"
    return source.slice(0, 1).toUpperCase()
  }, [user.email, user.name])

  return (
    <div className="relative min-h-svh overflow-hidden bg-zinc-50 dark:bg-black">
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-medium">Your boards</h2>
                  <p className="text-sm text-muted-foreground">
                    Pick up where you left off, or start another one.
                  </p>
                </div>
                <NewBoardButton userId={user.id} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((board, index) => (
                  <BoardCard key={board.id} board={board} index={index} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

"use client"

import { motion } from "motion/react"
import { Sparkles } from "lucide-react"

import { NewBoardButton } from "@/components/dashboard/new-board-button"

export function EmptyBoards() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-dashed border-foreground/15 bg-background/70 px-6 py-16 text-center shadow-xl backdrop-blur-xl"
    >
      <motion.div
        className="pointer-events-none absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-sky-300/20 blur-3xl"
        animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg"
      >
        <Sparkles className="size-7" />
      </motion.div>
      <h2 className="text-3xl font-semibold tracking-tight">
        Create your first board
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        A blank canvas for thinking, sketching, and collaborating. Start one now
        and Drawnix will keep it in your workspace.
      </p>
      <div className="mt-8 flex justify-center">
        <NewBoardButton size="lg" />
      </div>
    </motion.div>
  )
}

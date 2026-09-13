"use client"

import Link from "next/link"
import { motion } from "motion/react"

import type { Board } from "@/lib/boards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function BoardCard({ board, index }: { board: Board; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
    >
      <Link href={`/canvas/${board.id}`} className="block">
        <Card className="group overflow-hidden transition-shadow hover:shadow-xl">
          <div className="relative h-36 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(160,210,255,0.35),_transparent_55%),linear-gradient(180deg,#f8fafc,#e2e8f0)] dark:bg-[radial-gradient(circle_at_top,_rgba(160,210,255,0.12),_transparent_55%),linear-gradient(180deg,#171717,#0a0a0a)]">
            <div className="absolute inset-6 rounded-xl border border-dashed border-foreground/15 bg-background/50 backdrop-blur-sm transition-transform duration-500 group-hover:scale-[1.03]" />
            <div className="absolute top-8 left-10 h-2 w-16 rounded-full bg-orange-400/80" />
            <div className="absolute top-14 left-10 h-2 w-24 rounded-full bg-lime-300/90" />
            <div className="absolute right-10 bottom-10 size-10 rounded-full border-2 border-[#3B6FA0]/70" />
          </div>
          <CardHeader className="pb-1">
            <CardTitle className="truncate">{board.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Updated {formatUpdated(board.updatedAt)}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

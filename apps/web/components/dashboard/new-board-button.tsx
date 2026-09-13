"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Plus } from "lucide-react"

import { createBoard } from "@/lib/boards"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NewBoardButton({
  userId,
  size = "default",
  className,
}: {
  userId: string
  size?: "default" | "lg"
  className?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const create = () => {
    if (pending) return
    setPending(true)
    const board = createBoard(userId)
    router.push(`/canvas/${board.id}`)
  }

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
      <Button
        type="button"
        onClick={create}
        disabled={pending}
        className={cn(
          "rounded-full shadow-lg shadow-foreground/10",
          size === "lg" && "h-12 px-6 text-base",
          className
        )}
      >
        <Plus className={size === "lg" ? "size-5" : "size-4"} />
        {pending ? "Opening board..." : "New Board"}
      </Button>
    </motion.div>
  )
}

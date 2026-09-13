"use client"

import { motion } from "motion/react"
import { LockKeyhole } from "lucide-react"

import { LoginCard } from "@/components/login-card"
import { LightRays } from "@/components/ui/light-rays"
import { Button } from "@/components/ui/button"

export function NotAuthenticated() {
  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center overflow-hidden px-6">
      <LightRays length="100vh" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-border/70 bg-background/80 p-10 text-center shadow-2xl backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.7, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg"
        >
          <LockKeyhole className="size-7" />
        </motion.div>
        <p className="text-xs font-semibold tracking-[0.28em] text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Not authenticated
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in to open your workspace, create boards, and start drawing.
        </p>
        <div className="mt-8">
          <LoginCard
            trigger={
              <Button className="h-10 w-full rounded-full">Log in to continue</Button>
            }
          />
        </div>
      </motion.div>
    </div>
  )
}

"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react"
import { motion } from "motion/react"
import { Manrope } from "next/font/google"

import { cn } from "@/lib/utils"

const manrope = Manrope({
  subsets: ["latin"],
  weight: "700",
})

type PupilPos = { x: number; y: number }

function Eye({
  eyeColor,
  pupilColor,
  eyeSize,
  pupilSize,
  pupilPos,
  isBlinking,
  trackingSpeed,
}: {
  eyeColor: string
  pupilColor: string
  eyeSize: number
  pupilSize: number
  pupilPos: PupilPos
  isBlinking: boolean
  trackingSpeed: number
}) {
  return (
    <div
      className="overflow-hidden rounded-full"
      style={{ width: eyeSize, height: eyeSize }}
    >
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: eyeSize,
          height: eyeSize,
          backgroundColor: eyeColor,
          transformOrigin: "center",
        }}
        animate={{ scaleY: isBlinking ? 0.08 : 1 }}
        transition={{
          duration: isBlinking ? 0.06 : 0.14,
          ease: isBlinking ? [0.4, 0, 1, 1] : [0.22, 1, 0.36, 1],
        }}
      >
        <motion.div
          className="rounded-full"
          style={{
            width: pupilSize,
            height: pupilSize,
            backgroundColor: pupilColor,
          }}
          animate={{
            x: pupilPos.x,
            y: pupilPos.y,
            opacity: isBlinking ? 0 : 1,
          }}
          transition={{
            x: { type: "spring", stiffness: trackingSpeed, damping: 18 },
            y: { type: "spring", stiffness: trackingSpeed, damping: 18 },
            opacity: {
              duration: isBlinking ? 0.05 : 0.12,
              ease: "easeOut",
            },
          }}
        />
      </motion.div>
    </div>
  )
}

export function EyeFollowButton({
  children = "See it in action",
  href,
  className,
  buttonColor = "rgb(0, 0, 0)",
  textColor = "rgb(255, 255, 255)",
  eyeColor = "rgb(255, 255, 255)",
  pupilColor = "rgb(0, 0, 0)",
  eyeSize = 24,
  pupilSize: rawPupilSize = 7,
  eyeGap = 3,
  trackingSpeed = 220,
  trackingRange = 90,
  blinking = true,
  onClick,
  ...props
}: {
  children?: ReactNode
  href?: string
  className?: string
  buttonColor?: string
  textColor?: string
  eyeColor?: string
  pupilColor?: string
  eyeSize?: number
  pupilSize?: number
  eyeGap?: number
  trackingSpeed?: number
  trackingRange?: number
  blinking?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftPupilPos, setLeftPupilPos] = useState<PupilPos>({ x: 0, y: 0 })
  const [rightPupilPos, setRightPupilPos] = useState<PupilPos>({ x: 0, y: 0 })
  const [isBlinking, setIsBlinking] = useState(false)

  const pupilSize = useMemo(
    () => Math.min(rawPupilSize, eyeSize * 0.8),
    [rawPupilSize, eyeSize]
  )
  const maxDistance = useMemo(
    () => ((eyeSize - pupilSize) / 2) * (trackingRange / 100),
    [eyeSize, pupilSize, trackingRange]
  )

  useEffect(() => {
    if (!blinking) return

    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeouts.push(setTimeout(resolve, ms))
      })

    const closeAndOpen = async () => {
      if (cancelled) return
      setIsBlinking(true)
      await wait(80 + Math.random() * 50)
      if (cancelled) return
      setIsBlinking(false)
    }

    const loop = async () => {
      await wait(700 + Math.random() * 900)
      while (!cancelled) {
        await closeAndOpen()
        if (cancelled) return
        if (Math.random() < 0.38) {
          await wait(90 + Math.random() * 80)
          await closeAndOpen()
        }
        await wait(2200 + Math.random() * 4000)
      }
    }

    void loop()

    return () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
  }, [blinking])

  useEffect(() => {
    let frame = 0

    const handleMouseMove = (event: MouseEvent) => {
      if (frame) return

      const { clientX, clientY } = event
      frame = requestAnimationFrame(() => {
        frame = 0
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const mouseX = clientX - (rect.left + rect.width / 2)
        const mouseY = clientY - (rect.top + rect.height / 2)

        const pupilFromOffset = (eyeOffsetX: number) => {
          const relativeX = mouseX - eyeOffsetX
          const distance = Math.hypot(relativeX, mouseY)
          if (distance === 0) return { x: 0, y: 0 }

          const clampedDistance = Math.min(distance, maxDistance)
          const angle = Math.atan2(mouseY, relativeX)
          return {
            x: Math.cos(angle) * clampedDistance,
            y: Math.sin(angle) * clampedDistance,
          }
        }

        setLeftPupilPos(pupilFromOffset(-eyeGap / 2))
        setRightPupilPos(pupilFromOffset(eyeGap / 2))
      })
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(frame)
    }
  }, [eyeGap, maxDistance])

  const content = (
    <>
      <span
        className={cn(manrope.className, "relative whitespace-nowrap text-sm")}
        style={{
          color: textColor,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.4,
        }}
      >
        {children}
      </span>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center"
        style={{ gap: eyeGap, height: eyeSize }}
      >
        <Eye
          eyeColor={eyeColor}
          pupilColor={pupilColor}
          eyeSize={eyeSize}
          pupilSize={pupilSize}
          pupilPos={leftPupilPos}
          isBlinking={isBlinking}
          trackingSpeed={trackingSpeed}
        />
        <Eye
          eyeColor={eyeColor}
          pupilColor={pupilColor}
          eyeSize={eyeSize}
          pupilSize={pupilSize}
          pupilPos={rightPupilPos}
          isBlinking={isBlinking}
          trackingSpeed={trackingSpeed}
        />
      </div>
    </>
  )

  const sharedClassName = cn(
    "inline-flex cursor-pointer items-center justify-center gap-3 no-underline",
    className
  )
  const sharedStyle = {
    backgroundColor: buttonColor,
    borderRadius: 20,
    padding: "4px 4px 4px 14px",
    boxShadow:
      "0.4px 0.4px 0.56px -0.31px rgba(0, 0, 0, 0.07), 1.2px 1.2px 1.71px -0.63px rgba(0, 0, 0, 0.08), 3.19px 3.19px 4.51px -0.94px rgba(0, 0, 0, 0.1), 10px 10px 14.14px -1.25px rgba(0, 0, 0, 0.19)",
  }

  if (href) {
    return (
      <a href={href} className={sharedClassName} style={sharedStyle}>
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={sharedClassName}
      style={sharedStyle}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  )
}

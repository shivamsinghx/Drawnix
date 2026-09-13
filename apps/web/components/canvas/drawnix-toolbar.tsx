"use client"

import type { ComponentType } from "react"
import {
  ArrowUpRight,
  Circle,
  Diamond,
  Eraser,
  Hand,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
} from "lucide-react"
import { useIsToolSelected, useTools } from "tldraw"

import { cn } from "@/lib/utils"

type DockIcon = ComponentType<{ className?: string }>

const TOOLS: { id: string; label: string; icon: DockIcon }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "hand", label: "Hand", icon: Hand },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "diamond", label: "Diamond", icon: Diamond },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
  { id: "line", label: "Line", icon: LineIcon },
  { id: "draw", label: "Draw", icon: Pencil },
  { id: "text", label: "Text", icon: Type },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "note", label: "Note", icon: StickyNote },
]

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 18 L18 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DockTool({
  id,
  label,
  icon: Icon,
}: {
  id: string
  label: string
  icon: DockIcon
}) {
  const tools = useTools()
  const tool = tools[id]
  const selected = useIsToolSelected(tool)

  if (!tool) return null

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cn("drawnix-dock-btn", selected && "is-active")}
      onClick={() => tool.onSelect("toolbar")}
    >
      <Icon />
    </button>
  )
}

export function DrawnixToolbar() {
  return (
    <div className="drawnix-toolbar-slot">
      <div className="drawnix-floating-dock" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map((tool) => (
          <DockTool key={tool.id} {...tool} />
        ))}
      </div>
    </div>
  )
}

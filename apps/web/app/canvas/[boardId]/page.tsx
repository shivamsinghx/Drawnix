import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { CanvasClient } from "@/components/canvas/canvas-client"

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/dashboard")
  }

  const { boardId } = await params
  const userId = session.user.email ?? session.user.name ?? "local"

  return <CanvasClient boardId={boardId} userId={userId} />
}

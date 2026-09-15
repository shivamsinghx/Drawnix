import { NotAuthenticated } from "@/components/dashboard/not-authenticated"
import { DashboardHome } from "@/components/dashboard/dashboard-home"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { listBoards } from "@/lib/board-service"
import { getCurrentUser } from "@/lib/current-user"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  const content = !user ? (
    <NotAuthenticated />
  ) : (
    <DashboardHome
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }}
      initialBoards={await listBoards(user.id)}
    />
  )

  return (
    <div className="relative min-h-svh overflow-hidden bg-zinc-50 dark:bg-black">
      <AnimatedGridPattern />
      <div className="relative z-10">{content}</div>
    </div>
  )
}

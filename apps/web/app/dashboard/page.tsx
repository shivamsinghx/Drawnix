import { auth } from "@/lib/auth"
import { NotAuthenticated } from "@/components/dashboard/not-authenticated"
import { DashboardHome } from "@/components/dashboard/dashboard-home"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"

export default async function DashboardPage() {
  const session = await auth()

  const content = !session?.user ? (
    <NotAuthenticated />
  ) : (
    <DashboardHome
      user={{
        id: session.user.email ?? session.user.name ?? "local",
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  )

  return (
    <div className="relative min-h-svh overflow-hidden bg-zinc-50 dark:bg-black">
      <AnimatedGridPattern />
      <div className="relative z-10">{content}</div>
    </div>
  )
}

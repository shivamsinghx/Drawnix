import { auth } from "@/lib/auth"
import { NotAuthenticated } from "@/components/dashboard/not-authenticated"
import { DashboardHome } from "@/components/dashboard/dashboard-home"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    return <NotAuthenticated />
  }

  const userId = session.user.email ?? session.user.name ?? "local"

  return (
    <DashboardHome
      user={{
        id: userId,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  )
}

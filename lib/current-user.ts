import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) return null

  if (session.user.id) {
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    }
  }

  if (!session.user.email) return null

  const row = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!row) return null

  return {
    id: row.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  }
}

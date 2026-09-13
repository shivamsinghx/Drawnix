import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  providers: [Google, GitHub],
  pages: {
    signIn: "/",
  },
  callbacks: {
    session({ session }) {
      return session
    },
  },
})
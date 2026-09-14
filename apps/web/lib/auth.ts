import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,

  adapter: PrismaAdapter(prisma),
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
import { cookies } from "next/headers"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Prisma } from "@/generated/prisma/client"
import { emailsAllowMerge, mergeAuthUsers } from "@/lib/merge-auth-users"
import { prisma } from "@/lib/prisma"

import NextAuth from "next-auth"
import type { Account, Profile } from "next-auth"
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

const GITHUB_USER_URL = "https://api.github.com/user"
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

type GitHubEmail = {
  email: string
  primary: boolean
  verified: boolean
  visibility: "public" | "private" | null
}

function normalizeEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase()
  return value ? value : null
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

function toAdapterUser(user: {
  id: string
  name: string | null
  email: string | null
  emailVerified: Date | null
  image: string | null
}): AdapterUser {
  return {
    id: user.id,
    name: user.name ?? undefined,
    email: user.email ?? "",
    emailVerified: user.emailVerified,
    image: user.image ?? undefined,
  }
}

function oauthAccountData(userId: string, account: Account | AdapterAccount) {
  return {
    userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refresh_token:
      typeof account.refresh_token === "string" ? account.refresh_token : undefined,
    access_token:
      typeof account.access_token === "string" ? account.access_token : undefined,
    expires_at:
      typeof account.expires_at === "number" ? account.expires_at : undefined,
    token_type:
      typeof account.token_type === "string" ? account.token_type : undefined,
    scope: typeof account.scope === "string" ? account.scope : undefined,
    id_token: typeof account.id_token === "string" ? account.id_token : undefined,
    session_state:
      typeof account.session_state === "string" ? account.session_state : undefined,
  }
}

async function persistOAuthAccount(userId: string, account: Account | AdapterAccount) {
  try {
    return await prisma.account.create({
      data: oauthAccountData(userId, account),
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      })
    }
    throw error
  }
}

function createAuthAdapter(): Adapter {
  const base = PrismaAdapter(prisma)
  return {
    ...base,
    async getUserByEmail(email) {
      const normalized = normalizeEmail(email)
      if (!normalized) return null
      const user = await prisma.user.findFirst({
        where: { email: { equals: normalized, mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
      })
      return user ? toAdapterUser(user) : null
    },
    async createUser(data) {
      const email = normalizeEmail(data.email)
      const user = await prisma.user.create({
        data: {
          name: data.name ?? undefined,
          email,
          image: data.image ?? undefined,
          emailVerified: email ? (data.emailVerified ?? new Date()) : null,
        },
      })
      return toAdapterUser(user)
    },
    async linkAccount(account) {
      return (await persistOAuthAccount(account.userId, account)) as AdapterAccount
    },
  }
}

function profileEmailVerified(profile: Profile | undefined) {
  const verified = (profile as { email_verified?: boolean | string } | undefined)
    ?.email_verified
  return verified === true || verified === "true"
}

async function fetchVerifiedGitHubEmail(accessToken: string) {
  const response = await fetch(GITHUB_EMAILS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "drawnix",
      Accept: "application/vnd.github+json",
    },
  })
  if (!response.ok) return null

  const emails = (await response.json()) as GitHubEmail[]
  if (!Array.isArray(emails)) return null

  const verified = emails.filter((entry) => entry.verified && entry.email)
  return verified.find((entry) => entry.primary) ?? verified[0] ?? null
}

async function oauthEmailIsVerified(
  provider: string | undefined,
  profile: Profile | undefined,
  account: Account | null
) {
  if (provider === "google") return profileEmailVerified(profile)
  if (provider !== "github") return false
  if (profileEmailVerified(profile)) return true

  const accessToken = account?.access_token
  if (!accessToken) return false

  const verifiedEmail = await fetchVerifiedGitHubEmail(accessToken)
  const profileEmail = normalizeEmail(profile?.email)
  if (!verifiedEmail) return false
  if (!profileEmail) return true
  return normalizeEmail(verifiedEmail.email) === profileEmail
}

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
]

async function getSessionRecord() {
  try {
    const store = await cookies()
    for (const name of SESSION_COOKIE_NAMES) {
      const token = store.get(name)?.value
      if (!token) continue
      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        select: {
          sessionToken: true,
          userId: true,
          expires: true,
        },
      })
      if (session && session.expires > new Date()) return session
    }
  } catch {
    return null
  }
  return null
}

async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  })
}

async function absorbUserIfNeeded(
  keepUserId: string,
  otherUserId: string | null | undefined,
  incomingEmail: string | null
) {
  if (!otherUserId || otherUserId === keepUserId) return keepUserId

  const [keep, other] = await Promise.all([
    prisma.user.findUnique({
      where: { id: keepUserId },
      select: { id: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, email: true },
    }),
  ])
  if (!keep) return otherUserId
  if (!other) return keepUserId

  if (!emailsAllowMerge(keep.email, other.email, incomingEmail)) {
    return null
  }

  return mergeAuthUsers(keepUserId, otherUserId)
}

async function linkVerifiedOAuthToExistingUser(
  userEmail: string | null | undefined,
  account: Account | null,
  profile: Profile | undefined
) {
  if (!account?.provider || !account.providerAccountId) return true

  const incomingEmail = normalizeEmail(userEmail ?? profile?.email)
  const verified = incomingEmail
    ? await oauthEmailIsVerified(account.provider, profile, account)
    : false

  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    select: { userId: true },
  })
  const emailOwner = incomingEmail ? await findUserByEmail(incomingEmail) : null
  const session = await getSessionRecord()

  if (!existingAccount && !incomingEmail) return "/?error=UnverifiedEmail"
  if (!existingAccount && !verified) return "/?error=UnverifiedEmail"

  if (session?.userId) {
    const mergedEmailOwner = await absorbUserIfNeeded(
      session.userId,
      emailOwner?.id,
      incomingEmail
    )
    if (mergedEmailOwner === null) {
      await prisma.session.deleteMany({
        where: { sessionToken: session.sessionToken },
      })
    } else {
      const mergedOAuthOwner = await absorbUserIfNeeded(
        session.userId,
        existingAccount?.userId,
        incomingEmail
      )
      if (mergedOAuthOwner === null) {
        await prisma.session.deleteMany({
          where: { sessionToken: session.sessionToken },
        })
      }
    }
    return true
  }

  if (existingAccount) return true

  if (emailOwner) {
    await persistOAuthAccount(emailOwner.id, account)
  }

  return true
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  adapter: createAuthAdapter(),
  providers: [
    Google,
    GitHub({
      userinfo: {
        url: GITHUB_USER_URL,
        async request({ tokens }: { tokens: { access_token?: string } }) {
          const accessToken = tokens.access_token
          if (!accessToken) {
            throw new Error("GitHub did not return an access token")
          }

          const profile = await fetch(GITHUB_USER_URL, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "drawnix",
              Accept: "application/vnd.github+json",
            },
          }).then(async (response) => {
            if (!response.ok) {
              throw new Error("GitHub profile request failed")
            }
            return response.json()
          })

          const verifiedEmail = await fetchVerifiedGitHubEmail(accessToken)
          profile.email = verifiedEmail?.email ?? null
          profile.email_verified = Boolean(verifiedEmail)
          return profile
        },
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      return linkVerifiedOAuthToExistingUser(
        user.email,
        account ?? null,
        profile
      )
    },
    session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id
      }
      return session
    },
  },
})

import type { NextAuthConfig } from 'next-auth'

// Edge-safe base config — no Prisma/bcrypt, runs in proxy (Edge runtime)
// Credentials provider added in auth.ts (Node runtime)
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [], // Populated in auth.ts
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    // Route protection logic — runs in proxy
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected =
        nextUrl.pathname.startsWith('/create') ||
        nextUrl.pathname.startsWith('/account') ||
        nextUrl.pathname.startsWith('/studio')
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register')
      const isVerifyPage = nextUrl.pathname.startsWith('/verify-email')

      // @ts-expect-error emailVerified from custom JWT
      const emailVerified = auth?.user?.emailVerified ?? true

      // Not logged in on protected page → redirect to login
      if ((isProtected || isVerifyPage) && !isLoggedIn) {
        return false
      }
      // Logged in but email not verified → redirect to verification
      if (isProtected && isLoggedIn && !emailVerified) {
        return Response.redirect(new URL('/verify-email', nextUrl))
      }
      // Logged in and verified → skip verification page
      if (isVerifyPage && isLoggedIn && emailVerified) {
        return Response.redirect(new URL('/create', nextUrl))
      }
      // Logged in on auth page → redirect to creation
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/create', nextUrl))
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // @ts-expect-error membership/credits/emailVerified from custom User
        token.membership = user.membership
        // @ts-expect-error
        token.credits = user.credits
        // @ts-expect-error
        token.emailVerified = user.emailVerified
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // @ts-expect-error
        session.user.membership = token.membership
        // @ts-expect-error
        session.user.credits = token.credits
        // @ts-expect-error
        session.user.emailVerified = token.emailVerified
      }
      return session
    },
  },
} satisfies NextAuthConfig

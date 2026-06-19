import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { authConfig } from './auth.config'
import { db } from './db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { checkLoginLockout, recordLoginAttempt, getClientIp } from './security'
import { isValidPhone, verifyCode } from './sms'
import { normalizeEmail } from './email-normalize'
import { env } from './env' // Validates AUTH_SECRET strength at startup

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Custom error — account locked due to brute-force protection
class AccountLockedError extends CredentialsSignin {
  code = 'account_locked'
}

// Create user from Google OAuth — grant 7-day trial + 50 credits
async function createGoogleUser(email: string, name?: string | null) {
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  return db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        emailVerified: true, // Google verifies email ownership
        membership: 'trial',
        credits: 50,
        trialEndsAt,
        consentAt: new Date(), // "Continue with Google" implies consent (standard OAuth pattern)
      },
    })
    await tx.creditTransaction.create({
      data: { userId: u.id, amount: 50, type: 'grant', reason: 'trial_signup' },
    })
    await tx.membershipRecord.create({
      data: { userId: u.id, plan: 'trial', startAt: new Date(), endAt: trialEndsAt, status: 'active' },
    })
    return u
  })
}

// Create user from phone verification — grant 7-day trial + 50 credits (kept for existing phone users)
async function createPhoneUser(phone: string, ip?: string) {
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  return db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        phone,
        name: `User${phone.slice(-4)}`,
        emailVerified: true,
        membership: 'trial',
        credits: 50,
        trialEndsAt,
        registerIp: ip,
        consentAt: new Date(),
      },
    })
    await tx.creditTransaction.create({
      data: { userId: u.id, amount: 50, type: 'grant', reason: 'trial_signup' },
    })
    await tx.membershipRecord.create({
      data: { userId: u.id, plan: 'trial', startAt: new Date(), endAt: trialEndsAt, status: 'active' },
    })
    return u
  })
}

// Build providers list — Google only added if credentials are configured
const providers = [
  // Email + password
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials, request) {
      const parsed = loginSchema.safeParse(credentials)
      if (!parsed.success) return null

      const email = normalizeEmail(parsed.data.email)
      const ip = request ? getClientIp(request) : undefined

      // 1. Brute-force protection — check if account is temporarily locked
      const lockout = await checkLoginLockout(email)
      if (lockout.locked) {
        throw new AccountLockedError()
      }

      // 2. Find user (phone-registered users have no password, can't use email login)
      const user = await db.user.findUnique({ where: { email } })
      if (!user || !user.passwordHash) {
        await recordLoginAttempt(email, false, ip)
        return null
      }

      // 3. Verify password
      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
      if (!valid) {
        await recordLoginAttempt(email, false, ip)
        return null
      }

      // 4. Success — record and clear failure count
      await recordLoginAttempt(email, true, ip)

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        membership: user.membership,
        credits: user.credits,
        emailVerified: user.emailVerified,
      }
    },
  }),
  // Phone + verification code (kept for existing phone users; not exposed in overseas UI)
  Credentials({
    id: 'phone',
    name: 'phone',
    credentials: {
      phone: { label: 'Phone', type: 'tel' },
      code: { label: 'Code', type: 'text' },
      consent: { label: 'Consent', type: 'hidden' },
    },
    async authorize(credentials, request) {
      const phone = String(credentials?.phone || '')
      const code = String(credentials?.code || '')
      const consent = String(credentials?.consent || '')
      if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) return null

      const ok = await verifyCode(phone, code)
      if (!ok) return null

      const ip = request ? getClientIp(request) : undefined
      let user = await db.user.findUnique({ where: { phone } })
      if (!user) {
        if (consent !== 'true') return null
        user = await createPhoneUser(phone, ip)
      }
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        membership: user.membership,
        credits: user.credits,
        emailVerified: user.emailVerified,
      }
    },
  }),
]

// Google OAuth — only activate if credentials are configured (graceful degradation)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }) as any // Provider type widening for conditional push
  )
}

// Full config — extends edge-safe base with Credentials + Google providers (Node runtime only)
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  providers,
  callbacks: {
    // Preserve route protection from authConfig
    authorized: authConfig.callbacks.authorized,

    // Google OAuth user upsert — runs before jwt callback
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        let dbUser = await db.user.findUnique({ where: { email: user.email } })
        if (!dbUser) {
          // New Google user → create with trial + 50 credits
          dbUser = await createGoogleUser(user.email, user.name)
        }
        // Attach DB fields to user object so jwt callback can use them
        user.id = dbUser.id
        ;(user as any).membership = dbUser.membership
        ;(user as any).credits = dbUser.credits
        ;(user as any).emailVerified = dbUser.emailVerified
      }
      return true
    },

    // JWT — map user fields to token (same logic as authConfig, works for all providers)
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

    // Session — expose custom fields to client
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
})

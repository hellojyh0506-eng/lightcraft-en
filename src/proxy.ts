import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// Edge-safe auth init — no Prisma, runs in proxy runtime
// Route protection logic in authConfig.callbacks.authorized
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Exclude static assets, image optimization, and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}

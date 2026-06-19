// Environment variable startup validation — refuse to start when critical security config is missing or too weak
// Rationale: Auth.js v5 requires AUTH_SECRET to be a high-entropy random value (used for signing session JWTs; weak keys can be forged offline)

// Legacy placeholder from old repo — reject startup immediately if detected
const WEAK_AUTH_SECRET = 'lumiere-studio-secret-key-change-in-production'

function requireStrongAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret === WEAK_AUTH_SECRET || secret.length < 32) {
    throw new Error(
      '[Security] AUTH_SECRET is not configured, is still a placeholder, or is shorter than 32 characters. ' +
        'Please run `openssl rand -base64 32` to generate a strong key, add it to .env, and restart.'
    )
  }
  return secret
}

// Validation runs on module load (triggered when auth.ts imports this module at Node runtime)
export const env = {
  AUTH_SECRET: requireStrongAuthSecret(),
}

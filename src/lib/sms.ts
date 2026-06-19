// SMS disabled in overseas version — phone auth is hidden from UI.
// Stub exports keep auth.ts compiling without @alicloud dependencies.

export class SmsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SmsError'
  }
}

export function isValidPhone(_phone: string): boolean {
  return false // Phone auth disabled for overseas
}

export async function sendSms(_phone: string, _code: string): Promise<void> {
  throw new SmsError('SMS is not available in this version')
}

export async function requestVerificationCode(_phone: string, _ip?: string): Promise<void> {
  throw new SmsError('SMS is not available in this version')
}

export async function verifyCode(_phone: string, _code: string): Promise<boolean> {
  return false
}

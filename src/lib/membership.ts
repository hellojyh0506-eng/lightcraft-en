// Membership permission check — unified gate for generation / polish and other creative endpoints
// Free (starter) not allowed; trial expired (trialEndsAt has passed) not allowed, preventing 7-day trial from becoming permanent

export type MembershipCode = 'NO_MEMBERSHIP' | 'TRIAL_EXPIRED'

export class MembershipError extends Error {
  code: MembershipCode
  status = 403
  constructor(code: MembershipCode, message: string) {
    super(message)
    this.code = code
    this.name = 'MembershipError'
  }
}

interface MembershipUser {
  membership: string
  trialEndsAt: Date | null
}

// Validate creative access; throws MembershipError (with user-facing message and code) if not authorized
export function assertActiveMembership(user: MembershipUser): void {
  if (user.membership === 'starter') {
    throw new MembershipError('NO_MEMBERSHIP', 'Please subscribe or start a trial to use creative features')
  }
  if (
    user.membership === 'trial' &&
    user.trialEndsAt &&
    user.trialEndsAt.getTime() < Date.now()
  ) {
    throw new MembershipError('TRIAL_EXPIRED', 'Your trial has expired. Please upgrade your plan to continue creating')
  }
}

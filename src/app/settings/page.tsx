import { auth, signOut } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Coins, Gem, ArrowLeft, LogOut, CreditCard, Clock } from 'lucide-react'
import { MEMBERSHIP_LABELS, type PlanId } from '@/lib/plans'
import { DeleteAccountButton } from '@/components/delete-account-button'
import { BrandKitEditor } from './_brand-kit-editor'

export const metadata = { title: 'Settings · LightCraft' }

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, creditLogs] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true, membership: true, credits: true, trialEndsAt: true, passwordHash: true } }),
    db.creditTransaction.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, amount: true, reason: true, createdAt: true } }),
  ])
  if (!user) redirect('/login')

  const memberInfo = MEMBERSHIP_LABELS[user.membership as PlanId] || MEMBERSHIP_LABELS.starter
  const reasons: Record<string, string> = {
    trial_signup: 'Sign-up bonus', video_gen: 'Video generation', image_edit: 'Image editing', image_gen: 'Image generation',
    image_bg: 'Background removal', daily_free: 'Daily check-in', refund_failed: 'Failure refund', manual_grant: 'Manual top-up',
    timeout: 'Timeout refund', submit_failed: 'Submission failure refund', generation_failed: 'Generation failure refund',
    moderation_rejected: 'Moderation refund', ai_polish: 'AI polish',
  }

  return (
    <div className="min-h-screen bg-noir-900">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-noir-900/80 border-b border-gold-400/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display text-lg text-noir-50 tracking-luxe">Settings</span>
          <Link href="/studio" className="text-sm text-noir-300 hover:text-gold-400 flex items-center gap-1"><ArrowLeft className="w-4 h-4" />Back to Studio</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-noir-800/40 border border-noir-600/40 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-noir-900 text-xl font-display">{user.name?.[0]?.toUpperCase() || 'U'}</div>
            <div>
              <h2 className="text-lg text-noir-50">{user.name}</h2>
              <p className="text-xs text-noir-400">{user.email || user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-noir-700/50">
            <div className="flex items-center gap-1.5"><Gem className={`w-4 h-4 ${memberInfo.color}`} /><span className={`text-sm ${memberInfo.color}`}>{memberInfo.label}</span></div>
            <div className="flex items-center gap-1.5"><Coins className="w-4 h-4 text-gold-400" /><span className="text-sm text-gold-400">{user.credits}</span><span className="text-xs text-noir-400">credits</span></div>
          </div>
          <Link href="/pricing" className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gold-400/10 border border-gold-400/30 text-gold-400 text-sm hover:bg-gold-400/20"><CreditCard className="w-4 h-4" />Upgrade Plan</Link>
        </div>

        <BrandKitEditor />

        <div>
          <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-noir-300" /><h3 className="text-sm text-noir-200">Credit History</h3></div>
          <div className="bg-noir-800/40 border border-noir-600/40 rounded-xl overflow-hidden">
            {creditLogs.length === 0 ? (
              <p className="text-sm text-noir-400 text-center py-6">No records yet</p>
            ) : creditLogs.map((log, i) => (
              <div key={log.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-noir-700/40' : ''}`}>
                <div>
                  <p className="text-sm text-noir-200">{reasons[log.reason] || log.reason}</p>
                  <p className="text-[10px] text-noir-400 mt-0.5">{new Date(log.createdAt).toLocaleString('en-US')}</p>
                </div>
                <span className={`text-sm font-medium ${log.amount > 0 ? 'text-sage-400' : 'text-noir-300'}`}>{log.amount > 0 ? '+' : ''}{log.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
          <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-noir-600/50 text-noir-400 text-sm hover:border-terracotta-400/50 hover:text-terracotta-400"><LogOut className="w-4 h-4" />Sign Out</button>
        </form>

        <DeleteAccountButton hasPassword={!!user.passwordHash} />
      </div>
    </div>
  )
}

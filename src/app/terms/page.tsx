import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service · LightCraft',
  description: 'LightCraft user service agreement',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-noir-900">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-noir-900/80 border-b border-gold-400/10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-light text-noir-50 tracking-luxe hover:text-gold-400 transition-colors">LightCraft</Link>
          <Link href="/register" className="font-body text-sm text-noir-300 hover:text-gold-400 transition-colors flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back to Sign Up</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-light text-noir-50 tracking-wide mb-2">Terms of Service</h1>
        <p className="font-body text-xs text-noir-400 mb-10">Effective date: June 15, 2026</p>
        <p className="font-body text-sm text-noir-300 leading-relaxed mb-10">Welcome to LightCraft (hereinafter referred to as &ldquo;the Platform&rdquo; or &ldquo;we&rdquo;). Before registering, logging in, or using any features of the Platform, please carefully read the entirety of this agreement. By checking &ldquo;agree&rdquo; or by using the Platform&apos;s services, you acknowledge that you have fully understood and agree to be bound by this agreement.</p>
        <div className="space-y-10 font-body text-sm text-noir-300 leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 1: General Provisions</h2>
            <p className="mb-2">1.1 This agreement is entered into between you (hereinafter referred to as the &ldquo;User&rdquo;) and the operator of LightCraft regarding the use of the Platform&apos;s services.</p>
            <p className="mb-2">1.2 The Platform provides users with AI-powered image-to-short-video generation services. Users upload images and enter prompts, and the Platform calls third-party AI models to generate corresponding short videos.</p>
            <p>1.3 The Platform reserves the right to modify this agreement as needed for business development. Modified agreements will be announced within the Platform or communicated via in-app notifications. Continued use of the Platform&apos;s services after changes constitutes acceptance of the modified agreement. If you do not agree to the changes, you have the right to stop using the services and delete your account.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 2: Account Registration and Management</h2>
            <p className="mb-2">2.1 Users may register an account using a phone number or email address with a password.</p>
            <p className="mb-2">2.2 Users must provide truthful and accurate registration information. All consequences arising from providing false information shall be borne by the user.</p>
            <p className="mb-2">2.3 Users are responsible for safeguarding their account and password and must not lend their account to others.</p>
            <p className="mb-2">2.4 The Platform does not provide services to minors under the age of sixteen.</p>
            <p>2.5 Users may request account deletion through account settings. Upon deletion, all account data (including credit balance, generation history, uploaded images, etc.) will be permanently deleted and cannot be recovered.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 3: Service Content</h2>
            <p className="mb-2">3.1 Users upload images and enter text descriptions, and the Platform generates 5-second, 10-second, or 15-second short videos using artificial intelligence technology.</p>
            <p className="mb-2">3.2 Video generation relies on third-party AI model capabilities. Due to technical limitations, the Platform makes no guarantees regarding the quality, style, or accuracy of generated results.</p>
            <p>3.3 The Platform reserves the right to adjust service content and features based on technical upgrades, compliance requirements, or operational needs, and will notify users in advance.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 4: Credits and Membership System</h2>
            <p className="mb-2">4.1 The Platform uses a credit-based billing system. Newly registered users receive 20 credits for trial use, with a trial period of 7 days from registration.</p>
            <p className="mb-2">4.2 Membership tiers include Standard, Pro, Max, and Ultra, each with different monthly credit allowances and feature access. See the Platform&apos;s pricing page for details.</p>
            <p className="mb-2">4.3 Each video generation consumes the corresponding credits. If a generation task fails due to system errors, the deducted credits will be automatically refunded to the user&apos;s account.</p>
            <p className="mb-2">4.4 Credits are non-transferable, non-withdrawable, and cannot be exchanged for cash. Remaining credits are forfeited upon account deletion.</p>
            <p>4.5 The Platform reserves the right to adjust credit consumption rules and membership pricing, with advance notice to users before any changes.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 5: Payment Methods</h2>
            <p className="mb-2">5.1 Users may purchase membership plans directly through the Platform&apos;s pricing page. Payments are processed by our payment partner, Creem (Armitage Labs OÜ), acting as Merchant of Record.</p>
            <p className="mb-2">5.2 Membership services are billed as one-time monthly purchases. There is no automatic recurring billing.</p>
            <p className="mb-2">5.3 If the Platform&apos;s services are unavailable for more than 72 consecutive hours due to our own issues, users may email <a href="mailto:support@dflow.top" className="text-gold-400 underline">support@dflow.top</a> to request compensation in membership time.</p>
            <p>5.4 Except for the circumstances described above and as otherwise required by law, paid membership fees are non-refundable.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 6: User Conduct Guidelines</h2>
            <p className="mb-2">6.1 Images uploaded and prompts entered by users must comply with applicable laws and regulations. The following content is prohibited:</p>
            <ul className="list-disc list-inside mb-3 space-y-1 text-noir-400">
              <li>Content that violates constitutional principles</li>
              <li>Content that endangers national security or leaks state secrets</li>
              <li>Content that incites hatred, discrimination, or undermines unity among peoples</li>
              <li>Content that disseminates obscene, pornographic, violent, or terrorist material</li>
              <li>Content that infringes upon the reputation, privacy, intellectual property, or other lawful rights of others</li>
              <li>Other content prohibited by applicable laws and regulations</li>
            </ul>
            <p className="mb-2">6.2 The Platform performs automated AI content moderation on user-uploaded content. Content that fails moderation will be rejected.</p>
            <p className="mb-2">6.3 Users must not use technical means to circumvent the Platform&apos;s content moderation mechanisms, credit billing systems, or other security measures.</p>
            <p>6.4 If a user violates this chapter, the Platform reserves the right to take measures including warnings, feature restrictions, or account suspension depending on the severity. In serious cases, the Platform will report the matter to the relevant authorities as required by law.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 7: Intellectual Property</h2>
            <p className="mb-2">7.1 The intellectual property of images uploaded by users does not change due to the act of uploading. Users warrant that they have lawful rights to or have obtained authorization for all uploaded images.</p>
            <p className="mb-2">7.2 Users have the right to use videos generated through the Platform for lawful purposes within the scope permitted by law, including commercial promotion and social media publishing.</p>
            <p>7.3 The intellectual property of the Platform&apos;s software, interface design, trademarks, and logos belongs to the Platform operator.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 8: Disclaimers and Limitation of Liability</h2>
            <p className="mb-2">8.1 The Platform is not liable for service disruptions caused by force majeure, third-party AI model service interruptions, or the user&apos;s own network environment.</p>
            <p className="mb-2">8.2 To the maximum extent permitted by law, the Platform is not liable for indirect losses or loss of profits.</p>
            <p>8.3 The Platform&apos;s total liability to any user shall not exceed the total fees actually paid by the user in the 12 months preceding the event.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 9: Service Suspension and Termination</h2>
            <p className="mb-2">9.1 The Platform reserves the right to suspend or terminate services if the user violates this agreement, if required by law, or if the Platform ceases operations for business reasons.</p>
            <p>9.2 If the Platform ceases operations, users will be notified at least 30 days in advance, and user data export and deletion will be handled appropriately.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 10: Dispute Resolution</h2>
            <p className="mb-2">10.1 This agreement is governed by applicable law.</p>
            <p>10.2 Disputes arising from this agreement shall first be resolved through amicable negotiation. If negotiation fails, either party may bring a lawsuit before the competent court in the jurisdiction where the Platform operator is located.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 11: Miscellaneous</h2>
            <p className="mb-2">11.1 If any provision of this agreement is deemed invalid, the remaining provisions shall remain in effect.</p>
            <p>11.2 If you have any questions about this agreement, please contact us at <a href="mailto:support@dflow.top" className="text-gold-400 underline">support@dflow.top</a>.</p>
          </section>
        </div>
      </main>
    </div>
  )
}

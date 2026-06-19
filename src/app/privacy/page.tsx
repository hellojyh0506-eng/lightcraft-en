import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy · LightCraft',
  description: 'LightCraft privacy protection policy',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-noir-900">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-noir-900/80 border-b border-gold-400/10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-light text-noir-50 tracking-luxe hover:text-gold-400 transition-colors">LightCraft</Link>
          <Link href="/register" className="font-body text-sm text-noir-300 hover:text-gold-400 transition-colors flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back to Sign Up</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-light text-noir-50 tracking-wide mb-2">Privacy Policy</h1>
        <p className="font-body text-xs text-noir-400 mb-10">Effective date: June 15, 2026</p>
        <p className="font-body text-sm text-noir-300 leading-relaxed mb-10">LightCraft (hereinafter referred to as "the Platform" or "we") understands the importance of personal information security. This Privacy Policy explains how we collect, use, store, share, and protect your personal information, as well as the rights you are entitled to.</p>
        <div className="space-y-10 font-body text-sm text-noir-300 leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 1: Who We Are</h2>
            <p className="mb-2">1.1 The Platform is operated by an independent developer, providing users with AI image-to-video generation services.</p>
            <p>1.2 If you have any questions about this policy or wish to exercise your personal information rights, please contact us through the "Contact Support" feature within the Platform.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 2: Information We Collect</h2>
            <p className="mb-3">2.1 We collect the following personal information, each for a clearly defined and necessary purpose:</p>
            <div className="space-y-3 mb-3 pl-4 border-l border-noir-700/50">
              <div><p className="text-noir-200 font-medium">Phone Number</p><p className="text-noir-400 text-xs">Used for account registration, identity verification, and account security protection.</p></div>
              <div><p className="text-noir-200 font-medium">Email Address and Password</p><p className="text-noir-400 text-xs">Used for account registration and login verification. Passwords are stored encrypted — we cannot view plaintext passwords.</p></div>
              <div><p className="text-noir-200 font-medium">Login IP Address</p><p className="text-noir-400 text-xs">Used for account security risk control and abnormal login detection. Automatically deleted after 90 days.</p></div>
              <div><p className="text-noir-200 font-medium">Uploaded Images and Prompts</p><p className="text-noir-400 text-xs">Used as input materials and instructions for AI video generation. Retained until account deletion.</p></div>
              <div><p className="text-noir-200 font-medium">Generated Video Files</p><p className="text-noir-400 text-xs">Delivered to users as generation results and for viewing history. Retained until account deletion.</p></div>
            </div>
            <p>2.2 We do not collect personal information not listed in this policy. If we need to collect new types of information, we will obtain your consent separately.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 3: How We Use Your Information</h2>
            <p className="mb-2">3.1 Your personal information is used solely for: providing account registration and login services; core AI video generation services; account security and risk control; credits and membership management; responding to support inquiries and rights requests; and other purposes required by law.</p>
            <p className="mb-2">3.2 We will not use your information for purposes unrelated to the above. If the purpose needs to change, we will obtain your consent again.</p>
            <p>3.3 Content moderation is used only to determine whether content complies with our policies and does not involve personal profiling or evaluation.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 4: Information Sharing and Third-Party Processing</h2>
            <p className="mb-3">4.1 To deliver the video generation feature, your uploaded images and prompts will be transmitted to:</p>
            <div className="mb-3 p-4 rounded-lg bg-noir-800/40 border border-noir-600/40">
              <p className="text-noir-200 font-medium mb-1">Alibaba Cloud Bailian (Alibaba Cloud Computing Co., Ltd.)</p>
              <p className="text-noir-400 text-xs">Data transmitted: user-uploaded images and prompts · Purpose: AI video content generation · Data location: within the People's Republic of China · Alibaba Cloud holds Level 3 security certification</p>
            </div>
            <p className="mb-2">4.2 Other than the above, we will not share personal information with third parties unless we have your explicit consent or are required by law.</p>
            <p>4.3 We do not transfer personal information outside of the country. All data storage and processing is completed within China.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 5: Information Storage and Protection</h2>
            <p className="mb-2">5.1 Retention periods: Account information is retained from registration until deletion upon account cancellation; login IP addresses are automatically deleted after 90 days; images, prompts, and videos are retained until deletion upon account cancellation.</p>
            <p className="mb-2">5.2 Security measures: Passwords are stored using irreversible encryption; data transmission uses HTTPS encryption; servers are deployed on certified domestic cloud service providers; access control is implemented.</p>
            <p>5.3 In the event of a security incident, we will promptly notify affected users and report to regulatory authorities as required by law.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 6: Your Rights</h2>
            <p className="mb-3">In accordance with applicable data protection laws, you are entitled to the following rights:</p>
            <ul className="space-y-2 mb-2">
              <li><span className="text-noir-200">Right to Access</span> — You have the right to know what personal information we hold. You may initiate an inquiry by contacting support.</li>
              <li><span className="text-noir-200">Right to Rectification</span> — You have the right to request correction if your information is inaccurate. Some information can be modified directly in account settings.</li>
              <li><span className="text-noir-200">Right to Deletion</span> — You have the right to request deletion when the processing purpose has been achieved, consent has been withdrawn, or processing was unlawful.</li>
              <li><span className="text-noir-200">Right to Withdraw Consent</span> — You may withdraw your consent at any time. Withdrawal does not affect the lawfulness of prior processing.</li>
              <li><span className="text-noir-200">Right to Account Deletion</span> — You may delete your account through account settings. All personal information will be deleted within 15 business days.</li>
              <li><span className="text-noir-200">Right to Complaint</span> — If you believe we have violated your rights, you have the right to file a complaint with the relevant regulatory authorities.</li>
            </ul>
            <p>We will verify and respond to rights requests within 15 business days of receipt.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 7: Informed Consent Mechanism</h2>
            <p className="mb-2">7.1 Consent is given by checking the agreement to this Privacy Policy during registration. Registration cannot be completed without checking the box.</p>
            <p className="mb-2">7.2 You may withdraw all consent by deleting your account, or contact support to withdraw partial consent (which may affect certain features).</p>
            <p>7.3 In the event of material changes to this policy (expanded collection scope, changes to third-party sharing, etc.), we will seek your consent again.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 8: Protection of Minors</h2>
            <p className="mb-2">8.1 The Platform is intended for adults. We do not proactively provide services to minors under the age of sixteen.</p>
            <p className="mb-2">8.2 Minors aged sixteen to eighteen should use the Platform under the guidance of a guardian.</p>
            <p>8.3 If a guardian of a child discovers that personal information has been provided without consent, please contact us to delete the information and cancel the account.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 9: Updates to This Policy</h2>
            <p className="mb-2">9.1 We may revise this policy in response to changes in law or business adjustments.</p>
            <p>9.2 Material changes will require renewed consent. For non-material changes, continued use after the announcement constitutes acceptance.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 10: Governing Law</h2>
            <p className="mb-2">10.1 This policy is formulated in accordance with applicable data protection and cybersecurity laws.</p>
            <p>10.2 Disputes shall be resolved through amicable negotiation. If negotiation fails, either party may bring a lawsuit before the competent court in the jurisdiction where the operator is located.</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-noir-100 mb-3">Chapter 11: Contact Us</h2>
            <p>If you have any questions or wish to exercise any of your rights, please contact us through the "Contact Support" feature within the Platform. We will respond within 15 business days.</p>
          </section>
        </div>
      </main>
    </div>
  )
}

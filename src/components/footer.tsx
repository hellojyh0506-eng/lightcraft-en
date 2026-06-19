import Link from 'next/link'

// Shared Footer — extracted from landing page, reused on pricing and other public pages
export function Footer() {
  return (
    <footer className="border-t border-noir-700/50 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <p className="font-display text-lg text-noir-50 tracking-luxe mb-1">LightCraft</p>
            <p className="font-body text-xs text-noir-400 mb-4">Turn Images into Videos</p>
            <p className="font-body text-xs text-noir-400 leading-relaxed">
              Upload a photo from your phone and get a video.<br />
              No editing skills needed. No hiring required.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-body text-xs text-noir-300 uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/studio', label: 'Start Creating' },
                { href: '/pricing', label: 'Pricing' },
                { href: '/login', label: 'Sign in' },
                { href: '/register', label: 'Sign up Free' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-body text-sm text-noir-400 hover:text-gold-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-body text-xs text-noir-300 uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2.5">
              {[
                { href: '/terms', label: 'Terms of Service' },
                { href: '/privacy', label: 'Privacy Policy' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-body text-sm text-noir-400 hover:text-gold-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <span className="font-body text-sm text-noir-400">
                  Contact us: support@lightcraft.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-noir-700/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-noir-500">&copy; 2026 LightCraft</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="font-body text-xs text-noir-500 hover:text-noir-300 transition-colors">Terms</Link>
            <Link href="/privacy" className="font-body text-xs text-noir-500 hover:text-noir-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

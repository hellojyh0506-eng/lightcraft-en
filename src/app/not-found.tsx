import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-noir-950 flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="font-display text-6xl text-gold-400/20 mb-4">404</h1>
        <h2 className="font-display text-xl text-noir-200 mb-2">Page Not Found</h2>
        <p className="font-body text-sm text-noir-400 mb-8">The page you visited has been removed or never existed</p>
        <Link href="/" className="px-6 py-2.5 rounded-lg bg-gold-400 text-noir-900 text-sm font-medium hover:bg-gold-300 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  )
}

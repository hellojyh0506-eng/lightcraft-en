'use client'

// Route-level error boundary — catches component exceptions within the page
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-terracotta-400/10 flex items-center justify-center">
          <span className="text-2xl text-terracotta-400">!</span>
        </div>
        <h2 className="font-display text-lg text-noir-200 mb-2">Something went wrong</h2>
        <p className="font-body text-sm text-noir-400 mb-6">{error.message || 'An error occurred. Please refresh and try again.'}</p>
        <button onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-gold-400 text-noir-900 text-sm font-medium hover:bg-gold-300 transition-colors">
          Retry
        </button>
      </div>
    </div>
  )
}

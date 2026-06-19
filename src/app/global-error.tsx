'use client'

// Global error boundary — catches any unhandled React component exceptions to prevent blank screens
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <h2 style={{ fontSize: 20, color: '#c8a45a', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>{error.message || 'An error occurred while loading the page. Please refresh and try again.'}</p>
          <button onClick={reset} style={{ background: '#c8a45a', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}

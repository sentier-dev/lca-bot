'use client'

// Deliberately NOT translated (locked decision, wiki/subsystems/i18n.md): this
// boundary renders when the root layout itself has crashed, so it mounts
// outside the app's NextIntlClientProvider (which lives in that layout). It
// has no locale to read and no provider to read it from — keep this static
// English, unlike error.tsx/not-found.tsx which render inside the provider.
interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#292524' }}>500</h1>
          <p style={{ marginTop: '1rem', fontSize: '1.125rem', color: '#57534e' }}>
            Something went wrong. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: '#292524',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}

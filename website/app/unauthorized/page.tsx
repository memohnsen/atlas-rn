import { SignOutButton } from '@clerk/nextjs'

export default function UnauthorizedPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#111827'
    }}>
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ marginBottom: 12 }}>Not authorized</h1>
        <p style={{ margin: 0, color: '#4b5563' }}>
          Your account does not have access to this site.
        </p>
        <div style={{ marginTop: 24 }}>
          <SignOutButton>
            <button
              type="button"
              style={{
                padding: '10px 16px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  )
}

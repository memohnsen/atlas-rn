import { auth } from '@clerk/nextjs/server'

export default async function DebugAuthPage() {
  const { userId, sessionId } = await auth()
  const adminUserId = process.env.ADMIN_CLERK_USER_ID || '(missing)'
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#111827'
    }}>
      <div style={{ maxWidth: 640, width: '100%' }}>
        <h1 style={{ marginBottom: 12 }}>Auth Debug</h1>
        <p style={{ margin: '0 0 8px', color: '#4b5563' }}>
          This page is temporary. Remove it after debugging.
        </p>
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16
        }}>
          <div><strong>userId:</strong> {userId || '(none)'}</div>
          <div><strong>sessionId:</strong> {sessionId || '(none)'}</div>
          <div><strong>ADMIN_CLERK_USER_ID:</strong> {adminUserId}</div>
        </div>
      </div>
    </main>
  )
}

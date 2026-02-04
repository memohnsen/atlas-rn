'use client'

import { ReactNode, useMemo } from 'react'
import { ClerkProvider, RedirectToSignIn, SignedIn, SignedOut, useAuth } from '@clerk/nextjs'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function Providers({ children }: { children: ReactNode }) {
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL')
  }
  if (!clerkPublishableKey) {
    throw new Error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')
  }

  const convex = useMemo(() => new ConvexReactClient(convexUrl), [])

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <SignedIn>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </ClerkProvider>
  )
}

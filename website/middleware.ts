import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/unauthorized',
  '/sign-out(.*)',
  '/debug-auth'
])

const adminUserId =
  process.env.ADMIN_CLERK_USER_ID || 'user_2vH3UoiRGEC3ux7UPTAetUE2wAQ'

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY


export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return
  }

  const { userId, redirectToSignIn } = await auth()
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url })
  }

  if (userId !== adminUserId) {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }
}, {
  publishableKey,
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up'
})

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ]
}

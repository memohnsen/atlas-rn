import { Metadata } from 'next'
import { ReactNode } from 'react'
import './globals.css'
import { ConvexClientProvider } from '../lib/convex'

export const metadata: Metadata = {
  title: 'Workout Program Viewer',
  description: 'View Olympic Weightlifting Program Data',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  )
}

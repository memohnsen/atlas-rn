import * as SecureStore from 'expo-secure-store'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type OnboardingContextValue = {
  hasOnboarded: boolean
  isHydrated: boolean
  completeOnboarding: () => void
}

const ONBOARDING_KEY = 'hasOnboarded'

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let isMounted = true
    const hydrate = async () => {
      const stored = await SecureStore.getItemAsync(ONBOARDING_KEY)
      if (!isMounted) return
      setHasOnboarded(stored === 'true')
      setIsHydrated(true)
    }
    hydrate()
    return () => {
      isMounted = false
    }
  }, [])

  const completeOnboarding = () => {
    setHasOnboarded(true)
    SecureStore.setItemAsync(ONBOARDING_KEY, 'true')
  }

  const value = useMemo(
    () => ({ hasOnboarded, isHydrated, completeOnboarding }),
    [hasOnboarded, isHydrated]
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

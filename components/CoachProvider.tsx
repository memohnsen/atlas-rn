import { api } from '@/convex/_generated/api'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from 'convex/react'
import * as SecureStore from 'expo-secure-store'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type CoachContextValue = {
  isCoachUser: boolean
  coachEnabled: boolean
  setCoachEnabled: (value: boolean) => void
  selectedAthlete: string | null
  setSelectedAthlete: (value: string | null) => void
  athletes: string[]
  isHydrated: boolean
}

const COACH_USER_ID = 'user_2vH3UoiRGEC3ux7UPTAetUE2wAQ'
const COACH_MODE_KEY = 'coachModeEnabled'
const COACH_ATHLETE_KEY = 'coachSelectedAthlete'

const CoachContext = createContext<CoachContextValue | null>(null)

export const CoachProvider = ({ children }: { children: React.ReactNode }) => {
  const { userId, isSignedIn } = useAuth()
  const isCoachUser = userId === COACH_USER_ID
  const athletes = useQuery(api.programs.getAthletes, isSignedIn ? {} : 'skip') ?? []

  const [coachEnabled, setCoachEnabled] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let isMounted = true

    const hydrate = async () => {
      if (!isCoachUser) {
        if (isMounted) {
          setCoachEnabled(false)
          setSelectedAthlete(null)
          setIsHydrated(true)
        }
        return
      }

      const [storedMode, storedAthlete] = await Promise.all([
        SecureStore.getItemAsync(COACH_MODE_KEY),
        SecureStore.getItemAsync(COACH_ATHLETE_KEY),
      ])

      if (!isMounted) return
      setCoachEnabled(storedMode === 'true')
      setSelectedAthlete(storedAthlete || null)
      setIsHydrated(true)
    }

    if (isSignedIn) {
      hydrate()
    } else {
      setCoachEnabled(false)
      setSelectedAthlete(null)
      setIsHydrated(false)
    }

    return () => {
      isMounted = false
    }
  }, [isCoachUser, isSignedIn])

  useEffect(() => {
    if (!isCoachUser || !isHydrated) return
    SecureStore.setItemAsync(COACH_MODE_KEY, coachEnabled ? 'true' : 'false')
  }, [coachEnabled, isCoachUser, isHydrated])

  useEffect(() => {
    if (!isCoachUser || !isHydrated) return
    if (selectedAthlete) {
      SecureStore.setItemAsync(COACH_ATHLETE_KEY, selectedAthlete)
    }
  }, [selectedAthlete, isCoachUser, isHydrated])

  useEffect(() => {
    if (!isCoachUser || !isHydrated) return
    if (athletes.length === 0) return
    if (!selectedAthlete || !athletes.includes(selectedAthlete)) {
      setSelectedAthlete(athletes[0])
    }
  }, [athletes, isCoachUser, isHydrated, selectedAthlete])

  const value = useMemo(
    () => ({
      isCoachUser,
      coachEnabled: isCoachUser ? coachEnabled : false,
      setCoachEnabled,
      selectedAthlete,
      setSelectedAthlete,
      athletes,
      isHydrated,
    }),
    [athletes, coachEnabled, isCoachUser, isHydrated, selectedAthlete]
  )

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}

export const useCoach = () => {
  const context = useContext(CoachContext)
  if (!context) {
    throw new Error('useCoach must be used within a CoachProvider')
  }
  return context
}

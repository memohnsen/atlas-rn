import * as SecureStore from 'expo-secure-store'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type WeightUnit = 'kg' | 'lb'

type UnitContextValue = {
  weightUnit: WeightUnit
  setWeightUnit: (unit: WeightUnit) => void
  isHydrated: boolean
}

const WEIGHT_UNIT_KEY = 'weightUnit'

const UnitContext = createContext<UnitContextValue | null>(null)

export const UnitProvider = ({ children }: { children: React.ReactNode }) => {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let isMounted = true
    const hydrate = async () => {
      const stored = await SecureStore.getItemAsync(WEIGHT_UNIT_KEY)
      if (!isMounted) return
      if (stored === 'lb' || stored === 'kg') {
        setWeightUnit(stored)
      } else {
        setWeightUnit('kg')
      }
      setIsHydrated(true)
    }

    hydrate()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    SecureStore.setItemAsync(WEIGHT_UNIT_KEY, weightUnit)
  }, [isHydrated, weightUnit])

  const value = useMemo(
    () => ({ weightUnit, setWeightUnit, isHydrated }),
    [weightUnit, isHydrated]
  )

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>
}

export const useUnit = () => {
  const context = useContext(UnitContext)
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider')
  }
  return context
}

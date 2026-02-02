import { AthletePRs } from '@/types/athlete-prs'

export type AthletePrKey = keyof Omit<AthletePRs, 'athlete_name' | 'created_at' | 'updated_at'>

type PrField = {
  key: AthletePrKey
  label: string
}

type PrSection = {
  title: string
  fields: PrField[]
}

export const prSections: PrSection[] = [
  {
    title: 'Snatch',
    fields: [
      { key: 'snatch_1rm', label: '1RM' },
      { key: 'snatch_2rm', label: '2RM' },
      { key: 'snatch_3rm', label: '3RM' }
    ]
  },
  {
    title: 'Clean',
    fields: [
      { key: 'clean_1rm', label: '1RM' },
      { key: 'clean_2rm', label: '2RM' },
      { key: 'clean_3rm', label: '3RM' }
    ]
  },
  {
    title: 'Jerk',
    fields: [
      { key: 'jerk_1rm', label: '1RM' },
      { key: 'jerk_2rm', label: '2RM' },
      { key: 'jerk_3rm', label: '3RM' }
    ]
  },
  {
    title: 'Clean & Jerk',
    fields: [
      { key: 'clean_jerk_1rm', label: '1RM' },
      { key: 'clean_jerk_2rm', label: '2RM' },
      { key: 'clean_jerk_3rm', label: '3RM' }
    ]
  },
  {
    title: 'Back Squat',
    fields: [
      { key: 'back_squat_1rm', label: '1RM' },
      { key: 'back_squat_2rm', label: '2RM' },
      { key: 'back_squat_3rm', label: '3RM' },
      { key: 'back_squat_4rm', label: '4RM' },
      { key: 'back_squat_5rm', label: '5RM' },
      { key: 'back_squat_6rm', label: '6RM' },
      { key: 'back_squat_7rm', label: '7RM' },
      { key: 'back_squat_8rm', label: '8RM' },
      { key: 'back_squat_9rm', label: '9RM' },
      { key: 'back_squat_10rm', label: '10RM' }
    ]
  },
  {
    title: 'Front Squat',
    fields: [
      { key: 'front_squat_1rm', label: '1RM' },
      { key: 'front_squat_2rm', label: '2RM' },
      { key: 'front_squat_3rm', label: '3RM' },
      { key: 'front_squat_4rm', label: '4RM' },
      { key: 'front_squat_5rm', label: '5RM' },
      { key: 'front_squat_6rm', label: '6RM' },
      { key: 'front_squat_7rm', label: '7RM' },
      { key: 'front_squat_8rm', label: '8RM' },
      { key: 'front_squat_9rm', label: '9RM' },
      { key: 'front_squat_10rm', label: '10RM' }
    ]
  }
]

export const prFieldKeys = prSections.flatMap((section) => section.fields.map((field) => field.key))

export const emptyPrValues = (): Record<AthletePrKey, string> =>
  prFieldKeys.reduce((acc, key) => {
    acc[key] = ''
    return acc
  }, {} as Record<AthletePrKey, string>)

export const parsePrValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

type GroupedPrs = Record<string, Record<string, number>>

export const prsToFormValues = (
  prs: AthletePRs | GroupedPrs | null
): Record<AthletePrKey, string> => {
  const base = emptyPrValues()
  if (!prs) {
    return base
  }
  if ('athlete_name' in prs) {
    prFieldKeys.forEach((key) => {
      const value = prs[key]
      base[key] = value === null || value === undefined ? '' : String(value)
    })
    return base
  }

  prFieldKeys.forEach((key) => {
    const match = key.match(/^(.+)_([0-9]+)rm$/)
    if (!match) {
      base[key] = ''
      return
    }
    const exerciseName = match[1]
    const repKey = `${match[2]}rm`
    const value = prs[exerciseName]?.[repKey]
    base[key] = value === null || value === undefined ? '' : String(value)
  })
  return base
}

export const buildPrPayload = (
  athleteName: string,
  values: Record<AthletePrKey, string>
): Omit<AthletePRs, 'created_at' | 'updated_at'> => {
  const payload = {
    athlete_name: athleteName
  } as Omit<AthletePRs, 'created_at' | 'updated_at'>

  prFieldKeys.forEach((key) => {
    payload[key] = parsePrValue(values[key])
  })

  return payload
}

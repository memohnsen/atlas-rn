import { ProgramBuilderDay, ProgramBuilderExercise } from '@/types/workout'

type ExerciseTemplate = {
  category: string
  sets: string
  supersetGroup?: string
  supersetOrder?: string
}

export type ProgramBuilderTemplateId = 'classic' | 'weightlifting'

export const programBuilderTemplateOptions: { id: ProgramBuilderTemplateId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'weightlifting', label: 'Weightlifting' }
]

export const createExercise = (dayNumber: number, index: number): ProgramBuilderExercise => ({
  id: `day-${dayNumber}-exercise-${index}-${Date.now()}`,
  name: '',
  category: '',
  intensity: '',
  reps: '',
  sets: '1',
  notes: '',
  supersetGroup: '',
  supersetOrder: ''
})

const createExerciseFromTemplate = (
  dayNumber: number,
  index: number,
  template: ExerciseTemplate
): ProgramBuilderExercise => ({
  ...createExercise(dayNumber, index),
  category: template.category,
  sets: template.sets,
  supersetGroup: template.supersetGroup ?? '',
  supersetOrder: template.supersetOrder ?? ''
})

const createSupersetTemplates = (
  category: string,
  sets: string,
  group: string,
  orders: string[]
): ExerciseTemplate[] =>
  orders.map((order) => ({
    category,
    sets,
    supersetGroup: group,
    supersetOrder: order
  }))

const defaultDayTemplates: Record<ProgramBuilderTemplateId, Record<number, Record<number, ExerciseTemplate[]>>> = {
  classic: {
    3: {
      1: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      2: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'clean & jerk', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      3: [
        { category: 'primer', sets: '3', supersetGroup: 'A', supersetOrder: '1' },
        { category: 'snatch', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'primer', sets: '3', supersetGroup: 'A', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ]
    },
    4: {
      1: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      2: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'clean', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      3: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'jerk', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      4: [
        { category: 'primer', sets: '3', supersetGroup: 'A', supersetOrder: '1' },
        { category: 'snatch', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'primer', sets: '3', supersetGroup: 'A', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ]
    },
    5: {
      1: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      2: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'clean', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      3: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'jerk', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'pull', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      4: [
        { category: 'primer', sets: '3', supersetGroup: 'A', supersetOrder: '1' },
        { category: 'snatch', sets: '6', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'primer', sets: '3', supersetGroup: 'A', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '6', supersetGroup: 'B', supersetOrder: '1' }
      ],
      5: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'accessory', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'squat', sets: '6', supersetGroup: 'C', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '3', 'D', ['1', '2', '3'])
      ]
    }
  },
  weightlifting: {
    3: {
      1: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      2: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      3: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'pull', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ]
    },
    4: {
      1: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      2: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      3: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'squat', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'pull', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '3', 'E', ['1', '2', '3'])
      ],
      4: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'pull', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '3', 'E', ['1', '2', '3'])
      ]
    },
    5: {
      1: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      2: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'squat', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      3: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'squat', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'pull', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '3', 'E', ['1', '2', '3'])
      ],
      4: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean & jerk', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'pull', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ],
      5: [
        ...createSupersetTemplates('primer', '3', 'A', ['1', '2', '3']),
        { category: 'snatch', sets: '5', supersetGroup: 'B', supersetOrder: '1' },
        { category: 'clean', sets: '5', supersetGroup: 'C', supersetOrder: '1' },
        { category: 'pull', sets: '4', supersetGroup: 'D', supersetOrder: '1' },
        ...createSupersetTemplates('accessory', '2', 'E', ['1', '2', '3'])
      ]
    }
  }
}

export const buildDefaultDays = (
  dayCount: number,
  templateId: ProgramBuilderTemplateId = 'classic'
): ProgramBuilderDay[] => {
  const template = defaultDayTemplates[templateId]?.[dayCount]
  if (!template) {
    return []
  }

  return Object.keys(template)
    .map((dayKey) => Number(dayKey))
    .sort((a, b) => a - b)
    .map((dayNumber) => ({
      id: `day-${dayNumber}`,
      dayNumber,
      dayLabel: '',
      exercises: template[dayNumber].map((entry, index) =>
        createExerciseFromTemplate(dayNumber, index, entry)
      )
    }))
}

export const createEmptyDay = (dayNumber: number): ProgramBuilderDay => ({
  id: `day-${dayNumber}`,
  dayNumber,
  dayLabel: '',
  exercises: [createExercise(dayNumber, 0)]
})

export const buildDefaultsIfSequential = (
  selectedNumbers: number[],
  templateId: ProgramBuilderTemplateId = 'classic'
): ProgramBuilderDay[] | null => {
  const sorted = [...selectedNumbers].sort((a, b) => a - b)
  if (sorted.length === 0) {
    return []
  }
  const isSequential = sorted.every((value, index) => value === index + 1)
  if (!isSequential) {
    return null
  }
  const template = defaultDayTemplates[templateId]?.[sorted.length]
  if (!template) {
    return null
  }
  return buildDefaultDays(sorted.length, templateId)
}

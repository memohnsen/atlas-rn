'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ProgramBuilder from '../components/ProgramBuilder'
import ProgramPreview from '../components/ProgramPreview'
import {
  ProgramBuilderDay,
  RepTargets,
  WeekTotalReps,
  WorkoutRecord
} from '@/types/workout'
import { applyProgramOverride, buildGeneratedProgramWeeks } from '@/lib/program-builder'
import { validateGeneratedProgramInputs } from '@/lib/program-validation'
import { formatDate } from '@/lib/date-format'
import { buildBuilderStateFromWorkouts } from '@/lib/program-editor-helpers'
import { parseCount, parseIntensityValues } from '@/lib/value-parse'
import { createExercise } from '@/lib/program-builder-defaults'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const USER_ID = 'default-user'

type ProgramOption = {
  program_name: string
  start_date: string
}

type ProgramSummary = {
  programName: string
  startDate: string
}

type ProgramExercise = {
  exerciseNumber: number
  exerciseName: string
  exerciseCategory?: string | null
  exerciseNotes?: string | null
  supersetGroup?: string | null
  supersetOrder?: number | null
  sets?: number | null
  reps: string | string[]
  weights?: number | null
  percent?: number | number[] | null
  completed: boolean
  athleteComments?: string | null
}

type ProgramDay = {
  dayNumber: number
  dayOfWeek?: string | null
  dayLabel?: string | null
  completed: boolean
  rating?: 'Trash' | 'Below Average' | 'Average' | 'Above Average' | 'Crushing It'
  sessionIntensity?: number
  completedAt?: number
  exercises: ProgramExercise[]
}

type ProgramWeek = {
  weekNumber: number
  days: ProgramDay[]
}

type ProgramData = {
  _id: Id<'programs'>
  athleteName: string
  programName: string
  startDate: string
  weekCount: number
  repTargets: RepTargets
  weekTotals: WeekTotalReps[]
  weeks: ProgramWeek[]
}

export default function ProgramEditorPage() {
  const athletes =
    (useQuery(api.programs.getAthletes, { userId: USER_ID }) as string[] | undefined) ?? []
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedProgram, setSelectedProgram] = useState<ProgramOption | null>(null)
  const [seedDays, setSeedDays] = useState<ProgramBuilderDay[]>([])
  const [builderDays, setBuilderDays] = useState<ProgramBuilderDay[]>([])
  const [builderWeekCount, setBuilderWeekCount] = useState(4)
  const [repTargets, setRepTargets] = useState<RepTargets>({
    snatch: '',
    clean: '',
    jerk: '',
    squat: '',
    pull: ''
  })
  const [weekTotals, setWeekTotals] = useState<WeekTotalReps[]>([])
  const [builderSeed, setBuilderSeed] = useState<string | null>(null)
  const [pushingToDatabase, setPushingToDatabase] = useState(false)
  const [pushSuccess, setPushSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const programs =
    (useQuery(
      api.programs.getProgramsForAthlete,
      selectedAthlete ? { userId: USER_ID, athleteName: selectedAthlete } : 'skip'
    ) as ProgramSummary[] | undefined) ?? []

  const selectedProgramData = useQuery(
    api.programs.getAthleteProgram,
    selectedAthlete && selectedProgram
      ? {
          athleteName: selectedAthlete,
          programName: selectedProgram.program_name,
          startDate: selectedProgram.start_date
        }
      : 'skip'
  ) as ProgramData | undefined

  const updateProgram = useMutation(api.programs.updateProgram)
  const deleteProgram = useMutation(api.programs.deleteProgram)

  const generatedProgram = useMemo(
    () => buildGeneratedProgramWeeks(builderDays, builderWeekCount),
    [builderDays, builderWeekCount]
  )

  const handleDayLabelChange = (dayNumber: number, value: string) => {
    setBuilderDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, dayLabel: value }
          : day
      )
    )
  }

  const handleAddExercise = (dayNumber: number) => {
    setBuilderDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber !== dayNumber) {
          return day
        }
        const nextIndex = day.exercises.length
        const nextExercise = createExercise(dayNumber, nextIndex)
        return {
          ...day,
          exercises: [...day.exercises, nextExercise]
        }
      })
    )
  }

  useEffect(() => {
    if (!selectedAthlete) {
      setSelectedProgram(null)
      return
    }
  }, [selectedAthlete])

  useEffect(() => {
    if (!selectedAthlete || !selectedProgram || !selectedProgramData) {
      setSeedDays([])
      setBuilderDays([])
      setBuilderWeekCount(4)
      setBuilderSeed(null)
      return
    }

    setPushSuccess(false)

    // Transform nested Convex data to flat WorkoutRecord for buildBuilderStateFromWorkouts
    const flattenedWorkouts: WorkoutRecord[] = selectedProgramData.weeks.flatMap((week) =>
      week.days.flatMap((day) =>
        day.exercises.map((ex) => {
          const reps = Array.isArray(ex.reps) ? ex.reps[0] ?? '' : ex.reps
          const percent = Array.isArray(ex.percent) ? ex.percent[0] ?? null : ex.percent ?? null
          return {
          user_id: USER_ID,
          athlete_name: selectedAthlete,
          program_name: selectedProgram.program_name,
          start_date: selectedProgram.start_date,
          week_number: week.weekNumber,
          day_number: day.dayNumber,
          day_of_week: day.dayOfWeek ?? null,
          exercise_number: ex.exerciseNumber,
          exercise_name: ex.exerciseName,
          exercise_category: ex.exerciseCategory ?? null,
          exercise_notes: ex.exerciseNotes ?? null,
          superset_group: ex.supersetGroup ?? null,
          superset_order: ex.supersetOrder ?? null,
          sets: ex.sets ?? null,
          reps,
          weights: ex.weights ?? null,
          percent,
          athlete_comments: ex.athleteComments ?? null,
          completed: ex.completed,
          created_at: '',
          updated_at: ''
        }
        })
      )
    )

    const { days, weekCount } = buildBuilderStateFromWorkouts(flattenedWorkouts)
    setSeedDays(days)
    setBuilderDays(days)
    setBuilderWeekCount(weekCount)
    setBuilderSeed(`${selectedAthlete}-${selectedProgram.program_name}-${selectedProgram.start_date}`)
  }, [selectedAthlete, selectedProgram, selectedProgramData])

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  const buildConvexProgram = () => {
    if (!selectedProgram || !selectedProgramData) {
      return null
    }

    const athlete = selectedAthlete.trim().toLowerCase()
    const program = selectedProgram.program_name.trim().toLowerCase()
    const start = selectedProgram.start_date

    // Transform generatedProgram to Convex nested structure
    const weeks = generatedProgram.map((week) => ({
      weekNumber: week.weekNumber,
      days: week.days.map((day) => ({
        dayNumber: day.dayNumber,
        dayOfWeek: (day.dayLabel ?? day.dayOfWeek ?? '').trim().toLowerCase() || undefined,
        dayLabel: (day.dayLabel ?? day.dayOfWeek ?? '').trim() || undefined,
        completed: false,
        exercises: day.exercises.map((exercise, exerciseIndex) => {
          const intensityValues = parseIntensityValues(exercise.intensity || '')
          const supersetGroup = exercise.supersetGroup?.trim() || undefined
          const supersetOrder = supersetGroup
            ? Number.parseInt(exercise.supersetOrder || '', 10)
            : undefined
          const normalizedSupersetOrder = Number.isNaN(supersetOrder ?? NaN) ? undefined : supersetOrder

          return {
            exerciseNumber: exerciseIndex + 1,
            exerciseName: exercise.name || `Exercise ${exerciseIndex + 1}`,
            exerciseCategory: exercise.category?.trim() || undefined,
            exerciseNotes: exercise.notes?.trim() || undefined,
            supersetGroup,
            supersetOrder: normalizedSupersetOrder,
            sets: parseCount(exercise.sets || '') || undefined,
            reps: exercise.reps || '',
            weights: undefined,
            percent: intensityValues[0] ?? undefined,
            completed: false,
            athleteComments: undefined
          }
        })
      }))
    }))

    return {
      userId: USER_ID,
      athleteName: athlete,
      programName: program,
      startDate: start,
      weekCount: generatedProgram.length,
      repTargets: {
        snatch: repTargets.snatch || '',
        clean: repTargets.clean || '',
        jerk: repTargets.jerk || '',
        squat: repTargets.squat || '',
        pull: repTargets.pull || ''
      },
      weekTotals: weekTotals.map(wt => ({
        weekNumber: wt.weekNumber,
        total: String(wt.total)
      })),
      weeks
    }
  }

  const handlePushToDatabase = async () => {
    if (!selectedProgram || !selectedAthlete || !selectedProgramData) {
      setError('Please select an athlete and program first.')
      return
    }

    if (generatedProgram.length === 0) {
      setError('No program data to push. Please add days and exercises first.')
      return
    }

    setPushingToDatabase(true)
    setError(null)
    setPushSuccess(false)

    try {
      const validation = validateGeneratedProgramInputs(generatedProgram)
      if (!validation.isValid) {
        setError(validation.message || 'Please complete all exercise inputs before pushing.')
        setPushingToDatabase(false)
        return
      }

      const programData = buildConvexProgram()
      if (!programData) {
        setError('Failed to build program data.')
        setPushingToDatabase(false)
        return
      }

      await updateProgram({
        programId: selectedProgramData._id,
        ...programData
      })

      setPushSuccess(true)
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
      successTimeoutRef.current = setTimeout(() => setPushSuccess(false), 3000)
    } catch (err) {
      const errorMessage = (err as Error)?.message || String(err)
      setError('Failed to push updates: ' + errorMessage)
    } finally {
      setPushingToDatabase(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#333' }}>Edit Athlete Program</h1>
        <div className="header-actions">
          <Link
            href="/program-builder"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Program Builder
          </Link>
          <Link
            href="/"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            ← Back to Scraper
          </Link>
        </div>
      </div>

      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Select an athlete and program, update the plan, and push changes back to the database.
      </p>

      <div
        style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}
      >
        <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#333' }}>
          Select Program
        </h2>
        <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Athlete Name <span style={{ color: '#d00' }}>*</span>:
            </label>
            <select
              value={selectedAthlete}
              onChange={(event) => setSelectedAthlete(event.target.value)}
              disabled={athletes === undefined}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">{athletes === undefined ? 'Loading...' : 'Select athlete'}</option>
              {athletes.map((athlete) => (
                <option key={athlete} value={athlete}>
                  {athlete}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Program <span style={{ color: '#d00' }}>*</span>:
            </label>
            <select
              value={selectedProgram ? `${selectedProgram.program_name}-${selectedProgram.start_date}` : ''}
              onChange={(event) => {
                const next = programs.find(
                  (program) =>
                    `${program.programName}-${program.startDate}` === event.target.value
                )
                setSelectedProgram(next ? { program_name: next.programName, start_date: next.startDate } : null)
              }}
              disabled={!selectedAthlete}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: !selectedAthlete ? '#f3f4f6' : 'white',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select program</option>
              {programs.map((program) => (
                <option
                  key={`${program.programName}-${program.startDate}`}
                  value={`${program.programName}-${program.startDate}`}
                >
                  {program.programName} · {formatDate(program.startDate)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Start Date:
            </label>
            <input
              type="text"
              value={selectedProgram ? formatDate(selectedProgram.start_date) : ''}
              readOnly
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f3f4f6',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: '14px', fontSize: '13px', color: '#6b7280' }}>
          {selectedProgram && selectedProgramData === undefined
            ? 'Loading program data...'
            : selectedProgram
              ? 'Use the builder below to update the plan.'
              : 'Pick an athlete and program to load workouts.'}
        </div>
        <button
          type="button"
          onClick={handlePushToDatabase}
          disabled={!selectedProgram || pushingToDatabase}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: pushingToDatabase || !selectedProgram ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: pushingToDatabase || !selectedProgram ? 'not-allowed' : 'pointer'
          }}
        >
          {pushingToDatabase ? 'Pushing...' : 'Push Updates to Database'}
        </button>
        {pushSuccess && (
          <p style={{ marginTop: '10px', color: '#16a34a', fontWeight: 600 }}>
            Updates pushed successfully!
          </p>
        )}
        {error && (
          <p style={{ marginTop: '10px', color: '#dc2626', whiteSpace: 'pre-line' }}>
            {error}
          </p>
        )}
      </div>

      {selectedProgram && (
        <>
          <ProgramBuilder
            onChange={setBuilderDays}
            onWeekCountChange={setBuilderWeekCount}
            onRepTargetsChange={setRepTargets}
            onWeekTotalsChange={setWeekTotals}
            initialDays={seedDays}
            initialWeekCount={builderWeekCount}
            initialSeed={builderSeed}
          />
          <div style={{ marginBottom: '24px' }}>
          <ProgramPreview
            weeks={generatedProgram}
            repTargets={repTargets}
            weekTotals={weekTotals}
            onDayLabelChange={handleDayLabelChange}
            onAddExercise={handleAddExercise}
            onOverrideChange={(dayNumber, exerciseId, field, value, weekNumber) =>
              setBuilderDays((prev) =>
                applyProgramOverride(prev, dayNumber, exerciseId, field, value, weekNumber)
              )
              }
            />
          </div>
        </>
      )}
    </div>
  )
}

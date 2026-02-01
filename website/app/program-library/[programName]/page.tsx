'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useConvex } from 'convex/react'
import { api } from '@/convex/_generated/api'
import ProgramBuilder from '@/app/components/ProgramBuilder'
import ProgramPreview from '@/app/components/ProgramPreview'
import { applyProgramOverride, buildGeneratedProgramWeeks } from '@/lib/program-builder'
import { validateGeneratedProgramInputs } from '@/lib/program-validation'
import { createExercise } from '@/lib/program-builder-defaults'
import {
  ProgramBuilderDay,
  RepTargets,
  WeekTotalReps,
  WorkoutRecord
} from '@/types/workout'
import { parseCount, parseIntensityValues } from '@/lib/value-parse'

const USER_ID = 'default-user'

type ProgramLibraryEditorProps = {
  params: { programName: string }
}

const defaultRepTargets: RepTargets = {
  snatch: '',
  clean: '',
  jerk: '',
  squat: '',
  pull: ''
}

export default function ProgramLibraryEditorPage({ params }: ProgramLibraryEditorProps) {
  const convex = useConvex()
  const decodedProgramName = decodeURIComponent(params.programName)
  const normalizedProgramName = decodedProgramName.trim().toLowerCase()

  const [days, setDays] = useState<ProgramBuilderDay[]>([])
  const [weekCount, setWeekCount] = useState(4)
  const [repTargets, setRepTargets] = useState<RepTargets>(defaultRepTargets)
  const [weekTotals, setWeekTotals] = useState<WeekTotalReps[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [copyName, setCopyName] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [assignAthlete, setAssignAthlete] = useState('')
  const [assignProgramName, setAssignProgramName] = useState('')
  const [assignStartDate, setAssignStartDate] = useState('')
  const [assignStatus, setAssignStatus] = useState<'idle' | 'assigning' | 'success' | 'error'>('idle')
  const [assignMessage, setAssignMessage] = useState<string | null>(null)
  const seedRef = useRef<string | null>(null)

  const template = useQuery(api.programTemplates.getTemplate, {
    userId: USER_ID,
    programName: normalizedProgramName
  })

  const saveTemplate = useMutation(api.programTemplates.saveTemplate)

  const loading = template === undefined
  const error = template === null ? 'Template not found' : null

  useEffect(() => {
    if (!template) return

    // Transform nested Convex data to flat WorkoutRecord for buildBuilderStateFromWorkouts
    const flattenedWorkouts: WorkoutRecord[] = template.weeks.flatMap((week) =>
      week.days.flatMap((day) =>
        day.exercises.map((ex) => ({
          id: '',
          user_id: USER_ID,
          athlete_name: '',
          program_name: template.programName,
          start_date: '',
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
          reps: ex.reps,
          weights: ex.weights ?? null,
          percent: ex.percent ?? null,
          athlete_comments: null,
          completed: false,
          created_at: '',
          updated_at: ''
        }))
      )
    )

    // Build builder state from flattened workouts
    const dayMap = new Map<number, WorkoutRecord[]>()
    flattenedWorkouts.forEach((workout) => {
      if (!dayMap.has(workout.day_number)) {
        dayMap.set(workout.day_number, [])
      }
      dayMap.get(workout.day_number)!.push(workout)
    })

    const initialDays: ProgramBuilderDay[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([dayNumber, workouts]) => {
        const exerciseMap = new Map<number, WorkoutRecord[]>()
        workouts.forEach((workout) => {
          if (!exerciseMap.has(workout.exercise_number)) {
            exerciseMap.set(workout.exercise_number, [])
          }
          exerciseMap.get(workout.exercise_number)!.push(workout)
        })

        const exercises = Array.from(exerciseMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([exerciseNumber, sets]) => {
            const first = sets[0]
            const intensityValues = sets
              .map((s) => s.percent)
              .filter((p): p is number => p !== null)
            const repsValues = sets.map((s) => s.reps)

            return {
              id: `day-${dayNumber}-ex-${exerciseNumber}`,
              dayNumber,
              exerciseNumber,
              name: first.exercise_name,
              category: first.exercise_category || '',
              notes: first.exercise_notes || '',
              sets: String(sets.length),
              reps: repsValues.length > 0 ? repsValues[0] : '',
              intensity: intensityValues.length > 0 ? intensityValues.join(', ') : '',
              supersetGroup: first.superset_group || '',
              supersetOrder: first.superset_order ? String(first.superset_order) : ''
            }
          })

        return {
          dayNumber,
          dayOfWeek: workouts[0]?.day_of_week || undefined,
          dayLabel: workouts[0]?.day_of_week || undefined,
          exercises
        }
      })

    setDays(initialDays)
    setWeekCount(template.weekCount)
    setRepTargets({
      snatch: template.repTargets.snatch,
      clean: template.repTargets.clean,
      jerk: template.repTargets.jerk,
      squat: template.repTargets.squat,
      pull: template.repTargets.pull
    })
    setWeekTotals(template.weekTotals.map(wt => ({ weekNumber: wt.weekNumber, total: wt.total })))
    setCopyName('')
    seedRef.current = `${normalizedProgramName}-${Date.now()}`
  }, [template, normalizedProgramName])

  const generatedProgram = useMemo(
    () => buildGeneratedProgramWeeks(days, weekCount),
    [days, weekCount]
  )

  const handleDayLabelChange = (dayNumber: number, value: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber ? { ...day, dayLabel: value } : day
      )
    )
  }

  const handleAddExercise = (dayNumber: number) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber !== dayNumber) return day
        const nextIndex = day.exercises.length
        const nextExercise = createExercise(dayNumber, nextIndex)
        return {
          ...day,
          exercises: [...day.exercises, nextExercise]
        }
      })
    )
  }

  const buildConvexTemplate = (programName: string) => {
    const weeks = generatedProgram.map((week) => ({
      weekNumber: week.weekNumber,
      days: week.days.map((day) => ({
        dayNumber: day.dayNumber,
        dayOfWeek: (day.dayLabel ?? day.dayOfWeek ?? '').trim().toLowerCase() || undefined,
        dayLabel: (day.dayLabel ?? day.dayOfWeek ?? '').trim() || undefined,
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
            percent: intensityValues[0] ?? undefined
          }
        })
      }))
    }))

    return {
      userId: USER_ID,
      programName,
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

  const handleSaveChanges = async () => {
    if (generatedProgram.length === 0) {
      setSaveStatus('error')
      setSaveMessage('No program data to save. Please add days and exercises first.')
      return
    }

    const validation = validateGeneratedProgramInputs(generatedProgram)
    if (!validation.isValid) {
      setSaveStatus('error')
      setSaveMessage(validation.message || 'Please complete all exercise inputs before saving.')
      return
    }

    setSaveStatus('saving')
    setSaveMessage(null)

    try {
      const templateData = buildConvexTemplate(normalizedProgramName)
      await saveTemplate(templateData)
      setSaveStatus('success')
      setSaveMessage('Library program updated successfully!')
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setSaveStatus('error')
      setSaveMessage('Failed to update library program: ' + message)
    }
  }

  const handleSaveCopy = async () => {
    if (generatedProgram.length === 0) {
      setCopyStatus('error')
      setCopyMessage('No program data to save. Please add days and exercises first.')
      return
    }

    const validation = validateGeneratedProgramInputs(generatedProgram)
    if (!validation.isValid) {
      setCopyStatus('error')
      setCopyMessage(validation.message || 'Please complete all exercise inputs before saving.')
      return
    }

    const trimmedCopyName = copyName.trim()
    if (!trimmedCopyName) {
      setCopyStatus('error')
      setCopyMessage('Please enter a name for the copied program.')
      return
    }

    const normalizedCopyName = trimmedCopyName.toLowerCase()

    setCopyStatus('saving')
    setCopyMessage(null)

    try {
      const exists = await convex.query(api.programTemplates.checkTemplateExists, {
        userId: USER_ID,
        programName: normalizedCopyName
      })

      if (exists) {
        setCopyStatus('error')
        setCopyMessage(`Program "${trimmedCopyName}" already exists in the library.`)
        return
      }

      const templateData = buildConvexTemplate(normalizedCopyName)
      await saveTemplate(templateData)
      setCopyStatus('success')
      setCopyMessage('Library copy saved successfully!')
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setCopyStatus('error')
      setCopyMessage('Failed to save copy: ' + message)
    }
  }

  const handleAssign = async () => {
    if (generatedProgram.length === 0) {
      setAssignStatus('error')
      setAssignMessage('No program data to assign. Please add days and exercises first.')
      return
    }

    const validation = validateGeneratedProgramInputs(generatedProgram)
    if (!validation.isValid) {
      setAssignStatus('error')
      setAssignMessage(validation.message || 'Please complete all exercise inputs before assigning.')
      return
    }

    if (!assignAthlete.trim() || !assignProgramName.trim() || !assignStartDate.trim()) {
      setAssignStatus('error')
      setAssignMessage('Please enter athlete name, program name, and start date.')
      return
    }

    const normalizedAthlete = assignAthlete.trim().toLowerCase()
    const normalizedProgram = assignProgramName.trim().toLowerCase()
    const start = assignStartDate.trim()

    setAssignStatus('assigning')
    setAssignMessage(null)

    try {
      const exists = await convex.query(api.programs.checkProgramExists, {
        userId: USER_ID,
        athleteName: normalizedAthlete,
        programName: normalizedProgram,
        startDate: start
      })

      if (exists) {
        setAssignStatus('error')
        setAssignMessage(
          `Program "${assignProgramName.trim()}" already exists for athlete "${assignAthlete.trim()}".`
        )
        return
      }

      // First save the template if needed
      const templateData = buildConvexTemplate(normalizedProgramName)
      await saveTemplate(templateData)

      // Then assign it to the athlete
      await convex.mutation(api.programTemplates.assignTemplateToAthlete, {
        userId: USER_ID,
        templateName: normalizedProgramName,
        athleteName: normalizedAthlete,
        programName: normalizedProgram,
        startDate: start
      })

      setAssignStatus('success')
      setAssignMessage('Program assigned successfully!')
    } catch (err) {
      const message = (err as Error)?.message || String(err)
      setAssignStatus('error')
      setAssignMessage('Failed to assign program: ' + message)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#111827' }}>
          Edit Library Program: {decodedProgramName}
        </h1>
        <div className="header-actions">
          <Link
            href="/program-library"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none'
            }}
          >
            ← Back to Library
          </Link>
        </div>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading program details...</p>}
      {error && (
        <p style={{ color: '#dc2626' }}>Failed to load program details: {error}</p>
      )}

      {!loading && !error && (
        <>
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#111827' }}>
              Save updates to the library
            </h2>
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: '14px' }}>
              This will overwrite the existing library program with your current edits.
            </p>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saveStatus === 'saving'}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: saveStatus === 'saving' ? '#93c5fd' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer'
              }}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMessage && (
              <p style={{
                marginTop: '10px',
                color: saveStatus === 'error' ? '#dc2626' : '#16a34a',
                fontWeight: 600
              }}>
                {saveMessage}
              </p>
            )}
          </div>

          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#111827' }}>
              Save as a new library copy
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                  New Program Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={copyName}
                  onChange={(event) => setCopyName(event.target.value)}
                  placeholder="Enter new library program name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveCopy}
                disabled={copyStatus === 'saving'}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: copyStatus === 'saving' ? '#fcd34d' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: copyStatus === 'saving' ? 'not-allowed' : 'pointer'
                }}
              >
                {copyStatus === 'saving' ? 'Saving...' : 'Save Copy'}
              </button>
              {copyMessage && (
                <p style={{
                  marginTop: '6px',
                  color: copyStatus === 'error' ? '#dc2626' : '#16a34a',
                  fontWeight: 600
                }}>
                  {copyMessage}
                </p>
              )}
            </div>
          </div>

          <div style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#111827' }}>
              Assign edited program to an athlete
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                  Athlete Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={assignAthlete}
                  onChange={(event) => setAssignAthlete(event.target.value)}
                  placeholder="Enter athlete name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                  Program Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={assignProgramName}
                  onChange={(event) => setAssignProgramName(event.target.value)}
                  placeholder="Enter program name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#374151' }}>
                  Start Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(event) => setAssignStartDate(event.target.value)}
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAssign}
              disabled={assignStatus === 'assigning'}
              style={{
                marginTop: '16px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: assignStatus === 'assigning' ? '#a7f3d0' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: assignStatus === 'assigning' ? 'not-allowed' : 'pointer'
              }}
            >
              {assignStatus === 'assigning' ? 'Assigning...' : 'Assign Program'}
            </button>
            {assignMessage && (
              <p style={{
                marginTop: '10px',
                color: assignStatus === 'error' ? '#dc2626' : '#16a34a',
                fontWeight: 600
              }}>
                {assignMessage}
              </p>
            )}
          </div>

          <ProgramBuilder
            onChange={setDays}
            onWeekCountChange={setWeekCount}
            onRepTargetsChange={setRepTargets}
            onWeekTotalsChange={setWeekTotals}
            initialDays={days}
            initialWeekCount={weekCount}
            initialRepTargets={repTargets}
            initialWeekTotals={weekTotals}
            initialSeed={seedRef.current}
          />

          <div style={{ marginBottom: '24px' }}>
          <ProgramPreview
            weeks={generatedProgram}
            repTargets={repTargets}
            weekTotals={weekTotals}
            onDayLabelChange={handleDayLabelChange}
            onAddExercise={handleAddExercise}
            onOverrideChange={(dayNumber, exerciseId, field, value, weekNumber) =>
              setDays((prev) =>
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

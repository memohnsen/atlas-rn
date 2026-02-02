'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { WorkoutRecord } from '@/types/workout'
import { buildExerciseVolumeData, buildWeeklyIntensityData, buildWeeklyRepData, formatNumber } from '@/lib/analytics-helpers'
import { parseCount } from '@/lib/value-parse'

const USER_ID = 'default-user'

type ProgramOption = {
  programName: string
  startDate: string
}

type AnalyticsWorkout = {
  athleteName: string
  programName: string
  startDate: string
  weekNumber: number
  dayNumber: number
  dayOfWeek?: string | null
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
  athleteComments?: string | null
  completed: boolean
}

export default function AnalyticsPage() {
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')

  const athletes = (useQuery(api.programs.getAthletes, { userId: USER_ID }) as string[] | undefined) ?? []

  const programs = useQuery(
    api.programs.getProgramsForAthlete,
    selectedAthlete ? { userId: USER_ID, athleteName: selectedAthlete } : 'skip'
  ) as ProgramOption[] | undefined ?? []

  const workoutsData = useQuery(
    api.programs.getWorkoutsForAnalytics,
    selectedAthlete
      ? {
          userId: USER_ID,
          athleteName: selectedAthlete,
          programName: selectedProgram || undefined
        }
      : 'skip'
  ) as AnalyticsWorkout[] | undefined

  const workouts: WorkoutRecord[] = useMemo(() => {
    if (!workoutsData) return []
    return workoutsData.map((w) => {
      const reps = Array.isArray(w.reps) ? w.reps[0] ?? '' : w.reps
      const percent = Array.isArray(w.percent) ? w.percent[0] ?? null : w.percent ?? null
      return {
        user_id: USER_ID,
        athlete_name: w.athleteName,
        program_name: w.programName,
        start_date: w.startDate,
        week_number: w.weekNumber,
        day_number: w.dayNumber,
        day_of_week: w.dayOfWeek ?? null,
        exercise_number: w.exerciseNumber,
        exercise_name: w.exerciseName,
        exercise_category: w.exerciseCategory ?? null,
        exercise_notes: w.exerciseNotes ?? null,
        superset_group: w.supersetGroup ?? null,
        superset_order: w.supersetOrder ?? null,
        sets: w.sets ?? null,
        reps,
        weights: w.weights ?? null,
        percent,
        athlete_comments: w.athleteComments ?? null,
        completed: w.completed,
        created_at: '',
        updated_at: ''
      }
    })
  }, [workoutsData])

  const loadingAthletes = athletes === undefined
  const loadingPrograms = selectedAthlete && programs === undefined
  const loadingWorkouts = selectedAthlete && workoutsData === undefined
  const error = null

  const weeklyRepData = useMemo(() => buildWeeklyRepData(workouts), [workouts])
  const weeklyIntensityData = useMemo(() => buildWeeklyIntensityData(workouts), [workouts])
  const exerciseVolumeData = useMemo(() => buildExerciseVolumeData(workouts), [workouts])

  const summary = useMemo(() => {
    let totalSets = 0
    let totalReps = 0
    workouts.forEach((workout) => {
      const reps = parseCount(workout.reps)
      if (reps === null) return
      const sets = workout.sets || 1
      totalSets += sets
      totalReps += reps * sets
    })

    return {
      totalSets,
      totalReps: Number.isInteger(totalReps) ? totalReps : Number.parseFloat(formatNumber(totalReps)),
      weeks: new Set(workouts.map((workout) => workout.week_number)).size
    }
  }, [workouts])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ margin: 0, color: '#333' }}>Program Analytics</h1>
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
              textDecoration: 'none'
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
              textDecoration: 'none'
            }}
          >
            ← Back to Scraper
          </Link>
        </div>
      </div>

      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Filter by athlete and program to review performance trends and training volume.
      </p>

      <div style={{
        marginBottom: '24px',
        padding: '16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        display: 'grid',
        gap: '14px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
      }}>
        <label style={{ display: 'grid', gap: '6px', fontSize: '13px', color: '#475569' }}>
          Athlete
          <select
            value={selectedAthlete}
            onChange={(event) => setSelectedAthlete(event.target.value)}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          >
            <option value="">Select athlete</option>
            {athletes.map((athlete) => (
              <option key={athlete} value={athlete}>
                {athlete || 'Unnamed athlete'}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '6px', fontSize: '13px', color: '#475569' }}>
          Program
          <select
            value={selectedProgram}
            onChange={(event) => setSelectedProgram(event.target.value)}
            disabled={!selectedAthlete}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: selectedAthlete ? '#fff' : '#f8fafc'
            }}
          >
            <option value="">All programs</option>
            {programs.map((program) => (
              <option
                key={`${program.programName}-${program.startDate}`}
                value={program.programName}
              >
                {program.programName} ({program.startDate})
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {(loadingAthletes || loadingPrograms || loadingWorkouts) && (
        <div style={{ marginBottom: '16px', color: '#475569', fontSize: '14px' }}>
          Loading analytics...
        </div>
      )}

      {!loadingAthletes && !loadingPrograms && !loadingWorkouts && selectedAthlete && workouts.length === 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          borderRadius: '8px',
          border: '1px dashed #cbd5f5',
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: '14px'
        }}>
          No workouts found for this selection.
        </div>
      )}

      {workouts.length > 0 && (
        <>
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total reps</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>{summary.totalReps}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total sets</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>{summary.totalSets}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Weeks tracked</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>{summary.weeks}</div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gap: '20px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
          }}>
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              minHeight: '280px'
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1f2937' }}>
                Weekly Rep Volume
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklyRepData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reps" fill="#0ea5e9" name="Reps" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              minHeight: '280px'
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1f2937' }}>
                Weekly Avg Intensity
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyIntensityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="intensity" stroke="#6366f1" name="Avg %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              minHeight: '280px'
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1f2937' }}>
                Top Exercises by Reps
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={exerciseVolumeData} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="exercise" type="category" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reps" fill="#22c55e" name="Reps" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

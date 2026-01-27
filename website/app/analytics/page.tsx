'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { WorkoutRecord } from '@/types/workout'
import { getAthletes, getProgramsForAthlete, getWorkoutsForAthlete, getWorkoutsForAthleteProgram } from '@/lib/supabase-queries'
import { buildExerciseVolumeData, buildWeeklyIntensityData, buildWeeklyRepData } from '@/lib/analytics-helpers'
import { parseCount } from '@/lib/value-parse'

type ProgramOption = {
  program_name: string
  start_date: string
}

export default function AnalyticsPage() {
  const [athletes, setAthletes] = useState<string[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([])
  const [loadingAthletes, setLoadingAthletes] = useState(false)
  const [loadingPrograms, setLoadingPrograms] = useState(false)
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAthletes = async () => {
      setLoadingAthletes(true)
      setError(null)
      try {
        const result = await getAthletes()
        setAthletes(result)
      } catch (err) {
        console.error('Error loading athletes:', err)
        setError('Failed to load athletes.')
      } finally {
        setLoadingAthletes(false)
      }
    }

    loadAthletes()
  }, [])

  useEffect(() => {
    if (!selectedAthlete) {
      setPrograms([])
      setSelectedProgram('')
      setWorkouts([])
      return
    }

    const loadPrograms = async () => {
      setLoadingPrograms(true)
      setError(null)
      try {
        const result = await getProgramsForAthlete(selectedAthlete)
        setPrograms(result as ProgramOption[])
      } catch (err) {
        console.error('Error loading programs:', err)
        setError('Failed to load programs.')
      } finally {
        setLoadingPrograms(false)
      }
    }

    loadPrograms()
  }, [selectedAthlete])

  useEffect(() => {
    if (!selectedAthlete) {
      return
    }

    const loadWorkouts = async () => {
      setLoadingWorkouts(true)
      setError(null)
      try {
        const data = selectedProgram
          ? await getWorkoutsForAthleteProgram(selectedAthlete, selectedProgram)
          : await getWorkoutsForAthlete(selectedAthlete)
        setWorkouts(data)
      } catch (err) {
        console.error('Error loading workouts:', err)
        setError('Failed to load workouts.')
      } finally {
        setLoadingWorkouts(false)
      }
    }

    loadWorkouts()
  }, [selectedAthlete, selectedProgram])

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
                key={`${program.program_name}-${program.start_date}`}
                value={program.program_name}
              >
                {program.program_name} ({program.start_date})
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

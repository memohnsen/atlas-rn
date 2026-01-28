'use client'

import { useEffect, useMemo, useState } from 'react'

import type { AthleteScheduleSummary } from '@/lib/supabase-queries'
import { getAthleteScheduleSummaries } from '@/lib/supabase-queries'

type ScheduleState = {
  data: AthleteScheduleSummary[]
  error: string | null
  loading: boolean
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not scheduled'
  }

  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function AthleteScheduleSummary() {
  const [state, setState] = useState<ScheduleState>({
    data: [],
    error: null,
    loading: true
  })

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const data = await getAthleteScheduleSummaries()
        if (isMounted) {
          setState({ data, error: null, loading: false })
        }
      } catch (err) {
        console.error('Failed to load athlete schedules:', err)
        if (isMounted) {
          setState({
            data: [],
            error: 'Unable to load athlete schedules right now.',
            loading: false
          })
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  const content = useMemo(() => {
    if (state.loading) {
      return <p className="home-section-muted">Loading athlete schedules...</p>
    }

    if (state.error) {
      return <p className="home-section-error">{state.error}</p>
    }

    if (state.data.length === 0) {
      return <p className="home-section-muted">No athlete schedules found yet.</p>
    }

    return (
      <div className="home-table">
        <table>
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Last scheduled session</th>
              <th>Days remaining</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((summary) => (
              <tr key={summary.athlete_name}>
                <td>{summary.athlete_name}</td>
                <td>{formatDate(summary.last_session_date)}</td>
                <td>{summary.days_remaining ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [state])

  return (
    <section className="home-section">
      <div className="home-section-header">
        <div>
          <h2>Athlete schedules</h2>
          <p>Track each athlete’s last scheduled training session and the days left until it.</p>
        </div>
      </div>
      {content}
    </section>
  )
}

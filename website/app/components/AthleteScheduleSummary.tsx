'use client'

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

const USER_ID = 'default-user'

type AthleteScheduleSummary = {
  athlete_name: string
  last_session_date: string | null
  days_remaining: number | null
}

type ScheduleSummaryResponse = {
  athleteName: string
  lastScheduledDate: string | null
  daysRemaining: number | null
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
  const summaries = useQuery(
    api.programs.getAthleteScheduleSummaries,
    {}
  ) as ScheduleSummaryResponse[] | undefined

  const data: AthleteScheduleSummary[] = useMemo(() => {
    if (!summaries) return []
    return summaries.map((s) => ({
      athlete_name: s.athleteName,
      last_session_date: s.lastScheduledDate,
      days_remaining: s.daysRemaining
    }))
  }, [summaries])

  const loading = summaries === undefined
  const error = null

  const content = useMemo(() => {
    if (loading) {
      return <p className="home-section-muted">Loading athlete schedules...</p>
    }

    if (error) {
      return <p className="home-section-error">{error}</p>
    }

    if (data.length === 0) {
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
            {data.map((summary) => (
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
  }, [loading, error, data])

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

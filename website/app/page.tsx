import Link from 'next/link'

import AthleteScheduleSummary from './components/AthleteScheduleSummary'

const destinations = [
  {
    title: 'Program Scraper',
    description: 'Pull workout programs from Google Sheets and push them into the database.',
    href: '/program-scraper',
    accent: '#2563eb',
    cta: 'Open scraper'
  },
  {
    title: 'Program Builder',
    description: 'Create new programs and templates from scratch.',
    href: '/program-builder',
    accent: '#0ea5e9',
    cta: 'Build a program'
  },
  {
    title: 'Program Editor',
    description: 'Edit existing programs and manage training blocks.',
    href: '/program-editor',
    accent: '#f97316',
    cta: 'Edit programs'
  },
  {
    title: 'Analytics',
    description: 'Visualize training data and athlete progress.',
    href: '/analytics',
    accent: '#10b981',
    cta: 'View analytics'
  },
  {
    title: 'Browse Athletes & Programs',
    description: 'Search the database for athletes and program libraries.',
    href: '/browse',
    accent: '#6366f1',
    cta: 'Browse library'
  }
]

export default function HomePage() {
  return (
    <div className="page-container">
      <div className="home-hero">
        <div>
          <p className="home-kicker">Atlas Training</p>
          <h1>Choose where you want to go</h1>
          <p className="home-subtitle">
            Start with the Program Scraper or jump straight into building, editing, and analyzing programs.
          </p>
        </div>
        <div className="home-hero-actions">
          <Link className="home-primary" href="/program-scraper">
            Go to Program Scraper
          </Link>
          <Link className="home-secondary" href="/program-builder">
            Start building
          </Link>
        </div>
      </div>

      <div className="home-grid">
        {destinations.map((destination) => (
          <Link
            key={destination.title}
            className="home-card"
            href={destination.href}
            style={{ borderTopColor: destination.accent }}
          >
            <div>
              <h2>{destination.title}</h2>
              <p>{destination.description}</p>
            </div>
            <span className="home-card-cta" style={{ color: destination.accent }}>
              {destination.cta}
            </span>
          </Link>
        ))}
      </div>

      <AthleteScheduleSummary />
    </div>
  )
}

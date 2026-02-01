# Atlas Convex Database Guide

A practical guide to working with the Convex database in the Atlas training application.

## Table of Contents
- [Database Overview](#database-overview)
- [Reading Data (Queries)](#reading-data-queries)
- [Writing Data (Mutations)](#writing-data-mutations)
- [Database Schema](#database-schema)
- [Common Workflows](#common-workflows)
- [Tips & Best Practices](#tips--best-practices)

---

## Database Overview

Atlas uses Convex as its database with 4 main tables:

1. **programs** - Training programs assigned to athletes
2. **programTemplates** - Reusable program templates in your library
3. **athletePRs** - Personal records for each athlete
4. **exerciseLibrary** - Searchable catalog of exercises

All data is scoped to a `userId` (currently "default-user") to support multi-coach usage in the future.

---

## Reading Data (Queries)

### In React Components (Website)

Use the `useQuery` hook to subscribe to real-time data:

```typescript
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

const athletes = useQuery(api.programs.getAthletes, { userId: 'default-user' })
```

**What happens:**
- Component automatically subscribes to database changes
- Data updates in real-time when the database changes
- Returns `undefined` while loading
- Returns the actual data once loaded

**Example: Load all athletes**
```typescript
const athletes = useQuery(api.programs.getAthletes, { userId: USER_ID })

// athletes will be: undefined (loading) or ["john doe", "jane smith"]
```

**Example: Load programs for a specific athlete**
```typescript
const programs = useQuery(
  api.programs.getProgramsForAthlete,
  { userId: USER_ID, athleteName: "john doe" }
)

// programs will be an array of program objects with nested weeks/days/exercises
```

**Conditional queries** (only run when you have the required data):
```typescript
const programs = useQuery(
  api.programs.getProgramsForAthlete,
  selectedAthlete
    ? { userId: USER_ID, athleteName: selectedAthlete }
    : 'skip'  // Don't run the query if no athlete selected
)
```

### Imperative Queries (Call When Needed)

Sometimes you need to run a query once, not subscribe to it. Use `useConvex`:

```typescript
import { useConvex } from 'convex/react'
import { api } from '@/convex/_generated/api'

const convex = useConvex()

// Later, in an event handler:
const exists = await convex.query(api.programs.checkProgramExists, {
  userId: USER_ID,
  athleteName: "john doe",
  programName: "4-day template",
  startDate: "2026-01-01"
})

if (exists) {
  alert("This program already exists!")
}
```

---

## Writing Data (Mutations)

### Basic Pattern

Use the `useMutation` hook to get a function you can call:

```typescript
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

const insertProgram = useMutation(api.programs.insertProgram)

// Later, in an event handler:
const handleSave = async () => {
  try {
    const programId = await insertProgram({
      userId: 'default-user',
      athleteName: 'john doe',
      programName: '4-day template',
      startDate: '2026-01-01',
      weekCount: 4,
      repTargets: { snatch: '135', clean: '185', jerk: '205', squat: '315', pull: '275' },
      weekTotals: [
        { weekNumber: 1, total: '50' },
        { weekNumber: 2, total: '55' }
      ],
      weeks: [ /* nested week/day/exercise data */ ]
    })

    console.log('Program created with ID:', programId)
  } catch (error) {
    console.error('Failed to save:', error)
  }
}
```

### Common Mutations

**Insert a new program:**
```typescript
const insertProgram = useMutation(api.programs.insertProgram)
await insertProgram({ userId, athleteName, programName, startDate, weekCount, repTargets, weekTotals, weeks })
```

**Update an existing program:**
```typescript
const updateProgram = useMutation(api.programs.updateProgram)
await updateProgram({
  programId: program._id,  // The ID from the loaded program
  userId,
  athleteName,
  programName,
  startDate,
  weekCount,
  repTargets,
  weekTotals,
  weeks
})
```

**Delete a program:**
```typescript
const deleteProgram = useMutation(api.programs.deleteProgram)
await deleteProgram({ userId, athleteName, programName, startDate })
```

**Save a template to the library:**
```typescript
const saveTemplate = useMutation(api.programTemplates.saveTemplate)
await saveTemplate({ userId, programName, weekCount, repTargets, weekTotals, weeks })
```

**Assign a template to an athlete:**
```typescript
const assignTemplate = useMutation(api.programTemplates.assignTemplateToAthlete)
await assignTemplate({
  userId: 'default-user',
  templateName: '4-Day Template',  // Name in your library
  athleteName: 'john doe',
  programName: 'johns custom program',  // Name for the athlete's copy
  startDate: '2026-02-15'
})
```

**Update athlete PRs:**
```typescript
const upsertPR = useMutation(api.athletePRs.upsertPR)
await upsertPR({
  athleteName: 'john doe',
  exerciseName: 'snatch',
  repMax: 1,
  weight: 135
})
```

---

## Database Schema

### Programs Table

Stores complete training programs for athletes with nested structure:

```
Program
├── userId: "default-user"
├── athleteName: "john doe"
├── programName: "4-day template"
├── startDate: "2026-01-01"
├── weekCount: 4
├── repTargets: { snatch: "135", clean: "185", ... }
├── weekTotals: [{ weekNumber: 1, total: "50" }, ...]
└── weeks: [
    {
      weekNumber: 1,
      days: [
        {
          dayNumber: 1,
          dayOfWeek: "monday",
          dayLabel: "Day 1",
          completed: false,
          rating: undefined | "Trash" | "Below Average" | "Average" | "Above Average" | "Crushing It",
          completedAt: undefined | timestamp,
          exercises: [
            {
              exerciseNumber: 1,
              exerciseName: "snatch",
              exerciseCategory: "olympic",
              exerciseNotes: "focus on speed",
              supersetGroup: "A",
              supersetOrder: 1,
              sets: 5,
              reps: "3",
              weights: undefined,
              percent: 70,
              completed: false,
              athleteComments: undefined
            }
          ]
        }
      ]
    }
  ]
```

**Key Points:**
- Everything is in one document (no joins needed)
- Days and exercises are deeply nested
- Completion tracking is embedded (for real-time updates)
- Each program is uniquely identified by: (userId, athleteName, programName, startDate)

### Program Templates Table

Same structure as programs but:
- No `athleteName` (it's a template, not assigned yet)
- No completion tracking (completed, rating, completedAt, athleteComments)
- Identified by: (userId, programName)

### Athlete PRs Table

Normalized table for tracking personal records:

```
PR Record
├── athleteName: "john doe"
├── exerciseName: "snatch"
├── repMax: 1
├── weight: 135
└── recordedAt: timestamp (optional)
```

**Key Points:**
- Athlete names are globally unique (no userId)
- One row per exercise/rep-max combination
- Extensible for any exercise

### Exercise Library Table

```
Exercise
├── userId: "default-user"
├── exerciseName: "snatch"
└── category: "olympic"
```

Simple lookup table for autocomplete and categorization.

---

## Common Workflows

### 1. Creating a Program from Scratch

```typescript
// In your component
const insertProgram = useMutation(api.programs.insertProgram)

const handleCreate = async () => {
  const weeks = [
    {
      weekNumber: 1,
      days: [
        {
          dayNumber: 1,
          dayOfWeek: 'monday',
          completed: false,
          exercises: [
            {
              exerciseNumber: 1,
              exerciseName: 'snatch',
              sets: 5,
              reps: '3',
              percent: 70,
              completed: false
            }
          ]
        }
      ]
    }
  ]

  await insertProgram({
    userId: 'default-user',
    athleteName: 'john doe',
    programName: 'my program',
    startDate: '2026-02-01',
    weekCount: 1,
    repTargets: { snatch: '135', clean: '185', jerk: '205', squat: '315', pull: '275' },
    weekTotals: [],
    weeks
  })
}
```

### 2. Loading and Editing a Program

```typescript
// Load the program
const program = useQuery(
  api.programs.getAthleteProgram,
  {
    userId: 'default-user',
    athleteName: 'john doe',
    programName: 'my program',
    startDate: '2026-02-01'
  }
)

// Update it
const updateProgram = useMutation(api.programs.updateProgram)

const handleSave = async () => {
  if (!program) return

  // Modify the program data
  const updatedWeeks = program.weeks.map(week => ({
    ...week,
    days: week.days.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => ({
        ...ex,
        sets: ex.sets ? ex.sets + 1 : 1  // Add one set to each exercise
      }))
    }))
  }))

  await updateProgram({
    programId: program._id,
    userId: program.userId,
    athleteName: program.athleteName,
    programName: program.programName,
    startDate: program.startDate,
    weekCount: program.weekCount,
    repTargets: program.repTargets,
    weekTotals: program.weekTotals,
    weeks: updatedWeeks
  })
}
```

### 3. Browsing Athletes and Their Programs

```typescript
// Get all athletes
const athletes = useQuery(api.programs.getAthletes, { userId: 'default-user' })

// When user selects an athlete, get their programs
const [selectedAthlete, setSelectedAthlete] = useState('')

const programs = useQuery(
  api.programs.getProgramsForAthlete,
  selectedAthlete
    ? { userId: 'default-user', athleteName: selectedAthlete }
    : 'skip'
)

// Display
return (
  <div>
    <select onChange={(e) => setSelectedAthlete(e.target.value)}>
      <option value="">Select athlete</option>
      {athletes?.map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>

    {programs?.map(p => (
      <div key={`${p.programName}-${p.startDate}`}>
        {p.programName} - {p.startDate}
      </div>
    ))}
  </div>
)
```

### 4. Checking if a Program Already Exists

```typescript
const convex = useConvex()

const handleBeforeCreate = async () => {
  const exists = await convex.query(api.programs.checkProgramExists, {
    userId: 'default-user',
    athleteName: 'john doe',
    programName: 'my program',
    startDate: '2026-02-01'
  })

  if (exists) {
    alert('This program already exists!')
    return
  }

  // Proceed with creation
}
```

### 5. Working with Templates

**Save current program as template:**
```typescript
const saveTemplate = useMutation(api.programTemplates.saveTemplate)

const handleSaveAsTemplate = async () => {
  await saveTemplate({
    userId: 'default-user',
    programName: '4-Day Strength Template',  // Template name
    weekCount: program.weekCount,
    repTargets: program.repTargets,
    weekTotals: program.weekTotals,
    weeks: program.weeks.map(week => ({
      ...week,
      days: week.days.map(day => ({
        dayNumber: day.dayNumber,
        dayOfWeek: day.dayOfWeek,
        dayLabel: day.dayLabel,
        exercises: day.exercises.map(ex => ({
          exerciseNumber: ex.exerciseNumber,
          exerciseName: ex.exerciseName,
          exerciseCategory: ex.exerciseCategory,
          exerciseNotes: ex.exerciseNotes,
          supersetGroup: ex.supersetGroup,
          supersetOrder: ex.supersetOrder,
          sets: ex.sets,
          reps: ex.reps,
          weights: ex.weights,
          percent: ex.percent
        }))
        // Note: No completion tracking in templates
      }))
    }))
  })
}
```

**Assign template to athlete:**
```typescript
const assignTemplate = useMutation(api.programTemplates.assignTemplateToAthlete)

await assignTemplate({
  userId: 'default-user',
  templateName: '4-Day Strength Template',
  athleteName: 'jane smith',
  programName: 'janes winter program',
  startDate: '2026-02-15'
})
```

### 6. Managing Athlete PRs

**Set or update a PR:**
```typescript
const upsertPR = useMutation(api.athletePRs.upsertPR)

await upsertPR({
  athleteName: 'john doe',
  exerciseName: 'snatch',
  repMax: 1,
  weight: 140  // New PR!
})
```

**Load all PRs for an athlete:**
```typescript
const prs = useQuery(
  api.athletePRs.getAthletePRs,
  { athleteName: 'john doe' }
)

// prs will be grouped by exercise:
// {
//   snatch: [{ repMax: 1, weight: 140 }, { repMax: 2, weight: 130 }],
//   clean: [{ repMax: 1, weight: 190 }]
// }
```

### 7. Searching Exercises

**Autocomplete search:**
```typescript
const convex = useConvex()

const handleSearch = async (searchTerm: string) => {
  const results = await convex.query(api.exerciseLibrary.searchExercises, {
    userId: 'default-user',
    searchTerm: searchTerm.toLowerCase()
  })

  return results  // Array of exercise objects
}
```

---

## Tips & Best Practices

### Real-Time Updates

Convex automatically pushes updates to all subscribers. If you mark a day as completed:

```typescript
const markComplete = useMutation(api.programs.markDayComplete)

await markComplete({
  programId: program._id,
  weekNumber: 1,
  dayNumber: 2,
  completed: true,
  rating: 'Crushing It'
})
```

**Everyone subscribed to that program will see the update instantly** (< 100ms).

### Handling Loading States

Queries return `undefined` while loading:

```typescript
const athletes = useQuery(api.programs.getAthletes, { userId: USER_ID })

if (athletes === undefined) {
  return <div>Loading...</div>
}

if (athletes.length === 0) {
  return <div>No athletes found</div>
}

return <div>{athletes.length} athletes</div>
```

### Error Handling

Mutations throw errors if they fail:

```typescript
const insertProgram = useMutation(api.programs.insertProgram)

try {
  await insertProgram({ /* data */ })
  alert('Success!')
} catch (error) {
  alert('Failed: ' + error.message)
}
```

### Nested Data Access

Programs have deeply nested structure. Access exercises like:

```typescript
const program = useQuery(api.programs.getAthleteProgram, { /* args */ })

if (program) {
  const firstWeek = program.weeks[0]
  const firstDay = firstWeek.days[0]
  const firstExercise = firstDay.exercises[0]

  console.log(firstExercise.exerciseName)  // "snatch"
}
```

### Performance

- **One query per program** - No joins needed, everything is nested
- **Real-time by default** - useQuery automatically subscribes
- **Conditional queries** - Use `'skip'` to prevent unnecessary queries
- **Document size limit** - 1MB per document (you're nowhere near this)

### Environment Setup

Your Convex URL is in `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=https://good-chameleon-503.convex.cloud
```

The website code automatically reads this and connects to your Convex deployment.

### Available Functions Quick Reference

**programs.ts:**
- `getAthletes()` - List all athletes
- `getProgramsForAthlete()` - Get programs for one athlete
- `getAthleteProgram()` - Load specific program
- `checkProgramExists()` - Check if program exists
- `insertProgram()` - Create new program
- `updateProgram()` - Update existing program
- `deleteProgram()` - Delete program
- `markDayComplete()` - Mark day as completed
- `markExerciseComplete()` - Mark exercise as completed
- `updateDayRating()` - Set workout rating
- `getAthleteScheduleSummaries()` - Get schedule overview
- `getWorkoutsForAnalytics()` - Flatten data for charts

**programTemplates.ts:**
- `getTemplates()` - List all templates
- `getTemplate()` - Load specific template
- `checkTemplateExists()` - Check if template exists
- `saveTemplate()` - Create/update template
- `assignTemplateToAthlete()` - Clone template to athlete program
- `deleteTemplate()` - Delete template

**athletePRs.ts:**
- `getAthletePRs()` - Get all PRs for athlete
- `getPRsForExercise()` - Get PRs for specific exercise
- `upsertPR()` - Set or update PR
- `deletePR()` - Remove PR

**exerciseLibrary.ts:**
- `searchExercises()` - Search by name
- `getAllExercises()` - Get all exercises
- `insertExercise()` - Add new exercise
- `deleteExercise()` - Remove exercise

---

## Questions?

This guide covers the 90% use case. For edge cases or advanced usage:

1. Check the actual function definitions in `convex/*.ts` files
2. Look at existing component code in `website/app/**/*.tsx`
3. Consult the [Convex docs](https://docs.convex.dev)

The database structure is designed to be simple and intuitive. When in doubt, follow the pattern: **read with useQuery, write with useMutation**.

---
name: Interactive Training Log
overview: Add a new training log screen reachable from the play button on the training calendar. The log uses a swipeable tab layout (readiness → one page per superset group → intensity), shows exercises with weights derived from athlete PRs and readiness-adjusted percentages, and persists readiness and session intensity on the day in the database with correct defaults when programs are created on the website.
todos: []
isProject: false
---

# Interactive Training Log Implementation Plan

## Current state

- **[app/(tabs)/training/index.tsx](app/\\\\\\\\\\\\(tabs)/training/index.tsx)** – Training calendar with `DayViewButtons` and `WorkoutCard`; play button is in [WorkoutCard](components/WorkoutCard.tsx) (line 59) but has no `onPress`.
- **Schema** – Day already has `rating` (readiness: Trash / Below Average / Average / Above Average / Crushing It). Day does **not** have session intensity (1–10); that needs to be added.
- **Convex** – `updateDayRating` exists in [convex/programs.ts](convex/programs.ts). `markDayComplete`, `markExerciseComplete` exist. No mutation yet for session intensity.
- **Website program creation** – [website/app/program-builder/page.tsx](website/app/program-builder/page.tsx) and [website/app/program-scraper/page.tsx](website/app/program-scraper/page.tsx) build days with `rating: undefined`; you want default `rating: "Average"` and a new `sessionIntensity` default (null/undefined).
- **PRs** – [convex/athletePRs.ts](convex/athletePRs.ts) exposes `getAthletePRs` (grouped by `exerciseName`, with `1rm` key). Program exercises have `exerciseCategory` (e.g. snatch, clean, squat); PRs are keyed by `exerciseName` (e.g. snatch, back_squat). You’ll need a consistent way to map category → 1RM (same name or a small mapping).

---

## 1. Schema and Convex
Status: completed (2026-02-02)

**Add session intensity to the day**

- In [convex/schema.ts](convex/schema.ts), inside the day object (same level as `completed`, `rating`, `completedAt`), add: `sessionIntensity: v.optional(v.number())` (1–10, optional). That’s in `programs.weeks[].days[]`.
- In [types/program.ts](types/program.ts), add to the `Day` interface: `sessionIntensity?: number`.

**New mutation**

- In [convex/programs.ts](convex/programs.ts), add a new mutation `updateDaySessionIntensity` with args: `programId` (v.id("programs")), `weekNumber`, `dayNumber`, `sessionIntensity` (v.number()). The handler is the same pattern as `updateDayRating`: get the program, map over weeks/days to find the matching day, return a new day object with `...day, sessionIntensity: args.sessionIntensity }`, then `ctx.db.patch(args.programId, { weeks: updatedWeeks })`.

**Default values when creating programs**

- In [convex/programs.ts](convex/programs.ts), ensure `insertProgram` and any other mutation that creates days accepts optional `rating` and `sessionIntensity` in the day payload. Schema already has `rating` optional; add `sessionIntensity` to the day validator in `insertProgram` (and `updateProgram` if it replaces full weeks).
- On the **website**, when building the `weeks` payload that is sent to `insertProgram`:
- Set each day’s `rating: "Average"` (instead of `undefined`).
- Set each day’s `sessionIntensity: undefined` (or omit it).
- Files to update: [website/app/program-builder/page.tsx](website/app/program-builder/page.tsx) (around line 376), [website/app/program-scraper/page.tsx](website/app/program-scraper/page.tsx) (around line 144).

---

## 2. Navigation and data flow
Status: completed (2026-02-02)

**Resolve programId**

- `getAthleteProgram` returns the Convex document, which includes `_id`. Use that as `programId` for mutations. If your [Program](types/program.ts) type doesn’t include `_id`, either extend it for the Convex result or pass `programId` separately (e.g. from `api.programs.getAthleteProgram` result’s `_id`).

**New route**

- Add a new screen under training, e.g. **`app/(tabs)/training/log.tsx`** (or `session.tsx`). Register it in [app/(tabs)/training/_layout.tsx](app/\\\\\\\\\\\\(tabs)/training/_layout.tsx) so the stack knows about it (e.g. add `<Stack.Screen name="log" options={{ title: 'Workout' }} />`).

**Play button → log screen**

- In [components/WorkoutCard.tsx](components/WorkoutCard.tsx), give the play `LiquidGlassButton` an `onPress`. When the selected day has exercises (and optionally only when not already completed), use Expo Router to navigate to the log screen and pass the data the log needs:
- **Option A:** `router.push({ pathname: '/training/log', params: { date: format(selectedDate, 'yyyy-MM-dd') } })` and have the log screen use the same `getAthleteProgram` query + `getTrainingDayByDate(program, selectedDate)` so it doesn’t depend on passed program state.
- **Option B:** Pass `programId`, `date`, and any minimal state (e.g. week/day indices) as params or via a shared context. The log screen will need `programId` for `updateDayRating`, `updateDaySessionIntensity`, `markExerciseComplete`, and `markDayComplete`.

Recommendation: pass **date** (and optionally **programId** if you have it) as route params; the log screen can call `getAthleteProgram` with the same args as the calendar (athleteName, programName, startDate) and derive the day + programId from the result. That keeps a single source of truth and avoids passing large objects.

---

## 3. Log screen structure (swipeable pages)
Status: completed (2026-02-02)

**Page order**

1. **Start page** – Readiness: “How are you feeling?” with options Trash, Below Average, Average, Above Average, Crushing It. On select: call `updateDayRating` with the chosen rating and store it in local state for the rest of the session (so weight math uses it immediately).
2. **Middle pages** – One page per **superset group**, ordered by group then by **supersetOrder**. Group exercises by `exercise.supersetGroup` (e.g. '', 'A', 'B', 'C'), sort groups (e.g. '' first, then A, B, C), and within each group sort by `supersetOrder`. Each page shows only the exercises in that group.
3. **End page** – Session intensity: 1–10 scale. On submit: call `updateDaySessionIntensity`, then optionally `markDayComplete(true)` and navigate back.

**Require superset on the website (no ungrouped exercises)**

- Programs must not be pushable if any exercise has empty supersetGroup or supersetOrder. Add validation on the website (see below); then the app can assume every exercise has a group (no ungrouped case).
- **Validation (program-builder):** In website/lib/program-validation.ts, add a check for every exercise: if `!exercise.supersetGroup?.trim()` or `!exercise.supersetOrder?.trim()`, return `{ isValid: false, message: 'Set superset group and order for [exercise name] (week X, day Y).' }`. Replace or extend the existing rule that only required order when group was set.
- **Tests:** In website/lib/program-validation.test.ts, update `baseWeek()` so the exercise has `supersetGroup: 'A'` and `supersetOrder: '1'` so "passes valid week data" still passes. Add a test that fails when supersetGroup is empty and one when supersetOrder is empty.
- **Program scraper:** Before calling `insertProgram`, validate that every exercise in the built `weeks` has non-empty superset_group and superset_order. If any are missing, set an error and do not push. Optionally default them (e.g. first exercise per day gets "A"/1) and document that sheets should include these columns.

**UI component**

- Use a horizontal swipeable layout (e.g. `react-native-pager-view`, or `FlatList`/`ScrollView` with `pagingEnabled` and `horizontal`) so each of the above is one “page”. Consider a dot or step indicator for current page (start → group A → group B → … → end).

---

## 4. Weight calculation (percent → weight)
Status: completed (2026-02-02)

**Readiness delta**

- Map readiness to a delta: Trash **-8%**, Below Average **-4%**, Average **0%**, Above Average **+4%**, Crushing It **+8%**. Apply this delta to every exercise’s prescribed percent for the day (so effective percent = base percent + delta; clamp to a sensible range if you want, e.g. 0–100).

**1RM lookup**

- Fetch PRs with `getAthletePRs(athleteName)`. Result is like `{ [exerciseName]: { "1rm": weight, "2rm": weight, ... } }`.
- For each exercise, use `exerciseCategory` to choose which PR to use. If your PRs use the same names as categories (e.g. category “snatch” and PR key “snatch”), use that. If not (e.g. category “squat” but PR “back_squat”), add a small mapping in the app (e.g. `categoryToPRExercise: Record<string, string>`) or in a util: `getOneRepMax(prs, exerciseCategory)` that returns the 1RM or undefined.
- Weight per set: `(effectivePercent / 100) * oneRepMax`. If 1RM is missing, show percent as fallback.

**Display**

- Each exercise row: checkmark (tap toggles `markExerciseComplete`) + exercise name. Below it, one line per set: e.g. “1  3 @ 70 kg”, “2  2 @ 80 kg” (set index, reps, weight). Use the set count from the exercise (or length of `reps`/`percent` arrays); normalize so you have one entry per set with reps and effective percent → weight.

---

## 5. Start and end page behavior
Status: completed (2026-02-02)

**Start (readiness)**

- Save to DB: `updateDayRating(programId, weekNumber, dayNumber, rating)`.
- Store selected rating in component state so middle and end pages can use it (and so weight math uses the delta without re-reading from DB).
- After selection, user can swipe to the first workout page (or tap “Start workout”).

**End (intensity)**

- Input: 1–10 (slider or buttons). Save: `updateDaySessionIntensity(programId, weekNumber, dayNumber, sessionIntensity)`.
- Optionally call `markDayComplete(programId, weekNumber, dayNumber, true, rating)` if you keep completion in sync with “session done” (you may already set rating on the start page; ensure you don’t overwrite it). Then navigate back to the training calendar.

---

## 6. Implementation order (suggested)
Status: completed (2026-02-02)

0. **Require superset on website** – In website/lib/program-validation.ts add the “both supersetGroup and supersetOrder required” check. Update program-validation.test.ts (baseWeek + new failing tests). In program-scraper, before insertProgram, validate or default superset_group/superset_order and block push if invalid.
1. **Schema + Convex** – Add `sessionIntensity` to schema and day type; add `updateDaySessionIntensity`; add `sessionIntensity` to insert/update validators where days are built.
2. **Website defaults** – When creating programs in program-builder and program-scraper, set `rating: "Average"` and `sessionIntensity: undefined` for each day.
3. **Route + navigation** – Add `app/(tabs)/training/log.tsx`, register in training `_layout`, and from `WorkoutCard` play button navigate with date (and programId if needed).
4. **Log screen data** – In log screen, use `getAthleteProgram` and `getTrainingDayByDate(program, selectedDate)` to get the day; get `programId` from the Convex program doc `_id`; get `weekNumber`/`dayNumber` from the resolved day/week.
5. **Readiness page** – UI for five options; on select call `updateDayRating` and store rating in state.
6. **Superset grouping util** – In `utils/programUtils.ts` (or a log-specific util), add a function that takes the day’s exercises and returns an ordered list of “pages”, each being a list of exercises (e.g. `{ group: string, exercises: Exercise[] }[]`). Sort groups (e.g. A, B, C) and within each group sort by supersetOrder.
7. **Weight/PR helper** – Implement `getOneRepMax(prs, exerciseCategory)` (with category → PR key mapping if needed) and `effectivePercent(basePercent, readiness)` using the delta table. Use in the log UI.
8. **Middle pages UI** – One swipeable page per superset group; each shows exercise rows (checkmark + name + set lines with weight). Wire checkmark to `markExerciseComplete`. (completed 2026-02-02)
9. **End page** – Intensity 1–10 input; on submit call `updateDaySessionIntensity` and optionally `markDayComplete`, then navigate back. (completed 2026-02-02)

---

## 7. Convex and React Native implementation guide

### Convex basics (for the app)

- **Queries** read data and stay in sync: when the DB changes, the component re-renders with new data. Use `useQuery(api.programs.getAthleteProgram, { athleteName, programName, startDate })`. The return value is the document or `undefined` (while loading or if not found). Convex documents include an `_id` field (type `Id<"programs">`); use this as `programId` when calling mutations.
- **Mutations** change data. Use `useMutation(api.programs.updateDayRating)` (and similar for other mutations). You get a function; call it with an object of args, e.g. `updateDayRating({ programId, weekNumber, dayNumber, rating })`. Mutations are async; you can `await` them or use `.then()`. The mutation runs on the Convex server; the client stays in sync because any subscribed queries (e.g. `getAthleteProgram`) will re-run and update the UI.
- **API import:** In the app you import `api` from `@/convex/_generated/api`. Then `api.programs.getAthleteProgram` is the query reference and `api.programs.updateDayRating` is the mutation reference. You never call these references directly; you pass them to `useQuery` / `useMutation`.

**Example in a screen:**

```tsx
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

// In your component:
const program = useQuery(api.programs.getAthleteProgram, {
  athleteName: 'maddisen',
  programName: 'test',
  startDate: '2026-02-01'
})
const updateDayRating = useMutation(api.programs.updateDayRating)

// program is undefined while loading, or the document (with _id) when loaded
const programId = program?._id as Id<"programs"> | undefined
// When calling the mutation:
if (programId) {
  await updateDayRating({ programId, weekNumber: 1, dayNumber: 1, rating: 'Average' })
}
```

### Expo Router navigation

- **Navigate to a screen:** `import { useRouter } from 'expo-router'`, then `const router = useRouter()`, then `router.push('/training/log')` or `router.push({ pathname: '/training/log', params: { date: '2026-02-01' } })`.
- **Read params on the log screen:** `import { useLocalSearchParams } from 'expo-router'`, then `const { date } = useLocalSearchParams<{ date: string }>()`. You get the `date` string (or undefined) that was passed. Use it to build the `Date` for `getTrainingDayByDate(program, new Date(date))`.
- **Go back:** `router.back()`.

### Log screen data flow (step by step)

1. In `app/(tabs)/training/log.tsx`, use `useLocalSearchParams` to get `date` (and optionally hardcode or get athleteName, programName, startDate for now).
2. Call `useQuery(api.programs.getAthleteProgram, { athleteName, programName, startDate })` to get `program`. While `program === undefined`, show a loading state.
3. When `program` is defined, get `programId = program._id`. Use `getTrainingDayByDate(program, new Date(date))` from `@/utils/programUtils` to get `{ day, week }`. If the result is `null` (rest day or invalid date), show a message and optionally a back button.
4. From `day` and `week` you have `weekNumber`, `dayNumber`, and `day.exercises`. Use these for all mutations: `updateDayRating(programId, week.weekNumber, day.dayNumber, rating)`, etc.

### Local state for the session

- Use `useState` for the readiness the user selected on the start page, e.g. `const [readiness, setReadiness] = useState<DayRating | null>(null)`. When they tap an option, call `setReadiness('Above Average')` and `await updateDayRating(...)`. Use `readiness` when computing effective percent (and thus weight) on the middle pages; if `readiness` is null, you can default to "Average" (0% delta) or block rendering the workout pages until they’ve selected.
- Use `useState` for the current page index if you want to control the pager (e.g. `const [pageIndex, setPageIndex] = useState(0)`). When the user swipes, update `pageIndex` so a dot indicator or "Next" can reflect the current page.

### Swipeable pages (React Native)

- **Option A – FlatList horizontal:** Use a `FlatList` with `data={[{ id: 'start' }, { id: 'groupA' }, ...]} `(one item per page), `renderItem` that returns a full-screen `View` for that page (readiness UI, list of exercises for that group, or intensity UI), `horizontal`, `pagingEnabled`, `showsHorizontalScrollIndicator={false}`, and `onMomentumScrollEnd` (or `onScroll`) to update `pageIndex` from `contentOffset.x / width`. Give the list a fixed width (e.g. `Dimensions.get('window').width`) so each "page" is one screen width.
- **Option B – PagerView:** Install `react-native-pager-view` and use `PagerView` with `initialPage={0}` and one child `View` per page. Use `onPageSelected={(e) => setPageIndex(e.nativeEvent.position)}` to track the current page. Each child should be a full-screen wrapper so swiping feels like flipping pages.

### Calling mutations from the UI

- **Readiness:** On the start page, each option is a pressable; `onPress` should call `setReadiness(option)` and then `await updateDayRating({ programId, weekNumber: week.weekNumber, dayNumber: day.dayNumber, rating: option })`. You need `programId`, `week`, and `day` from the data flow above; if the log screen only mounts when you have a resolved day, you can use them directly.
- **Exercise checkmark:** Each exercise row has a checkmark; `onPress` toggles completion. Call `markExerciseComplete({ programId, weekNumber, dayNumber, exerciseNumber: ex.exerciseNumber, completed: !ex.completed })`. After the mutation, the `program` query will update and `day.exercises` will reflect the new `completed`; no need to hold exercise completion in local state unless you want optimistic UI.
- **Session intensity:** On the end page, user picks 1–10 (e.g. slider or 10 buttons). On submit, call `await updateDaySessionIntensity({ programId, weekNumber, dayNumber, sessionIntensity: value })`, then optionally `await markDayComplete({ programId, weekNumber, dayNumber, completed: true })`, then `router.back()`.

### Typing program with _id

- The Convex-generated type for the programs table is in `convex/_generated/dataModel.d.ts` (e.g. `Doc<"programs">`). Your app’s [types/program.ts](types/program.ts) might not include `_id`. For the log screen you can: (1) type the query result as `Doc<"programs">` when you need `_id`, or (2) add `_id?: Id<"programs">` to your Program type when used for Convex results. Then `programId = program._id` is type-safe.

---

## 8. Optional refinements

- **Rest day** – If the selected date has no exercises, either hide the play button or show a message and don’t navigate to the log.
- **Completion state** – If the day is already completed, you might show the play button as a checkmark (as now) and still allow opening the log in “review” mode (read-only or with edits depending on product choice).
- **programId in app** – Ensure the program query result is typed so you can read `_id` (e.g. `Doc<"programs">` or `Program & { _id: Id<"programs"> }`) where you need it for mutations.

This plan gives you a clear path to implement the interactive training log, DB changes, and website defaults on your own.

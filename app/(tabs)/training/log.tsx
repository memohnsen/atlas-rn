import { useCoach } from '@/components/CoachProvider'
import { useUnit } from '@/components/UnitProvider'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { DayRating, Exercise, Program } from '@/types/program'
import {
  getEffectivePercent,
  getOneRepMax,
  resolveProgramDayDate,
  getTrainingDayByDate,
  groupExercisesBySuperset,
} from '@/utils/programUtils'
import { useMutation, useQuery } from 'convex/react'
import { useAuth } from '@clerk/clerk-expo'
import { format, parse } from 'date-fns'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { SymbolView } from 'expo-symbols'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
} from 'react-native-reanimated'

// ─── Constants ─────────────────────────────────────────────

const READINESS_OPTIONS: {
  value: DayRating
  label: string
  emoji: string
  color: string
  darkColor: string
  delta: string
}[] = [
  { value: 'Trash', label: 'Trash', emoji: '😩', color: '#FF3B30', darkColor: '#FF453A', delta: '-8%' },
  { value: 'Below Average', label: 'Below Avg', emoji: '😐', color: '#FF9500', darkColor: '#FF9F0A', delta: '-4%' },
  { value: 'Average', label: 'Average', emoji: '😊', color: '#FFCC00', darkColor: '#FFD60A', delta: '0%' },
  { value: 'Above Average', label: 'Above Avg', emoji: '💪', color: '#34C759', darkColor: '#30D158', delta: '+4%' },
  { value: 'Crushing It', label: 'Crushing It', emoji: '🔥', color: '#00C7BE', darkColor: '#63E6BE', delta: '+8%' },
]

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type SetStatus = 'pending' | 'complete' | 'miss'

type UpdateExerciseSets = (args: {
  programId: Id<'programs'>
  weekNumber: number
  dayNumber: number
  exerciseNumber: number
  reps: string[]
  percent?: number[]
  setWeights?: number[]
  setStatuses?: SetStatus[]
  sets?: number
}) => Promise<unknown>

// ─── Main Component ────────────────────────────────────────

const TrainingLog = () => {
  const { date } = useLocalSearchParams<{ date?: string }>()
  const [pageIndex, setPageIndex] = useState(0)
  const [readiness, setReadiness] = useState<DayRating | null>(null)
  const [intensity, setIntensity] = useState<number | null>(null)
  const { width: screenWidth } = useWindowDimensions()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const flatListRef = useRef<FlatList>(null)
  const { isSignedIn } = useAuth()
  const { coachEnabled, selectedAthlete } = useCoach()
  const { weightUnit } = useUnit()

  // ─── Data ──────────────────────────────────────────────

  const coachProgram = useQuery(
    api.programs.getCurrentProgramForAthlete,
    coachEnabled && selectedAthlete ? { athleteName: selectedAthlete } : 'skip'
  )

  const programData = useQuery(
    api.programs.getAthleteProgram,
    !coachEnabled && isSignedIn
      ? {
          athleteName: 'maddisen',
          programName: 'test',
          startDate: '2026-02-01',
        }
      : 'skip'
  )

  const program = (coachEnabled ? coachProgram : programData) as (Program & {
    _id: Id<'programs'>
  }) | undefined
  const updateDayRating = useMutation(api.programs.updateDayRating)
  const updateDaySessionIntensity = useMutation(api.programs.updateDaySessionIntensity)
  const markDayComplete = useMutation(api.programs.markDayComplete)
  const markExerciseComplete = useMutation(api.programs.markExerciseComplete)
  const updateExerciseSets = useMutation(api.programs.updateExerciseSets)
  const updateExerciseNotes = useMutation(api.programs.updateExerciseNotes)
  const prs = useQuery(
    api.athletePRs.getAthletePRs,
    isSignedIn
      ? { athleteName: coachEnabled ? (selectedAthlete ?? 'maddisen') : (program?.athleteName ?? 'maddisen') }
      : 'skip'
  )

  // ─── Loading / Error states ────────────────────────────

  if (program === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16, fontWeight: '500' }}>Loading workout...</Text>
        </Animated.View>
      </View>
    )
  }

  if (!program) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>No program found</Text>
      </View>
    )
  }

  if (!date) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>Missing workout date</Text>
      </View>
    )
  }

  const parsedDate = parse(date, 'yyyy-MM-dd', new Date())
  const result = getTrainingDayByDate(program, parsedDate)
  const currentDay = result?.day
  const weekNumber = result?.week.weekNumber ?? 0
  const dayNumber = currentDay?.dayNumber ?? 0
  const listKey = `${program._id}-${weekNumber}-${dayNumber}`

  if (!currentDay) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>Rest day</Text>
      </View>
    )
  }

  const activeReadiness = readiness ?? currentDay.rating ?? 'Average'
  const sessionDayLabel = useMemo(() => {
    const resolvedDate = resolveProgramDayDate(program, currentDay, weekNumber)
    if (!resolvedDate) return currentDay.dayLabel
    const [year, month, day] = resolvedDate.split('-').map(Number)
    if (!year || !month || !day) return currentDay.dayLabel
    return format(new Date(year, month - 1, day), 'EEEE')
  }, [currentDay, program, weekNumber])

  // ─── Handlers ──────────────────────────────────────────

  const handleReadinessSelect = async (rating: DayRating) => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setReadiness(rating)
    await updateDayRating({
      programId: program._id,
      weekNumber,
      dayNumber,
      rating,
    })
  }

  const handleIntensitySubmit = async () => {
    if (!intensity) return
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await updateDaySessionIntensity({
      programId: program._id,
      weekNumber,
      dayNumber,
      sessionIntensity: intensity,
    })
    await markDayComplete({
      programId: program._id,
      weekNumber,
      dayNumber,
      completed: true,
      rating: activeReadiness,
    })
    if (!coachEnabled && isFirstWorkoutCompletion && Platform.OS !== 'web') {
      try {
        const isAvailable = await StoreReview.isAvailableAsync()
        if (isAvailable) {
          await StoreReview.requestReview()
        }
      } catch {
        // Ignore review request errors silently.
      }
    }
    if (coachEnabled) {
      router.back()
      return
    }

    router.push({
      pathname: '/(tabs)/training/summary',
      params: {
        date,
        readiness: activeReadiness,
        intensity: String(intensity),
      },
    })
  }

  const handleExerciseToggle = async (exerciseNumber: number, completed: boolean, weight?: number) => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await markExerciseComplete({
      programId: program._id,
      weekNumber,
      dayNumber,
      exerciseNumber,
      completed: !completed,
      weight,
    })
  }

  const handleIntensitySelect = (value: number) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync()
    setIntensity(value)
  }

  // ─── Data prep ─────────────────────────────────────────

  const supersetPages = useMemo(() => {
    return groupExercisesBySuperset(currentDay.exercises)
  }, [currentDay.exercises])

  const pages = coachEnabled
    ? supersetPages.map((page) => ({
        key: `group-${page.key}`,
        type: 'group' as const,
        group: page.key,
        exercises: page.exercises,
      }))
    : [
        { key: 'readiness', type: 'readiness' as const },
        ...supersetPages.map((page) => ({
          key: `group-${page.key}`,
          type: 'group' as const,
          group: page.key,
          exercises: page.exercises,
        })),
        { key: 'intensity', type: 'intensity' as const },
      ]

  const totalExercises = currentDay.exercises.length
  const completedExercises = currentDay.exercises.filter((e) => e.completed).length
  const isFirstWorkoutCompletion = useMemo(() => {
    if (currentDay.completed) return false
    let completedCount = 0
    for (const week of program.weeks) {
      for (const day of week.days) {
        if (day.completed) {
          if (week.weekNumber === weekNumber && day.dayNumber === dayNumber) continue
          completedCount += 1
        }
      }
    }
    return completedCount === 0
  }, [currentDay.completed, dayNumber, program.weeks, weekNumber])

  const toDisplayWeight = (value: number | undefined) => {
    if (typeof value !== 'number') return ''
    const factor = weightUnit === 'lb' ? 2.2 : 1
    const converted = value * factor
    const rounded = weightUnit === 'lb'
      ? Math.round(converted / 5) * 5
      : Math.round(converted * 10) / 10
    return String(rounded)
  }

  const toStorageWeight = (value: number) => {
    const factor = weightUnit === 'lb' ? 2.2 : 1
    const normalized = weightUnit === 'lb' ? Math.round(value / 5) * 5 : value
    return Math.round((normalized / factor) * 10) / 10
  }

  // ─── Colors ────────────────────────────────────────────

  const colors = {
    bg: isDark ? '#000000' : '#FFFFFF',
    card: isDark ? '#1C1C1E' : '#F2F2F7',
    cardSecondary: isDark ? '#2C2C2E' : '#E8E8ED',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#6C6C70',
    textTertiary: isDark ? '#48484A' : '#AEAEB2',
    accent: '#5386E4',
    green: isDark ? '#30D158' : '#34C759',
    border: isDark ? '#38383A' : '#E5E5EA',
    setRowBg: isDark ? '#2C2C2E' : '#F8F8FC',
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Progress bar + page info */}
      <View style={{ paddingTop: 100, paddingBottom: 8, paddingHorizontal: 24 }}>
        {/* Week/Day header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
        >
          {!coachEnabled && (
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
              }}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView name="chevron.left" tintColor={colors.text} size={16} weight="bold" />
              ) : (
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>‹</Text>
              )}
            </Pressable>
          )}
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>
            W{weekNumber}D{currentDay.dayNumber}
          </Text>
          {sessionDayLabel && (
            <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '500' }}>
              {sessionDayLabel}
            </Text>
          )}
          {coachEnabled && (
            <Pressable
              onPress={() => router.back()}
              style={{
                marginLeft: 'auto',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                borderCurve: 'continuous',
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Done</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Progress bar */}
        <Animated.View entering={FadeIn.duration(600).delay(200)} style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
          {pages.map((_, index) => (
            <View
              key={`seg-${index}`}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: index <= pageIndex ? colors.accent : colors.border,
              }}
            />
          ))}
        </Animated.View>
      </View>

      {/* Swipeable Pages */}
      <FlatList
        ref={flatListRef}
        key={listKey}
        data={pages}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth)
          setPageIndex(nextIndex)
        }}
        renderItem={({ item }) => {
          if (item.type === 'readiness') {
            return (
              <ReadinessPage
                screenWidth={screenWidth}
                activeReadiness={activeReadiness}
                onSelect={handleReadinessSelect}
                onContinue={() => {
                  flatListRef.current?.scrollToIndex({ index: 1, animated: true })
                }}
                colors={colors}
                isDark={isDark}
              />
            )
          }

          if (item.type === 'group') {
            return (
              <ExerciseGroupPage
                screenWidth={screenWidth}
                groupKey={item.group!}
                exercises={item.exercises!}
                prs={prs}
                activeReadiness={activeReadiness}
                onExerciseToggle={handleExerciseToggle}
                onUpdateSets={updateExerciseSets}
                onUpdateNotes={updateExerciseNotes}
                programId={program._id}
                weekNumber={weekNumber}
                dayNumber={dayNumber}
                colors={colors}
                isDark={isDark}
                coachEnabled={coachEnabled}
                weightUnit={weightUnit}
                toDisplayWeight={toDisplayWeight}
                toStorageWeight={toStorageWeight}
              />
            )
          }

          return (
            <IntensityPage
              screenWidth={screenWidth}
              intensity={intensity}
              onSelectIntensity={handleIntensitySelect}
              onSubmit={handleIntensitySubmit}
              completedExercises={completedExercises}
              totalExercises={totalExercises}
              colors={colors}
              isDark={isDark}
            />
          )
        }}
      />
    </View>
  )
}

// ─── Readiness Page ──────────────────────────────────────────

interface ReadinessPageProps {
  screenWidth: number
  activeReadiness: DayRating
  onSelect: (rating: DayRating) => void
  onContinue: () => void
  colors: Record<string, string>
  isDark: boolean
}

const ReadinessPage = ({ screenWidth, activeReadiness, onSelect, onContinue, colors, isDark }: ReadinessPageProps) => {
  return (
    <View style={{ width: screenWidth, paddingHorizontal: 24, paddingTop: 24 }}>
      <Animated.Text
        entering={FadeInDown.duration(400)}
        style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 4, letterSpacing: -0.3 }}
      >
        How are you feeling?
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(50)}
        style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 24 }}
      >
        This adjusts your working weights for today
      </Animated.Text>

      <View style={{ gap: 10 }}>
        {READINESS_OPTIONS.map((option, index) => {
          const isSelected = activeReadiness === option.value
          const optionColor = isDark ? option.darkColor : option.color

          return (
            <AnimatedPressable
              key={option.value}
              entering={FadeInDown.duration(300).delay(100 + index * 60)}
              onPress={() => onSelect(option.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 18,
                borderRadius: 16,
                borderCurve: 'continuous',
                backgroundColor: isSelected
                  ? (isDark ? `${optionColor}18` : `${optionColor}12`)
                  : colors.card,
                borderWidth: isSelected ? 1.5 : 1,
                borderColor: isSelected ? optionColor : 'transparent',
                gap: 14,
              }}
            >
              {/* Emoji */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: isSelected ? `${optionColor}20` : colors.cardSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>{option.emoji}</Text>
              </View>

              {/* Label */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: isSelected ? optionColor : colors.text,
                    fontSize: 17,
                    fontWeight: '600',
                  }}
                >
                  {option.label}
                </Text>
              </View>

              {/* Delta badge */}
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderCurve: 'continuous',
                  backgroundColor: isSelected ? `${optionColor}20` : colors.cardSecondary,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? optionColor : colors.textSecondary,
                    fontSize: 13,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {option.delta}
                </Text>
              </View>

              {/* Check indicator */}
              {isSelected && Platform.OS === 'ios' && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <SymbolView
                    name="checkmark.circle.fill"
                    tintColor={optionColor}
                    size={22}
                    weight="medium"
                  />
                </Animated.View>
              )}
              {isSelected && Platform.OS !== 'ios' && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: optionColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>
                </Animated.View>
              )}
            </AnimatedPressable>
          )
        })}
      </View>

      {/* Continue button */}
      <Animated.View entering={FadeInUp.duration(400).delay(500)} style={{ marginTop: 28 }}>
        <Pressable
          onPress={() => {
            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onContinue()
          }}
          style={{
            paddingVertical: 16,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {Platform.OS === 'ios' && (
            <SymbolView name="arrow.right" tintColor="#fff" size={18} weight="semibold" />
          )}
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 }}>
            Continue
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

// ─── Exercise Group Page ─────────────────────────────────────

interface ExerciseGroupPageProps {
  screenWidth: number
  groupKey: string
  exercises: Exercise[]
  prs: Record<string, Record<string, number>> | undefined
  activeReadiness: DayRating
  onExerciseToggle: (exerciseNumber: number, completed: boolean, weight?: number) => void
  onUpdateSets: UpdateExerciseSets
  onUpdateNotes: (args: {
    programId: Id<'programs'>
    weekNumber: number
    dayNumber: number
    exerciseNumber: number
    notes: string
  }) => Promise<unknown>
  programId: Id<'programs'>
  weekNumber: number
  dayNumber: number
  colors: Record<string, string>
  isDark: boolean
  coachEnabled: boolean
  weightUnit: 'kg' | 'lb'
  toDisplayWeight: (value: number | undefined) => string
  toStorageWeight: (value: number) => number
}

const ExerciseGroupPage = ({
  screenWidth,
  groupKey,
  exercises,
  prs,
  activeReadiness,
  onExerciseToggle,
  onUpdateSets,
  onUpdateNotes,
  programId,
  weekNumber,
  dayNumber,
  colors,
  isDark,
  coachEnabled,
  weightUnit,
  toDisplayWeight,
  toStorageWeight,
}: ExerciseGroupPageProps) => {
  return (
    <View style={{ width: screenWidth }}>
      <FlatList
        data={exercises}
        keyExtractor={(e) => `ex-${e.exerciseNumber}`}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  backgroundColor: `${colors.accent}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '800' }}>
                  {groupKey === 'Ungrouped' ? '-' : groupKey}
                </Text>
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
                  {groupKey === 'Ungrouped' ? 'Exercises' : `Block ${groupKey}`}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </Animated.View>
        }
        renderItem={({ item: exercise, index }) => (
          <ExerciseCard
            key={exercise.exerciseNumber}
            exercise={exercise}
            index={index}
            prs={prs}
            activeReadiness={activeReadiness}
            onToggle={onExerciseToggle}
            onUpdateSets={onUpdateSets}
            onUpdateNotes={onUpdateNotes}
            programId={programId}
            weekNumber={weekNumber}
            dayNumber={dayNumber}
            colors={colors}
            isDark={isDark}
            coachEnabled={coachEnabled}
            weightUnit={weightUnit}
            toDisplayWeight={toDisplayWeight}
            toStorageWeight={toStorageWeight}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  )
}

// ─── Exercise Card ───────────────────────────────────────────

interface ExerciseCardProps {
  exercise: Exercise
  index: number
  prs: Record<string, Record<string, number>> | undefined
  activeReadiness: DayRating
  onToggle: (exerciseNumber: number, completed: boolean, weight?: number) => void
  onUpdateSets: UpdateExerciseSets
  onUpdateNotes: (args: {
    programId: Id<'programs'>
    weekNumber: number
    dayNumber: number
    exerciseNumber: number
    notes: string
  }) => Promise<unknown>
  programId: Id<'programs'>
  weekNumber: number
  dayNumber: number
  colors: Record<string, string>
  isDark: boolean
  coachEnabled: boolean
  weightUnit: 'kg' | 'lb'
  toDisplayWeight: (value: number | undefined) => string
  toStorageWeight: (value: number) => number
}

const ExerciseCard = ({
  exercise,
  index,
  prs,
  activeReadiness,
  onToggle,
  onUpdateSets,
  onUpdateNotes,
  programId,
  weekNumber,
  dayNumber,
  colors,
  isDark,
  coachEnabled,
  weightUnit,
  toDisplayWeight,
  toStorageWeight,
}: ExerciseCardProps) => {
  const repsArray = Array.isArray(exercise.reps) ? exercise.reps : [exercise.reps]
  const percentArray = Array.isArray(exercise.percent)
    ? exercise.percent
    : exercise.percent !== undefined
      ? [exercise.percent]
      : []
  const hasPercent = percentArray.length > 0
  const setWeightsArray = exercise.setWeights ?? []
  const setStatusesArray = exercise.setStatuses ?? []
  const setCount = Math.max(
    repsArray.length,
    percentArray.length,
    setWeightsArray.length,
    setStatusesArray.length,
    exercise.sets ?? 0,
    1,
  )
  const oneRepMax =
    getOneRepMax(prs, exercise.exerciseCategory) ??
    getOneRepMax(prs, exercise.exerciseName)

  const [repsBySet, setRepsBySet] = useState<string[]>([])
  const [weightsBySet, setWeightsBySet] = useState<string[]>([])
  const [statusesBySet, setStatusesBySet] = useState<SetStatus[]>([])
  const [percentBySet, setPercentBySet] = useState<number[]>([])
  const [notesDraft, setNotesDraft] = useState(exercise.exerciseNotes ?? '')
  const [isEditingNotes, setIsEditingNotes] = useState(false)

  useEffect(() => {
    const nextReps = Array.from({ length: setCount }, (_, i) => repsArray[i] ?? repsArray[0] ?? '')
    const nextWeights = Array.from({ length: setCount }, (_, i) => {
      const value = setWeightsArray[i]
      if (typeof value === 'number' && value > 0) return toDisplayWeight(value)

      const basePercent = percentArray[i] ?? percentArray[0]
      const effectivePercent =
        typeof basePercent === 'number'
          ? getEffectivePercent(basePercent, activeReadiness)
          : undefined
      const derivedWeight =
        oneRepMax && effectivePercent !== undefined
          ? Math.round((effectivePercent / 100) * oneRepMax)
          : undefined

      return typeof derivedWeight === 'number' && derivedWeight > 0 ? toDisplayWeight(derivedWeight) : ''
    })
    const nextStatuses = Array.from({ length: setCount }, (_, i) => setStatusesArray[i] ?? 'pending')
    const nextPercents = Array.from({ length: setCount }, (_, i) => {
      const value = percentArray[i] ?? percentArray[0]
      return typeof value === 'number' ? value : 0
    })

    setRepsBySet(nextReps)
    setWeightsBySet(nextWeights)
    setStatusesBySet(nextStatuses)
    setPercentBySet(nextPercents)
    setNotesDraft(exercise.exerciseNotes ?? '')
    setIsEditingNotes(false)
  }, [exercise.exerciseNumber, exercise.reps, exercise.percent, exercise.setWeights, exercise.setStatuses, exercise.sets, exercise.exerciseNotes])

  const buildSetWeights = (values: string[]) => {
    const parsed = values.map((value) => {
      const normalized = value.trim()
      if (!normalized) return null
      const next = Number(normalized)
      if (!Number.isFinite(next)) return null
      return toStorageWeight(next)
    })

    let lastIndex = -1
    parsed.forEach((value, index) => {
      if (typeof value === 'number') lastIndex = index
    })

    if (lastIndex < 0) return undefined

    return Array.from({ length: lastIndex + 1 }, (_, i) => {
      const value = parsed[i]
      return typeof value === 'number' ? value : 0
    })
  }

  const getHeaviestNonMissWeight = (weights: string[], statuses: SetStatus[]) => {
    const eligibleWeights = weights
      .map((value, index) => {
        const weight = Number(value)
        if (!Number.isFinite(weight) || weight <= 0) return null
        if (statuses[index] === 'miss') return null
        return toStorageWeight(weight)
      })
      .filter((value): value is number => typeof value === 'number')

    return eligibleWeights.length > 0 ? Math.max(...eligibleWeights) : undefined
  }

  const areAllSetsResolved = (statuses: SetStatus[]) => {
    if (setCount <= 0) return false
    return Array.from({ length: setCount }, (_, index) => statuses[index] ?? 'pending')
      .every((status) => status !== 'pending')
  }

  const persistSets = async (next: {
    reps?: string[]
    weights?: string[]
    statuses?: SetStatus[]
    percents?: number[]
    includePercent?: boolean
  }) => {
    const repsToSave = next.reps ?? repsBySet
    const weightsToSave = buildSetWeights(next.weights ?? weightsBySet)
    const statusesToSave = next.statuses ?? statusesBySet
    const rawPercent = next.percents ?? percentBySet
    const lastPercentIndex = rawPercent.findLastIndex((value) => value > 0)
    const trimmedPercents = lastPercentIndex >= 0 ? rawPercent.slice(0, lastPercentIndex + 1) : []
    const percentToSave = next.includePercent ? trimmedPercents : undefined

    await onUpdateSets({
      programId,
      weekNumber,
      dayNumber,
      exerciseNumber: exercise.exerciseNumber,
      reps: repsToSave,
      percent: percentToSave,
      setWeights: weightsToSave,
      setStatuses: statusesToSave,
      sets: repsToSave.length,
    })
  }

  const sets = Array.from({ length: setCount }, (_, i) => {
    const reps = repsBySet[i] ?? ''
    const basePercent = percentBySet[i] ?? percentBySet[0]
    const effectivePercent =
      typeof basePercent === 'number' && basePercent > 0
        ? getEffectivePercent(basePercent, activeReadiness)
        : undefined
    const weightValue = weightsBySet[i]?.trim()
    const weight = weightValue ? Number(weightValue) : undefined
    const weightInKg =
      typeof weight === 'number' && Number.isFinite(weight) && weight > 0
        ? toStorageWeight(weight)
        : undefined
    const derivedPercent =
      typeof weightInKg === 'number' && oneRepMax
        ? Math.round((weightInKg / oneRepMax) * 100)
        : undefined

    return {
      reps,
      effectivePercent,
      weight,
      derivedPercent,
      status: statusesBySet[i] ?? 'pending',
      index: i,
    }
  })

  useEffect(() => {
    if (exercise.completed) return
    if (!areAllSetsResolved(statusesBySet)) return

    const heaviest = getHeaviestNonMissWeight(weightsBySet, statusesBySet)
    onToggle(exercise.exerciseNumber, false, heaviest)
  }, [exercise.completed, exercise.exerciseNumber, statusesBySet, weightsBySet, setCount])

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(80 + index * 60)}
      style={{
        backgroundColor: colors.card,
        borderRadius: 18,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}
    >
      {/* Exercise header */}
      <Pressable
        onPress={() => {
          const nextCompleted = !exercise.completed
          if (!nextCompleted) {
            onToggle(exercise.exerciseNumber, exercise.completed)
            return
          }

          const eligibleWeights = weightsBySet
            .map((value, index) => {
              const weight = Number(value)
              if (!Number.isFinite(weight) || weight <= 0) return null
              if (statusesBySet[index] === 'miss') return null
              return toStorageWeight(weight)
            })
            .filter((value): value is number => typeof value === 'number')

          const heaviest = eligibleWeights.length > 0 ? Math.max(...eligibleWeights) : undefined
          onToggle(exercise.exerciseNumber, exercise.completed, heaviest)
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 18,
          paddingVertical: 16,
          gap: 14,
        }}
      >
        {/* Completion toggle */}
        <Animated.View layout={LinearTransition.duration(200)}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: exercise.completed ? colors.green : (isDark ? '#3A3A3C' : '#DEDEE3'),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {Platform.OS === 'ios' && (
              <SymbolView
                name="checkmark"
                tintColor={exercise.completed ? '#fff' : (isDark ? '#636366' : '#AEAEB2')}
                size={14}
                weight="bold"
              />
            )}
            {Platform.OS !== 'ios' && (
              <Text style={{ color: exercise.completed ? '#fff' : (isDark ? '#636366' : '#AEAEB2'), fontSize: 13, fontWeight: '800' }}>✓</Text>
            )}
          </View>
        </Animated.View>

        {/* Exercise info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: exercise.completed ? colors.textSecondary : colors.text,
              fontSize: 20,
              fontWeight: '600',
              textDecorationLine: exercise.completed ? 'line-through' : 'none',
            }}
          >
            {exercise.exerciseName}
          </Text>
        </View>
      </Pressable>

      {(coachEnabled || exercise.exerciseNotes) && (
        <View style={{ marginHorizontal: 18, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>
              Notes
            </Text>
            {coachEnabled && (
              <Pressable
                onPress={async () => {
                  if (isEditingNotes) {
                    await onUpdateNotes({
                      programId,
                      weekNumber,
                      dayNumber,
                      exerciseNumber: exercise.exerciseNumber,
                      notes: notesDraft.trim(),
                    })
                  }
                  setIsEditingNotes(!isEditingNotes)
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderCurve: 'continuous',
                  backgroundColor: colors.cardSecondary,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
                  {isEditingNotes ? 'Save' : 'Edit'}
                </Text>
              </Pressable>
            )}
          </View>

          {isEditingNotes ? (
            <TextInput
              value={notesDraft}
              onChangeText={setNotesDraft}
              placeholder="Coach notes"
              placeholderTextColor={colors.textTertiary}
              multiline
              style={{
                color: colors.text,
                fontSize: 14,
                fontWeight: '500',
                padding: 12,
                borderRadius: 12,
                borderCurve: 'continuous',
                backgroundColor: colors.setRowBg,
                minHeight: 56,
              }}
            />
          ) : (
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderCurve: 'continuous',
                backgroundColor: isDark ? '#5386E415' : '#5386E410',
                borderLeftWidth: 3,
                borderLeftColor: colors.accent,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {Platform.OS === 'ios' && (
                <SymbolView name="info.circle.fill" tintColor={colors.accent} size={16} weight="medium" style={{ marginTop: 1 }} />
              )}
              <Text
                selectable
                style={{
                  color: isDark ? '#B0C4F5' : '#3A6BC5',
                  fontSize: 14,
                  fontWeight: '500',
                  lineHeight: 20,
                  flex: 1,
                }}
              >
                {exercise.exerciseNotes?.trim() || (coachEnabled ? 'Add notes' : '')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Sets breakdown */}
      <View style={{ paddingHorizontal: 18, paddingBottom: 14, gap: 4 }}>
        {sets.map((set) => (
          <View
            key={`set-${exercise.exerciseNumber}-${set.index}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderCurve: 'continuous',
              backgroundColor: colors.setRowBg,
              gap: 8,
            }}
          >
            {/* Set number */}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                borderCurve: 'continuous',
                backgroundColor: isDark ? '#3A3A3C' : '#DEDEE3',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {set.index + 1}
              </Text>
            </View>

            {/* Reps */}
            <TextInput
              value={repsBySet[set.index] ?? ''}
              onChangeText={(value) => {
                setRepsBySet((prev) => {
                  const next = [...prev]
                  next[set.index] = value
                  return next
                })
              }}
              onEndEditing={() => {
                const nextReps = [...repsBySet]
                persistSets({ reps: nextReps })
              }}
              placeholder="Reps"
              placeholderTextColor={colors.textTertiary}
              style={{
                color: colors.text,
                fontSize: 15,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                width: 40,
                textAlign: 'center',
              }}
            />

            {/* Weight or percent */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>@</Text>
              <TextInput
                value={weightsBySet[set.index] ?? ''}
                onChangeText={(value) => {
                  setWeightsBySet((prev) => {
                    const next = [...prev]
                    next[set.index] = value
                    return next
                  })
                }}
                onEndEditing={() => {
                  const nextWeights = [...weightsBySet]
                  persistSets({ weights: nextWeights })
                }}
                placeholder="Weight"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                style={{
                  color: colors.accent,
                  fontSize: 15,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                  width: 50,
                  textAlign: 'center',
                }}
              />
              <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700' }}>
                {weightUnit === 'lb' ? 'lb' : 'kg'}
              </Text>
            </View>

            {/* Percent, right-aligned */}
            {(coachEnabled || set.derivedPercent !== undefined || set.effectivePercent !== undefined) && (
              <>
                <View style={{ flex: 1 }} />
                {coachEnabled ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TextInput
                      value={percentBySet[set.index] > 0 ? String(percentBySet[set.index]) : ''}
                      onChangeText={(value) => {
                        const parsed = Number(value)
                        setPercentBySet((prev) => {
                          const next = [...prev]
                          next[set.index] = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
                          return next
                        })
                      }}
                      onEndEditing={() => {
                        const nextPercents = [...percentBySet]
                        persistSets({ percents: nextPercents, includePercent: true })
                      }}
                      placeholder="%"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      style={{
                        color: colors.textTertiary,
                        fontSize: 14,
                        fontWeight: '600',
                        fontVariant: ['tabular-nums'],
                        width: 36,
                        textAlign: 'right',
                      }}
                    />
                    <Text style={{ color: colors.textTertiary, fontSize: 14, fontWeight: '600' }}>%</Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 15,
                      fontWeight: '500',
                      fontVariant: ['tabular-nums'],
                      width: 52,
                      textAlign: 'right',
                    }}
                  >
                    {set.derivedPercent ?? set.effectivePercent}%
                  </Text>
                )}
              </>
            )}

            {/* Status toggle */}
            <Pressable
              onPress={() => {
                const nextStatus: SetStatus =
                  set.status === 'pending' ? 'complete' : set.status === 'complete' ? 'miss' : 'pending'
                const nextStatuses = [...statusesBySet]
                nextStatuses[set.index] = nextStatus
                setStatusesBySet(nextStatuses)
                persistSets({ statuses: nextStatuses })
              }}
              style={{
                width: 28,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                borderCurve: 'continuous',
                backgroundColor:
                  set.status === 'complete'
                    ? `${colors.green}20`
                    : set.status === 'miss'
                      ? (isDark ? '#FF453A20' : '#FF3B3020')
                      : colors.cardSecondary,
              }}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView
                  name={
                    set.status === 'complete'
                      ? 'checkmark'
                      : set.status === 'miss'
                        ? 'xmark'
                        : 'circle'
                  }
                  tintColor={
                    set.status === 'complete'
                      ? colors.green
                      : set.status === 'miss'
                        ? (isDark ? '#FF453A' : '#FF3B30')
                        : colors.textSecondary
                  }
                  size={14}
                  weight="bold"
                />
              ) : (
                <Text
                  style={{
                    color:
                      set.status === 'complete'
                        ? colors.green
                        : set.status === 'miss'
                          ? (isDark ? '#FF453A' : '#FF3B30')
                          : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: '800',
                  }}
                >
                  {set.status === 'complete' ? '✓' : set.status === 'miss' ? '✕' : '○'}
                </Text>
              )}
            </Pressable>
          </View>
        ))}

        {/* Add/remove set */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable
            onPress={() => {
              if (repsBySet.length <= 1) return
              const nextReps = repsBySet.slice(0, -1)
              const nextWeights = weightsBySet.slice(0, -1)
              const nextStatuses = statusesBySet.slice(0, -1)
              const nextPercents = percentBySet.slice(0, -1)

              setRepsBySet(nextReps)
              setWeightsBySet(nextWeights)
              setStatusesBySet(nextStatuses)
              setPercentBySet(nextPercents)
              persistSets({
                reps: nextReps,
                weights: nextWeights,
                statuses: nextStatuses,
                percents: nextPercents,
                includePercent: coachEnabled || hasPercent,
              })
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              borderCurve: 'continuous',
              backgroundColor: isDark ? '#2C2C2E' : '#E8E8ED',
              opacity: repsBySet.length <= 1 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>- Set</Text>
          </Pressable>
          
          <Pressable
            onPress={() => {
              const nextReps = [...repsBySet, repsBySet[repsBySet.length - 1] ?? '']
              const nextWeights = [...weightsBySet, weightsBySet[weightsBySet.length - 1] ?? '']
              const nextStatuses = [...statusesBySet, 'pending']
              const nextPercents = [...percentBySet]
              if (percentBySet.length > 0) {
                nextPercents.push(percentBySet[percentBySet.length - 1])
              }

              setRepsBySet(nextReps)
              setWeightsBySet(nextWeights)
              setStatusesBySet(nextStatuses)
              setPercentBySet(nextPercents)
              persistSets({
                reps: nextReps,
                weights: nextWeights,
                statuses: nextStatuses,
                percents: nextPercents,
                includePercent: coachEnabled || hasPercent,
              })
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              borderCurve: 'continuous',
              backgroundColor: isDark ? '#2C2C2E' : '#E8E8ED',
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>+ Set</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  )
}

// ─── Intensity Page ──────────────────────────────────────────

interface IntensityPageProps {
  screenWidth: number
  intensity: number | null
  onSelectIntensity: (value: number) => void
  onSubmit: () => void
  completedExercises: number
  totalExercises: number
  colors: Record<string, string>
  isDark: boolean
}

const IntensityPage = ({
  screenWidth,
  intensity,
  onSelectIntensity,
  onSubmit,
  completedExercises,
  totalExercises,
  colors,
  isDark,
}: IntensityPageProps) => {
  const getIntensityColor = (value: number) => {
    if (value <= 3) return isDark ? '#30D158' : '#34C759'
    if (value <= 5) return isDark ? '#FFD60A' : '#FFCC00'
    if (value <= 7) return isDark ? '#FF9F0A' : '#FF9500'
    return isDark ? '#FF453A' : '#FF3B30'
  }

  const getIntensityLabel = (value: number) => {
    if (value <= 2) return 'Light'
    if (value <= 4) return 'Moderate'
    if (value <= 6) return 'Challenging'
    if (value <= 8) return 'Hard'
    return 'Max Effort'
  }

  const displayValue = intensity ?? 5
  const activeColor = getIntensityColor(displayValue)

  return (
    <View style={{ width: screenWidth, paddingHorizontal: 24, paddingTop: 24 }}>
      <Animated.Text
        entering={FadeInDown.duration(400)}
        style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 4, letterSpacing: -0.3 }}
      >
        How hard was that?
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(50)}
        style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 8 }}
      >
        Rate your perceived effort from 1 to 10
      </Animated.Text>

      {/* Completion summary */}
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 32,
          paddingVertical: 10,
          paddingHorizontal: 14,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderCurve: 'continuous',
        }}
      >
        {Platform.OS === 'ios' ? (
          <SymbolView name="checkmark.circle" tintColor={colors.green} size={18} weight="medium" />
        ) : (
          <Text style={{ color: colors.green, fontSize: 16 }}>✓</Text>
        )}
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {completedExercises}/{totalExercises}
          </Text>
          {' '}exercises completed
        </Text>
      </Animated.View>

      {/* Big intensity number */}
      <Animated.View entering={FadeIn.duration(500).delay(150)} style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text
          style={{
            color: intensity !== null ? activeColor : colors.textTertiary,
            fontSize: 72,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            letterSpacing: -2,
          }}
        >
          {displayValue}
        </Text>
        <Text
          style={{
            color: intensity !== null ? activeColor : colors.textTertiary,
            fontSize: 18,
            fontWeight: '700',
            marginTop: -4,
          }}
        >
          {intensity !== null ? getIntensityLabel(intensity) : 'Tap to rate'}
        </Text>
      </Animated.View>

      {/* Intensity track */}
      <Animated.View entering={FadeInUp.duration(400).delay(250)} style={{ marginBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 4,
            gap: 3,
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
            const isSelected = intensity === value
            const itemColor = getIntensityColor(value)

            return (
              <Pressable
                key={value}
                onPress={() => onSelectIntensity(value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  backgroundColor: isSelected ? itemColor : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontSize: 15,
                    fontWeight: isSelected ? '800' : '600',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Animated.View>

      {/* Scale labels */}
      <Animated.View entering={FadeIn.duration(300).delay(300)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 36 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: '500' }}>Easy</Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: '500' }}>Max Effort</Text>
      </Animated.View>

      {/* Finish button */}
      <Animated.View entering={FadeInUp.duration(400).delay(400)}>
        <Pressable
          onPress={onSubmit}
          style={{
            paddingVertical: 18,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: intensity ? colors.accent : colors.cardSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: intensity ? 1 : 0.5,
          }}
        >
          {intensity && Platform.OS === 'ios' && (
            <SymbolView name="checkmark.circle.fill" tintColor="#fff" size={20} weight="medium" />
          )}
          <Text
            style={{
              color: intensity ? '#FFFFFF' : colors.textTertiary,
              fontSize: 17,
              fontWeight: '700',
              letterSpacing: -0.2,
            }}
          >
            Finish Session
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

export default TrainingLog

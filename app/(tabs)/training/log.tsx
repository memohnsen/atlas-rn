import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { DayRating, Exercise, Program } from '@/types/program'
import {
  getEffectivePercent,
  getOneRepMax,
  getTrainingDayByDate,
  groupExercisesBySuperset,
} from '@/utils/programUtils'
import { useMutation, useQuery } from 'convex/react'
import { parse } from 'date-fns'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Platform,
  Pressable,
  Text,
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

  // ─── Data ──────────────────────────────────────────────

  const programData = useQuery(api.programs.getAthleteProgram, {
    athleteName: 'maddisen',
    programName: 'test',
    startDate: '2026-02-01',
  })

  const program = programData as (Program & { _id: Id<'programs'> }) | undefined
  const updateDayRating = useMutation(api.programs.updateDayRating)
  const updateDaySessionIntensity = useMutation(api.programs.updateDaySessionIntensity)
  const markDayComplete = useMutation(api.programs.markDayComplete)
  const markExerciseComplete = useMutation(api.programs.markExerciseComplete)
  const prs = useQuery(api.athletePRs.getAthletePRs, {
    athleteName: program?.athleteName ?? 'maddisen',
  })

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
    router.back()
  }

  const handleExerciseToggle = async (exerciseNumber: number, completed: boolean) => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await markExerciseComplete({
      programId: program._id,
      weekNumber,
      dayNumber,
      exerciseNumber,
      completed: !completed,
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

  const pages = [
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
        <Animated.View entering={FadeInDown.duration(400)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>
            W{weekNumber}D{currentDay.dayNumber}
          </Text>
          {currentDay.dayLabel && (
            <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '500' }}>
              {currentDay.dayLabel}
            </Text>
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
                colors={colors}
                isDark={isDark}
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
  onExerciseToggle: (exerciseNumber: number, completed: boolean) => void
  colors: Record<string, string>
  isDark: boolean
}

const ExerciseGroupPage = ({
  screenWidth,
  groupKey,
  exercises,
  prs,
  activeReadiness,
  onExerciseToggle,
  colors,
  isDark,
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
                  {groupKey === 'Ungrouped' ? 'Exercises' : `Superset ${groupKey}`}
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
            colors={colors}
            isDark={isDark}
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
  onToggle: (exerciseNumber: number, completed: boolean) => void
  colors: Record<string, string>
  isDark: boolean
}

const ExerciseCard = ({ exercise, index, prs, activeReadiness, onToggle, colors, isDark }: ExerciseCardProps) => {
  const repsArray = Array.isArray(exercise.reps) ? exercise.reps : [exercise.reps]
  const percentArray = Array.isArray(exercise.percent)
    ? exercise.percent
    : exercise.percent !== undefined
      ? [exercise.percent]
      : []
  const setCount = exercise.sets ?? Math.max(repsArray.length, percentArray.length, 1)
  const oneRepMax =
    getOneRepMax(prs, exercise.exerciseCategory) ??
    getOneRepMax(prs, exercise.exerciseName)

  const sets = Array.from({ length: setCount }, (_, i) => {
    const reps = repsArray[i] ?? repsArray[0] ?? ''
    const basePercent = percentArray[i] ?? percentArray[0]
    const effectivePercent =
      typeof basePercent === 'number'
        ? getEffectivePercent(basePercent, activeReadiness)
        : undefined
    const weight =
      oneRepMax && effectivePercent !== undefined
        ? Math.round((effectivePercent / 100) * oneRepMax)
        : undefined

    return { reps, effectivePercent, weight, index: i }
  })

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
        onPress={() => onToggle(exercise.exerciseNumber, exercise.completed)}
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

      {/* Exercise notes callout */}
      {exercise.exerciseNotes && (
        <View
          style={{
            marginHorizontal: 18,
            marginBottom: 10,
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
            {exercise.exerciseNotes}
          </Text>
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
              gap: 10,
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
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {set.reps} {set.reps === '1' ? 'rep' : 'reps'}
            </Text>

            {/* Weight or percent */}
            {(set.weight !== undefined || set.effectivePercent !== undefined) && (
              <>
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>@</Text>
                <Text
                  selectable
                  style={{
                    color: colors.accent,
                    fontSize: 15,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {set.weight !== undefined ? `${set.weight} kg` : `${set.effectivePercent}%`}
                </Text>
              </>
            )}

            {/* Effective percent, right-aligned */}
            {set.effectivePercent !== undefined && (
              <>
                <View style={{ flex: 1 }} />
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 15,
                    fontWeight: '500',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {set.effectivePercent}%
                </Text>
              </>
            )}
          </View>
        ))}
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

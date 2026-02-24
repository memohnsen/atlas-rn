import { useCoach } from '@/components/CoachProvider'
import { useUnit } from '@/components/UnitProvider'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { DayRating, Program } from '@/types/program'
import {
  getEffectivePercent,
  getOneRepMax,
  resolveProgramDayDate,
  getTrainingDayByDate,
} from '@/utils/programUtils'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from 'convex/react'
import { format, parse } from 'date-fns'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { SymbolView } from 'expo-symbols'
import { useMemo, useRef } from 'react'
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import ViewShot from 'react-native-view-shot'

const READINESS_OPTIONS: {
  value: DayRating
  label: string
  emoji: string
  color: string
  darkColor: string
}[] = [
  { value: 'Trash', label: 'Trash', emoji: '😩', color: '#FF3B30', darkColor: '#FF453A' },
  { value: 'Below Average', label: 'Below Avg', emoji: '😐', color: '#FF9500', darkColor: '#FF9F0A' },
  { value: 'Average', label: 'Average', emoji: '😊', color: '#FFCC00', darkColor: '#FFD60A' },
  { value: 'Above Average', label: 'Above Avg', emoji: '💪', color: '#34C759', darkColor: '#30D158' },
  { value: 'Crushing It', label: 'Crushing It', emoji: '🔥', color: '#00C7BE', darkColor: '#63E6BE' },
]

const TrainingSummary = () => {
  const { date, readiness, intensity } = useLocalSearchParams<{ date?: string; readiness?: DayRating; intensity?: string }>()
  const { isSignedIn } = useAuth()
  const { coachEnabled } = useCoach()
  const { weightUnit } = useUnit()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const shareRef = useRef<ViewShot>(null)

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

  const program = programData as (Program & { _id: Id<'programs'> }) | undefined
  const prs = useQuery(
    api.athletePRs.getAthletePRs,
    isSignedIn
      ? { athleteName: program?.athleteName ?? 'maddisen' }
      : 'skip'
  )

  if (coachEnabled) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>Summary is available in athlete mode</Text>
      </View>
    )
  }

  if (program === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>Loading summary...</Text>
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

  if (!currentDay) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>Rest day</Text>
      </View>
    )
  }

  const activeReadiness = readiness ?? currentDay.rating ?? 'Average'
  const activeIntensity = intensity ? Number(intensity) : currentDay.sessionIntensity ?? null
  const sessionDayLabel = useMemo(() => {
    const resolvedDate = resolveProgramDayDate(program, currentDay, weekNumber)
    if (!resolvedDate) return currentDay.dayLabel
    const [year, month, day] = resolvedDate.split('-').map(Number)
    if (!year || !month || !day) return currentDay.dayLabel
    return format(new Date(year, month - 1, day), 'EEEE')
  }, [currentDay, program, weekNumber])

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
  }

  const readinessMeta = READINESS_OPTIONS.find((option) => option.value === activeReadiness) ?? READINESS_OPTIONS[2]
  const readinessColor = isDark ? readinessMeta.darkColor : readinessMeta.color

  const toDisplayWeight = (value: number) => {
    const factor = weightUnit === 'lb' ? 2.2 : 1
    const converted = value * factor
    if (weightUnit === 'lb') return Math.round(converted / 5) * 5
    return Math.round(converted * 10) / 10
  }

  const summary = useMemo(() => {
    let totalReps = 0
    let totalWeightKg = 0
    let intensitySum = 0
    let intensityCount = 0

    currentDay.exercises.forEach((exercise) => {
      const repsArray = Array.isArray(exercise.reps) ? exercise.reps : [exercise.reps]
      const percentArray = Array.isArray(exercise.percent)
        ? exercise.percent
        : exercise.percent !== undefined
          ? [exercise.percent]
          : []
      const setWeightsArray = exercise.setWeights ?? []
      const setCount = Math.max(
        repsArray.length,
        percentArray.length,
        setWeightsArray.length,
        exercise.sets ?? 0,
        1
      )
      const oneRepMax =
        getOneRepMax(prs, exercise.exerciseCategory) ??
        getOneRepMax(prs, exercise.exerciseName)

      for (let index = 0; index < setCount; index += 1) {
        const repsValue = Number(repsArray[index] ?? repsArray[0] ?? 0)
        if (Number.isFinite(repsValue) && repsValue > 0) totalReps += repsValue

        const storedWeight = setWeightsArray[index]
        const basePercent = percentArray[index] ?? percentArray[0]
        const effectivePercent =
          typeof basePercent === 'number'
            ? getEffectivePercent(basePercent, activeReadiness)
            : undefined
        const derivedWeight =
          oneRepMax && effectivePercent !== undefined
            ? (effectivePercent / 100) * oneRepMax
            : undefined
        const weightToUse = typeof storedWeight === 'number' && storedWeight > 0 ? storedWeight : derivedWeight

        if (weightToUse && repsValue > 0) {
          totalWeightKg += weightToUse * repsValue
        }

        const derivedIntensity =
          typeof weightToUse === 'number' && oneRepMax
            ? (weightToUse / oneRepMax) * 100
            : effectivePercent

        if (typeof derivedIntensity === 'number' && derivedIntensity > 0) {
          intensitySum += derivedIntensity
          intensityCount += 1
        }
      }
    })

    const averageIntensity = intensityCount > 0 ? Math.round((intensitySum / intensityCount) * 10) / 10 : null
    return {
      totalReps,
      totalWeightKg,
      averageIntensity,
    }
  }, [currentDay.exercises, activeReadiness, prs])

  const totalWeightDisplay = toDisplayWeight(summary.totalWeightKg)
  const totalWeightLabel = `${totalWeightDisplay} ${weightUnit}`
  const averageIntensityLabel = summary.averageIntensity ? `${summary.averageIntensity}%` : '—'

  const getIntensityLabel = (value: number) => {
    if (value <= 2) return 'Light'
    if (value <= 4) return 'Moderate'
    if (value <= 6) return 'Challenging'
    if (value <= 8) return 'Hard'
    return 'Max Effort'
  }

  const handleShare = async () => {
    if (!shareRef.current) return
    try {
      const uri = await shareRef.current.capture?.()
      if (!uri) return

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share workout' })
        return
      }

      await Share.share({ url: uri, message: 'Workout summary' })
    } catch (error) {
      Alert.alert('Share failed', 'Could not generate the share image. Please try again.')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 90, paddingHorizontal: 24, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
            }}
          >
            {Platform.OS === 'ios' ? (
              <SymbolView name="chevron.left" tintColor={colors.text} size={18} weight="bold" />
            ) : (
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>‹</Text>
            )}
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.4 }}>
            Workout Summary
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 16 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              borderCurve: 'continuous',
              padding: 18,
              gap: 12,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              Session
            </Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
              W{weekNumber}D{currentDay.dayNumber}
            </Text>
            {sessionDayLabel && (
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{sessionDayLabel}</Text>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: `${readinessColor}20`,
                }}
              >
                <Text style={{ color: readinessColor, fontSize: 13, fontWeight: '700' }}>
                  {readinessMeta.emoji} {readinessMeta.label}
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: colors.cardSecondary,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                  Effort: {activeIntensity ?? '—'}{activeIntensity ? ` (${getIntensityLabel(activeIntensity)})` : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 18,
                borderCurve: 'continuous',
                padding: 16,
                gap: 6,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                Total Weight
              </Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{totalWeightLabel}</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 18,
                borderCurve: 'continuous',
                padding: 16,
                gap: 6,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                Total Reps
              </Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{summary.totalReps}</Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              borderCurve: 'continuous',
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              Average Intensity
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{averageIntensityLabel}</Text>
          </View>

          <Pressable
            onPress={handleShare}
            style={{
              paddingVertical: 16,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              marginTop: 6,
            }}
          >
            {Platform.OS === 'ios' && (
              <SymbolView name="square.and.arrow.up" tintColor="#fff" size={18} weight="semibold" />
            )}
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 }}>
              Share Workout
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Offscreen ViewShot for image capture */}
      <View style={{ position: 'absolute', left: -9999 }}>
        <ViewShot
          ref={shareRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1350 }}
          style={{
            width: 360,
            aspectRatio: 4 / 5,
            backgroundColor: '#0C0F1F',
          }}
        >
          <View style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                Workout Complete
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.6 }}>
                W{weekNumber}D{currentDay.dayNumber}
              </Text>
              {sessionDayLabel && (
                <Text style={{ color: '#9AA7FF', fontSize: 16, fontWeight: '600' }}>{sessionDayLabel}</Text>
              )}
            </View>

            <View style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 20,
              borderCurve: 'continuous',
              padding: 20,
              gap: 16,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: '#9AA7FF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Total</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>{totalWeightLabel}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#9AA7FF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Reps</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>{summary.totalReps}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: '#9AA7FF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Avg Intensity</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>{averageIntensityLabel}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#9AA7FF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Effort</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>{activeIntensity ?? '—'}/10</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>{readinessMeta.emoji}</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{readinessMeta.label} readiness</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#9AA7FF', fontSize: 14, fontWeight: '600' }}>Atlas Training</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    </View>
  )
}

export default TrainingSummary

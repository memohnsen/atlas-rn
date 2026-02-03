import { useCoach } from '@/components/CoachProvider'
import Header from '@/components/Header'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { api } from '@/convex/_generated/api'
import { Program } from '@/types/program'
import { getTrainingDayByDate } from '@/utils/programUtils'
import { useAuth } from '@clerk/clerk-expo'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from 'convex/react'
import { differenceInDays, format } from 'date-fns'
import { useRouter } from 'expo-router'
import { Card, Divider } from 'heroui-native'
import { useMemo } from 'react'
import { Platform, Pressable, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')

export default function HomeScreen() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { coachEnabled } = useCoach()

  // Queries
  const coachDashboard = useQuery(
    api.programs.getCoachDashboard,
    coachEnabled && isSignedIn ? {} : 'skip'
  )

  const nextMeet = useQuery(
    api.athleteMeets.getNextMeet,
    isSignedIn ? { athleteName: 'maddisen' } : 'skip'
  )

  const prData = useQuery(
    api.athletePRs.getAthletePRs,
    isSignedIn ? { athleteName: 'maddisen' } : 'skip'
  )

  const programData = useQuery(
    api.programs.getAthleteProgram,
    isSignedIn
      ? {
          athleteName: 'maddisen',
          programName: 'test',
          startDate: '2026-02-01',
        }
      : 'skip'
  )

  const completedDays = useQuery(
    api.programs.getCompletedDays,
    isSignedIn ? { athleteName: 'maddisen', limit: 30 } : 'skip'
  )

  const program = programData as Program | undefined

  // Derived data
  const today = new Date()

  const daysUntilMeet = useMemo(() => {
    if (!nextMeet) return null
    const meetDate = new Date(nextMeet.meetDate + 'T00:00:00')
    return differenceInDays(meetDate, today)
  }, [nextMeet])

  const todayTraining = useMemo(() => {
    if (!program) return null
    return getTrainingDayByDate(program, today)
  }, [program])

  const trainingStreak = useMemo(() => {
    if (!completedDays || completedDays.length === 0) return 0
    let streak = 0
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
    for (const day of completedDays) {
      if (day.completedAt && day.completedAt >= oneWeekAgo) {
        streak++
      }
    }
    return streak
  }, [completedDays])

  const totalCompleted = completedDays?.length ?? 0

  if (coachEnabled) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 40 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {Platform.OS === 'android' && <View className="h-20" />}
        <View className="px-5 pt-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Header title="Coach Mode" subtitle={format(new Date(), 'EEEE, MMMM d')} />
            </View>
            <View className="pt-1">
              {Platform.OS === 'ios' ? (
                <LiquidGlassButton
                  icon="settings-outline"
                  iconSize={24}
                  height={44}
                  width={44}
                  iconColor="#6C6C70"
                  onPress={() => router.push('/settings')}
                />
              ) : (
                <Pressable onPress={() => router.push('/settings')}>
                  <Ionicons name="settings-outline" size={24} color="#6C6C70" />
                </Pressable>
              )}
            </View>
          </View>

          <View className="mt-6" style={{ gap: 12 }}>
            {coachDashboard?.map((summary) => (
              <Card key={`${summary.athleteName}-${summary.startDate}`} className="bg-card-background">
                <Card.Body>
                  <Text className="text-text-title text-xl font-bold mt-1">
                    {toTitleCase(summary.athleteName)}
                  </Text>
                  <Text className="text-text-title text-lg font-semibold mt-1">
                    {toTitleCase(summary.programName)}
                  </Text>
                  <View className="flex-row mt-2" style={{ gap: 16 }}>
                    <Text className="text-gray-500 text-sm">
                      Starts {format(new Date(summary.startDate + 'T00:00:00'), 'MMM d, yyyy')}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {summary.weekCount} weeks
                    </Text>
                  </View>
                  <View className="mt-3 rounded-lg bg-blue-900/10 px-3 py-2">
                    <Text className="text-blue-energy text-sm font-semibold">
                      {summary.sessionsRemaining} sessions remaining
                    </Text>
                  </View>
                </Card.Body>
              </Card>
            ))}
            {coachDashboard && coachDashboard.length === 0 && (
              <Text className="text-gray-500 text-base">No athletes found.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {Platform.OS === 'android' && <View className="h-20" />}
      <View className="px-5 pt-4">
        <View className="flex-row items-start justify-between">
          <View>
            <Header title="Atlas" subtitle={format(today, 'EEEE, MMMM d')} />
          </View>
          <View className="pt-1">
            {Platform.OS === 'ios' ? (
              <LiquidGlassButton
                icon="settings-outline"
                iconSize={24}
                height={44}
                width={44}
                iconColor="#6C6C70"
                onPress={() => router.push('/settings')}
              />
            ) : (
              <Pressable onPress={() => router.push('/settings')}>
                <Ionicons name="settings-outline" size={24} color="#6C6C70" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Meet Countdown */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Pressable onPress={() => router.push('/set-meet')}>
            <Card className="mt-6 bg-card-background">
              <Card.Body>
                {nextMeet && daysUntilMeet !== null ? (
                  <View className="items-center py-4">
                    <Text className="text-gray-500 text-sm uppercase tracking-widest">
                      {nextMeet.meetName}
                    </Text>
                    <Text
                      className="text-blue-energy font-bold mt-2"
                      style={{ fontSize: 64, fontVariant: ['tabular-nums'] }}
                    >
                      {daysUntilMeet}
                    </Text>
                    <Text className="text-text-title text-lg font-semibold -mt-1">
                      {daysUntilMeet === 1 ? 'day' : 'days'} until competition
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {format(new Date(nextMeet.meetDate + 'T00:00:00'), 'MMMM d, yyyy')}
                    </Text>
                  </View>
                ) : (
                  <View className="items-center py-6">
                    <Text className="text-gray-500 text-lg">No meet scheduled</Text>
                    <Text className="text-blue-energy text-sm mt-2 font-medium">
                      Tap to set your next competition
                    </Text>
                  </View>
                )}
              </Card.Body>
            </Card>
          </Pressable>
        </Animated.View>

        {/* Today's Training Quick Look */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Pressable onPress={() => router.push('/training')}>
            <Card className="mt-4 bg-card-background">
              <Card.Body>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-text-title text-lg font-bold">
                    Today's Training
                  </Text>
                  <Text className="text-blue-energy text-sm font-medium">
                    View
                  </Text>
                </View>
                <Divider />
                {todayTraining ? (
                  <View className="mt-3">
                    <Text className="text-gray-500 text-sm">
                      Week {todayTraining.week.weekNumber} — Day{' '}
                      {todayTraining.day.dayNumber}
                    </Text>
                    <View className="mt-2" style={{ gap: 6 }}>
                      {todayTraining.day.exercises.slice(0, 4).map((ex) => (
                        <View key={ex.exerciseNumber} className="flex-row items-center" style={{ gap: 8 }}>
                          <View
                            className="bg-blue-energy"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                            }}
                          />
                          <Text className="text-text-title text-base" numberOfLines={1}>
                            {ex.exerciseName}
                          </Text>
                        </View>
                      ))}
                      {todayTraining.day.exercises.length > 4 && (
                        <Text className="text-gray-500 text-sm ml-3.5">
                          +{todayTraining.day.exercises.length - 4} more
                        </Text>
                      )}
                    </View>
                    {todayTraining.day.completed && (
                      <View className="mt-3 bg-green-900/20 rounded-lg py-2 px-3" style={{ borderCurve: 'continuous' }}>
                        <Text className="text-green-500 text-sm font-medium text-center">
                          Completed
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="mt-3 py-2">
                    <Text className="text-gray-500 text-base">Rest day</Text>
                  </View>
                )}
              </Card.Body>
            </Card>
          </Pressable>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View className="flex-row mt-4" style={{ gap: 12 }}>
            <Card className="flex-1 bg-card-background">
              <Card.Body>
                <Text className="text-gray-500 text-xs uppercase tracking-wider">
                  This Week
                </Text>
                <Text
                  className="text-text-title text-3xl font-bold mt-1"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {trainingStreak}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {trainingStreak === 1 ? 'session' : 'sessions'}
                </Text>
              </Card.Body>
            </Card>
            <Card className="flex-1 bg-card-background">
              <Card.Body>
                <Text className="text-gray-500 text-xs uppercase tracking-wider">
                  Total
                </Text>
                <Text
                  className="text-text-title text-3xl font-bold mt-1"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {totalCompleted}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {totalCompleted === 1 ? 'session' : 'sessions'}
                </Text>
              </Card.Body>
            </Card>
          </View>
        </Animated.View>

        {/* Current Program Info */}
        {program && (
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <Card className="mt-4 bg-card-background">
              <Card.Body>
                <Text className="text-gray-500 text-xs uppercase tracking-wider">
                  Current Program
                </Text>
                <Text className="text-text-title text-xl font-bold mt-1">
                  {toTitleCase(program.programName)}
                </Text>
                <View className="flex-row mt-2" style={{ gap: 16 }}>
                  <Text className="text-gray-500 text-sm">
                    {program.weekCount} weeks
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Started {format(new Date(program.startDate + 'T00:00:00'), 'MMM d')}
                  </Text>
                </View>
              </Card.Body>
            </Card>
          </Animated.View>
        )}
      </View>

      {Platform.OS === 'android' && <View style={{ height: 120 }} />}
    </ScrollView>
  )
}

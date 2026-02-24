import { Program } from '@/types/program'
import { getTrainingDayByDate, resolveProgramDayDate } from '@/utils/programUtils'
import { Id } from '@/convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { FunctionReference } from 'convex/server'
import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import LiquidGlassButton from './LiquidGlassButton'
import WorkoutSchemeCard from './WorkoutSchemeCard'

interface WorkoutCardProps {
    program?: Program
    selectedDate: Date
}

const WorkoutCard = ({ program, selectedDate }: WorkoutCardProps) => {
    const router = useRouter()
    const moveWorkoutDay = useMutation(
        'programs:moveWorkoutDay' as unknown as FunctionReference<'mutation'>
    )
    const [showMovePicker, setShowMovePicker] = useState(false)
    const [moveDate, setMoveDate] = useState(selectedDate)
    const programWithId = program as (Program & { _id: Id<'programs'> }) | undefined

    // Date Formatting
    const formatArray = (value: string | number | string[] | number[] | undefined) => {
        if (value === undefined) return ''
        if (Array.isArray(value)) return value.join(', ')
        return value.toString()
    }

    // View
    if (program === undefined) {
        return (
            <>
                {Platform.OS === 'android' && <View className='h-44' />}
                {Platform.OS === 'ios' && <View className='h-30' />}
                <View className='flex-1 justify-center items-center'>
                    <Text className='text-text-title'>Loading workout...</Text>
                </View>
            </>
        )
    } else if (!program) {
        return (
            <>
                {Platform.OS === 'android' && <View className='h-44' />}
                {Platform.OS === 'ios' && <View className='h-30' />}
                <View className='flex-1 justify-center items-center'>
                    <Text className='text-text-title'>No program found</Text>
                </View>
            </>
        )
    } else {
        const result = getTrainingDayByDate(program, selectedDate)
        const currentDay = result?.day
        const currentWeek = result?.week.weekNumber
        const exercises = currentDay?.exercises ?? []
        const scheduledDate = currentDay && currentWeek
            ? resolveProgramDayDate(program, currentDay, currentWeek)
            : null

        const handleStartAsScheduled = () => {
            if (!currentDay || exercises.length === 0) return
            router.push({
                pathname: '/training/log',
                params: { date: format(selectedDate, 'yyyy-MM-dd') },
            })
        }

        const handleMoveWorkout = async (targetDate: Date) => {
            if (!programWithId || !currentDay || !currentWeek) return false
            if (currentDay.completed) {
                Alert.alert('Workout complete', 'Completed workouts cannot be moved.')
                return false
            }

            const targetDateStr = format(targetDate, 'yyyy-MM-dd')
            if (scheduledDate === targetDateStr) return true

            try {
                await moveWorkoutDay({
                    programId: programWithId._id,
                    sourceWeekNumber: currentWeek,
                    sourceDayNumber: currentDay.dayNumber,
                    targetDate: targetDateStr,
                })
                return true
            } catch {
                Alert.alert('Move failed', 'Unable to move this workout. Please try again.')
                return false
            }
        }

        const handleMoveToTodayAndStart = async () => {
            const today = new Date()
            const moved = await handleMoveWorkout(today)
            if (!moved) return
            router.push({
                pathname: '/training/log',
                params: { date: format(today, 'yyyy-MM-dd') },
            })
        }

        const handlePlayPress = () => {
            if (!currentDay || exercises.length === 0) return
            const todayDate = format(new Date(), 'yyyy-MM-dd')
            if (scheduledDate && scheduledDate !== todayDate && !currentDay.completed) {
                Alert.alert(
                    'Move workout to today?',
                    'This workout is scheduled for a different date.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Start As Scheduled', onPress: handleStartAsScheduled },
                        { text: 'Move to Today', onPress: handleMoveToTodayAndStart },
                    ]
                )
                return
            }
            handleStartAsScheduled()
        }

        const handleEllipsisPress = () => {
            if (!currentDay || exercises.length === 0) return
            Alert.alert('Workout Actions', 'Choose an action for this workout.', [
                {
                    text: 'Move Workout',
                    onPress: () => {
                        if (currentDay.completed) {
                            Alert.alert('Workout complete', 'Completed workouts cannot be moved.')
                            return
                        }
                        setMoveDate(selectedDate)
                        setShowMovePicker(true)
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ])
        }

        const handleAndroidDateChange = async (event: DateTimePickerEvent, nextDate?: Date) => {
            setShowMovePicker(false)
            if (event.type !== 'set' || !nextDate) return
            await handleMoveWorkout(nextDate)
        }

        const handleIOSConfirm = async () => {
            setShowMovePicker(false)
            await handleMoveWorkout(moveDate)
        }

        return (
            <ScrollView className='bg-background p-4'>
                {Platform.OS === 'android' && <View className='h-44' />}
                {Platform.OS === 'ios' && <View className='h-30' />}
                <View className="flex flex-row items-center justify-between mb-4">
                    <View className='flex-1 justify-center'>
                        <Text className='text-text-title font-bold text-xl'>
                            {currentDay ? `Week ${currentWeek} - Day ${currentDay.dayNumber}` : 'Rest Day'}
                        </Text>
                        <Text className='text-gray-500 text-md mt-1'>{program.programName.trim().split(' ').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')}</Text>
                    </View>
                    <View className='flex-row gap-x-2'>
                        <LiquidGlassButton icon={currentDay?.completed ? 'checkmark' : 'play'} iconSize={24} height={40} width={40} iconColor='green' onPress={handlePlayPress} />
                        <LiquidGlassButton icon='ellipsis-horizontal' iconSize={24} height={40} width={40} iconColor='gray' onPress={handleEllipsisPress} />
                    </View>
                </View>

                {showMovePicker && Platform.OS === 'ios' && (
                    <View className='mb-4 rounded-xl bg-day-card p-3'>
                        <DateTimePicker
                            value={moveDate}
                            mode='date'
                            display='inline'
                            onChange={(_, nextDate) => {
                                if (nextDate) setMoveDate(nextDate)
                            }}
                        />
                        <View className='flex-row justify-end gap-x-3 mt-2'>
                            <Pressable onPress={() => setShowMovePicker(false)}>
                                <Text className='text-gray-500 text-base'>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={handleIOSConfirm}>
                                <Text className='text-blue-500 text-base font-semibold'>Move</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {showMovePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                        value={moveDate}
                        mode='date'
                        display='default'
                        onChange={handleAndroidDateChange}
                    />
                )}

                {exercises.length > 0 ? (
                    <>
                        {exercises.map((exercise) => (
                        <WorkoutSchemeCard
                            key={exercise.exerciseNumber}
                            supersetId={(exercise.supersetGroup ?? '') + (exercise.supersetOrder ?? '')}
                            exerciseName={exercise.exerciseName}
                            reps={formatArray(exercise.reps)}
                            percent={formatArray(exercise.percent)}
                        />
                        ))}
                    </>
                    ) : (
                    <View className='py-8'>
                        <Text className='text-gray-500 text-center text-lg'>
                        No workout scheduled for {format(selectedDate, 'MMMM d, yyyy')}
                        </Text>
                    </View>
                )}

                {Platform.OS === 'android' &&
                    <View style={{ height: 250 }} /> 
                }
            </ScrollView>
        )
    }
}

export default WorkoutCard

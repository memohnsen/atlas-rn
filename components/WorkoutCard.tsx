import { Program } from '@/types/program'
import { getTrainingDayByDate } from '@/utils/programUtils'
import { format } from 'date-fns'
import { Platform, ScrollView, Text, View } from 'react-native'
import LiquidGlassButton from './LiquidGlassButton'
import WorkoutSchemeCard from './WorkoutSchemeCard'

interface WorkoutCardProps {
    program?: Program
    selectedDate: Date
}

const WorkoutCard = ({ program, selectedDate }: WorkoutCardProps) => {
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
                <View className='h-44'/>
                <View className='flex-1 justify-center items-center'>
                    <Text className='text-text-title'>Loading workout...</Text>
                </View>
            </>
        )
    } else if (!program) {
        return (
            <>
                <View className='h-44'/>
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

        return (
            <ScrollView className='bg-background p-4'>
                {Platform.OS === 'android' && <View className='h-44' />}
                {Platform.OS === 'ios' && <View className='h-30' />}
                <View className="flex flex-row items-center justify-between mb-4">
                    <View className='flex-1 justify-center'>
                        <Text className='text-text-title font-bold text-xl'>
                            {currentDay ? `Week ${currentWeek} - Day ${currentDay.dayNumber}` : 'Select a day'}
                        </Text>
                        <Text className='text-gray-500 text-md mt-1'>{program.programName.toUpperCase()}</Text>
                    </View>
                    <View className='flex-row gap-x-2'>
                        <LiquidGlassButton icon='checkmark' iconSize={24} height={40} width={40} iconColor='green' />
                        <LiquidGlassButton icon='ellipsis-horizontal' iconSize={24} height={40} width={40} iconColor='gray'/>
                    </View>
                </View>

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
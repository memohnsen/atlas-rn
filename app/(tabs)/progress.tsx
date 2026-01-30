import Header from '@/components/Header'
import ProgressCard from '@/components/ProgressCard'
import { Chip } from 'heroui-native'
import React from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const Progress = () => {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView className='flex-1 p-5 bg-background' contentContainerStyle={{ paddingBottom: 20 }} style={{ paddingTop: insets.top}}>
      <Header title="Lifting Progress" subtitle="Track your personal records" />

      <View className='flex-row gap-2 mt-6'>
        <Chip variant="primary" size="lg" className='h-8'>
          <Chip.Label>All Lifts</Chip.Label>
        </Chip>
        <Chip variant="soft" size="lg" className='h-8'>
          <Chip.Label>Olympic</Chip.Label>
        </Chip>
        <Chip variant="soft" size="lg" className='h-8'>
          <Chip.Label>Strength</Chip.Label>
        </Chip>
      </View>

      <ProgressCard exerciseName="Snatch" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Clean" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Jerk" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Clean and Jerk" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Back Squat" recentBest={120} pr={116}/>
      <ProgressCard exerciseName="Front Squat" recentBest={120} pr={116}/>
    </ScrollView>
  )
}

export default Progress
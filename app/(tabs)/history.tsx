import Header from '@/components/Header'
import HistoryCard from '@/components/HistoryCard'
import { Chip } from 'heroui-native'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'


const History = () => {
  return (
    <ScrollView className='flex-1 p-5 bg-background'>
      <Header title="Training History" subtitle="4 workouts completed" />

      <View className='flex-row gap-2 mt-6'>
        <Chip variant="primary" size="lg" className='h-8'>
          <Chip.Label>All</Chip.Label>
        </Chip>
        <Chip variant="soft" size="lg" className='h-8'>
          <Chip.Label>This Week</Chip.Label>
        </Chip>
        <Chip variant="soft" size="lg" className='h-8'>
          <Chip.Label>This Month</Chip.Label>
        </Chip>
      </View>

      <HistoryCard weekNum={1} dayNum={1} mainExercise="Snatch" day="19" month="JAN" />
      <HistoryCard weekNum={1} dayNum={2} mainExercise="Jerk" day="20" month="JAN" />
      <HistoryCard weekNum={1} dayNum={3} mainExercise="Clean" day="21" month="JAN" />
      <HistoryCard weekNum={1} dayNum={4} mainExercise="Clean and Jerk" day="22" month="JAN" />
      <HistoryCard weekNum={1} dayNum={2} mainExercise="Jerk" day="20" month="JAN" />
      <HistoryCard weekNum={1} dayNum={3} mainExercise="Clean" day="21" month="JAN" />
      <HistoryCard weekNum={1} dayNum={4} mainExercise="Clean and Jerk" day="22" month="JAN" />

      <Text className='mt-2'></Text>
    </ScrollView>
  )
}

export default History

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
})
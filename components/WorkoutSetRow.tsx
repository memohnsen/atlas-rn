import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface WorkoutSetRowProps {
    sets: number
    reps: number
    percent: number
}

const WorkoutSetRow = ({sets, reps, percent}: WorkoutSetRowProps) => {
  return (
    <View className='flex-row justify-between bg-card-background-secondary py-2 px-4 mt-3 rounded'>
        <Text className='text-white'>{sets}</Text>
        <Text className='text-white'>x</Text>
        <Text className='text-white'>{reps}</Text>
        <Text className='text-white'>@</Text>
        <Text className='text-text-primary font-bold'>{percent}%</Text>
    </View>
  )
}

export default WorkoutSetRow

const styles = StyleSheet.create({})
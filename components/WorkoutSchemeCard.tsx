import { Card, Divider } from 'heroui-native'
import React from 'react'
import { StyleSheet, View } from 'react-native'

interface WorkoutSchemeCardProps {
    exerciseName: string
    supersetId: string
    reps: string
    percent: string
}

const WorkoutSchemeCard = ({exerciseName, supersetId, reps, percent}: WorkoutSchemeCardProps) => {
  return (
    <View className='mb-4'>
      <Card>
        <Card.Title className='mb-2 text-xl font-bold'>{supersetId}. {exerciseName}</Card.Title>
        <Divider />
        <View className='bg-card-background-secondary py-2 px-4 mt-3 rounded'>
          <Card.Description className='text-blue-energy font-bold'>{reps} @ {percent}%</Card.Description>
        </View>
      </Card>
    </View>
  )
}

export default WorkoutSchemeCard

const styles = StyleSheet.create({})
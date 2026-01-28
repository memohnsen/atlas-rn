import { Card, Divider } from 'heroui-native'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import WorkoutSetRow from './WorkoutSetRow'

interface WorkoutSchemeCardProps {
    exerciseName: string
}

const WorkoutSchemeCard = ({exerciseName}: WorkoutSchemeCardProps) => {
  return (
    <View className='mb-4'>
      <Card>
        <Card.Title className='mb-2 text-xl font-bold'>{exerciseName}</Card.Title>
        <Divider />
        <WorkoutSetRow sets={1} reps={3} percent={60} />
        <WorkoutSetRow sets={1} reps={3} percent={65} />
        <WorkoutSetRow sets={1} reps={2} percent={70} />
        <WorkoutSetRow sets={1} reps={1} percent={75} />
        <WorkoutSetRow sets={1} reps={1} percent={80} />
        <WorkoutSetRow sets={1} reps={1} percent={85} />
      </Card>
    </View>
  )
}

export default WorkoutSchemeCard

const styles = StyleSheet.create({})
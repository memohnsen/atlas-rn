import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useColors } from '../../constants/colors'

const History = () => {
  const colors = useColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary }}>History</Text>
    </View>
  )
}

export default History

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
})
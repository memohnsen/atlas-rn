import Ionicons from '@expo/vector-icons/Ionicons'
import { GlassView } from 'expo-glass-effect'
import React from 'react'
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native'

interface LiquidGlassButtonProps {
    icon: string
    iconSize: number
    iconColor: string
    height: number
    width: number
}

const LiquidGlassButton = ({ icon, iconSize, height, width, iconColor }: LiquidGlassButtonProps) => {
  if (Platform.OS === 'ios') {
    return (
      <GlassView style={{height: height, width: width, borderRadius: 40, justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
          <TouchableOpacity className='justify-center items-center h-8 w-8 rounded-full'>
              <View className="flex-1 items-center justify-center">
                  <Ionicons name={icon} size={iconSize} color={iconColor} />
              </View>
          </TouchableOpacity>
      </GlassView>
    )
  }

  return (
    <View className='bg-day-card rounded-full justify-center align-center items-center' style={{height: height, width: width}}>
        <TouchableOpacity className='h-8 w-8'>
            <View className="flex-1 items-center justify-center">
                <Ionicons name={icon} size={iconSize} color={iconColor} />
            </View>
        </TouchableOpacity>
    </View>
  )
}

export default LiquidGlassButton

const styles = StyleSheet.create({})
import Ionicons from '@expo/vector-icons/Ionicons'
import { GlassView } from 'expo-glass-effect'
import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

interface LiquidGlassButtonProps {
    icon: string
    iconSize: number
    iconColor: string
    height: number
    width: number
}

const LiquidGlassButton = ({ icon, iconSize, height, width, iconColor }: LiquidGlassButtonProps) => {
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

export default LiquidGlassButton

const styles = StyleSheet.create({})
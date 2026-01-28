import React from 'react'
import { StyleSheet, Text } from 'react-native'

interface HeaderProps {
    title: string
    subtitle: string
}

const Header = ({title, subtitle}: HeaderProps) => {
  return (
    <>
        <Text className='text-text-title font-bold text-4xl'>{title}</Text>
        <Text className='text-gray-500 text-lg mt-2'>{subtitle}</Text>
    </>
  )
}

export default Header

const styles = StyleSheet.create({})
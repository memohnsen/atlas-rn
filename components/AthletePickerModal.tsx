import Ionicons from '@expo/vector-icons/Ionicons'
import React from 'react'
import { Modal, Pressable, ScrollView, Text } from 'react-native'

type AthletePickerModalProps = {
  visible: boolean
  athletes: string[]
  selectedAthlete: string | null
  onSelect: (athlete: string) => void
  onClose: () => void
}

const AthletePickerModal = ({
  visible,
  athletes,
  selectedAthlete,
  onSelect,
  onClose,
}: AthletePickerModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={onClose}>
        <Pressable
          className="rounded-2xl bg-card-background p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-text-title text-lg font-semibold mb-4">Select Athlete</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {athletes.map((athlete) => {
              const isSelected = athlete === selectedAthlete
              return (
                <Pressable
                  key={athlete}
                  onPress={() => {
                    onSelect(athlete)
                    onClose()
                  }}
                  className="flex-row items-center justify-between rounded-xl px-3 py-3 mb-2"
                  style={{ backgroundColor: isSelected ? 'rgba(83, 134, 228, 0.12)' : 'transparent' }}
                >
                  <Text className="text-text-title text-base font-medium">{athlete.charAt(0).toUpperCase() + athlete.slice(1)}</Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color="#5386E4" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={22} color="#8E8E93" />
                  )}
                </Pressable>
              )
            })}
            {athletes.length === 0 && (
              <Text className="text-gray-500 text-sm">No athletes found.</Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export default AthletePickerModal

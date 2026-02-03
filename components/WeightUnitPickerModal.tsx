import Ionicons from '@expo/vector-icons/Ionicons'
import React from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import type { WeightUnit } from './UnitProvider'

type WeightUnitPickerModalProps = {
  visible: boolean
  selectedUnit: WeightUnit
  onSelect: (unit: WeightUnit) => void
  onClose: () => void
}

const OPTIONS: { label: string; value: WeightUnit }[] = [
  { label: 'KG', value: 'kg' },
  { label: 'LB', value: 'lb' },
]

const WeightUnitPickerModal = ({
  visible,
  selectedUnit,
  onSelect,
  onClose,
}: WeightUnitPickerModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={onClose}>
        <Pressable
          className="rounded-2xl bg-card-background p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-text-title text-lg font-semibold mb-4">Weight Units</Text>
          {OPTIONS.map((option) => {
            const isSelected = option.value === selectedUnit
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value)
                  onClose()
                }}
                className="flex-row items-center justify-between rounded-xl px-3 py-3 mb-2"
                style={{ backgroundColor: isSelected ? 'rgba(83, 134, 228, 0.12)' : 'transparent' }}
              >
                <Text className="text-text-title text-base font-medium">{option.label}</Text>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color="#5386E4" />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color="#8E8E93" />
                )}
              </Pressable>
            )
          })}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export default WeightUnitPickerModal

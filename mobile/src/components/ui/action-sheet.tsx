import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { Icon, IconName } from './icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ActionSheetOption {
  label: string;
  value: string;
  icon?: IconName;
  color?: string;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  options: ActionSheetOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
  selectedValue?: string;
}

export function ActionSheet({
  visible,
  title,
  options,
  onSelect,
  onClose,
  selectedValue
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              return (
                <TouchableOpacity 
                  key={option.value}
                  style={[
                    styles.optionButton,
                    index !== options.length - 1 && styles.borderBottom,
                    isSelected && styles.selectedOption
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  {option.icon && (
                    <Icon 
                      name={option.icon} 
                      size={20} 
                      color={isSelected ? '#8b5cf6' : (option.color || '#a19bb0')} 
                      style={styles.icon}
                    />
                  )}
                  <Text style={[
                    styles.optionLabel, 
                    isSelected && styles.selectedLabel,
                    option.color ? { color: option.color } : null
                  ]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={20} color="#8b5cf6" style={styles.checkIcon} weight="bold" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Ləğv et</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '100%',
    backgroundColor: 'rgba(30, 25, 45, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  selectedOption: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  icon: {
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedLabel: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: '600',
  },
});

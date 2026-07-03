import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Icon, IconName } from '../ui/icon';
import { BlurView } from 'expo-blur';
import { useSettingsStore } from '../../store/settings.store';
import { useAppTheme } from '../../theme/ThemeProvider';

interface ThemeModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: any) => string;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ visible, onClose, t }) => {
  const { themeMode, setThemeMode } = useSettingsStore();
  const { theme, colors } = useAppTheme();

  const isLight = theme === 'light';

  const modes: { value: 'system' | 'light' | 'dark'; label: string; icon: IconName }[] = [
    { value: 'system', label: t('systemTheme') || 'System Default', icon: 'settings' },
    { value: 'light', label: t('lightTheme') || 'Light', icon: 'sun' },
    { value: 'dark', label: t('darkTheme') || 'Dark', icon: 'moon' },
  ];

  const handleSelect = (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }]}>
        <BlurView intensity={isLight ? 40 : 20} tint={isLight ? "light" : "dark"} style={StyleSheet.absoluteFill} />
        
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{t('theme') || 'Görünüş'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.list}>
            {modes.map((mode) => {
              const isActive = themeMode === mode.value;
              return (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.item,
                    { backgroundColor: colors.background.secondary, borderColor: colors.border.subtle },
                    isActive && { backgroundColor: colors.accent.secondary, borderColor: colors.accent.primary }
                  ]}
                  onPress={() => handleSelect(mode.value)}
                  activeOpacity={0.7}
                >
                  <Icon name={mode.icon} size={24} color={isActive ? colors.accent.primary : colors.text.secondary} style={styles.icon} />
                  <Text style={[styles.label, { color: colors.text.primary }, isActive && { color: colors.accent.primary, fontWeight: 'bold' }]}>
                    {mode.label}
                  </Text>
                  {isActive && <Icon name="check-circle" size={24} color={colors.accent.primary} weight="fill" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  icon: {
    marginRight: 16,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  }
});

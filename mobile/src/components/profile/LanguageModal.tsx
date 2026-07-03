import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Icon } from '../ui/icon';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useSettingsStore } from '../../store/settings.store';
import { LanguageCode } from '../../utils/i18n';

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: any) => string;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ visible, onClose, t }) => {
  const { language, setLanguage } = useSettingsStore();
  const { colors, theme } = useAppTheme();
  const isLight = theme === 'light';

  const languages: { code: LanguageCode; name: string; flag: string }[] = [
    { code: 'az', name: 'Azərbaycanca', flag: '🇦🇿' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }]}>
        <BlurView intensity={isLight ? 40 : 20} tint={isLight ? "light" : "dark"} style={StyleSheet.absoluteFill} />
        
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{t('language')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.list}>
            {languages.map((lang) => {
              const isActive = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.item,
                    { backgroundColor: colors.background.secondary, borderColor: colors.border.subtle },
                    isActive && { backgroundColor: colors.accent.secondary, borderColor: colors.accent.primary }
                  ]}
                  onPress={() => handleSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.flag, { opacity: isActive ? 1 : 0.7 }]}>{lang.flag}</Text>
                  <Text style={[
                    styles.langName, 
                    { color: colors.text.primary },
                    isActive && { color: colors.accent.primary, fontWeight: 'bold' }
                  ]}>
                    {lang.name}
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
  flag: {
    fontSize: 24,
    marginRight: 16,
  },
  langName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  activeText: {
    fontWeight: 'bold',
    color: '#8b5cf6',
  }
});

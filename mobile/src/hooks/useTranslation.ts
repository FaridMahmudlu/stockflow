import { useSettingsStore } from '../store/settings.store';
import { dictionaries, LanguageCode, TranslationKey } from '../utils/i18n';

export const useTranslation = () => {
  const language = useSettingsStore((state) => state.language) as LanguageCode;
  
  // Fallback to 'az' if language is somehow undefined
  const currentDict = dictionaries[language] || dictionaries['az'];

  const t = (key: TranslationKey): string => {
    return currentDict[key] || dictionaries['az'][key] || key;
  };

  return { t, language };
};

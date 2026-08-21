import { setDefaultOptions } from 'date-fns';
import { ar, enUS, fr, zhCN, type Locale } from 'date-fns/locale';
import type { LanguageCode } from './types';

const DATE_LOCALES: Record<LanguageCode, Locale> = {
  en: enUS,
  fr,
  ar,
  zh: zhCN,
};

export function dateFnsLocale(code: string): Locale {
  return DATE_LOCALES[code as LanguageCode] ?? enUS;
}

export function applyDateLocale(code: string) {
  setDefaultOptions({ locale: dateFnsLocale(code) });
}

export function intlLocale(code: string): string {
  switch (code) {
    case 'fr':
      return 'fr-FR';
    case 'ar':
      return 'ar-SA';
    case 'zh':
      return 'zh-CN';
    default:
      return 'en-US';
  }
}

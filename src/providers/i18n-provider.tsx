import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';
import { IntlProvider } from 'react-intl';
import {
  I18N_CONFIG_KEY,
  I18N_DEFAULT_LANGUAGE,
  I18N_LANGUAGES,
  languageFromStored,
} from '@/i18n/config';
import { applyDateLocale } from '@/i18n/date-locale';
import { I18nProviderProps, type Language } from '@/i18n/types';
import { getData, setData } from '@/lib/storage';

const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return I18N_DEFAULT_LANGUAGE;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');

  if (langParam) {
    const matchedLanguage = I18N_LANGUAGES.find((lang) => lang.code === langParam);
    if (matchedLanguage) {
      setData(I18N_CONFIG_KEY, matchedLanguage.code);
      applyDateLocale(matchedLanguage.code);
      return matchedLanguage;
    }
  }

  const stored = languageFromStored(getData(I18N_CONFIG_KEY)) ?? I18N_DEFAULT_LANGUAGE;
  applyDateLocale(stored.code);
  return stored;
};

const initialProps: I18nProviderProps = {
  currenLanguage: getInitialLanguage(),
  changeLanguage: (_: Language) => {},
  isRTL: () => false,
};

const TranslationsContext = createContext<I18nProviderProps>(initialProps);
const useLanguage = () => useContext(TranslationsContext);

const I18nProvider = ({ children }: PropsWithChildren) => {
  const [currenLanguage, setCurrenLanguage] = useState(initialProps.currenLanguage);

  const changeLanguage = (language: Language) => {
    setData(I18N_CONFIG_KEY, language.code);
    applyDateLocale(language.code);
    setCurrenLanguage(language);
  };

  const isRTL = () => currenLanguage.direction === 'rtl';

  useEffect(() => {
    applyDateLocale(currenLanguage.code);
    document.documentElement.setAttribute('dir', currenLanguage.direction);
    document.documentElement.setAttribute('lang', currenLanguage.code);
  }, [currenLanguage]);

  return (
    <TranslationsContext.Provider
      value={{
        isRTL,
        currenLanguage,
        changeLanguage,
      }}
    >
      <IntlProvider
        messages={currenLanguage.messages}
        locale={currenLanguage.code}
        defaultLocale={I18N_DEFAULT_LANGUAGE.code}
      >
        <RadixDirectionProvider dir={currenLanguage.direction}>
          {children}
        </RadixDirectionProvider>
      </IntlProvider>
    </TranslationsContext.Provider>
  );
};

export { I18nProvider, useLanguage };

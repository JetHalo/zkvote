import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "zh";

const STORAGE_KEY = "zkvote-console.language";
const DEFAULT_LANGUAGE: Language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE === "zh" ? "zh" : "en";

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const I18nContext = createContext<I18nContextValue>({
  language: "en",
  setLanguage: () => {},
});

const isLanguage = (value: string | null): value is Language => value === "en" || value === "zh";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

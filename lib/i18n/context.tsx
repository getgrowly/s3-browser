"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { tr } from "./locales/tr"
import { en } from "./locales/en"

type Locale = "tr" | "en"
type Translations = typeof tr

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations & ((key: string, params?: Record<string, string | number>) => string)
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const translations: Record<Locale, Translations> = {
  tr,
  en,
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    // Load saved locale from localStorage
    const savedLocale = localStorage.getItem("s3-browser-locale") as Locale
    if (savedLocale && (savedLocale === "tr" || savedLocale === "en")) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("s3-browser-locale", newLocale)
  }

  const tFunc = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".")
    let value: any = translations[locale]

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k]
      } else {
        console.warn(`Translation key not found: ${key}`)
        return key
      }
    }

    if (typeof value !== "string") {
      console.warn(`Translation value is not a string: ${key}`)
      return key
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return value
  }

  // Merge function with translation object for both usages: t('key') and t.update.download
  const t = Object.assign(tFunc, translations[locale])

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

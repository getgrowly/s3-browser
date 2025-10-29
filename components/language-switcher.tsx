"use client"

import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material"
import { useI18n } from "@/lib/i18n/context"
import { useState } from "react"

const languages = [
  { code: "tr" as const, name: "Türkçe", flag: "🇹🇷" },
  { code: "en" as const, name: "English", flag: "🇺🇸" },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLanguageSelect = (code: "tr" | "en") => {
    setLocale(code)
    handleClose()
  }

  const currentLanguage = languages.find((lang) => lang.code === locale)

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        title={t("common.language")}
        sx={{ color: 'text.primary', fontSize: '1.25rem' }}
      >
        {currentLanguage?.flag}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageSelect(language.code)}
            selected={locale === language.code}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {language.flag}
            </ListItemIcon>
            <ListItemText>{language.name}</ListItemText>
            {locale === language.code && <span style={{ marginLeft: 16 }}>✓</span>}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

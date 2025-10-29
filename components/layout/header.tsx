"use client"

import type React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Box, IconButton, Typography, AppBar, Toolbar } from "@mui/material"
import { LanguageSwitcher } from "@/components/language-switcher"

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <AppBar position="static" color="default" elevation={0}>
      <Toolbar sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Box flex={1}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Theme Toggle */}
          <IconButton size="small" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </IconButton>

          {/* Custom Actions */}
          {actions}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

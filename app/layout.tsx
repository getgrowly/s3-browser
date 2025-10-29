import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { I18nProvider } from "@/lib/i18n/context"
import { Providers } from "@/components/providers"
import { UpdateNotification } from "@/components/update-notification"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Growly S3",
  description: "Professional S3 Browser for AWS and S3-compatible storage services",
  generator: "v0.app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <I18nProvider>
            <ThemeProvider>
              {children}
              <UpdateNotification />
            </ThemeProvider>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  )
}

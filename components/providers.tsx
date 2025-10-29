"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { queryClient } from "@/lib/query-client"
import { ToastProvider } from "@/lib/toast-context"
import { EnhancedToastProvider } from "@/lib/enhanced-toast-context"
import { DownloadManagerProvider } from "@/lib/download-manager"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EnhancedToastProvider>
          <DownloadManagerProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </DownloadManagerProvider>
        </EnhancedToastProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}


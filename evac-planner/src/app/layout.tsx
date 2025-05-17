import type React from "react"
import "@/app/globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
  title: "Evacuation Planning System",
  description: "Interactive evacuation planning and route visualization system",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}

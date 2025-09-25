import { Inter as FontSans } from "next/font/google"

import { cn } from "@/lib/utils"
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import Provider from "./Provider"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'RTC Tool - Real-Time Collaborative Editor',
  description: 'Modern collaborative document editor with real-time features, version history, and persistent undo/redo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { 
          colorPrimary: "#3371FF" ,
          fontSize: '16px'
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen font-sans antialiased",
            fontSans.variable
          )}
        >
          <Provider>
            <ToastProvider>{children}</ToastProvider>
          </Provider>
        </body>
      </html>
    </ClerkProvider>
  )
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers/session-provider'
import { PerformanceMonitor } from '@/components/monitoring/PerformanceMonitor'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'New Andalus - Modern Editorial Platform',
  description: 'A modern editorial platform for content creation and publishing',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <PerformanceMonitor 
          enabled={process.env.NODE_ENV === 'production'} 
          debug={process.env.NODE_ENV === 'development'}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

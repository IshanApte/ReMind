import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ReMind - AI Memory System',
  description: 'AI with human-like memory dynamics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


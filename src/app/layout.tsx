import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Beyond RAG: Dynamic Memory That Adapts to Topic Flow',
  description: 'Zero down on topics in your book with dynamic memory that adapts to your learning flow',
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


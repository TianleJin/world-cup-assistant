import type { Metadata } from 'next'
import { Inter, Russo_One } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })
const russoOne = Russo_One({ subsets: ['latin'], weight: '400', variable: '--font-russo' })

export const metadata: Metadata = {
  title: 'FootyHQ — Football Tournament Assistant',
  description: 'Live scores, standings, news, and betting simulation across major football tournaments',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={russoOne.variable}>
      <body className={inter.className}>
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-600 mt-8">
          FootyHQ · Live data from football-data.org · Odds provided by Sportsbet · For entertainment only
        </footer>
      </body>
    </html>
  )
}

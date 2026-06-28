'use client'

import { useState } from 'react'

const MESSAGES: Record<string, string> = {
  bet_placed: 'Bet placed successfully! Good luck.',
  bet_cancelled: 'Bet cancelled and stake refunded.',
}

export default function SuccessBanner({ type }: { type: string }) {
  const [visible, setVisible] = useState(true)
  const message = MESSAGES[type]

  if (!visible || !message) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-green-900/40 border border-green-700 text-green-300 rounded-xl px-4 py-3 text-sm">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-green-500 hover:text-green-300 flex-shrink-0 text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

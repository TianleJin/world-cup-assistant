'use client'

import { useActionState, useState } from 'react'
import { placeBetAction } from '@/app/actions'
import type { OddsRow } from '@/types'

interface Props {
  odds: OddsRow
  balance: number
  preselection?: string
  tournamentSlug: string
}

export default function BetForm({ odds, balance, preselection, tournamentSlug }: Props) {
  const [state, action, pending] = useActionState(placeBetAction, null)
  const [selection, setSelection] = useState<'home' | 'draw' | 'away' | 'over' | 'under' | ''>(
    (preselection as 'home' | 'draw' | 'away' | 'over' | 'under') || ''
  )
  const [stake, setStake] = useState('')

  const matchDate = odds.commence_time.split('T')[0]

  const selectedOdds =
    selection === 'home' ? odds.home_odds
    : selection === 'away' ? odds.away_odds
    : selection === 'draw' ? odds.draw_odds
    : selection === 'over' ? odds.over_odds
    : selection === 'under' ? odds.under_odds
    : null

  const potentialReturn =
    selectedOdds && stake ? (parseFloat(stake) * selectedOdds).toFixed(2) : null
  const potentialProfit =
    selectedOdds && stake
      ? ((parseFloat(stake) * selectedOdds) - parseFloat(stake)).toFixed(2)
      : null

  const selectionLabel =
    selection === 'home' ? odds.home_team
    : selection === 'away' ? odds.away_team
    : selection === 'draw' ? 'Draw'
    : selection === 'over' ? 'Over 2.5 goals'
    : selection === 'under' ? 'Under 2.5 goals'
    : ''

  return (
    <form action={action} className="space-y-5">
      {/* Hidden fields */}
      <input type="hidden" name="tournament" value={tournamentSlug} />
      <input type="hidden" name="odds_match_id" value={odds.match_id} />
      <input type="hidden" name="home_team" value={odds.home_team} />
      <input type="hidden" name="away_team" value={odds.away_team} />
      <input type="hidden" name="match_date" value={matchDate} />
      <input type="hidden" name="commence_time" value={odds.commence_time} />
      <input type="hidden" name="selection" value={selection} />
      <input type="hidden" name="odds" value={selectedOdds?.toString() ?? ''} />

      {/* Match winner buttons */}
      <div>
        <p className="text-sm text-slate-400 mb-2">Match winner</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: 'home', label: odds.home_team, price: odds.home_odds },
              { key: 'draw', label: 'Draw', price: odds.draw_odds },
              { key: 'away', label: odds.away_team, price: odds.away_odds },
            ] as const
          ).map(({ key, label, price }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelection(key)}
              disabled={!price}
              className={`rounded-lg p-3 text-center border transition-colors ${
                selection === key
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="text-xs truncate">{label}</div>
              <div className="font-bold mt-0.5">{price?.toFixed(2) ?? '—'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Over/under buttons */}
      {(odds.over_odds || odds.under_odds) && (
        <div>
          <p className="text-sm text-slate-400 mb-2">Total goals</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'over', label: 'Over 2.5', price: odds.over_odds },
                { key: 'under', label: 'Under 2.5', price: odds.under_odds },
              ] as const
            ).map(({ key, label, price }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelection(key)}
                disabled={!price}
                className={`rounded-lg p-3 text-center border transition-colors ${
                  selection === key
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="text-xs">{label}</div>
                <div className="font-bold mt-0.5">{price?.toFixed(2) ?? '—'}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stake */}
      <div>
        <label className="text-sm text-slate-400 block mb-2">
          Stake (balance: ${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })})
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="text"
            inputMode="numeric"
            name="stake"
            value={stake}
            onChange={(e) => setStake(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-7 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        {/* Quick stake buttons */}
        <div className="flex gap-2 mt-2">
          {[10, 50, 100, 500].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setStake(String(Math.min(amount, balance)))}
              className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md py-1.5 text-slate-300 transition-colors"
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {selection && stake && parseFloat(stake) > 0 && selectedOdds && (
        <div className="bg-slate-700/50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between text-slate-300">
            <span>Selection</span>
            <span className="font-medium">{selectionLabel} @ {selectedOdds.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Stake</span>
            <span>${parseFloat(stake).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-white border-t border-slate-600 pt-1 mt-1">
            <span>Potential return</span>
            <span className="text-amber-400">${potentialReturn}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Potential profit</span>
            <span className="text-amber-500">+${potentialProfit}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {state?.error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending || !selection || !stake || parseFloat(stake) < 1}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {pending ? 'Placing bet...' : 'Place Bet'}
      </button>

      <p className="text-xs text-slate-500 text-center">
        This is a simulation — no real money involved.
      </p>
    </form>
  )
}

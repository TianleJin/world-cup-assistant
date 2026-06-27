'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface BetFormState {
  error?: string
}

export async function placeBetAction(
  _prev: BetFormState | null,
  formData: FormData
): Promise<BetFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const oddsMatchId = formData.get('odds_match_id') as string
  const homeTeam = formData.get('home_team') as string
  const awayTeam = formData.get('away_team') as string
  const matchDate = formData.get('match_date') as string
  const commenceTime = formData.get('commence_time') as string
  const selection = formData.get('selection') as 'home' | 'draw' | 'away'
  const oddsStr = formData.get('odds') as string
  const stakeStr = formData.get('stake') as string

  const odds = parseFloat(oddsStr)
  const stake = parseFloat(stakeStr)

  if (!selection || !['home', 'draw', 'away'].includes(selection)) {
    return { error: 'Please select a result to bet on.' }
  }
  if (isNaN(stake) || stake < 1) {
    return { error: 'Minimum stake is $1.' }
  }
  if (stake > 50000) {
    return { error: 'Maximum stake is $50,000.' }
  }
  if (isNaN(odds) || odds < 1) {
    return { error: 'Invalid odds.' }
  }

  const { error } = await supabase.rpc('place_bet', {
    p_user_id: user.id,
    p_odds_match_id: oddsMatchId,
    p_home_team: homeTeam,
    p_away_team: awayTeam,
    p_match_date: matchDate,
    p_commence_time: commenceTime || null,
    p_selection: selection,
    p_odds: odds,
    p_stake: stake,
  })

  if (error) {
    if (error.message.includes('Insufficient balance')) {
      return { error: 'Insufficient balance. Add more funds or reduce your stake.' }
    }
    return { error: error.message }
  }

  revalidatePath('/account')
  revalidatePath('/')
  redirect('/account')
}

export async function cancelBetAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const betId = formData.get('bet_id') as string

  await supabase.rpc('cancel_bet', {
    p_bet_id: betId,
    p_user_id: user.id,
  })

  revalidatePath('/account')
  revalidatePath('/')
}

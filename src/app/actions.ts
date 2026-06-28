'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  if (!selection || !['home', 'draw', 'away', 'over', 'under'].includes(selection)) {
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
  redirect(`/bet/${oddsMatchId}?success=bet_placed`)
}

export async function changePasswordAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const oldPassword = formData.get('old_password') as string
  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (newPassword.length < 6) return { error: 'Password must be at least 6 characters.' }
  if (newPassword !== confirmPassword) return { error: 'Passwords do not match.' }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: oldPassword,
  })
  if (authError) return { error: 'Current password is incorrect.' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

export async function deleteAccountAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const password = formData.get('password') as string
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  })
  if (authError) return { error: 'Incorrect password.' }

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(user.id)
  await supabase.auth.signOut()
  redirect('/')
}

export async function cancelBetAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const betId = formData.get('bet_id') as string
  const redirectTo = (formData.get('redirect_to') as string | null) ?? '/account'

  await supabase.rpc('cancel_bet', {
    p_bet_id: betId,
    p_user_id: user.id,
  })

  revalidatePath('/account')
  revalidatePath('/')
  redirect(`${redirectTo}?success=bet_cancelled`)
}

'use client'

import { useActionState, useState } from 'react'
import { changePasswordAction, deleteAccountAction } from '@/app/actions'

export default function SettingsSection() {
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, null)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccountAction, null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Settings</h2>
      <div className="space-y-2">

        {/* Change password */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
          >
            <span className="text-sm font-medium text-slate-200">Change Password</span>
            <span className="text-slate-500 text-xs">{showPassword ? '▲' : '▼'}</span>
          </button>
          {showPassword && (
            <div className="px-4 pb-4 border-t border-slate-700 pt-4">
              <form action={passwordAction} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Current password</label>
                  <input
                    type="password"
                    name="old_password"
                    required
                    placeholder="Your current password"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">New password</label>
                  <input
                    type="password"
                    name="new_password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Confirm new password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                {passwordState?.error && (
                  <p className="text-xs text-red-400">{passwordState.error}</p>
                )}
                {passwordState?.success && (
                  <p className="text-xs text-green-400">Password updated successfully.</p>
                )}
                <button
                  type="submit"
                  disabled={passwordPending}
                  className="text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {passwordPending ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Delete account */}
        <div className="bg-slate-800 border border-red-900/40 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDelete(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
          >
            <span className="text-sm font-medium text-red-400">Delete Account</span>
            <span className="text-slate-500 text-xs">{showDelete ? '▲' : '▼'}</span>
          </button>
          {showDelete && (
            <div className="px-4 pb-4 border-t border-red-900/40 pt-4">
              <p className="text-xs text-slate-400 mb-3">
                Permanently deletes your account, all bets, and your balance. This cannot be undone.
              </p>
              <form action={deleteAction} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Enter your password"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Type <span className="text-white font-mono">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                {deleteState?.error && (
                  <p className="text-xs text-red-400">{deleteState.error}</p>
                )}
                <button
                  type="submit"
                  disabled={deleteConfirm !== 'DELETE' || deletePending}
                  className="text-sm bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {deletePending ? 'Deleting...' : 'Delete my account'}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}

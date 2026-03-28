'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase auto-processes the hash token on page load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION') && session) {
        setSessionReady(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.replace('/portal'), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Image src="/logo.png" alt="PropEase" width={48} height={48} className="rounded-lg object-contain" />
          <span className="font-bold text-xl text-gray-900">PropEase</span>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle size={52} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">All set!</h2>
            <p className="text-sm text-gray-400">Taking you to your portal...</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Create your password</h1>
            <p className="text-sm text-gray-400 text-center mb-6">
              Set a password to access your tenant portal
            </p>

            {!sessionReady && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-center">
                <p className="text-sm text-blue-700">Processing invite link...</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Set Password & Enter Portal'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  )
}

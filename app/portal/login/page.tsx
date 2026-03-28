'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/portal')
    })
  }, [])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Invalid email or password.')
      return
    }
    router.replace(params.get('redirect') ?? '/portal')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Image src="/logo.png" alt="PropEase" width={48} height={48} className="rounded-lg object-contain" />
          <span className="font-bold text-xl text-gray-900">PropEase</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Tenant Portal</h1>
        <p className="text-sm text-gray-400 text-center mb-6">Sign in to manage your tenancy</p>

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-6">
          Access is by invitation only. Contact your property manager.
        </p>
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

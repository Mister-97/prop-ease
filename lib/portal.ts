import { supabase } from './supabase'

export async function getPortalTenant() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const res = await fetch('/api/portal/me', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  })
  if (!res.ok) return null
  return res.json()
}

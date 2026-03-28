import { supabase } from './supabase'

export async function getPortalTenant() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, units(unit_number, rent_amount, bedrooms, bathrooms, properties(name, address, city, state))')
    .eq('auth_user_id', user.id)
    .single()

  return tenant
}

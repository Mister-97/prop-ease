import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Returns the tenant record for the currently logged-in portal user
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the JWT and get the user
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*, units(unit_number, rent_amount, bedrooms, bathrooms, properties(name, address, city, state))')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Fetch rent status and open maintenance count alongside tenant
  const monthStr = new Date().toISOString().slice(0, 7)
  const [rentRes, maintRes] = await Promise.all([
    supabaseAdmin.from('rent_payments')
      .select('*')
      .eq('tenant_id', tenant.id)
      .gte('due_date', `${monthStr}-01`)
      .lte('due_date', `${monthStr}-31`)
      .maybeSingle(),
    supabaseAdmin.from('maintenance_requests')
      .select('id', { count: 'exact', head: true })
      .eq('unit_id', tenant.unit_id)
      .neq('status', 'completed'),
  ])

  return NextResponse.json({
    ...tenant,
    _rentStatus: rentRes.data ?? null,
    _openRequests: maintRes.count ?? 0,
  })
}

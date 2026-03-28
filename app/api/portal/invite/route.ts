import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { tenantId, email, name } = await req.json()
  if (!tenantId || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Create or invite the user in Supabase Auth
  const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://prop-ease.vercel.app'}/portal/set-password`,
    data: { role: 'tenant', name },
  })

  if (error && !error.message.includes('already been registered')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If user already exists, look them up
  let userId = invited?.user?.id
  if (!userId) {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const existing = users?.users?.find((u: any) => u.email === email)
    userId = existing?.id
  }

  if (userId) {
    await supabaseAdmin.from('tenants').update({ auth_user_id: userId }).eq('id', tenantId)
  }

  return NextResponse.json({ ok: true })
}

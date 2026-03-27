import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Property = {
  id: string
  user_id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  photo_url: string | null
  notes: string | null
  created_at: string
  units?: Unit[]
}

export type Unit = {
  id: string
  property_id: string
  unit_number: string
  rent_amount: number
  is_occupied: boolean
  created_at: string
  tenants?: Tenant[]
}

export type Tenant = {
  id: string
  unit_id: string
  name: string
  email: string
  phone: string
  lease_start: string
  lease_end: string
  created_at: string
}

export type MaintenanceRequest = {
  id: string
  unit_id: string
  property_id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  photo_url: string | null
  vendor_name: string | null
  created_at: string
  updated_at: string
  units?: Unit & { properties?: Property }
}

export type Vendor = {
  id: string
  user_id: string
  name: string
  specialty: string
  phone: string
  email: string
  notes: string | null
  created_at: string
}

export type Expense = {
  id: string
  property_id: string
  unit_id: string | null
  amount: number
  description: string
  category: string
  date: string
  receipt_url: string | null
  created_at: string
  properties?: Property
}

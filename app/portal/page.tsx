'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPortalTenant } from '@/lib/portal'
import PortalShell from '@/components/PortalShell'
import { format, differenceInDays } from 'date-fns'
import { Home, Calendar, DollarSign, Wrench, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function PortalHome() {
  const [tenant, setTenant] = useState<any>(null)
  const [rentStatus, setRentStatus] = useState<any>(null)
  const [openRequests, setOpenRequests] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const t = await getPortalTenant()
      if (!t) { router.replace('/portal/login'); return }
      setTenant(t)

      const monthStr = new Date().toISOString().slice(0, 7)
      const [rent, maint] = await Promise.all([
        supabase.from('rent_payments')
          .select('*')
          .eq('tenant_id', t.id)
          .gte('due_date', `${monthStr}-01`)
          .lte('due_date', `${monthStr}-31`)
          .single(),
        supabase.from('maintenance_requests')
          .select('id', { count: 'exact' })
          .eq('unit_id', t.unit_id)
          .neq('status', 'completed'),
      ])
      setRentStatus(rent.data)
      setOpenRequests(maint.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !tenant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const daysLeft = tenant.lease_end ? differenceInDays(new Date(tenant.lease_end), new Date()) : null
  const isPaid = rentStatus?.status === 'paid'

  return (
    <PortalShell tenantName={tenant.name}>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hi, {tenant.name.split(' ')[0]}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Unit card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Home size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tenant.units?.properties?.name}</p>
            <p className="text-sm text-gray-400">Unit {tenant.units?.unit_number} · {tenant.units?.bedrooms}bd {tenant.units?.bathrooms}ba</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <span>{tenant.units?.properties?.address}{tenant.units?.properties?.city ? `, ${tenant.units.properties.city}` : ''}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Rent status */}
        <div className={`rounded-2xl p-4 border ${isPaid ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {isPaid ? <CheckCircle size={16} className="text-green-600" /> : <DollarSign size={16} className="text-orange-500" />}
            <p className="text-xs font-semibold text-gray-600">Rent — {format(new Date(), 'MMMM')}</p>
          </div>
          <p className={`text-xl font-bold ${isPaid ? 'text-green-700' : 'text-orange-600'}`}>
            {isPaid ? 'Paid' : 'Due'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">${Number(tenant.units?.rent_amount ?? 0).toLocaleString()}/mo</p>
        </div>

        {/* Lease */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-blue-500" />
            <p className="text-xs font-semibold text-gray-600">Lease</p>
          </div>
          {tenant.lease_end ? (
            <>
              <p className={`text-xl font-bold ${daysLeft !== null && daysLeft <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                {daysLeft !== null && daysLeft < 0 ? 'Expired' : daysLeft !== null ? `${daysLeft}d left` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Ends {format(new Date(tenant.lease_end), 'MMM d, yyyy')}</p>
            </>
          ) : <p className="text-sm text-gray-400">No end date</p>}
        </div>
      </div>

      {/* Open maintenance */}
      {openRequests > 0 && (
        <Link href="/portal/maintenance" className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 hover:bg-yellow-100 transition-colors">
          <Clock size={18} className="text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">{openRequests} open maintenance request{openRequests > 1 ? 's' : ''}</p>
            <p className="text-xs text-yellow-600">Tap to view status</p>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/portal/maintenance" className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
          <Wrench size={20} className="text-blue-600 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Request Repair</p>
          <p className="text-xs text-gray-400 mt-0.5">Submit a maintenance request</p>
        </Link>
        <Link href="/portal/messages" className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
          <DollarSign size={20} className="text-green-600 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Pay Rent</p>
          <p className="text-xs text-gray-400 mt-0.5">Coming soon — online payments</p>
        </Link>
      </div>
    </PortalShell>
  )
}

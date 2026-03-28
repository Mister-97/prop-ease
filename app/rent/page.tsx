'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, CheckCircle, Circle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'

export default function RentPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const monthStr = format(month, 'yyyy-MM')
    const [t, p] = await Promise.all([
      supabase.from('tenants')
        .select('*, units(unit_number, rent_amount, properties(name, id))')
        .order('name'),
      supabase.from('rent_payments')
        .select('*')
        .gte('due_date', `${monthStr}-01`)
        .lte('due_date', `${monthStr}-31`),
    ])
    setTenants(t.data ?? [])
    setPayments(p.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [month])

  function getPayment(tenantId: string) {
    return payments.find(p => p.tenant_id === tenantId)
  }

  async function togglePaid(tenant: any) {
    setSaving(tenant.id)
    const existing = getPayment(tenant.id)
    const dueDate = format(month, 'yyyy-MM') + '-01'
    const amount = Number(tenant.units?.rent_amount ?? 0)

    if (existing) {
      if (existing.status === 'paid') {
        await supabase.from('rent_payments').update({ status: 'unpaid', paid_date: null }).eq('id', existing.id)
      } else {
        await supabase.from('rent_payments').update({ status: 'paid', paid_date: format(new Date(), 'yyyy-MM-dd') }).eq('id', existing.id)
      }
    } else {
      await supabase.from('rent_payments').insert({
        tenant_id: tenant.id,
        unit_id: tenant.unit_id,
        property_id: tenant.units?.properties?.id,
        amount,
        due_date: dueDate,
        status: 'paid',
        paid_date: format(new Date(), 'yyyy-MM-dd'),
      })
    }
    setSaving(null)
    load()
  }

  const paid = tenants.filter(t => getPayment(t.id)?.status === 'paid')
  const unpaid = tenants.filter(t => getPayment(t.id)?.status !== 'paid')
  const totalDue = tenants.reduce((s, t) => s + Number(t.units?.rent_amount ?? 0), 0)
  const totalCollected = paid.reduce((s, t) => s + Number(t.units?.rent_amount ?? 0), 0)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rent Tracker</h1>
          <p className="text-gray-500 mt-1">Track monthly rent payments</p>
        </div>
        {/* Month picker */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="text-gray-400 hover:text-gray-700">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-28 text-center">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="text-gray-400 hover:text-gray-700">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Collected</p>
          <p className="text-2xl font-bold text-green-600">${totalCollected.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">{paid.length} of {tenants.length} tenants</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-orange-500">${(totalDue - totalCollected).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">{unpaid.length} tenant{unpaid.length !== 1 ? 's' : ''} unpaid</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Expected</p>
          <p className="text-2xl font-bold text-gray-900">${totalDue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">{Math.round(totalDue > 0 ? (totalCollected / totalDue) * 100 : 0)}% collected</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />)}</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <DollarSign size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tenants yet</p>
          <p className="text-sm mt-1">Add tenants through a property's unit page</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Unpaid first */}
          {unpaid.length > 0 && (
            <div className="mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Unpaid ({unpaid.length})</p>
              {unpaid.map(t => (
                <TenantRow key={t.id} tenant={t} payment={getPayment(t.id)} saving={saving === t.id} onToggle={() => togglePaid(t)} />
              ))}
            </div>
          )}
          {paid.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Paid ({paid.length})</p>
              {paid.map(t => (
                <TenantRow key={t.id} tenant={t} payment={getPayment(t.id)} saving={saving === t.id} onToggle={() => togglePaid(t)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TenantRow({ tenant, payment, saving, onToggle }: {
  tenant: any; payment: any; saving: boolean; onToggle: () => void
}) {
  const isPaid = payment?.status === 'paid'
  const amount = Number(tenant.units?.rent_amount ?? 0)

  return (
    <div className={`flex items-center justify-between bg-white border rounded-xl px-4 py-3 mb-2 transition-colors ${isPaid ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {tenant.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
          <p className="text-xs text-gray-400">
            {tenant.units?.properties?.name} · Unit {tenant.units?.unit_number}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">${amount.toLocaleString()}</p>
          {isPaid && payment?.paid_date && (
            <p className="text-xs text-green-600">Paid {format(new Date(payment.paid_date), 'MMM d')}</p>
          )}
        </div>
        <button
          onClick={onToggle}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isPaid
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
          } disabled:opacity-50`}
        >
          {isPaid ? <CheckCircle size={13} /> : <Circle size={13} />}
          {saving ? '...' : isPaid ? 'Paid' : 'Mark Paid'}
        </button>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPortalTenant } from '@/lib/portal'
import PortalShell from '@/components/PortalShell'
import { DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export default function PortalPayments() {
  const [tenant, setTenant] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const t = await getPortalTenant()
      if (!t) { router.replace('/portal/login'); return }
      setTenant(t)
      const { data } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', t.id)
        .order('due_date', { ascending: false })
      setPayments(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !tenant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalOwed = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount) + Number(p.late_fee ?? 0), 0)

  return (
    <PortalShell tenantName={tenant.name}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Unit {tenant.units?.unit_number} · ${Number(tenant.units?.rent_amount ?? 0).toLocaleString()}/mo
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-green-700 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-700">${totalPaid.toLocaleString()}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${totalOwed > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-semibold mb-1 ${totalOwed > 0 ? 'text-orange-700' : 'text-gray-500'}`}>Balance Due</p>
          <p className={`text-2xl font-bold ${totalOwed > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
            ${totalOwed.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Ledger */}
      {payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payment records yet</p>
          <p className="text-sm mt-1">Your landlord will add rent records here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {p.status === 'paid'
                    ? <CheckCircle size={16} className="text-green-500" />
                    : p.status === 'late'
                    ? <AlertTriangle size={16} className="text-orange-500" />
                    : <Clock size={16} className="text-gray-400" />}
                  <span className="text-sm font-semibold text-gray-900">
                    {format(new Date(p.due_date), 'MMMM yyyy')} Rent
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${p.status === 'paid' ? 'text-green-700' : 'text-orange-600'}`}>
                    ${Number(p.amount).toLocaleString()}
                  </p>
                  {p.late_fee > 0 && (
                    <p className="text-xs text-orange-500">+${Number(p.late_fee).toFixed(2)} fee</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Due {format(new Date(p.due_date), 'MMM d, yyyy')}</span>
                {p.paid_date
                  ? <span className="text-green-600 font-medium">Paid {format(new Date(p.paid_date), 'MMM d, yyyy')}</span>
                  : <span className={`px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'late' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>{p.status === 'late' ? 'Overdue' : 'Unpaid'}</span>
                }
              </div>
              {p.notes && <p className="text-xs text-gray-400 mt-2 italic">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  )
}

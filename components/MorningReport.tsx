'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sun, X, AlertTriangle, Wrench, DollarSign, Calendar } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'

export default function MorningReport() {
  const [show, setShow] = useState(false)
  const [data, setData] = useState<{
    expiringLeases: any[]
    openMaintenance: any[]
    urgentMaintenance: any[]
    monthExpenses: number
    vacantUnits: any[]
  } | null>(null)

  useEffect(() => {
    const key = 'propease_report_date'
    const today = new Date().toDateString()
    const last = localStorage.getItem(key)
    if (last === today) return // already shown today

    async function fetchData() {
      const now = new Date()
      const in60 = new Date(); in60.setDate(now.getDate() + 60)

      const [tenants, maintenance, expenses, units] = await Promise.all([
        supabase.from('tenants').select('*, units(unit_number, properties(name))'),
        supabase.from('maintenance_requests').select('*, properties(name), units(unit_number)').neq('status', 'completed'),
        supabase.from('expenses').select('amount, date'),
        supabase.from('units').select('unit_number, properties(name)').eq('is_occupied', false),
      ])

      const expiringLeases = (tenants.data ?? []).filter(t => {
        if (!t.lease_end) return false
        const d = differenceInDays(new Date(t.lease_end), now)
        return d >= 0 && d <= 60
      }).sort((a, b) => new Date(a.lease_end).getTime() - new Date(b.lease_end).getTime())

      const monthStr = now.toISOString().slice(0, 7)
      const monthExpenses = (expenses.data ?? [])
        .filter(e => e.date?.startsWith(monthStr))
        .reduce((s, e) => s + Number(e.amount), 0)

      setData({
        expiringLeases,
        openMaintenance: (maintenance.data ?? []).filter(m => m.priority !== 'urgent'),
        urgentMaintenance: (maintenance.data ?? []).filter(m => m.priority === 'urgent'),
        monthExpenses,
        vacantUnits: units.data ?? [],
      })
      setShow(true)
      localStorage.setItem(key, today)
    }

    fetchData()
  }, [])

  if (!show || !data) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dayName = format(new Date(), 'EEEE, MMMM d')

  const hasAlerts = data.urgentMaintenance.length > 0 || data.expiringLeases.filter(t => differenceInDays(new Date(t.lease_end), new Date()) <= 30).length > 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 relative">
          <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sun size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{greeting}</p>
              <p className="text-blue-100 text-sm">{dayName} — daily summary</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Urgent maintenance */}
          {data.urgentMaintenance.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-red-500" />
                <p className="text-sm font-semibold text-red-700">Urgent Maintenance ({data.urgentMaintenance.length})</p>
              </div>
              {data.urgentMaintenance.map(m => (
                <p key={m.id} className="text-xs text-red-600 mt-1">
                  • {m.title} — {m.properties?.name}{m.units?.unit_number ? ` Unit ${m.units.unit_number}` : ''}
                </p>
              ))}
            </div>
          )}

          {/* Expiring leases */}
          {data.expiringLeases.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={15} className="text-orange-500" />
                <p className="text-sm font-semibold text-orange-700">Leases Expiring Soon ({data.expiringLeases.length})</p>
              </div>
              {data.expiringLeases.slice(0, 5).map(t => {
                const days = differenceInDays(new Date(t.lease_end), new Date())
                return (
                  <p key={t.id} className="text-xs text-orange-700 mt-1">
                    • {t.name} — {t.units?.properties?.name} Unit {t.units?.unit_number}
                    <span className={`ml-1 font-medium ${days <= 30 ? 'text-red-600' : ''}`}>
                      ({days}d left)
                    </span>
                  </p>
                )
              })}
            </div>
          )}

          {/* Open maintenance */}
          {data.openMaintenance.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wrench size={15} className="text-yellow-600" />
                <p className="text-sm font-semibold text-yellow-700">{data.openMaintenance.length} Open Maintenance Request{data.openMaintenance.length !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-xs text-yellow-600">
                {data.openMaintenance.filter(m => m.status === 'open').length} open · {data.openMaintenance.filter(m => m.status === 'in_progress').length} in progress
              </p>
            </div>
          )}

          {/* Expenses */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={15} className="text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">This Month's Expenses</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">${data.monthExpenses.toLocaleString()}</p>
          </div>

          {/* Vacant units */}
          {data.vacantUnits.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-700 mb-1">{data.vacantUnits.length} Vacant Unit{data.vacantUnits.length !== 1 ? 's' : ''}</p>
              {data.vacantUnits.slice(0, 4).map((u: any, i) => (
                <p key={i} className="text-xs text-blue-600">• {u.properties?.name} — Unit {u.unit_number}</p>
              ))}
            </div>
          )}

          {/* All clear */}
          {!hasAlerts && data.openMaintenance.length === 0 && data.expiringLeases.length === 0 && (
            <div className="text-center py-4">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-gray-700">All clear — no urgent items today.</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={() => setShow(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Let's go
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, AlertTriangle, Wrench, Calendar, CheckCircle, TrendingUp, Home, Users, ArrowRight } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import Link from 'next/link'

export default function MorningReport() {
  const [show, setShow] = useState(false)
  const [data, setData] = useState<{
    expiringLeases: any[]
    urgentMaintenance: any[]
    openMaintenance: any[]
    vacantUnits: any[]
    totalUnits: number
    occupiedUnits: number
    monthlyRevenue: number
    monthExpenses: number
    totalProperties: number
  } | null>(null)

  useEffect(() => {
    const key = 'propease_report_date'
    const today = new Date().toDateString()
    if (localStorage.getItem(key) === today) return

    async function fetchData() {
      const now = new Date()
      const monthStr = now.toISOString().slice(0, 7)
      const in60 = new Date(now); in60.setDate(now.getDate() + 60)

      const [tenants, maintenance, expenses, units, properties] = await Promise.all([
        supabase.from('tenants').select('*, units(unit_number, properties(name, id))'),
        supabase.from('maintenance_requests').select('*, properties(name), units(unit_number)').neq('status', 'completed').order('created_at', { ascending: false }),
        supabase.from('expenses').select('amount, date'),
        supabase.from('units').select('unit_number, is_occupied, rent_amount, properties(name)'),
        supabase.from('properties').select('id'),
      ])

      const allUnits = units.data ?? []
      const occupied = allUnits.filter(u => u.is_occupied)
      const monthlyRevenue = occupied.reduce((s, u) => s + Number(u.rent_amount), 0)
      const monthExpenses = (expenses.data ?? [])
        .filter(e => e.date?.startsWith(monthStr))
        .reduce((s, e) => s + Number(e.amount), 0)

      const expiringLeases = (tenants.data ?? [])
        .filter(t => {
          if (!t.lease_end) return false
          const d = differenceInDays(new Date(t.lease_end), now)
          return d >= 0 && d <= 60
        })
        .sort((a, b) => new Date(a.lease_end).getTime() - new Date(b.lease_end).getTime())

      const allMaintenance = maintenance.data ?? []

      setData({
        expiringLeases,
        urgentMaintenance: allMaintenance.filter(m => m.priority === 'urgent'),
        openMaintenance: allMaintenance.filter(m => m.priority !== 'urgent'),
        vacantUnits: allUnits.filter(u => !u.is_occupied),
        totalUnits: allUnits.length,
        occupiedUnits: occupied.length,
        monthlyRevenue,
        monthExpenses,
        totalProperties: properties.data?.length ?? 0,
      })
      setShow(true)
      localStorage.setItem(key, today)
    }

    fetchData()
  }, [])

  if (!show || !data) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const occupancyRate = data.totalUnits > 0 ? Math.round((data.occupiedUnits / data.totalUnits) * 100) : 0
  const net = data.monthlyRevenue - data.monthExpenses

  const priorities: { color: string; icon: any; label: string; detail: string; href: string }[] = []

  if (data.urgentMaintenance.length > 0) {
    priorities.push({
      color: 'bg-red-50 border-red-200 text-red-700',
      icon: AlertTriangle,
      label: `${data.urgentMaintenance.length} urgent maintenance request${data.urgentMaintenance.length > 1 ? 's' : ''}`,
      detail: data.urgentMaintenance.slice(0, 2).map(m => m.title).join(', ') + (data.urgentMaintenance.length > 2 ? '...' : ''),
      href: '/maintenance',
    })
  }

  const soonLeases = data.expiringLeases.filter(t => differenceInDays(new Date(t.lease_end), new Date()) <= 30)
  if (soonLeases.length > 0) {
    priorities.push({
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      icon: Calendar,
      label: `${soonLeases.length} lease${soonLeases.length > 1 ? 's' : ''} expiring within 30 days`,
      detail: soonLeases.slice(0, 2).map(t => `${t.name} (${differenceInDays(new Date(t.lease_end), new Date())}d)`).join(', '),
      href: '/tenants',
    })
  }

  if (data.vacantUnits.length > 0) {
    priorities.push({
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      icon: Home,
      label: `${data.vacantUnits.length} vacant unit${data.vacantUnits.length > 1 ? 's' : ''} — losing potential revenue`,
      detail: data.vacantUnits.slice(0, 3).map((u: any) => `${u.properties?.name} Unit ${u.unit_number}`).join(', '),
      href: '/properties',
    })
  }

  if (data.expiringLeases.filter(t => differenceInDays(new Date(t.lease_end), new Date()) > 30).length > 0) {
    const count = data.expiringLeases.filter(t => differenceInDays(new Date(t.lease_end), new Date()) > 30).length
    priorities.push({
      color: 'bg-blue-50 border-blue-200 text-blue-600',
      icon: Calendar,
      label: `${count} lease${count > 1 ? 's' : ''} expiring in 31–60 days`,
      detail: 'Good time to start renewal conversations',
      href: '/tenants',
    })
  }

  const allClear = priorities.length === 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Daily Briefing</p>
              <h2 className="text-xl font-bold text-gray-900">{greeting}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <button onClick={() => setShow(false)} className="text-gray-300 hover:text-gray-500 mt-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: 'Properties', value: String(data.totalProperties), sub: 'total' },
            { label: 'Occupancy', value: `${occupancyRate}%`, sub: `${data.occupiedUnits}/${data.totalUnits} units` },
            { label: 'Revenue', value: `$${data.monthlyRevenue.toLocaleString()}`, sub: 'this month' },
            { label: 'Net', value: `$${Math.abs(net).toLocaleString()}`, sub: net >= 0 ? 'profit' : 'deficit', negative: net < 0 },
          ].map(({ label, value, sub, negative }) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className={`text-base font-bold ${negative ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
              <p className="text-xs text-gray-400 leading-tight">{label}</p>
              <p className="text-xs text-gray-300 leading-tight">{sub}</p>
            </div>
          ))}
        </div>

        {/* Priorities */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          {allClear ? (
            <div className="text-center py-6">
              <CheckCircle size={36} className="mx-auto mb-2 text-green-500" />
              <p className="font-semibold text-gray-800">All clear today</p>
              <p className="text-sm text-gray-400 mt-1">No urgent items — enjoy a smooth day.</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Action Items</p>
              <div className="space-y-2">
                {priorities.map((p, i) => {
                  const Icon = p.icon
                  return (
                    <Link
                      key={i}
                      href={p.href}
                      onClick={() => setShow(false)}
                      className={`flex items-start gap-3 border rounded-xl px-4 py-3 hover:opacity-80 transition-opacity ${p.color}`}
                    >
                      <Icon size={15} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">{p.label}</p>
                        <p className="text-xs opacity-70 mt-0.5 truncate">{p.detail}</p>
                      </div>
                      <ArrowRight size={14} className="mt-0.5 shrink-0 opacity-50" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Open maintenance count if any */}
        {data.openMaintenance.length > 0 && (
          <div className="px-6 pb-2">
            <Link
              href="/maintenance"
              onClick={() => setShow(false)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600"
            >
              <Wrench size={12} />
              {data.openMaintenance.length} other open maintenance request{data.openMaintenance.length !== 1 ? 's' : ''} in progress
              <ArrowRight size={11} />
            </Link>
          </div>
        )}

        <div className="px-6 pb-5 pt-3">
          <button
            onClick={() => setShow(false)}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Start the day
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Users, Wrench, DollarSign, TrendingUp, CircleDollarSign } from 'lucide-react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    openMaintenance: 0,
    urgentMaintenance: 0,
    totalExpensesMonth: 0,
    monthlyRevenue: 0,
    expiringLeases: [] as any[],
    recentMaintenance: [] as any[],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [props, units, maintenance, expenses, leases] = await Promise.all([
        supabase.from('properties').select('id'),
        supabase.from('units').select('id, is_occupied, rent_amount'),
        supabase.from('maintenance_requests').select('id, title, status, priority, created_at, properties(name)').neq('status', 'completed').order('created_at', { ascending: false }).limit(5),
        supabase.from('expenses').select('amount').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        supabase.from('tenants').select('name, lease_end, units(unit_number, properties(name, id))').not('lease_end', 'is', null).lte('lease_end', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('lease_end'),
      ])
      const allUnits = units.data ?? []
      const occupiedUnits = allUnits.filter(u => u.is_occupied)
      setStats({
        totalProperties: props.data?.length ?? 0,
        totalUnits: allUnits.length,
        occupiedUnits: occupiedUnits.length,
        openMaintenance: maintenance.data?.length ?? 0,
        urgentMaintenance: maintenance.data?.filter(m => m.priority === 'urgent').length ?? 0,
        totalExpensesMonth: expenses.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0,
        monthlyRevenue: occupiedUnits.reduce((s, u) => s + Number((u as any).rent_amount ?? 0), 0),
        expiringLeases: leases.data ?? [],
        recentMaintenance: maintenance.data ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  const occupancyRate = stats.totalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) : 0
  const statCards = [
    { label: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: CircleDollarSign, color: 'green', href: '/rent' },
    { label: 'Occupancy', value: `${occupancyRate}%`, icon: TrendingUp, color: 'blue', href: '/properties' },
    { label: 'Open Requests', value: stats.openMaintenance, icon: Wrench, color: stats.urgentMaintenance > 0 ? 'red' : 'orange', href: '/maintenance' },
    { label: 'Expenses (MTD)', value: `$${stats.totalExpensesMonth.toLocaleString()}`, icon: DollarSign, color: 'purple', href: '/expenses' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  }
  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-500', green: 'text-green-500',
    red: 'text-red-500', orange: 'text-orange-500', purple: 'text-purple-500',
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-8">
        {statCards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className={`rounded-xl border p-4 lg:p-5 flex items-center gap-3 lg:gap-4 hover:shadow-sm transition-shadow ${colorMap[color]}`}>
            <div className={`shrink-0 ${iconColorMap[color]}`}>
              <Icon size={24} className="lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs lg:text-sm font-medium opacity-70 truncate">{label}</p>
              <p className="text-xl lg:text-2xl font-bold mt-0.5">{loading ? '—' : value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Expiring Leases */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-orange-500" />
            <h2 className="font-semibold text-gray-900">Leases Expiring Soon</h2>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : stats.expiringLeases.length === 0 ? (
            <p className="text-sm text-gray-400">No leases expiring in the next 60 days.</p>
          ) : (
            <div className="space-y-3">
              {stats.expiringLeases.map((t: any) => {
                const days = differenceInDays(new Date(t.lease_end), new Date())
                return (
                  <div key={t.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">{(t.units as any)?.properties?.name} · Unit {(t.units as any)?.unit_number}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 30 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {days}d left
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Maintenance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-blue-500" />
              <h2 className="font-semibold text-gray-900">Open Maintenance</h2>
            </div>
            <Link href="/maintenance" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : stats.recentMaintenance.length === 0 ? (
            <p className="text-sm text-gray-400">No open maintenance requests.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentMaintenance.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.title}</p>
                    <p className="text-xs text-gray-400">{(m.properties as any)?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      m.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{m.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                    }`}>{m.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

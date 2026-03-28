'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, TrendingUp, TrendingDown, DollarSign, Building2 } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [incomeData, setIncomeData] = useState<Record<string, number>>({})
  const [expenseData, setExpenseData] = useState<Record<string, number>>({})
  const [propertyIncome, setPropertyIncome] = useState<Record<string, number>>({})
  const [propertyExpenses, setPropertyExpenses] = useState<Record<string, number>>({})
  const [totalUnits, setTotalUnits] = useState(0)
  const [occupiedUnits, setOccupiedUnits] = useState(0)
  const [loading, setLoading] = useState(true)

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

  async function load() {
    setLoading(true)
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const [propsRes, unitsRes] = await Promise.all([
      supabase.from('properties').select('id, name'),
      supabase.from('units').select('id, property_id, is_occupied'),
    ])
    const allProps = propsRes.data ?? []
    setProperties(allProps)
    const allUnits = unitsRes.data ?? []
    setTotalUnits(allUnits.length)
    setOccupiedUnits(allUnits.filter((u: any) => u.is_occupied).length)

    // Filter by property if selected
    const propIds = selectedProperty === 'all'
      ? allProps.map((p: any) => p.id)
      : [selectedProperty]

    // Income: rent_payments with status=paid, paid_date in range
    const paymentsRes = await supabase
      .from('rent_payments')
      .select('paid_date, amount, late_fee, property_id')
      .eq('status', 'paid')
      .gte('paid_date', startDate)
      .lte('paid_date', endDate)
      .in('property_id', propIds)

    const payments = paymentsRes.data ?? []

    // Expenses in range
    const expensesRes = await supabase
      .from('expenses')
      .select('date, amount, property_id')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('property_id', propIds)

    const expenses = expensesRes.data ?? []

    // Build monthly maps
    const incomeByMonth: Record<string, number> = {}
    const expenseByMonth: Record<string, number> = {}
    const incByProp: Record<string, number> = {}
    const expByProp: Record<string, number> = {}

    for (const p of payments) {
      if (!p.paid_date) continue
      const monthIdx = new Date(p.paid_date).getMonth()
      const key = String(monthIdx)
      const total = Number(p.amount ?? 0) + Number(p.late_fee ?? 0)
      incomeByMonth[key] = (incomeByMonth[key] ?? 0) + total
      incByProp[p.property_id] = (incByProp[p.property_id] ?? 0) + total
    }

    for (const e of expenses) {
      if (!e.date) continue
      const monthIdx = new Date(e.date).getMonth()
      const key = String(monthIdx)
      const amt = Number(e.amount ?? 0)
      expenseByMonth[key] = (expenseByMonth[key] ?? 0) + amt
      expByProp[e.property_id] = (expByProp[e.property_id] ?? 0) + amt
    }

    setIncomeData(incomeByMonth)
    setExpenseData(expenseByMonth)
    setPropertyIncome(incByProp)
    setPropertyExpenses(expByProp)
    setLoading(false)
  }

  useEffect(() => { load() }, [year, selectedProperty])

  const totalIncome = Object.values(incomeData).reduce((s, v) => s + v, 0)
  const totalExpenses = Object.values(expenseData).reduce((s, v) => s + v, 0)
  const noi = totalIncome - totalExpenses
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  function fmt(n: number) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function exportCSV() {
    const headers = ['Month', 'Income', 'Expenses', 'Net', 'Status']
    const rows = MONTHS.map((month, i) => {
      const inc = incomeData[String(i)] ?? 0
      const exp = expenseData[String(i)] ?? 0
      const net = inc - exp
      const status = inc === 0 && exp === 0 ? 'No Data' : net >= 0 ? 'Profit' : 'Loss'
      return [month, inc.toFixed(2), exp.toFixed(2), net.toFixed(2), status]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `propease-report-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredProps = selectedProperty === 'all' ? properties : properties.filter(p => p.id === selectedProperty)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-500 mt-1">Income & expense analysis</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedProperty}
            onChange={e => setSelectedProperty(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-green-500" />
            <p className="text-xs text-gray-500 font-medium">Total Income</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{loading ? '—' : fmt(totalIncome)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Rent collected {year}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={15} className="text-red-400" />
            <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{loading ? '—' : fmt(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-0.5">All expenses {year}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} className="text-blue-500" />
            <p className="text-xs text-gray-500 font-medium">Net Operating Income</p>
          </div>
          <p className={`text-xl font-bold ${noi >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {loading ? '—' : fmt(noi)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Income minus expenses</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={15} className="text-violet-500" />
            <p className="text-xs text-gray-500 font-medium">Occupancy Rate</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{loading ? '—' : `${occupancyRate}%`}</p>
          <p className="text-xs text-gray-400 mt-0.5">{occupiedUnits} of {totalUnits} units</p>
        </div>
      </div>

      {/* Monthly P&L Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Monthly Profit & Loss — {year}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Month', 'Income', 'Expenses', 'Net', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : MONTHS.map((month, i) => {
                const inc = incomeData[String(i)] ?? 0
                const exp = expenseData[String(i)] ?? 0
                const net = inc - exp
                const hasData = inc > 0 || exp > 0
                const isProfit = net >= 0
                return (
                  <tr key={month} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{month} {year}</td>
                    <td className="px-5 py-3 text-sm text-green-700 font-medium">{hasData || inc > 0 ? fmt(inc) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-red-600 font-medium">{hasData || exp > 0 ? fmt(exp) : <span className="text-gray-300">—</span>}</td>
                    <td className={`px-5 py-3 text-sm font-semibold ${hasData ? (isProfit ? 'text-green-700' : 'text-red-600') : 'text-gray-300'}`}>
                      {hasData ? fmt(net) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {!hasData ? (
                        <span className="text-xs text-gray-300">No data</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isProfit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {isProfit ? 'Profit' : 'Loss'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-5 py-3 text-sm font-bold text-gray-900">Total</td>
                <td className="px-5 py-3 text-sm font-bold text-green-700">{fmt(totalIncome)}</td>
                <td className="px-5 py-3 text-sm font-bold text-red-600">{fmt(totalExpenses)}</td>
                <td className={`px-5 py-3 text-sm font-bold ${noi >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(noi)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${noi >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {noi >= 0 ? 'Net Profit' : 'Net Loss'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* By Property Breakdown */}
      {filteredProps.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">By Property</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Property', 'Income', 'Expenses', 'Net'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</td></tr>
                ) : filteredProps.map((prop: any) => {
                  const inc = propertyIncome[prop.id] ?? 0
                  const exp = propertyExpenses[prop.id] ?? 0
                  const net = inc - exp
                  return (
                    <tr key={prop.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{prop.name}</td>
                      <td className="px-5 py-3 text-sm text-green-700 font-medium">{fmt(inc)}</td>
                      <td className="px-5 py-3 text-sm text-red-600 font-medium">{fmt(exp)}</td>
                      <td className={`px-5 py-3 text-sm font-semibold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

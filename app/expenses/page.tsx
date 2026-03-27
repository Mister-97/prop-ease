'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, Plus, Download, Upload } from 'lucide-react'
import { format } from 'date-fns'
import CsvImportModal from '@/components/CsvImportModal'

const CATEGORIES = ['repairs', 'utilities', 'insurance', 'taxes', 'maintenance', 'landscaping', 'cleaning', 'supplies', 'other']

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ property_id: '', amount: '', description: '', category: 'repairs', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)

  async function load() {
    const [exp, props] = await Promise.all([
      supabase.from('expenses').select('*, properties(name)').order('date', { ascending: false }),
      supabase.from('properties').select('id, name'),
    ])
    setExpenses(exp.data ?? [])
    setProperties(props.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.property_id || !form.amount || !form.description) return
    setSaving(true)
    await supabase.from('expenses').insert({ ...form, amount: parseFloat(form.amount) })
    setSaving(false)
    setShowAdd(false)
    setForm({ property_id: '', amount: '', description: '', category: 'repairs', date: new Date().toISOString().split('T')[0] })
    load()
  }

  function exportCSV() {
    const headers = ['Date', 'Property', 'Category', 'Description', 'Amount']
    const rows = expenses.map(e => [
      e.date, e.properties?.name ?? '', e.category, e.description, e.amount
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const monthTotal = expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 mt-1">Track all property expenses</p>
        </div>
        <div className="flex gap-2 lg:gap-3">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Upload size={15} /> <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={15} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total All Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${total.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${monthTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{expenses.length}</p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />)
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No expenses yet</div>
        ) : expenses.map((e: any) => (
          <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-medium text-gray-900">{e.description}</p>
              <p className="text-sm font-semibold text-gray-900 ml-2 shrink-0">${Number(e.amount).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{e.category}</span>
              <span className="text-xs text-gray-400">{e.properties?.name}</span>
              <span className="text-xs text-gray-400">{format(new Date(e.date), 'MMM d, yyyy')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Date', 'Property', 'Category', 'Description', 'Amount'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">No expenses yet</td></tr>
            ) : expenses.map((e: any) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 text-sm text-gray-500">{format(new Date(e.date), 'MMM d, yyyy')}</td>
                <td className="px-5 py-3 text-sm text-gray-700">{e.properties?.name}</td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{e.category}</span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">{e.description}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-900">${Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showImport && (
        <CsvImportModal
          type="expenses"
          properties={properties}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); load() }}
        />
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add Expense</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select property...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this for?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

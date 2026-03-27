'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, MapPin, Home, Plus, ChevronLeft, Users, Wrench, DollarSign, X, CheckCircle, Circle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import { useParams } from 'next/navigation'

type Unit = {
  id: string
  unit_number: string
  bedrooms: number
  bathrooms: number
  rent_amount: number
  is_occupied: boolean
  square_feet: number | null
  notes: string | null
  tenants: Tenant[]
}

type Tenant = {
  id: string
  name: string
  email: string | null
  phone: string | null
  lease_start: string | null
  lease_end: string | null
}

type MaintenanceRequest = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  created_at: string
  units: { unit_number: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [property, setProperty] = useState<any>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'units' | 'maintenance'>('units')

  // Modals
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [showAddTenant, setShowAddTenant] = useState<string | null>(null) // unit id
  const [showAddMaintenance, setShowAddMaintenance] = useState(false)

  // Forms
  const [unitForm, setUnitForm] = useState({ unit_number: '', bedrooms: '1', bathrooms: '1', rent_amount: '', square_feet: '' })
  const [tenantForm, setTenantForm] = useState({ name: '', email: '', phone: '', lease_start: '', lease_end: '' })
  const [mForm, setMForm] = useState({ title: '', description: '', priority: 'medium', unit_id: '' })
  const [saving, setSaving] = useState(false)

  async function deleteProperty() {
    if (!confirm(`Delete "${property?.name}"? This will also delete all units, tenants, and maintenance records.`)) return
    await supabase.from('maintenance_requests').delete().eq('property_id', id)
    await supabase.from('expenses').delete().eq('property_id', id)
    const unitIds = units.map(u => u.id)
    if (unitIds.length > 0) {
      await supabase.from('tenants').delete().in('unit_id', unitIds)
      await supabase.from('units').delete().eq('property_id', id)
    }
    await supabase.from('properties').delete().eq('id', id)
    router.push('/properties')
  }

  async function load() {
    const [propRes, unitsRes, maintRes] = await Promise.all([
      supabase.from('properties').select('*').eq('id', id).single(),
      supabase.from('units').select('*, tenants(*)').eq('property_id', id).order('unit_number'),
      supabase.from('maintenance_requests').select('*, units(unit_number)').eq('property_id', id).order('created_at', { ascending: false }),
    ])
    setProperty(propRes.data)
    setUnits(unitsRes.data ?? [])
    setMaintenance(maintRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (id) load() }, [id])

  async function saveUnit() {
    if (!unitForm.unit_number || !unitForm.rent_amount) return
    setSaving(true)
    await supabase.from('units').insert({
      property_id: id,
      unit_number: unitForm.unit_number,
      bedrooms: parseInt(unitForm.bedrooms),
      bathrooms: parseFloat(unitForm.bathrooms),
      rent_amount: parseFloat(unitForm.rent_amount),
      square_feet: unitForm.square_feet ? parseInt(unitForm.square_feet) : null,
    })
    setSaving(false)
    setShowAddUnit(false)
    setUnitForm({ unit_number: '', bedrooms: '1', bathrooms: '1', rent_amount: '', square_feet: '' })
    load()
  }

  async function saveTenant() {
    if (!tenantForm.name || !showAddTenant) return
    setSaving(true)
    await supabase.from('tenants').insert({ ...tenantForm, unit_id: showAddTenant, property_id: id })
    await supabase.from('units').update({ is_occupied: true }).eq('id', showAddTenant)
    setSaving(false)
    setShowAddTenant(null)
    setTenantForm({ name: '', email: '', phone: '', lease_start: '', lease_end: '' })
    load()
  }

  async function saveMaintenance() {
    if (!mForm.title) return
    setSaving(true)
    await supabase.from('maintenance_requests').insert({
      ...mForm,
      property_id: id,
      unit_id: mForm.unit_id || null,
      status: 'open',
    })
    setSaving(false)
    setShowAddMaintenance(false)
    setMForm({ title: '', description: '', priority: 'medium', unit_id: '' })
    load()
  }

  async function removeTenant(tenantId: string, unitId: string) {
    if (!confirm('Remove this tenant?')) return
    await supabase.from('tenants').delete().eq('id', tenantId)
    // check if unit still has tenants
    const { data } = await supabase.from('tenants').select('id').eq('unit_id', unitId)
    if (!data || data.length === 0) {
      await supabase.from('units').update({ is_occupied: false }).eq('id', unitId)
    }
    load()
  }

  async function updateMaintenanceStatus(mId: string, status: string) {
    await supabase.from('maintenance_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', mId)
    load()
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-100 rounded w-40" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!property) return <div className="p-8 text-gray-500">Property not found.</div>

  const totalUnits = units.length
  const occupiedUnits = units.filter(u => u.is_occupied).length
  const monthlyRent = units.reduce((s, u) => s + Number(u.rent_amount), 0)
  const openRequests = maintenance.filter(m => m.status !== 'completed').length

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/properties" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ChevronLeft size={16} /> Back to Properties
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                <MapPin size={13} />
                <span>{property.address}{property.city ? `, ${property.city}` : ''}{property.state ? `, ${property.state}` : ''}</span>
              </div>
            </div>
          </div>
          <button
            onClick={deleteProperty}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {[
          { label: 'Units', value: `${occupiedUnits}/${totalUnits}`, sub: 'occupied', icon: Home, color: 'text-blue-600 bg-blue-50' },
          { label: 'Monthly Rent', value: `$${monthlyRent.toLocaleString()}`, sub: 'total potential', icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'Tenants', value: String(occupiedUnits), sub: 'active', icon: Users, color: 'text-purple-600 bg-purple-50' },
          { label: 'Maintenance', value: String(openRequests), sub: 'open requests', icon: Wrench, color: 'text-orange-600 bg-orange-50' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'units', label: `Units (${totalUnits})` },
          { key: 'maintenance', label: `Maintenance (${maintenance.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Units Tab */}
      {activeTab === 'units' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddUnit(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={14} /> Add Unit
            </button>
          </div>
          {units.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Home size={40} className="mx-auto mb-3 opacity-30" />
              <p>No units yet — add your first unit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {units.map((u) => {
                const tenant = u.tenants?.[0]
                const daysLeft = tenant?.lease_end ? differenceInDays(new Date(tenant.lease_end), new Date()) : null
                return (
                  <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${u.is_occupied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.unit_number}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Unit {u.unit_number}</p>
                          <p className="text-xs text-gray-400">
                            {u.bedrooms}bd · {u.bathrooms}ba
                            {u.square_feet ? ` · ${u.square_feet} sqft` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">${Number(u.rent_amount).toLocaleString()}/mo</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_occupied ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                          {u.is_occupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>
                    </div>

                    {/* Tenant info */}
                    {tenant ? (
                      <div className="mt-4 bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{tenant.name}</p>
                            <p className="text-xs text-gray-400">
                              {tenant.lease_start && tenant.lease_end
                                ? `${format(new Date(tenant.lease_start), 'MMM d, yy')} – ${format(new Date(tenant.lease_end), 'MMM d, yy')}`
                                : 'No lease dates set'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {daysLeft !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${daysLeft < 0 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? `${daysLeft}d left` : 'Active'}
                            </span>
                          )}
                          <button onClick={() => removeTenant(tenant.id, u.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddTenant(u.id)}
                        className="mt-3 w-full border-2 border-dashed border-gray-200 rounded-lg py-2 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={12} /> Add Tenant
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddMaintenance(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={14} /> Add Request
            </button>
          </div>
          {maintenance.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Wrench size={40} className="mx-auto mb-3 opacity-30" />
              <p>No maintenance requests</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Issue', 'Unit', 'Priority', 'Status', 'Date', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{m.title}</p>
                        {m.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{m.description}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">
                        {m.units?.unit_number ? `Unit ${m.units.unit_number}` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[m.priority]}`}>{m.priority}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status]}`}>
                          {m.status === 'in_progress' ? 'In Progress' : m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-400">{format(new Date(m.created_at), 'MMM d')}</td>
                      <td className="px-5 py-3.5">
                        <select
                          value={m.status}
                          onChange={e => updateMaintenanceStatus(m.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Unit</h2>
              <button onClick={() => setShowAddUnit(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number / Name</label>
                <input value={unitForm.unit_number} onChange={e => setUnitForm(f => ({ ...f, unit_number: e.target.value }))} placeholder="e.g. 1A or Basement" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                  <select value={unitForm.bedrooms} onChange={e => setUnitForm(f => ({ ...f, bedrooms: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n === 0 ? 'Studio' : n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                  <select value={unitForm.bathrooms} onChange={e => setUnitForm(f => ({ ...f, bathrooms: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    {[1, 1.5, 2, 2.5, 3].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                  <input type="number" value={unitForm.square_feet} onChange={e => setUnitForm(f => ({ ...f, square_feet: e.target.value }))} placeholder="800" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent ($)</label>
                <input type="number" value={unitForm.rent_amount} onChange={e => setUnitForm(f => ({ ...f, rent_amount: e.target.value }))} placeholder="1200" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddUnit(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={saveUnit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Unit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddTenant && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Tenant</h2>
              <button onClick={() => setShowAddTenant(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input value={tenantForm.name} onChange={e => setTenantForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={tenantForm.email} onChange={e => setTenantForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={tenantForm.phone} onChange={e => setTenantForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lease Start</label>
                  <input type="date" value={tenantForm.lease_start} onChange={e => setTenantForm(f => ({ ...f, lease_start: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lease End</label>
                  <input type="date" value={tenantForm.lease_end} onChange={e => setTenantForm(f => ({ ...f, lease_end: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddTenant(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={saveTenant} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Maintenance Modal */}
      {showAddMaintenance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Maintenance Request</h2>
              <button onClick={() => setShowAddMaintenance(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
                <input value={mForm.title} onChange={e => setMForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Leaky faucet in kitchen" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit (optional)</label>
                  <select value={mForm.unit_id} onChange={e => setMForm(f => ({ ...f, unit_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Common area</option>
                    {units.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={mForm.priority} onChange={e => setMForm(f => ({ ...f, priority: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={mForm.description} onChange={e => setMForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe the issue..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddMaintenance(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={saveMaintenance} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

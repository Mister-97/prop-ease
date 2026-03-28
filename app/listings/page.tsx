'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Copy, Check, ChevronRight, X, BedDouble, Bath, Ruler, DollarSign } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-600',
  withdrawn: 'bg-gray-100 text-gray-500',
}

export default function ListingsPage() {
  const [vacantUnits, setVacantUnits] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<any | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [unitsRes, appsRes] = await Promise.all([
      supabase
        .from('units')
        .select('*, properties(name, id)')
        .eq('is_occupied', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('rental_applications')
        .select('*, units(unit_number, properties(name))')
        .order('created_at', { ascending: false }),
    ])
    setVacantUnits(unitsRes.data ?? [])
    setApplications(appsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function copyLink(unitId: string) {
    const link = `${window.location.origin}/apply/${unitId}`
    navigator.clipboard.writeText(link)
    setCopied(unitId)
    setTimeout(() => setCopied(null), 2000)
  }

  function appCountForUnit(unitId: string) {
    return applications.filter(a => a.unit_id === unitId && a.status === 'pending').length
  }

  async function updateStatus(appId: string, status: string) {
    setUpdatingId(appId)
    await supabase.from('rental_applications').update({ status }).eq('id', appId)
    setUpdatingId(null)
    // Update local state
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
    if (selectedApp?.id === appId) setSelectedApp((prev: any) => prev ? { ...prev, status } : prev)
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listings & Applications</h1>
        <p className="text-gray-500 mt-1">Manage vacant units and rental applications</p>
      </div>

      {/* Vacant Units */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Vacant Units ({vacantUnits.length})
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-44 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
          </div>
        ) : vacantUnits.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
            <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No vacant units — all units are occupied</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vacantUnits.map((unit: any) => {
              const pendingCount = appCountForUnit(unit.id)
              return (
                <div key={unit.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{unit.properties?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Unit {unit.unit_number}</p>
                    </div>
                    {pendingCount > 0 && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {pendingCount} app{pendingCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
                    {unit.bedrooms != null && (
                      <span className="flex items-center gap-1"><BedDouble size={12} /> {unit.bedrooms} bd</span>
                    )}
                    {unit.bathrooms != null && (
                      <span className="flex items-center gap-1"><Bath size={12} /> {unit.bathrooms} ba</span>
                    )}
                    {unit.square_feet && (
                      <span className="flex items-center gap-1"><Ruler size={12} /> {unit.square_feet.toLocaleString()} sqft</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-blue-600 font-semibold text-sm">
                      <DollarSign size={14} />
                      {Number(unit.rent_amount ?? 0).toLocaleString()}<span className="text-gray-400 font-normal text-xs">/mo</span>
                    </div>
                    <button
                      onClick={() => copyLink(unit.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        copied === unit.id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {copied === unit.id ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Applications */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Applications ({applications.length})
        </h2>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />)
          ) : applications.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">No applications yet</div>
          ) : applications.map((app: any) => (
            <div
              key={app.id}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-sm"
              onClick={() => setSelectedApp(app)}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">{app.full_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[app.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {app.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">{app.units?.properties?.name} · Unit {app.units?.unit_number}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                {app.monthly_income && <span>Income: ${Number(app.monthly_income).toLocaleString()}/mo</span>}
                <span>{format(new Date(app.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Applicant', 'Unit', 'Income', 'Move-in', 'Submitted', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">No applications yet</td></tr>
              ) : applications.map((app: any) => (
                <tr
                  key={app.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer group"
                  onClick={() => setSelectedApp(app)}
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{app.full_name}</p>
                      <p className="text-xs text-gray-400">{app.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {app.units?.properties?.name}
                    <span className="text-gray-400"> · Unit {app.units?.unit_number}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    {app.monthly_income ? `$${Number(app.monthly_income).toLocaleString()}/mo` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {app.move_in_date ? format(new Date(app.move_in_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {format(new Date(app.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[app.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application detail side panel */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelectedApp(null)}>
          <div
            className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{selectedApp.full_name}</h2>
                <p className="text-xs text-gray-400">{selectedApp.units?.properties?.name} · Unit {selectedApp.units?.unit_number}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Status + actions */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[selectedApp.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {selectedApp.status}
              </span>
              {selectedApp.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'approved')}
                    disabled={updatingId === selectedApp.id}
                    className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {updatingId === selectedApp.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'denied')}
                    disabled={updatingId === selectedApp.id}
                    className="px-4 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {updatingId === selectedApp.id ? '...' : 'Deny'}
                  </button>
                </div>
              )}
              {selectedApp.status !== 'pending' && (
                <button
                  onClick={() => updateStatus(selectedApp.id, 'pending')}
                  disabled={updatingId === selectedApp.id}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Reset to pending
                </button>
              )}
            </div>

            <div className="px-6 py-5 space-y-6">
              <Section title="Personal Info">
                <Row label="Full Name" value={selectedApp.full_name} />
                <Row label="Email" value={selectedApp.email} />
                <Row label="Phone" value={selectedApp.phone} />
                <Row label="Date of Birth" value={selectedApp.date_of_birth ? format(new Date(selectedApp.date_of_birth), 'MMM d, yyyy') : null} />
              </Section>

              <Section title="Current Housing">
                <Row label="Current Address" value={selectedApp.current_address} />
                <Row label="Current Landlord" value={selectedApp.current_landlord} />
                <Row label="Landlord Phone" value={selectedApp.current_landlord_phone} />
                <Row label="Current Rent" value={selectedApp.monthly_rent_current ? `$${Number(selectedApp.monthly_rent_current).toLocaleString()}/mo` : null} />
                <Row label="Reason for Moving" value={selectedApp.reason_for_moving} />
              </Section>

              <Section title="Employment">
                <Row label="Employer" value={selectedApp.employer} />
                <Row label="Job Title" value={selectedApp.job_title} />
                <Row label="Monthly Income" value={selectedApp.monthly_income ? `$${Number(selectedApp.monthly_income).toLocaleString()}` : null} />
                <Row label="Employment Start" value={selectedApp.employment_start_date ? format(new Date(selectedApp.employment_start_date), 'MMM d, yyyy') : null} />
              </Section>

              <Section title="Household">
                <Row label="Move-in Date" value={selectedApp.move_in_date ? format(new Date(selectedApp.move_in_date), 'MMM d, yyyy') : null} />
                <Row label="Occupants" value={selectedApp.occupants} />
                <Row label="Vehicles" value={selectedApp.vehicles} />
                <Row label="Pets" value={selectedApp.pets ? 'Yes' : 'No'} />
                {selectedApp.pets && <Row label="Pet Description" value={selectedApp.pet_description} />}
              </Section>

              <Section title="References">
                {selectedApp.ref1_name && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Reference 1</p>
                    <Row label="Name" value={selectedApp.ref1_name} />
                    <Row label="Phone" value={selectedApp.ref1_phone} />
                    <Row label="Relationship" value={selectedApp.ref1_relationship} />
                  </>
                )}
                {selectedApp.ref2_name && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1 mt-2">Reference 2</p>
                    <Row label="Name" value={selectedApp.ref2_name} />
                    <Row label="Phone" value={selectedApp.ref2_phone} />
                    <Row label="Relationship" value={selectedApp.ref2_relationship} />
                  </>
                )}
              </Section>

              {selectedApp.notes && (
                <Section title="Additional Notes">
                  <p className="text-sm text-gray-700">{selectedApp.notes}</p>
                </Section>
              )}

              <p className="text-xs text-gray-300 pb-4">Submitted {format(new Date(selectedApp.created_at), 'MMMM d, yyyy · h:mm a')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: any }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-400 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-800 font-medium text-right">{String(value)}</span>
    </div>
  )
}

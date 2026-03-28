'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPortalTenant } from '@/lib/portal'
import PortalShell from '@/components/PortalShell'
import { Calendar, Home, MapPin, DollarSign, Users, Clock, BedDouble } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export default function PortalLease() {
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const t = await getPortalTenant()
      if (!t) { router.replace('/portal/login'); return }
      setTenant(t)
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
  const totalDays = (tenant.lease_start && tenant.lease_end)
    ? differenceInDays(new Date(tenant.lease_end), new Date(tenant.lease_start))
    : null
  const progress = (daysLeft !== null && totalDays !== null && totalDays > 0)
    ? Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100))
    : null

  return (
    <PortalShell tenantName={tenant.name}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Lease Details</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your current lease & unit information</p>
      </div>

      {/* Unit card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Home size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tenant.units?.properties?.name}</p>
            <p className="text-sm text-gray-400">Unit {tenant.units?.unit_number}</p>
          </div>
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            <span>
              {tenant.units?.properties?.address}
              {tenant.units?.properties?.city ? `, ${tenant.units.properties.city}` : ''}
              {tenant.units?.properties?.state ? ` ${tenant.units.properties.state}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <BedDouble size={14} className="text-gray-400 shrink-0" />
            <span>{tenant.units?.bedrooms ?? '?'} bed · {tenant.units?.bathrooms ?? '?'} bath</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign size={14} className="text-gray-400 shrink-0" />
            <span className="font-semibold text-gray-900">${Number(tenant.units?.rent_amount ?? 0).toLocaleString()}</span>
            <span className="text-gray-400">/ month</span>
          </div>
        </div>
      </div>

      {/* Lease term */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-blue-500" />
          <h2 className="font-semibold text-gray-900">Lease Term</h2>
        </div>

        {tenant.lease_start && tenant.lease_end ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Start Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {format(new Date(tenant.lease_start), 'MMM d, yyyy')}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${daysLeft !== null && daysLeft <= 30 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-400 mb-1">End Date</p>
                <p className={`text-sm font-semibold ${daysLeft !== null && daysLeft <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {format(new Date(tenant.lease_end), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {progress !== null && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Lease progress</span>
                  <span className={
                    daysLeft !== null && daysLeft < 0 ? 'text-red-500 font-medium' :
                    daysLeft !== null && daysLeft <= 30 ? 'text-orange-500 font-medium' :
                    'text-gray-500'
                  }>
                    {daysLeft !== null && daysLeft < 0
                      ? 'Lease expired'
                      : daysLeft !== null
                      ? `${daysLeft} days remaining`
                      : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      daysLeft !== null && daysLeft < 0 ? 'bg-red-400' :
                      daysLeft !== null && daysLeft <= 30 ? 'bg-orange-400' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {daysLeft !== null && daysLeft <= 60 && daysLeft >= 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                <Clock size={15} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-700">
                  Your lease expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Contact your property manager about renewal.
                </p>
              </div>
            )}
            {daysLeft !== null && daysLeft < 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <Clock size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Your lease has expired. Please contact your property manager immediately.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No lease dates on file. Contact your property manager.</p>
        )}
      </div>

      {/* Tenant info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-blue-500" />
          <h2 className="font-semibold text-gray-900">Your Information</h2>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Name', value: tenant.name },
            { label: 'Email', value: tenant.email },
            { label: 'Phone', value: tenant.phone },
          ].filter(r => r.value).map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-gray-400">{row.label}</span>
              <span className="font-medium text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}

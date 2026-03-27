'use client'
import { useEffect, useState } from 'react'
import { supabase, Property } from '@/lib/supabase'
import { Building2, Plus, MapPin, Home, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import AddPropertyModal from '@/components/AddPropertyModal'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('properties')
      .select('*, units(id, is_occupied, rent_amount)')
      .order('created_at', { ascending: false })
    setProperties(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 mt-1">{properties.length} properties</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Property
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Building2 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No properties yet</p>
          <p className="text-sm mt-1">Click "Add Property" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {properties.map((p: any) => {
            const total = p.units?.length ?? 0
            const occupied = p.units?.filter((u: any) => u.is_occupied).length ?? 0
            const monthlyRent = p.units?.reduce((s: number, u: any) => s + Number(u.rent_amount), 0) ?? 0
            return (
              <Link key={p.id} href={`/properties/${p.id}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors mt-1" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{p.name}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-400 mb-4">
                  <MapPin size={13} />
                  <span>{p.address}{p.city ? `, ${p.city}` : ''}</span>
                </div>
                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Units</p>
                    <p className="font-semibold text-gray-800">{occupied}/{total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Monthly Rent</p>
                    <p className="font-semibold text-gray-800">${monthlyRent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Vacancy</p>
                    <p className={`font-semibold ${total - occupied > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {total - occupied > 0 ? `${total - occupied} vacant` : 'Full'}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showAdd && <AddPropertyModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

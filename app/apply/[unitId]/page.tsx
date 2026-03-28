'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'

const SECTIONS = ['Personal Info', 'Current Housing', 'Employment', 'Household', 'References', 'Review']

export default function ApplyPage({ params }: { params: { unitId: string } }) {
  const { unitId } = params
  const [unit, setUnit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    current_address: '',
    current_landlord: '',
    current_landlord_phone: '',
    monthly_rent_current: '',
    reason_for_moving: '',
    employer: '',
    job_title: '',
    monthly_income: '',
    employment_start_date: '',
    move_in_date: '',
    occupants: '1',
    vehicles: '0',
    pets: 'false',
    pet_description: '',
    ref1_name: '',
    ref1_phone: '',
    ref1_relationship: '',
    ref2_name: '',
    ref2_phone: '',
    ref2_relationship: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  useEffect(() => {
    async function loadUnit() {
      const { data } = await supabase
        .from('units')
        .select('*, properties(name, address, city, state)')
        .eq('id', unitId)
        .single()
      setUnit(data)
      setLoading(false)
    }
    loadUnit()
  }, [unitId])

  async function submit() {
    if (!consent) { setError('Please confirm the consent checkbox before submitting.'); return }
    if (!form.full_name || !form.email) { setError('Full name and email are required.'); return }
    setError('')
    setSubmitting(true)

    const payload: any = {
      unit_id: unitId,
      property_id: unit?.property_id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      current_address: form.current_address || null,
      current_landlord: form.current_landlord || null,
      current_landlord_phone: form.current_landlord_phone || null,
      monthly_rent_current: form.monthly_rent_current ? parseFloat(form.monthly_rent_current) : null,
      reason_for_moving: form.reason_for_moving || null,
      employer: form.employer || null,
      job_title: form.job_title || null,
      monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
      employment_start_date: form.employment_start_date || null,
      move_in_date: form.move_in_date || null,
      occupants: parseInt(form.occupants) || 1,
      vehicles: parseInt(form.vehicles) || 0,
      pets: form.pets === 'true',
      pet_description: form.pet_description || null,
      ref1_name: form.ref1_name || null,
      ref1_phone: form.ref1_phone || null,
      ref1_relationship: form.ref1_relationship || null,
      ref2_name: form.ref2_name || null,
      ref2_phone: form.ref2_phone || null,
      ref2_relationship: form.ref2_relationship || null,
      notes: form.notes || null,
    }

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Submission failed')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 font-medium">Unit not found</p>
          <p className="text-gray-400 text-sm mt-1">This application link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your application has been submitted! The landlord will be in touch with you soon regarding next steps.
          </p>
        </div>
      </div>
    )
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">PropEase</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{unit.properties?.name}</h1>
          <p className="text-sm text-gray-500">
            Unit {unit.unit_number}
            {unit.bedrooms != null && ` · ${unit.bedrooms} bed`}
            {unit.bathrooms != null && ` / ${unit.bathrooms} bath`}
            {unit.rent_amount ? ` · $${Number(unit.rent_amount).toLocaleString()}/mo` : ''}
          </p>
          {unit.properties?.address && (
            <p className="text-xs text-gray-400 mt-0.5">
              {unit.properties.address}{unit.properties.city ? `, ${unit.properties.city}` : ''}{unit.properties.state ? `, ${unit.properties.state}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {SECTIONS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    i === step
                      ? 'bg-blue-600 text-white'
                      : i < step
                      ? 'bg-green-100 text-green-700 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-default'
                  }`}
                >
                  {s}
                </button>
                {i < SECTIONS.length - 1 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                  <input className={inputClass} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                  <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" className={inputClass} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Current Housing */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Current Housing</h2>
              <div>
                <label className={labelClass}>Current Address</label>
                <input className={inputClass} value={form.current_address} onChange={e => set('current_address', e.target.value)} placeholder="123 Main St, City, State" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Current Landlord</label>
                  <input className={inputClass} value={form.current_landlord} onChange={e => set('current_landlord', e.target.value)} placeholder="Landlord name" />
                </div>
                <div>
                  <label className={labelClass}>Landlord Phone</label>
                  <input type="tel" className={inputClass} value={form.current_landlord_phone} onChange={e => set('current_landlord_phone', e.target.value)} placeholder="(555) 000-0000" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Current Monthly Rent</label>
                <input type="number" className={inputClass} value={form.monthly_rent_current} onChange={e => set('monthly_rent_current', e.target.value)} placeholder="1200" />
              </div>
              <div>
                <label className={labelClass}>Reason for Moving</label>
                <textarea className={inputClass} rows={3} value={form.reason_for_moving} onChange={e => set('reason_for_moving', e.target.value)} placeholder="Why are you looking to move?" />
              </div>
            </div>
          )}

          {/* Step 2: Employment */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Employment</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Employer</label>
                  <input className={inputClass} value={form.employer} onChange={e => set('employer', e.target.value)} placeholder="Company name" />
                </div>
                <div>
                  <label className={labelClass}>Job Title</label>
                  <input className={inputClass} value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Your position" />
                </div>
                <div>
                  <label className={labelClass}>Monthly Income ($)</label>
                  <input type="number" className={inputClass} value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)} placeholder="5000" />
                </div>
                <div>
                  <label className={labelClass}>Employment Start Date</label>
                  <input type="date" className={inputClass} value={form.employment_start_date} onChange={e => set('employment_start_date', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Household */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Household Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Desired Move-in Date</label>
                  <input type="date" className={inputClass} value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Number of Occupants</label>
                  <input type="number" min="1" className={inputClass} value={form.occupants} onChange={e => set('occupants', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Number of Vehicles</label>
                  <input type="number" min="0" className={inputClass} value={form.vehicles} onChange={e => set('vehicles', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Pets?</label>
                  <select className={inputClass} value={form.pets} onChange={e => set('pets', e.target.value)}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
              {form.pets === 'true' && (
                <div>
                  <label className={labelClass}>Pet Description</label>
                  <input className={inputClass} value={form.pet_description} onChange={e => set('pet_description', e.target.value)} placeholder="e.g. 1 cat, 2 year old tabby" />
                </div>
              )}
            </div>
          )}

          {/* Step 4: References */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">References</h2>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Reference 1</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input className={inputClass} value={form.ref1_name} onChange={e => set('ref1_name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" className={inputClass} value={form.ref1_phone} onChange={e => set('ref1_phone', e.target.value)} placeholder="(555) 000-0000" />
                  </div>
                  <div>
                    <label className={labelClass}>Relationship</label>
                    <input className={inputClass} value={form.ref1_relationship} onChange={e => set('ref1_relationship', e.target.value)} placeholder="e.g. Employer" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Reference 2</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input className={inputClass} value={form.ref2_name} onChange={e => set('ref2_name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" className={inputClass} value={form.ref2_phone} onChange={e => set('ref2_phone', e.target.value)} placeholder="(555) 000-0000" />
                  </div>
                  <div>
                    <label className={labelClass}>Relationship</label>
                    <input className={inputClass} value={form.ref2_relationship} onChange={e => set('ref2_relationship', e.target.value)} placeholder="e.g. Friend" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Additional Notes</label>
                <textarea className={inputClass} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything else you'd like the landlord to know?" />
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Review & Submit</h2>

              <div className="space-y-3 mb-6">
                <ReviewRow label="Name" value={form.full_name} />
                <ReviewRow label="Email" value={form.email} />
                <ReviewRow label="Phone" value={form.phone} />
                <ReviewRow label="Employer" value={form.employer} />
                <ReviewRow label="Monthly Income" value={form.monthly_income ? `$${form.monthly_income}` : ''} />
                <ReviewRow label="Move-in Date" value={form.move_in_date} />
                <ReviewRow label="Occupants" value={form.occupants} />
                <ReviewRow label="Pets" value={form.pets === 'true' ? `Yes${form.pet_description ? ` — ${form.pet_description}` : ''}` : 'No'} />
              </div>

              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I certify that all information provided in this application is accurate and complete. I consent to a background and credit check as part of the rental application process.
                  </span>
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {step < SECTIONS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}

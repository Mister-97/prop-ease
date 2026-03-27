'use client'
import { useState, useRef } from 'react'
import { X, Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ImportType = 'expenses' | 'tenants'

type Props = {
  type: ImportType
  properties: { id: string; name: string }[]
  units?: { id: string; unit_number: string; property_id: string; properties?: { name: string } }[]
  onClose: () => void
  onDone: () => void
}

const FIELD_MAPS: Record<ImportType, { key: string; label: string; required?: boolean }[]> = {
  expenses: [
    { key: 'date', label: 'Date', required: true },
    { key: 'amount', label: 'Amount', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'category', label: 'Category' },
    { key: 'property', label: 'Property Name' },
  ],
  tenants: [
    { key: 'name', label: 'Tenant Name', required: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'lease_start', label: 'Lease Start' },
    { key: 'lease_end', label: 'Lease End' },
    { key: 'property', label: 'Property Name' },
    { key: 'unit', label: 'Unit Number' },
  ],
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(l =>
    l.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
  )
  return { headers, rows }
}

function guessMapping(headers: string[], fields: { key: string; label: string }[]) {
  const map: Record<string, string> = {}
  fields.forEach(f => {
    const match = headers.find(h =>
      h.toLowerCase().includes(f.key.toLowerCase()) ||
      h.toLowerCase().includes(f.label.toLowerCase()) ||
      f.label.toLowerCase().includes(h.toLowerCase())
    )
    if (match) map[f.key] = match
  })
  return map
}

export default function CsvImportModal({ type, properties, units = [], onClose, onDone }: Props) {
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'done'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const fields = FIELD_MAPS[type]

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCSV(text)
      setHeaders(headers)
      setRows(rows)
      setMapping(guessMapping(headers, fields))
      setStep('map')
    }
    reader.readAsText(file)
  }

  async function runImport() {
    setStep('importing')
    const errs: string[] = []
    let count = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const get = (key: string) => {
        const col = mapping[key]
        if (!col) return ''
        const idx = headers.indexOf(col)
        return idx >= 0 ? (row[idx] ?? '').trim() : ''
      }

      try {
        if (type === 'expenses') {
          const propName = get('property')
          const prop = properties.find(p => p.name.toLowerCase() === propName.toLowerCase())
          if (!prop) { errs.push(`Row ${i + 2}: property "${propName}" not found`); continue }
          const amount = parseFloat(get('amount').replace(/[$,]/g, ''))
          if (isNaN(amount)) { errs.push(`Row ${i + 2}: invalid amount`); continue }
          await supabase.from('expenses').insert({
            property_id: prop.id,
            amount,
            description: get('description') || 'Imported',
            category: get('category') || 'other',
            date: get('date') || new Date().toISOString().split('T')[0],
          })
          count++
        } else if (type === 'tenants') {
          const name = get('name')
          if (!name) { errs.push(`Row ${i + 2}: missing tenant name`); continue }
          const propName = get('property')
          const unitNum = get('unit')
          const prop = properties.find(p => p.name.toLowerCase() === propName.toLowerCase())
          const unit = units.find(u =>
            u.unit_number === unitNum &&
            (!prop || u.property_id === prop.id)
          )
          await supabase.from('tenants').insert({
            name,
            email: get('email') || null,
            phone: get('phone') || null,
            lease_start: get('lease_start') || null,
            lease_end: get('lease_end') || null,
            unit_id: unit?.id || null,
            property_id: prop?.id || null,
          })
          if (unit) await supabase.from('units').update({ is_occupied: true }).eq('id', unit.id)
          count++
        }
      } catch (e: any) {
        errs.push(`Row ${i + 2}: ${e.message}`)
      }
    }

    setImported(count)
    setErrors(errs)
    setStep('done')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Import {type === 'expenses' ? 'Expenses' : 'Tenants'} from CSV
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Upload step */}
        {step === 'upload' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Export your data as a CSV from Google Sheets, Excel, or any spreadsheet app, then upload it here.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Upload size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">Click to upload CSV</p>
              <p className="text-xs text-gray-400 mt-1">Columns can be in any order — we'll auto-match them</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Expected columns:</p>
              <p className="text-xs text-gray-400">{fields.map(f => f.label).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Mapping step */}
        {step === 'map' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {rows.length} rows found. Match your CSV columns to the right fields:
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {fields.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <p className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                  </p>
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep('upload')} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Back</button>
              <button onClick={runImport} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
                Import {rows.length} rows
              </button>
            </div>
          </div>
        )}

        {/* Importing */}
        {step === 'importing' && (
          <div className="text-center py-10">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Importing...</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={24} className="text-green-500" />
              <div>
                <p className="font-semibold text-gray-900">{imported} rows imported successfully</p>
                {errors.length > 0 && <p className="text-xs text-red-500">{errors.length} rows skipped</p>}
              </div>
            </div>
            {errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}
            <button onClick={onDone} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

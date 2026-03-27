import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  let message = ''
  let history: any[] = []
  let fileData: { base64: string; mimeType: string; name: string } | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    message = form.get('message') as string ?? ''
    history = JSON.parse((form.get('history') as string) ?? '[]')
    const file = form.get('file') as File | null
    if (file) {
      const buffer = await file.arrayBuffer()
      fileData = {
        base64: Buffer.from(buffer).toString('base64'),
        mimeType: file.type,
        name: file.name,
      }
    }
  } else {
    const body = await req.json()
    message = body.message
    history = body.history ?? []
  }

  const [properties, units, tenants, maintenance, expenses] = await Promise.all([
    supabase.from('properties').select('id, name, address, city, state'),
    supabase.from('units').select('id, unit_number, bedrooms, bathrooms, rent_amount, is_occupied, property_id, properties(name)'),
    supabase.from('tenants').select('id, name, email, phone, lease_start, lease_end, unit_id, property_id, units(unit_number, properties(name))'),
    supabase.from('maintenance_requests').select('id, title, status, priority, created_at, property_id, unit_id, properties(name), units(unit_number)').order('created_at', { ascending: false }).limit(20),
    supabase.from('expenses').select('id, amount, description, category, date, property_id, properties(name)').order('date', { ascending: false }).limit(20),
  ])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const systemPrompt = `You are PropEase AI, a concise property management assistant. Answer questions and take actions using the data below. If a file is attached, read and analyze it — if it contains expense or tenant data, offer to import it.

Today: ${today}

PROPERTIES: ${JSON.stringify(properties.data)}
UNITS: ${JSON.stringify(units.data)}
TENANTS: ${JSON.stringify(tenants.data)}
MAINTENANCE: ${JSON.stringify(maintenance.data)}
EXPENSES: ${JSON.stringify(expenses.data)}

When you need to take an action, include it anywhere in your response like this (no extra spaces):
<action>{"type":"ACTION_TYPE","data":{...}}</action>

Available action types:
- update_unit → data: { unit_id, updates: { is_occupied?, rent_amount? } }
- create_maintenance → data: { property_id, unit_id?, title, description?, priority (low/medium/high/urgent) }
- update_maintenance → data: { id, updates: { status (open/in_progress/completed) } }
- update_tenant → data: { id, updates: { name?, email?, phone?, lease_start?, lease_end? } }
- create_expense → data: { property_id, amount (number), description, category, date (YYYY-MM-DD) }
- create_tenant → data: { unit_id, property_id, name, email?, phone?, lease_start?, lease_end? }
- delete_maintenance → data: { id }
- bulk_expenses → data: { items: [{ property_id, amount, description, category, date }] }
- bulk_tenants → data: { items: [{ unit_id?, property_id?, name, email?, phone?, lease_start?, lease_end? }] }
- send_email → data: { to (email address), subject, body (plain text) }

Rules:
- Be concise and friendly
- Always use IDs from the data above — never make up IDs
- Confirm what you did after taking an action
- Format money as $X,XXX
- If something is ambiguous, ask one short clarifying question
- For bulk imports from files, use bulk_expenses or bulk_tenants actions`

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })

    const chat = model.startChat({
      history: history.map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
    })

    // Build message parts — text + optional file
    const parts: any[] = [{ text: message || 'Please analyze this file.' }]
    if (fileData) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        }
      })
    }

    const result = await chat.sendMessage(parts)
    const text = result.response.text()

    // Parse and execute all actions
    const actionMatches = [...text.matchAll(/<action>([\s\S]*?)<\/action>/g)]
    let actionTaken = false

    for (const match of actionMatches) {
      try {
        const action = JSON.parse(match[1])
        await executeAction(action)
        actionTaken = true
      } catch (e) {
        console.error('Action error:', e)
      }
    }

    const cleanMessage = text.replace(/<action>[\s\S]*?<\/action>/g, '').trim()
    return NextResponse.json({ message: cleanMessage, actionTaken })
  } catch (err) {
    console.error('Gemini error:', err)
    return NextResponse.json({ message: 'Something went wrong. Try again.', actionTaken: false }, { status: 500 })
  }
}

async function executeAction({ type, data }: { type: string; data: any }) {
  switch (type) {
    case 'update_unit':
      return supabase.from('units').update(data.updates).eq('id', data.unit_id)
    case 'create_maintenance':
      return supabase.from('maintenance_requests').insert({ ...data, status: 'open' })
    case 'update_maintenance':
      return supabase.from('maintenance_requests')
        .update({ ...data.updates, updated_at: new Date().toISOString() })
        .eq('id', data.id)
    case 'delete_maintenance':
      return supabase.from('maintenance_requests').delete().eq('id', data.id)
    case 'update_tenant':
      return supabase.from('tenants').update(data.updates).eq('id', data.id)
    case 'create_expense':
      return supabase.from('expenses').insert(data)
    case 'create_tenant':
      await supabase.from('tenants').insert(data)
      if (data.unit_id) await supabase.from('units').update({ is_occupied: true }).eq('id', data.unit_id)
      return
    case 'bulk_expenses':
      return supabase.from('expenses').insert(data.items)
    case 'bulk_tenants':
      for (const t of data.items) {
        await supabase.from('tenants').insert(t)
        if (t.unit_id) await supabase.from('units').update({ is_occupied: true }).eq('id', t.unit_id)
      }
      return
    case 'send_email': {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: data.to,
        subject: data.subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">${data.body.replace(/\n/g, '<br/>')}<hr style="margin-top:32px;border:none;border-top:1px solid #eee"/><p style="color:#999;font-size:12px;margin-top:12px">Sent via PropEase</p></div>`,
      })
      return
    }
    default:
      throw new Error(`Unknown action type: ${type}`)
  }
}

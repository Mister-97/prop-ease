import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  const { to, subject, body } = await req.json()

  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
        ${body.replace(/\n/g, '<br/>')}
        <hr style="margin-top:32px;border:none;border-top:1px solid #eee"/>
        <p style="color:#999;font-size:12px;margin-top:12px">Sent via PropEase</p>
      </div>`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

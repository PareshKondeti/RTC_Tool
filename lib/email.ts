'use server';

type SendInviteEmailParams = {
  to: string
  docTitle?: string
  inviterName?: string
  roomId: string
  access: string
}

export async function sendInviteEmail({ to, docTitle, inviterName, roomId, access }: SendInviteEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('Resend not configured. Skipping invite email.')
    return
  }

  // Avoid bundler static analysis requiring the module when not installed
  let ResendCtor: any
  try {
    // eslint-disable-next-line no-new-func
    const mod = await (Function("return import('resend')"))()
    ResendCtor = mod.Resend
  } catch (err) {
    console.warn('Resend SDK not installed. Skipping invite email.')
    return
  }

  const resend = new ResendCtor(apiKey)
  const from = process.env.RESEND_FROM || 'no-reply@example.com'

  const subject = `You have been granted ${access} access${docTitle ? ` to "${docTitle}"` : ''}`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">
      <h2 style="margin:0 0 12px">Document access granted</h2>
      <p>${inviterName ? inviterName : 'A collaborator'} granted you <b>${access}</b> access${docTitle ? ` to <b>${docTitle}</b>` : ''}.</p>
      <p>Open the document in your workspace to start collaborating.</p>
      <p style="margin-top:20px">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/documents/${roomId}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Open document</a>
      </p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
      <p style="color:#6b7280">This is an automated message; replies are not monitored.</p>
    </div>
  `

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('Failed to send invite email:', err)
  }
}



import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdminClient, getAdminEmail } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

// Same sender identity already used for the contact-form notification email
// (see app/api/contact/route.js) — override RESEND_FROM_EMAIL once a real
// beckyards.com sender is verified in Resend, since the resend.dev sandbox
// sender can only deliver to the Resend account's own verified address, not
// to an arbitrary customer's inbox.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const REPLY_FROM = process.env.RESEND_FROM_EMAIL || 'BeckYards Website <onboarding@resend.dev>';

// GET /api/admin/messages?filter=inbox|archived|all
export async function GET(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const filter = new URL(request.url).searchParams.get('filter') || 'inbox';

  let query = supabase
    .from('messages')
    .select('id, name, phone, email, address, message, created_at, read_at, archived, message_replies(id, to_email, body, sent_at)')
    .order('created_at', { ascending: false })
    .limit(300);

  if (filter === 'inbox') query = query.eq('archived', false);
  else if (filter === 'archived') query = query.eq('archived', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data || []).map((m) => ({
    ...m,
    message_replies: [...(m.message_replies || [])].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)),
  }));

  const unread = items.filter((m) => !m.read_at && !m.archived).length;
  return NextResponse.json({ items, unread, filter });
}

// POST { id, body } — email a reply to the original sender and log it against
// the message, so a quote request can be answered without leaving the admin
// panel for an external mail client.
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  if (!resend) {
    return NextResponse.json(
      {
        error:
          'Email sending isn\'t set up on this deployment yet: add RESEND_API_KEY in Vercel → ' +
          'Settings → Environment Variables, then redeploy.',
      },
      { status: 500 }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const id = payload?.id;
  const text = (payload?.body || '').trim();
  if (!id) return NextResponse.json({ error: 'Missing message id.' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'Write a reply first.' }, { status: 400 });

  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('id, name, email, message')
    .eq('id', id)
    .single();
  if (fetchError || !message) {
    return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
  }

  const { error: sendError } = await resend.emails.send({
    from: REPLY_FROM,
    to: message.email,
    replyTo: getAdminEmail(),
    subject: 'Re: your BeckYards quote request',
    text: `${text}\n\n---\n${message.name} originally wrote:\n${message.message}`,
  });
  if (sendError) {
    return NextResponse.json(
      { error: sendError.message || 'Could not send the email.' },
      { status: 502 }
    );
  }

  const { data: reply, error: insertError } = await supabase
    .from('message_replies')
    .insert([{ message_id: id, to_email: message.email, body: text }])
    .select('id, to_email, body, sent_at')
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);

  return NextResponse.json({ ok: true, reply });
}

// PATCH { id, action: 'read' | 'unread' | 'archive' | 'unarchive' }
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const { id, action } = body || {};
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const patch = {
    read: { read_at: new Date().toISOString() },
    unread: { read_at: null },
    archive: { archived: true, read_at: new Date().toISOString() },
    unarchive: { archived: false },
  }[action];

  if (!patch) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  const { error } = await supabase.from('messages').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE { id } — permanent. The UI confirms first; use Archive for the reversible path.
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body?.id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const { error } = await supabase.from('messages').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '../../../lib/supabaseClient';

// Where new quote requests are emailed. Resend's zero-setup sender
// (onboarding@resend.dev) only delivers to the Resend account's own email —
// switch to a beckyards.com address once that domain is verified in Resend.
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'oskelo.co@gmail.com';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request) {
  try {
    const { name, phone, email, address, message } = await request.json();

    if (!name || !email || !address || !message) {
      return NextResponse.json(
        { error: 'Name, email, address, and a description of the work are required.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('messages')
      .insert([{ name, phone, email, address, message }]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Could not save your request. Please try again.' },
        { status: 500 }
      );
    }

    if (resend) {
      try {
        await resend.emails.send({
          from: 'BeckYards Website <onboarding@resend.dev>',
          to: NOTIFY_EMAIL,
          replyTo: email,
          subject: `New quote request from ${name}`,
          text: `Name: ${name}\nPhone: ${phone || '(not provided)'}\nEmail: ${email}\nAddress: ${address}\n\n${message}`,
        });
      } catch (emailErr) {
        console.error('Resend email error:', emailErr);
      }
    } else {
      console.warn('RESEND_API_KEY not set — skipping email notification.');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact route error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

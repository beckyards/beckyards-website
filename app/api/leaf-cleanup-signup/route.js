import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { LEAF_CLEANUP_SEASON } from '../../../lib/seasons';

// Public endpoint (anon key; the table only allows inserts), so keep inputs
// bounded and ignore anything that isn't a string.
const MAX = { name: 120, phone: 40, email: 200, address: 300, notes: 1000 };

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = clean(body?.name, MAX.name);
    const phone = clean(body?.phone, MAX.phone);
    const email = clean(body?.email, MAX.email);
    const address = clean(body?.address, MAX.address);
    const notes = clean(body?.notes, MAX.notes);

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
    }

    const { error } = await supabase.from('leaf_cleanup_signups').insert([
      {
        name,
        phone,
        email: email || null,
        address: address || null,
        notes: notes || null,
        // Stamped here, never taken from the request body. (The table's insert
        // policy also blocks anonymous callers from pre-setting price/completed.)
        season: LEAF_CLEANUP_SEASON,
      },
    ]);

    if (error) {
      console.error('Leaf cleanup insert error:', error);
      return NextResponse.json(
        { error: 'Could not save your request. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Leaf cleanup signup route error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

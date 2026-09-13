import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

const VALID_SERVICE_TYPES = new Set(['aeration', 'aeration_overseeding']);

export async function POST(request) {
  try {
    const { name, phone, address, serviceType } = await request.json();

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: 'Name, phone, and address are all required.' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('aeration_signups').insert([
      {
        name,
        phone,
        address,
        service_type: VALID_SERVICE_TYPES.has(serviceType) ? serviceType : 'aeration_overseeding',
      },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Could not save your request. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Aeration signup route error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

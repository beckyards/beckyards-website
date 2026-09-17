import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { CONTENT_KEYS } from '../../../../lib/siteContent';
import { SERVICES } from '../../../../lib/services';
import { PROGRAMS } from '../../../../lib/programs';
import {
  HOME_DEFAULT,
  ABOUT_DEFAULT,
  CONTACT_PAGE_DEFAULT,
  PROMO_BAR_DEFAULT,
  FOOTER_DEFAULT,
  TERMS_DEFAULT,
  PORTFOLIO_DEFAULT,
} from '../../../../lib/pageContent';

const DEFAULTS = {
  services: SERVICES,
  programs: PROGRAMS,
  home: HOME_DEFAULT,
  about: ABOUT_DEFAULT,
  contact: CONTACT_PAGE_DEFAULT,
  promoBar: PROMO_BAR_DEFAULT,
  footer: FOOTER_DEFAULT,
  terms: TERMS_DEFAULT,
  portfolio: PORTFOLIO_DEFAULT,
};

// work/services/offers/terms.sections are lists; everything else here is one
// page's copy as a plain object. The saved value has to match that shape.
function isValidShape(key, value) {
  const wantsArray = Array.isArray(DEFAULTS[key]);
  return wantsArray ? Array.isArray(value) : value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function GET(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const key = new URL(request.url).searchParams.get('key');
  if (!CONTENT_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Unknown content key.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('site_content')
    .select('value, updated_at')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      key,
      value: DEFAULTS[key],
      isDefault: true,
      updatedAt: null,
    });
  }

  return NextResponse.json({
    key,
    value: data.value,
    isDefault: false,
    updatedAt: data.updated_at,
  });
}

export async function PUT(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const { key, value } = body || {};
  if (!CONTENT_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Unknown content key.' }, { status: 400 });
  }
  if (!isValidShape(key, value)) {
    return NextResponse.json(
      {
        error: Array.isArray(DEFAULTS[key])
          ? 'Content for this section must be a JSON array.'
          : 'Content for this section must be a JSON object.',
      },
      { status: 400 }
    );
  }
  if (Array.isArray(value) && value.length > 500) {
    return NextResponse.json({ error: 'That is too many entries.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('site_content')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// "Reset to built-in default" — drop the row so the site falls back to code.
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const key = body?.key;
  if (!CONTENT_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Unknown content key.' }, { status: 400 });
  }

  const { error } = await supabase.from('site_content').delete().eq('key', key);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, value: DEFAULTS[key] });
}

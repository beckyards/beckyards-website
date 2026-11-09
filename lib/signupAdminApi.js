import { NextResponse } from 'next/server';
import { requireAdminClient } from './adminAuth';

// Admin API shared by every "sign-up list" (aeration, leaf cleanup): list, edit a
// field in place, set a price, check off, drag-reorder, delete.
//
//   table          Supabase table name
//   columns        comma-separated select list
//   requiredText   text fields that can't be blanked (name, phone, address…)
//   optionalText   text fields that may be cleared back to null (email, notes…)
export function makeSignupAdminHandlers({ table, columns, requiredText, optionalText }) {
  async function GET() {
    const { client: supabase, error: authError } = await requireAdminClient();
    if (authError) return authError;

    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('sort_order', { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
  }

  // What this admin edits on the list:
  //   { id, <text field> }  -- any contact detail, in place
  //   { id, price }         -- what they're being charged
  //   { id, completed }     -- done or not
  //   { reorder: [ids] }    -- the visible list, top to bottom, after a manual move
  async function PATCH(request) {
    const { client: supabase, error: authError } = await requireAdminClient();
    if (authError) return authError;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
    }

    if (Array.isArray(body?.reorder)) {
      const ids = body.reorder;
      if (ids.length === 0 || ids.length > 500) {
        return NextResponse.json({ error: 'Invalid reorder list.' }, { status: 400 });
      }
      // First item keeps the highest sort_order (shown first, since the list
      // orders sort_order descending), counting down from there.
      const base = Date.now();
      for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase.from(table).update({ sort_order: base - i }).eq('id', ids[i]);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { id } = body || {};
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const patch = {};

    if ('price' in body) {
      let priceValue = null;
      if (body.price !== null && body.price !== undefined && body.price !== '') {
        priceValue = Number(body.price);
        if (!Number.isFinite(priceValue) || priceValue < 0) {
          return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
        }
      }
      patch.price = priceValue;
    }

    if ('completed' in body) {
      patch.completed = Boolean(body.completed);
    }

    for (const field of [...requiredText, ...optionalText]) {
      if (!(field in body)) continue;
      const value = typeof body[field] === 'string' ? body[field].trim() : body[field];
      if (requiredText.includes(field) && !value) {
        return NextResponse.json(
          { error: `${field[0].toUpperCase()}${field.slice(1)} can't be empty.` },
          { status: 400 }
        );
      }
      patch[field] = value || null; // optional fields may be cleared back to null
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { error } = await supabase.from(table).update(patch).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  // DELETE { id } — permanent, for a duplicate or mistaken signup.
  async function DELETE(request) {
    const { client: supabase, error: authError } = await requireAdminClient();
    if (authError) return authError;

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    if (!body?.id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { error } = await supabase.from(table).delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  return { GET, PATCH, DELETE };
}

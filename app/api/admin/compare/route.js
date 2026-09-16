import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { baseNameFrom, uploadToMedia } from '../../../../lib/mediaUpload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Both photos are cropped to this exact size so a portrait "before" next to a
// landscape "after" still lines up cleanly, regardless of the two originals'
// aspect ratios.
const HALF_WIDTH = 800;
const HALF_HEIGHT = 600;
const DIVIDER = 6;
const LABEL_MAX = 24;

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// A dark pill behind white text, burned into the corner of each half so the
// label survives being saved as a flat JPEG (no reliance on an <img> caption
// once it's placed elsewhere on the site).
function labelSvg(text) {
  const clean = escapeXml((text || '').slice(0, LABEL_MAX));
  const fontSize = 28;
  const boxWidth = Math.min(HALF_WIDTH - 24, clean.length * fontSize * 0.6 + 28);
  return Buffer.from(
    `<svg width="${HALF_WIDTH}" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="14" width="${boxWidth}" height="50" rx="8" fill="rgba(0,0,0,0.6)" />
      <text x="28" y="${14 + 50 / 2 + fontSize * 0.35}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${clean}</text>
    </svg>`
  );
}

// The two photos are already-uploaded media (see CompareView's picker), so
// this just re-downloads them from Supabase's public URL rather than
// accepting a fresh multipart upload — sidesteps Vercel's ~4.5 MB request
// body cap entirely, the same problem /api/admin/enhance works around.
async function fetchHalf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download that photo.');
  const buf = Buffer.from(await res.arrayBuffer());
  return sharp(buf).rotate().resize(HALF_WIDTH, HALF_HEIGHT, { fit: 'cover' }).toBuffer();
}

// POST { beforeUrl, afterUrl, beforeLabel, afterLabel, layout, save } —
// composites two already-uploaded photos into one side-by-side (or stacked)
// comparison image. `save=1` uploads the result to the media library,
// otherwise it just returns a preview.
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const beforeUrl = body?.beforeUrl;
  const afterUrl = body?.afterUrl;
  if (!beforeUrl || !afterUrl) {
    return NextResponse.json({ error: 'Pick a before photo and an after photo.' }, { status: 400 });
  }
  const layout = body.layout === 'vertical' ? 'vertical' : 'horizontal';
  const beforeLabel = (body.beforeLabel || 'Before').trim() || 'Before';
  const afterLabel = (body.afterLabel || 'After').trim() || 'After';
  const wantsSave = body.save === true || body.save === '1';

  try {
    const [beforeImg, afterImg] = await Promise.all([fetchHalf(beforeUrl), fetchHalf(afterUrl)]);

    const horizontal = layout === 'horizontal';
    const canvasWidth = horizontal ? HALF_WIDTH * 2 + DIVIDER : HALF_WIDTH;
    const canvasHeight = horizontal ? HALF_HEIGHT : HALF_HEIGHT * 2 + DIVIDER;
    const beforePos = { left: 0, top: 0 };
    const afterPos = horizontal
      ? { left: HALF_WIDTH + DIVIDER, top: 0 }
      : { left: 0, top: HALF_HEIGHT + DIVIDER };

    const outputBuffer = await sharp({
      create: { width: canvasWidth, height: canvasHeight, channels: 3, background: '#dddddd' },
    })
      .composite([
        { input: beforeImg, ...beforePos },
        { input: afterImg, ...afterPos },
        { input: labelSvg(beforeLabel), left: beforePos.left, top: beforePos.top + HALF_HEIGHT - 80 },
        { input: labelSvg(afterLabel), left: afterPos.left, top: afterPos.top + HALF_HEIGHT - 80 },
      ])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    if (!wantsSave) {
      return NextResponse.json({
        preview: `data:image/jpeg;base64,${outputBuffer.toString('base64')}`,
        bytes: outputBuffer.length,
      });
    }

    const base = `${baseNameFrom(`${beforeLabel}-${afterLabel}`)}-compare`;
    const { name, url } = await uploadToMedia(supabase, outputBuffer, base, 'jpg', 'image/jpeg');
    return NextResponse.json({ name, url, bytes: outputBuffer.length });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Could not generate the comparison image.' },
      { status: 500 }
    );
  }
}

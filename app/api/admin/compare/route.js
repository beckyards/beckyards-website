import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import * as opentype from 'opentype.js';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { baseNameFrom, uploadToMedia } from '../../../../lib/mediaUpload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The shared half-frame's larger side is capped at this size; the other side
// is derived from the two photos' own aspect ratio (clamped) so a vertical
// (portrait) pair stays vertical instead of being forced into a landscape
// box — and a landscape pair still gets the old, familiar 800x600-ish shape.
const MAX_DIM = 800;
const MIN_RATIO = 0.5; // no more extreme than a 1:2 portrait
const MAX_RATIO = 2; // no more extreme than a 2:1 landscape
const DIVIDER = 6;
const LABEL_MAX = 24;

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

// SVG <text> relies on system fonts being installed and discoverable via
// fontconfig — Vercel's serverless functions ship none, so labels rendered
// that way came out as tofu squares in production (this worked fine in local
// dev, which has real fonts, which is exactly why it slipped through).
// Converting the label to vector glyph outlines up front sidesteps font
// rendering at composite time entirely: sharp/librsvg just draws shapes.
const LABEL_FONT = opentype.parse(
  (() => {
    const buf = fs.readFileSync(path.join(process.cwd(), 'lib/fonts/Archivo-Bold.woff'));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  })()
);

// Lays out one glyph at a time rather than using the font's own shaper —
// opentype.js's GSUB/ligature support throws on some lookup types present in
// modern Google Fonts builds. Fine here: labels are short plain-ASCII text
// with no ligatures to worry about.
function textPath(text, fontSize) {
  const scale = fontSize / LABEL_FONT.unitsPerEm;
  let x = 0;
  const parts = [];
  for (const ch of text) {
    const glyph = LABEL_FONT.charToGlyph(ch);
    parts.push(glyph.getPath(x, 0, fontSize).toPathData(2));
    x += glyph.advanceWidth * scale;
  }
  return { d: parts.join(' '), width: x };
}

// A dark pill behind white text, burned into the corner of each half so the
// label survives being saved as a flat JPEG (no reliance on an <img> caption
// once it's placed elsewhere on the site).
function labelSvg(text, halfWidth) {
  const clean = (text || '').slice(0, LABEL_MAX);
  const fontSize = 28;
  const { d, width: textWidth } = textPath(clean, fontSize);
  const boxWidth = Math.min(halfWidth - 24, textWidth + 28);
  const pillY = 14;
  const pillHeight = 50;
  const ascent = (LABEL_FONT.ascender / LABEL_FONT.unitsPerEm) * fontSize;
  const descent = (LABEL_FONT.descender / LABEL_FONT.unitsPerEm) * fontSize;
  const baselineY = pillY + (pillHeight - (ascent - descent)) / 2 + ascent;
  return Buffer.from(
    `<svg width="${halfWidth}" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="${pillY}" width="${boxWidth}" height="${pillHeight}" rx="8" fill="rgba(0,0,0,0.6)" />
      <path d="${d}" fill="#ffffff" transform="translate(28, ${baselineY})" />
    </svg>`
  );
}

// The two photos are already-uploaded media (see CompareView's picker), so
// this just re-downloads them from Supabase's public URL rather than
// accepting a fresh multipart upload — sidesteps Vercel's ~4.5 MB request
// body cap entirely, the same problem /api/admin/enhance works around.
// Downloads and auto-orients (EXIF) a photo, returning its real pixel size —
// reading dimensions off the already-rotated output buffer rather than
// `metadata()`, since sharp's metadata() reports the pre-rotation size.
async function fetchOriented(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download that photo.');
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf).rotate().toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
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
    const [before, after] = await Promise.all([fetchOriented(beforeUrl), fetchOriented(afterUrl)]);

    // Shared half-frame shape follows the two photos' own aspect ratio
    // (averaged, then clamped) instead of a fixed landscape box — so two
    // vertical phone photos come out vertical, not cropped down to a
    // landscape sliver.
    const avgRatio = clamp((before.width / before.height + after.width / after.height) / 2, MIN_RATIO, MAX_RATIO);
    const halfWidth = avgRatio >= 1 ? MAX_DIM : Math.round(MAX_DIM * avgRatio);
    const halfHeight = avgRatio >= 1 ? Math.round(MAX_DIM / avgRatio) : MAX_DIM;

    const [beforeImg, afterImg] = await Promise.all([
      sharp(before.buffer).resize(halfWidth, halfHeight, { fit: 'cover' }).toBuffer(),
      sharp(after.buffer).resize(halfWidth, halfHeight, { fit: 'cover' }).toBuffer(),
    ]);

    const horizontal = layout === 'horizontal';
    const canvasWidth = horizontal ? halfWidth * 2 + DIVIDER : halfWidth;
    const canvasHeight = horizontal ? halfHeight : halfHeight * 2 + DIVIDER;
    const beforePos = { left: 0, top: 0 };
    const afterPos = horizontal
      ? { left: halfWidth + DIVIDER, top: 0 }
      : { left: 0, top: halfHeight + DIVIDER };

    const outputBuffer = await sharp({
      create: { width: canvasWidth, height: canvasHeight, channels: 3, background: '#dddddd' },
    })
      .composite([
        { input: beforeImg, ...beforePos },
        { input: afterImg, ...afterPos },
        { input: labelSvg(beforeLabel, halfWidth), left: beforePos.left, top: beforePos.top + halfHeight - 80 },
        { input: labelSvg(afterLabel, halfWidth), left: afterPos.left, top: afterPos.top + halfHeight - 80 },
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

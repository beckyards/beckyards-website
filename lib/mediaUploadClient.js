'use client';

import { createClient } from './supabase/browser';

// Uploads files from the browser straight to Supabase Storage's scratch
// bucket via a signed URL, bypassing Vercel's ~4.5 MB request body limit for
// serverless functions (a real phone photo exceeds that easily), then asks
// the server to validate/convert (HEIC included) and move each one into the
// public `media` bucket. Shared by every place in the admin that uploads to
// Images: the Images page itself, the global drop-anywhere zone, and the
// Content editor's image/gallery fields.
export async function uploadFilesToMedia(fileList) {
  const files = Array.from(fileList || []);
  const refs = [];
  const errors = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        const res = await fetch('/api/admin/media/upload-url', { method: 'POST' });
        const { path, token, error } = await res.json().catch(() => ({}));
        if (!res.ok || !path) throw new Error(error || 'Could not start the upload.');

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from('enhance-tmp')
          .uploadToSignedUrl(path, token, file);
        if (uploadError) throw new Error(uploadError.message || 'Upload failed.');

        refs.push({ tmpPath: path, name: file.name, type: file.type });
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    })
  );

  if (refs.length === 0) {
    return { uploaded: [], errors: errors.length ? errors : ['Upload failed.'] };
  }

  const res = await fetch('/api/admin/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: refs }),
  });
  const data = await res.json().catch(() => ({}));

  return {
    uploaded: data.uploaded || [],
    errors: [...errors, ...(data.errors || [])],
    error: data.error && !data.uploaded?.length ? data.error : undefined,
  };
}

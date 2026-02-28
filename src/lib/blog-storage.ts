import { createClient } from '@/utils/supabase/client';

const BLOG_BUCKET = 'blog-media';

/**
 * Upload a file to the blog-media bucket in Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadBlogImage(file: File): Promise<string> {
  const supabase = createClient();

  // Generate unique path: blog-media/YYYY/MM/timestamp-filename
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
  const filePath = `${year}/${month}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BLOG_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Error subiendo imagen: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BLOG_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete a file from the blog-media bucket by its full public URL.
 */
export async function deleteBlogImage(publicUrl: string): Promise<void> {
  const supabase = createClient();

  // Extract the path after /blog-media/
  const marker = `/object/public/${BLOG_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const filePath = publicUrl.slice(idx + marker.length);

  const { error } = await supabase.storage
    .from(BLOG_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Error eliminando imagen del blog:', error.message);
  }
}

/**
 * TinyMCE images_upload_handler compatible function.
 * Use in the TinyMCE init config.
 */
export function tinyMCEImageUploadHandler(
  blobInfo: { blob: () => Blob; filename: () => string },
  progress?: (percent: number) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      progress?.(0);
      const file = new File([blobInfo.blob()], blobInfo.filename(), {
        type: blobInfo.blob().type,
      });
      progress?.(50);
      const url = await uploadBlogImage(file);
      progress?.(100);
      resolve(url);
    } catch (err: unknown) {
      reject(err instanceof Error ? err.message : 'Error al subir imagen');
    }
  });
}

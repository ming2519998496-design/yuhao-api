-- 对话历史中的图像/视频文件（仅链接指向此桶，数据库不存 base64）
-- SQL Editor → Create a new snippet → Run

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  83886080,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 83886080,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']::text[];

DROP POLICY IF EXISTS "chat_media_public_read" ON storage.objects;
CREATE POLICY "chat_media_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-media');

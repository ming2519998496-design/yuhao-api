-- 收款码图片 Storage（在 supabase-admin-schema.sql 之后执行）
-- 也可不执行：上传接口会尝试用 service_role 自动创建桶

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qrcodes',
  'payment-qrcodes',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- 公开读（充值页展示收款码）
DROP POLICY IF EXISTS "payment_qrcodes_public_read" ON storage.objects;
CREATE POLICY "payment_qrcodes_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-qrcodes');

-- 管理员通过 service_role 上传（服务端 API），无需额外 INSERT 策略

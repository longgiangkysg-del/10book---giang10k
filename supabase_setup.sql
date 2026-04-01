-- ═══════════════════════════════════════════════════════════
-- SPRINT 1: Shared Gemini Key — Rate Limiting Table
-- Chạy lệnh này trong Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Tạo bảng theo dõi lượt dùng shared key
CREATE TABLE IF NOT EXISTS shared_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  used_at date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 1,
  UNIQUE(user_id, used_at)
);

-- 2. RLS: User chỉ thao tác record của chính mình
ALTER TABLE shared_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_usage" ON shared_key_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_insert_own_usage" ON shared_key_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. RPC function để increment an toàn (tránh race condition)
--    Dùng upsert: nếu đã có record hôm nay thì count+1, chưa có thì tạo mới với count=1
CREATE OR REPLACE FUNCTION increment_shared_key_usage(p_user_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO shared_key_usage (user_id, used_at, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, used_at)
  DO UPDATE SET count = shared_key_usage.count + 1;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- SPRINT 2: Public Book Pages (SEO)
-- Cho phép người chưa đăng nhập đọc sách đã phân tích
-- ═══════════════════════════════════════════════════════════

-- 1. Cho phép anonymous (chưa đăng nhập) SELECT sách đã phân tích
--    Chỉ sách có is_summarized = true mới được công khai
CREATE POLICY "anon_read_analyzed_books" ON books
  FOR SELECT
  TO anon
  USING (is_summarized = true);

-- ═══════════════════════════════════════════════════════════
-- ADMIN: quyền xoá sách vĩnh viễn trên bảng books
-- Chạy trong Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════
--
-- VÌ SAO CẦN: RLS đang bật trên books nhưng không có policy DELETE nào.
-- PostgREST khi đó trả 204 + error null → app tưởng xoá thành công,
-- thực tế không hàng nào bị xoá. Đây là chốt chặn thật ở phía database,
-- không phải ở trình duyệt (mã client ai cũng sửa được).

-- 1. Hàm nhận diện admin theo email trong JWT.
--    Danh sách này phải khớp ADMIN_EMAILS trong services/supabaseClient.ts
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (array['longgiangptit@gmail.com']);
$$;

-- 2. Policy: chỉ admin đã đăng nhập mới xoá được sách
drop policy if exists "admin_delete_books" on books;
create policy "admin_delete_books" on books
  for delete
  to authenticated
  using (public.is_admin());

-- 3. Kiểm tra: chạy xong câu này phải thấy dòng admin_delete_books / DELETE
select policyname, cmd, roles
from pg_policies
where tablename = 'books'
order by policyname;

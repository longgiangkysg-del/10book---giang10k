/**
 * Cửa xem thử dành cho lúc phát triển: bỏ qua màn đăng nhập Google để soát
 * giao diện, điều hướng và bố cục mà không cần phiên đăng nhập thật.
 *
 * KHÔNG BAO GIỜ lọt lên bản chạy thật. Hai chốt chặn cùng lúc:
 *   1. `import.meta.env.DEV` chỉ đúng khi chạy `npm run dev`. `npm run build`
 *      đặt nó thành false, nên nhánh này bị bộ nén cắt bỏ khỏi bundle.
 *   2. Còn phải tự khai `VITE_DEV_PREVIEW=1` trong `.env.local` (đã gitignore),
 *      nên máy nào không khai thì chạy dev vẫn thấy màn đăng nhập như thường.
 *
 * Chế độ này CHỈ giả một phiên đăng nhập ở phía trình duyệt. Mọi lệnh ghi và
 * xoá vẫn đi qua RLS của Supabase với khoá anon, tức là vẫn bị chặn — xem thì
 * được, sửa dữ liệu thật thì không.
 */
export const DEV_PREVIEW =
  import.meta.env.DEV && import.meta.env.VITE_DEV_PREVIEW === '1';

/** Phiên giả vừa đủ để App đi qua cổng đăng nhập. */
export const DEV_PREVIEW_SESSION = {
  user: {
    id: 'dev-preview',
    email: 'xem-thu@local',
    user_metadata: { full_name: 'Chế độ xem thử', avatar_url: '' },
  },
};

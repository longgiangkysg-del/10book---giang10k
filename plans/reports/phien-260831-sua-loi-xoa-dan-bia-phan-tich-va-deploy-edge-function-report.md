# Phiên 31/08/2026 — sửa lỗi xoá/dán bìa/phân tích, nối Codex, deploy edge function

Nhánh `master`. Commit đầu phiên `40f50a6` → cuối phiên `9bee390` (chưa tính commit của phiên song song).

## Lỗi đã sửa

| Việc | Gốc rễ | Commit |
|---|---|---|
| Admin không xoá được sách | `.delete()` không `.select()` → RLS chặn nhưng PostgREST trả 204 + `error: null`, app báo thành công | `e716cd7` |
| Không dán được bìa bằng Ctrl+V | Chỉ có `<input type=file>`, không có handler `paste` | `c385c56` |
| Phân tích ra "Không thể trích xuất" | Prompt không đưa văn bản sách; AI từ chối nhưng đúng khuôn JSON nên được lưu | `b0615b4` |
| Dấu `*` vỡ, chữ toàn trắng | `MarkdownText` không nhận gạch đầu dòng `*` → bộ dò *nghiêng* ăn nhầm | `5ab6640` |
| Header chiếm chỗ | Gom tên sách + nút + tab về một hàng dính, ~230px → ~62px | `76aa939` |

## Codex CLI thay API

`scripts/analyze-books.ts` thay `scripts/claude-analyze.mjs`: chạy 3 agent qua `codex exec`
(gói ChatGPT, 0 đồng API), gộp, soát rồi ghi Supabase. Song song trong một cuốn, tuần tự
giữa các cuốn. Prompt gom về `services/analysis-prompts.ts`, ngưỡng chặn về
`services/analysis-guard.ts` — app và script dùng chung (`1808edd`, `94cd92b`).

Chạy: `export SUPABASE_SERVICE_KEY=... && node scripts/analyze-books.ts analyze --all --limit 5`

## Edge function

- Thư mục `gemini-proxy` → `dynamic-responder` cho khớp slug thật (`5fa27be`).
  Function có `slug: dynamic-responder` nhưng `name: gemini-proxy`; deploy theo tên thư mục
  sẽ tạo function thừa và để bản thật chạy mã cũ.
- **Bản đang chạy cũ hơn repo 5 tháng** (version 11, 07/03; repo sửa 01/04 chưa từng deploy).
  Deploy kéo theo: quota 1 lượt/ngày → 1 lượt/tháng, gỡ `MAINTENANCE_GATE`, 5 sửa lỗi khác.
- Model `gemini-2.5-pro` → `gemini-3.1-pro-preview` khớp app (`ac4bd61`).
- **Lỗ hổng:** function chỉ `atob` payload JWT để lấy `sub`, không kiểm chữ ký. URL + anon key
  đều trong repo public → ai cũng bịa token đốt khoá Gemini chung không giới hạn (Gemini bị
  gọi trước bước ghi nhận lượt). Đổi sang `auth.getUser(userToken)` (`6af7b54`).

Version cuối: **13**, ACTIVE.

## Số đo (31/08, từ máy Mac)

- `fetchAllBooks` 277 cuốn (anon): **537 KB / 689ms**. Đăng nhập thấy 630 cuốn → ~1,2 MB.
- `user_ids` chiếm 7% payload (37 KB) — không phải chỗ nặng nhất.
- `fetchBookAnalysis` một cuốn: **50 KB / ~170–300ms**.
- Kho sách: 630 cuốn, 277 đã phân tích, 353 chưa.
- Người dùng: 209, chỉ 29 có key riêng → **180 người phụ thuộc khoá chung**.

## Kiểm chứng đã làm

- Dán ảnh: chạy thật trong trình duyệt, clipboard → File → nén → data URL.
- Markdown: 0 dấu sao thừa, 4 gạch đầu dòng, tiêu đề `#60A5FA` / đậm `#93C5FD` / thân `#E6EAF0`.
- Header: chụp ảnh cả desktop lẫn mobile.
- Edge function: token bịa → 401, token thật → 429 quota (auth pass).
- Policy xoá: admin xoá được 1 hàng; người thường 0 hàng, `error: null` — đúng bẫy ban đầu.
  Cuốn thử và user thử đã dọn sạch.

## Còn treo

- **Work Zone xoay ~2s khi mới vào app.** Nguyên nhân: `handlePostLogin` chạy tuần tự
  `ensureProfile` → `loadProviderConfig` → `Promise.all(quota, isAdmin)` → `await loadData()`
  (~1,2 MB) → `loadActivities()`; effect nạp `analysis` phải đợi `books` có dữ liệu mới chạy,
  dù nó không phụ thuộc gì vào danh sách sách. Hướng sửa: gộp các bước độc lập vào `Promise.all`,
  và khi URL có `#/book/<id>` thì nạp analysis song song ngay từ đầu (cache qua `useRef`,
  `loadData` merge lại). Thêm cache `localStorage` theo `updated_at` để lần sau hiện tức thì.
  **Chưa làm — App.tsx đang có phiên song song sửa, dễ xung đột.**
- Service key đã lộ trong bản ghi phiên; muốn xoay thì phải sửa anon key nằm cứng trong mã trước.

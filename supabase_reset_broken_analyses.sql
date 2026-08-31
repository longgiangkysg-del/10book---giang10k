-- ═══════════════════════════════════════════════════════════
-- Gỡ cờ "đã phân tích" của 31 cuốn có nội dung hỏng
-- Chạy trong Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Soát ngày 31/08/2026 · ngưỡng lấy từ services/analysis-guard.ts
-- ═══════════════════════════════════════════════════════════
--
-- VÌ SAO: cả 31 cuốn đang mang cờ is_summarized = true nhưng ruột rỗng
-- hoặc thiếu nửa (không có phần tri thức, hoặc không có ý tưởng). Cờ sai làm
-- hai việc hỏng theo: bộ lọc "Chưa phân tích" trong Kho sách không thấy chúng,
-- và nút Batch Analyze bỏ qua đúng những cuốn cần chạy lại nhất.
--
-- KHÔNG xoá cột analysis — nội dung cũ giữ nguyên để còn đối chiếu và lùi lại
-- được. Chạy lại phân tích sẽ ghi đè.

-- ── 1. Xem trước: phải ra đúng 31 dòng ─────────────────────────
select id, title, author, is_summarized
from books
where id in (
    '3a0da6b5-27ec-4421-9a15-af1f90635ebc',   -- Bắt Đầu Với Câu Hỏi TẠI SAO
    'd727375a-2624-49a2-ba6e-0d49855df9aa',   -- Goethe zertifikat b1
    'e8cd96d3-bc75-47a0-b608-15aeb592cbea',   -- Kế Hoạch Kinh Doanh Trong 1 Giờ
    '6e1205d5-e4b5-48d0-ace1-0a576ff02cff',   -- Mật Mã Văn Hóa: Bí Mật Của Các Nhóm Thành Công Vượt Trội
    '68806790-9ffd-4bce-8bf0-280eb0648b3e',   -- Phép Lạ Của Sự Tỉnh Thức
    '6ccec44b-3cd3-4899-9f6a-6a5990caf799',   -- QUYỀN LỰC LÃNH ĐẠO
    'a46c22c7-710c-41e0-82ce-02bbfec4eb81',   -- Quân Vương
    'fcf6cee8-1301-4f65-ad2c-00f4edf7e20d',   -- Rich Habits - Poor Habits - Sự Khác Biệt Giữa Người Giàu Và Người Nghèo
    'fe4a1fd6-cacf-4f10-9094-9295408cb481',   -- Sapiens: Lược Sử Loài Người
    '792f278d-5241-4ce4-a6ff-b7be29617f61',   -- Sách Siêu Cò - How To Be A Power Connector
    'ae8818b9-d2cc-45d6-b3b9-2563f2989e47',   -- Sống trong thế giới đàn ông
    'fe1f4e04-647c-42c9-9b9c-52fdf2ddeae7',   -- Sự Thật Mất Lòng Về Đàn Ông Đàn Bà Và Tiền Bạc
    '33194701-fda6-4b66-b382-a3677b14aa6d',   -- The E-Myth Revisited - Để Xây Dựng Doanh Nghiệp Hiệu Quả
    'e612df39-05de-4e48-a87a-df2e753b115a',   -- The Guide To Going Viral
    'cc5c835a-79d9-4906-83f6-67b1a4e609e3',   -- Thinkertoys
    '958b900f-2a45-49bf-abc2-cdaef5786aff',   -- Trí Tuệ Cảm Xúc - Emotional Intelligence
    'f489171d-c5f6-4a05-8a91-8059795dcb43',   -- 100M Lead
    'e2b06b92-2359-44a5-b533-e0d0797be146',   -- Hành Trình Về Phương Đông
    '144d3ece-c6ca-4c0b-b5d8-98161b528476',   -- 50 Điều Trường Học Không Dạy Bạn Và 20 Điều Cần Làm Trước Khi Rời Ghế Nhà Trường
    '6f167444-5039-47ef-ba57-2ebf22d0afad',   -- Bán Hàng Đỉnh Cao
    '1b0c410f-cc95-453e-905f-2cb93934da94',   -- Bí Mật tìm kiếm cổ phiếu ngoại hạng
    'd7defedf-e45e-41fe-ace0-f3072b2e9255',   -- Chiến Thắng Con Quỷ Trong Bạn
    '50e175a4-005d-4618-978c-9d92d54afe7f',   -- Câu Lạc Bộ 5 Giờ Sáng
    '6db59561-d7ce-4e00-ac31-3a55b6775250',   -- Dọn Dẹp Căn Nhà Và Đời Người
    '93bb5a8f-8286-40ce-9855-4222fdb4c586',   -- Ego Is The Enemy - Bản Ngã Là Kẻ Thù
    '67c0cfa6-a580-403b-bab2-45f83c0cb29e',   -- Làm Ra Làm Chơi Ra Chơi - Deep Work
    '0ba9a76d-87ff-41da-b847-d38445512625',   -- Nonviolent Communication - Giao Tiếp Bất Bạo Động
    'abcbbfec-48d9-4db9-a494-1e7950c191a2',   -- Super Thinking - Siêu Tư Duy
    '49873d78-e94a-451b-82d3-70b5193ac72d',   -- Tư Duy Làm Giàu Của Người Do Thái
    '9d4e5b12-63c1-4e1c-878d-bdbdd57d01ef',   -- Ăn kiêng cũng phải sướng
    'aac5be8b-f604-4c8e-967b-12c1f9b7c078'    -- Outlive - Sống Lâu Hơn
)
order by title;

-- ── 2. Gỡ cờ ────────────────────────────────────────────────
update books
set is_summarized = false,
    updated_at = now()
where id in (
    '3a0da6b5-27ec-4421-9a15-af1f90635ebc',   -- Bắt Đầu Với Câu Hỏi TẠI SAO
    'd727375a-2624-49a2-ba6e-0d49855df9aa',   -- Goethe zertifikat b1
    'e8cd96d3-bc75-47a0-b608-15aeb592cbea',   -- Kế Hoạch Kinh Doanh Trong 1 Giờ
    '6e1205d5-e4b5-48d0-ace1-0a576ff02cff',   -- Mật Mã Văn Hóa: Bí Mật Của Các Nhóm Thành Công Vượt Trội
    '68806790-9ffd-4bce-8bf0-280eb0648b3e',   -- Phép Lạ Của Sự Tỉnh Thức
    '6ccec44b-3cd3-4899-9f6a-6a5990caf799',   -- QUYỀN LỰC LÃNH ĐẠO
    'a46c22c7-710c-41e0-82ce-02bbfec4eb81',   -- Quân Vương
    'fcf6cee8-1301-4f65-ad2c-00f4edf7e20d',   -- Rich Habits - Poor Habits - Sự Khác Biệt Giữa Người Giàu Và Người Nghèo
    'fe4a1fd6-cacf-4f10-9094-9295408cb481',   -- Sapiens: Lược Sử Loài Người
    '792f278d-5241-4ce4-a6ff-b7be29617f61',   -- Sách Siêu Cò - How To Be A Power Connector
    'ae8818b9-d2cc-45d6-b3b9-2563f2989e47',   -- Sống trong thế giới đàn ông
    'fe1f4e04-647c-42c9-9b9c-52fdf2ddeae7',   -- Sự Thật Mất Lòng Về Đàn Ông Đàn Bà Và Tiền Bạc
    '33194701-fda6-4b66-b382-a3677b14aa6d',   -- The E-Myth Revisited - Để Xây Dựng Doanh Nghiệp Hiệu Quả
    'e612df39-05de-4e48-a87a-df2e753b115a',   -- The Guide To Going Viral
    'cc5c835a-79d9-4906-83f6-67b1a4e609e3',   -- Thinkertoys
    '958b900f-2a45-49bf-abc2-cdaef5786aff',   -- Trí Tuệ Cảm Xúc - Emotional Intelligence
    'f489171d-c5f6-4a05-8a91-8059795dcb43',   -- 100M Lead
    'e2b06b92-2359-44a5-b533-e0d0797be146',   -- Hành Trình Về Phương Đông
    '144d3ece-c6ca-4c0b-b5d8-98161b528476',   -- 50 Điều Trường Học Không Dạy Bạn Và 20 Điều Cần Làm Trước Khi Rời Ghế Nhà Trường
    '6f167444-5039-47ef-ba57-2ebf22d0afad',   -- Bán Hàng Đỉnh Cao
    '1b0c410f-cc95-453e-905f-2cb93934da94',   -- Bí Mật tìm kiếm cổ phiếu ngoại hạng
    'd7defedf-e45e-41fe-ace0-f3072b2e9255',   -- Chiến Thắng Con Quỷ Trong Bạn
    '50e175a4-005d-4618-978c-9d92d54afe7f',   -- Câu Lạc Bộ 5 Giờ Sáng
    '6db59561-d7ce-4e00-ac31-3a55b6775250',   -- Dọn Dẹp Căn Nhà Và Đời Người
    '93bb5a8f-8286-40ce-9855-4222fdb4c586',   -- Ego Is The Enemy - Bản Ngã Là Kẻ Thù
    '67c0cfa6-a580-403b-bab2-45f83c0cb29e',   -- Làm Ra Làm Chơi Ra Chơi - Deep Work
    '0ba9a76d-87ff-41da-b847-d38445512625',   -- Nonviolent Communication - Giao Tiếp Bất Bạo Động
    'abcbbfec-48d9-4db9-a494-1e7950c191a2',   -- Super Thinking - Siêu Tư Duy
    '49873d78-e94a-451b-82d3-70b5193ac72d',   -- Tư Duy Làm Giàu Của Người Do Thái
    '9d4e5b12-63c1-4e1c-878d-bdbdd57d01ef',   -- Ăn kiêng cũng phải sướng
    'aac5be8b-f604-4c8e-967b-12c1f9b7c078'    -- Outlive - Sống Lâu Hơn
);

-- ── 3. Kiểm lại: da_go phải bằng tong, và bằng 31 ──────────────
select count(*) filter (where is_summarized = false) as da_go,
       count(*)                                      as tong
from books
where id in (
    '3a0da6b5-27ec-4421-9a15-af1f90635ebc',   -- Bắt Đầu Với Câu Hỏi TẠI SAO
    'd727375a-2624-49a2-ba6e-0d49855df9aa',   -- Goethe zertifikat b1
    'e8cd96d3-bc75-47a0-b608-15aeb592cbea',   -- Kế Hoạch Kinh Doanh Trong 1 Giờ
    '6e1205d5-e4b5-48d0-ace1-0a576ff02cff',   -- Mật Mã Văn Hóa: Bí Mật Của Các Nhóm Thành Công Vượt Trội
    '68806790-9ffd-4bce-8bf0-280eb0648b3e',   -- Phép Lạ Của Sự Tỉnh Thức
    '6ccec44b-3cd3-4899-9f6a-6a5990caf799',   -- QUYỀN LỰC LÃNH ĐẠO
    'a46c22c7-710c-41e0-82ce-02bbfec4eb81',   -- Quân Vương
    'fcf6cee8-1301-4f65-ad2c-00f4edf7e20d',   -- Rich Habits - Poor Habits - Sự Khác Biệt Giữa Người Giàu Và Người Nghèo
    'fe4a1fd6-cacf-4f10-9094-9295408cb481',   -- Sapiens: Lược Sử Loài Người
    '792f278d-5241-4ce4-a6ff-b7be29617f61',   -- Sách Siêu Cò - How To Be A Power Connector
    'ae8818b9-d2cc-45d6-b3b9-2563f2989e47',   -- Sống trong thế giới đàn ông
    'fe1f4e04-647c-42c9-9b9c-52fdf2ddeae7',   -- Sự Thật Mất Lòng Về Đàn Ông Đàn Bà Và Tiền Bạc
    '33194701-fda6-4b66-b382-a3677b14aa6d',   -- The E-Myth Revisited - Để Xây Dựng Doanh Nghiệp Hiệu Quả
    'e612df39-05de-4e48-a87a-df2e753b115a',   -- The Guide To Going Viral
    'cc5c835a-79d9-4906-83f6-67b1a4e609e3',   -- Thinkertoys
    '958b900f-2a45-49bf-abc2-cdaef5786aff',   -- Trí Tuệ Cảm Xúc - Emotional Intelligence
    'f489171d-c5f6-4a05-8a91-8059795dcb43',   -- 100M Lead
    'e2b06b92-2359-44a5-b533-e0d0797be146',   -- Hành Trình Về Phương Đông
    '144d3ece-c6ca-4c0b-b5d8-98161b528476',   -- 50 Điều Trường Học Không Dạy Bạn Và 20 Điều Cần Làm Trước Khi Rời Ghế Nhà Trường
    '6f167444-5039-47ef-ba57-2ebf22d0afad',   -- Bán Hàng Đỉnh Cao
    '1b0c410f-cc95-453e-905f-2cb93934da94',   -- Bí Mật tìm kiếm cổ phiếu ngoại hạng
    'd7defedf-e45e-41fe-ace0-f3072b2e9255',   -- Chiến Thắng Con Quỷ Trong Bạn
    '50e175a4-005d-4618-978c-9d92d54afe7f',   -- Câu Lạc Bộ 5 Giờ Sáng
    '6db59561-d7ce-4e00-ac31-3a55b6775250',   -- Dọn Dẹp Căn Nhà Và Đời Người
    '93bb5a8f-8286-40ce-9855-4222fdb4c586',   -- Ego Is The Enemy - Bản Ngã Là Kẻ Thù
    '67c0cfa6-a580-403b-bab2-45f83c0cb29e',   -- Làm Ra Làm Chơi Ra Chơi - Deep Work
    '0ba9a76d-87ff-41da-b847-d38445512625',   -- Nonviolent Communication - Giao Tiếp Bất Bạo Động
    'abcbbfec-48d9-4db9-a494-1e7950c191a2',   -- Super Thinking - Siêu Tư Duy
    '49873d78-e94a-451b-82d3-70b5193ac72d',   -- Tư Duy Làm Giàu Của Người Do Thái
    '9d4e5b12-63c1-4e1c-878d-bdbdd57d01ef',   -- Ăn kiêng cũng phải sướng
    'aac5be8b-f604-4c8e-967b-12c1f9b7c078'    -- Outlive - Sống Lâu Hơn
);

-- ── Lùi lại nếu cần: đổi false thành true ở bước 2 rồi chạy lại ─────────

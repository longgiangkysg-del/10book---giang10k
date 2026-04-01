-- ═══════════════════════════════════════════════════════════
-- INSERT 20 cuốn Bestseller VN chưa có trong DB
-- Chạy trong Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

INSERT INTO books (title, author, is_summarized, user_ids, tags, priority, cover_image, updated_at) VALUES
-- 10 cuốn từ danh sách gốc (chưa có trong DB)
('Nhà Giả Kim - The Alchemist', 'Paulo Coelho', false, '{}', '{"Tư duy"}', 'Cao', 'https://m.media-amazon.com/images/I/61HAE8zahLL._AC_UF1000,1000_QL80_.jpg', NOW()),
('Cha Giàu Cha Nghèo - Rich Dad Poor Dad', 'Robert Kiyosaki', false, '{}', '{"Tài chính"}', 'Cao', 'https://m.media-amazon.com/images/I/81bsw6fnUiL._AC_UF1000,1000_QL80_.jpg', NOW()),
('7 Thói Quen Hiệu Quả - 7 Habits of Highly Effective People', 'Stephen R. Covey', false, '{}', '{"Kỹ năng","Lãnh đạo"}', 'Cao', 'https://m.media-amazon.com/images/I/71mTqMFG1SL._AC_UF1000,1000_QL80_.jpg', NOW()),
('Dám Bị Ghét - The Courage to Be Disliked', 'Ichiro Kishimi, Fumitake Koga', false, '{}', '{"Tâm lý"}', 'Cao', 'https://m.media-amazon.com/images/I/71R-Isxx+5L._AC_UF1000,1000_QL80_.jpg', NOW()),
('Tuổi Trẻ Đáng Giá Bao Nhiêu', 'Rosie Nguyễn', false, '{}', '{"Tư duy","Kỹ năng"}', 'Trung bình', 'https://salt.tikicdn.com/cache/280x280/ts/product/5e/18/24/2a6154ba08df6ce6161c13f4303fa19e.jpg', NOW()),
('Lòng Tốt Của Bạn Cần Thêm Đôi Phần Sắc Sảo', 'Tất Bình', false, '{}', '{"Kỹ năng","Tâm lý"}', 'Trung bình', 'https://salt.tikicdn.com/cache/280x280/ts/product/2c/4e/f2/34d28acb58c7dda5bfbb0b7b7e3dd8d7.jpg', NOW()),
('13 Nguyên Tắc Nghĩ Giàu Làm Giàu - Think And Grow Rich', 'Napoleon Hill', false, '{}', '{"Tài chính","Tư duy"}', 'Cao', 'https://m.media-amazon.com/images/I/61y04z8SGTL._AC_UF1000,1000_QL80_.jpg', NOW()),
('Cách Nghĩ Để Thành Công - Think And Grow Rich', 'Napoleon Hill', false, '{}', '{"Tư duy","Tài chính"}', 'Cao', 'https://m.media-amazon.com/images/I/71UypkUjStL._AC_UF1000,1000_QL80_.jpg', NOW()),
('Thay Đổi Cuộc Sống Với Nhân Số Học', 'Lê Đỗ Quỳnh Hương', false, '{}', '{"Tư duy"}', 'Trung bình', 'https://salt.tikicdn.com/cache/280x280/ts/product/45/3c/67/d7ac7e3acdf2a58eaf27b4f06f9c5857.jpg', NOW()),
('Tứ Đại Quyền Lực - The Four', 'Scott Galloway', false, '{}', '{"Công nghệ","Tài chính"}', 'Cao', 'https://m.media-amazon.com/images/I/71FgSDpP+fL._AC_UF1000,1000_QL80_.jpg', NOW()),

-- 10 cuốn bestseller bổ sung (chưa có trong DB)
('38 Lá Thư Rockefeller Gửi Con Trai', 'John D. Rockefeller', false, '{}', '{"Lãnh đạo","Tài chính"}', 'Cao', 'https://salt.tikicdn.com/cache/280x280/ts/product/96/a0/55/0b4579bfec78ee0e3a4f9e9def2cdae3.jpg', NOW()),
('Chiến Thắng Bản Thân - Awaken The Giant Within', 'Tony Robbins', false, '{}', '{"Tư duy","Kỹ năng"}', 'Cao', 'https://m.media-amazon.com/images/I/71lBjRHRL5L._AC_UF1000,1000_QL80_.jpg', NOW()),
('Tư Duy Ngược Dành Cho Người Thành Công', 'Nguyễn Anh Dũng', false, '{}', '{"Tư duy"}', 'Trung bình', 'https://salt.tikicdn.com/cache/280x280/ts/product/bf/24/29/48bb03e24a4984f52b810f477a7e3d00.jpg', NOW()),
('Nghệ Thuật Tinh Tế Của Việc Đếch Quan Tâm - The Subtle Art of Not Giving a F*ck', 'Mark Manson', false, '{}', '{"Tâm lý","Kỹ năng"}', 'Cao', 'https://m.media-amazon.com/images/I/71QKQ9mwV7L._AC_UF1000,1000_QL80_.jpg', NOW()),
('Cuộc Đời Rộng Lớn Hơn Bạn Nghĩ', 'Rosie Nguyễn', false, '{}', '{"Tư duy"}', 'Trung bình', 'https://salt.tikicdn.com/cache/280x280/ts/product/a3/5e/a0/cd4e8c13a52a2c080e006a74dff68a49.jpg', NOW()),
('Bí Quyết Gây Dựng Cơ Nghiệp Bạc Tỷ - The Millionaire Fastlane', 'MJ DeMarco', false, '{}', '{"Tài chính"}', 'Cao', 'https://m.media-amazon.com/images/I/71Mdu9MP6YL._AC_UF1000,1000_QL80_.jpg', NOW()),
('Khéo Ăn Nói Sẽ Có Được Thiên Hạ', 'Trác Nhã', false, '{}', '{"Kỹ năng"}', 'Trung bình', 'https://salt.tikicdn.com/cache/280x280/ts/product/84/63/4d/fb2d8a0fdfe8ef2e993b50d9ce7dbbe6.jpg', NOW()),
('Không Gia Đình - Sans Famille', 'Hector Malot', false, '{}', '{"Tâm lý"}', 'Trung bình', 'https://salt.tikicdn.com/cache/280x280/ts/product/5b/07/44/e75db tried.jpg', NOW()),
('Đời Ngắn Đừng Ngủ Dài - The 5 AM Club', 'Robin Sharma', false, '{}', '{"Kỹ năng","Tư duy"}', 'Cao', 'https://m.media-amazon.com/images/I/71zytzrg6lL._AC_UF1000,1000_QL80_.jpg', NOW()),
('Nhà Lãnh Đạo Không Chức Danh - The Leader Who Had No Title', 'Robin Sharma', false, '{}', '{"Lãnh đạo"}', 'Cao', 'https://m.media-amazon.com/images/I/71k2MgYpOkL._AC_UF1000,1000_QL80_.jpg', NOW())

ON CONFLICT (id) DO NOTHING;

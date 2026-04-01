
import { Book, Priority } from './types';

export const CATEGORIES = [
  'Tư duy',
  'Kỹ năng',
  'Tài chính',
  'Sức khỏe',
  'Lãnh đạo',
  'Tâm lý',
  'Công nghệ'
];

export const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'Atomic Habits',
    author: 'James Clear',
    isSummarized: true,
    /* Satisfy new Book interface */
    isReading: false,
    readingTimeMinutes: 240,
    user_ids: [],
    tags: ['Kỹ năng', 'Tư duy'],
    priority: Priority.HIGH,
    addedAt: Date.now() - 1000,
    coverImage: 'https://m.media-amazon.com/images/I/91bYsX41DVL.jpg',
    centralThesis: 'Thay đổi nhỏ 1% mỗi ngày tạo nên kết quả khổng lồ sau một năm thông qua lãi kép thói quen.',
    keyIdeas: [
      { id: 'k1', description: 'Tập trung vào hệ thống thay vì mục tiêu', importance: 3 },
      { id: 'k2', description: 'Thay đổi danh tính dẫn dắt thay đổi hành vi', importance: 3 },
      { id: 'k3', description: 'Quy tắc 2 phút để bắt đầu thói quen', importance: 2 }
    ],
    models: ['4 Định luật thay đổi hành vi', 'Vòng lặp thói quen: Gợi ý - Khao khát - Đáp ứng - Thưởng'],
    checklist: ['Thiết kế môi trường để gợi ý hiển hiện', 'Ghép đôi thói quen mới với thói quen cũ', 'Theo dõi thói quen bằng lịch']
  },
  {
    id: '2',
    title: 'Deep Work',
    author: 'Cal Newport',
    isSummarized: true,
    /* Satisfy new Book interface */
    isReading: true,
    readingTimeMinutes: 300,
    user_ids: [],
    tags: ['Kỹ năng', 'Công nghệ'],
    priority: Priority.HIGH,
    addedAt: Date.now() - 2000,
    coverImage: 'https://m.media-amazon.com/images/I/417Pwa77-FL.jpg',
    centralThesis: 'Khả năng tập trung không gián đoạn vào một nhiệm vụ khó khăn là siêu năng lực trong nền kinh tế tri thức.',
    keyIdeas: [
      { id: 'k4', description: 'Làm việc sâu vs Làm việc nông', importance: 3 },
      { id: 'k5', description: 'Dư nợ nhận thức khi chuyển đổi tác vụ', importance: 2 },
      { id: 'k6', description: 'Sự tập trung là một kỹ năng cần rèn luyện', importance: 3 }
    ],
    models: ['Công thức: Work = Time x Intensity', 'Bốn triết lý làm việc sâu'],
    checklist: ['Chặn thời gian Deep Work 90p mỗi sáng', 'Xóa mạng xã hội trên điện thoại', 'Thực hiện nghi thức kết thúc ngày']
  }
];

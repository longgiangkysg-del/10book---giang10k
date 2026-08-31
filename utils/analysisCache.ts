/**
 * Cache bản phân tích sách trong localStorage.
 *
 * Mỗi bản 50–90 KB nên KHÔNG giữ hết: chỉ N cuốn xem gần nhất. Vượt thì bỏ cuốn
 * cũ nhất — localStorage chỉ có ~5 MB, ghi tràn là trình duyệt ném QuotaExceeded.
 *
 * Mọi thao tác bọc try/catch: chế độ ẩn danh, người dùng chặn lưu trữ, hay bộ nhớ
 * đầy đều làm localStorage ném lỗi. Mất cache thì chỉ chậm lại như cũ, không hỏng,
 * nên tuyệt đối đừng để nó làm vỡ luồng đọc sách.
 */

const PREFIX = 'book_analysis_';
const INDEX_KEY = 'book_analysis_index';
const MAX_BOOKS = 10;

export interface CachedAnalysis {
  analysis: any;
  /** `updated_at` của sách lúc lưu — dùng để biết bản trên server đã đổi chưa. */
  updatedAt: string;
}

/** Thứ tự xem gần nhất, mới nhất đứng đầu. */
const readIndex = (): string[] => {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeIndex = (ids: string[]) => {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch { /* hết chỗ thì thôi */ }
};

const removeEntry = (bookId: string) => {
  try {
    localStorage.removeItem(PREFIX + bookId);
  } catch { /* không xoá được thì thôi */ }
};

export const readAnalysisCache = (bookId: string): CachedAnalysis | null => {
  try {
    const raw = localStorage.getItem(PREFIX + bookId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.analysis) return null;
    return { analysis: parsed.analysis, updatedAt: parsed.updatedAt || '' };
  } catch {
    return null;
  }
};

export const writeAnalysisCache = (bookId: string, analysis: any, updatedAt: string) => {
  if (!analysis) return;

  // Đưa cuốn này lên đầu danh sách gần nhất trước, để nếu phải dọn chỗ thì
  // cuốn vừa xem không nằm trong nhóm bị bỏ.
  const ids = [bookId, ...readIndex().filter(id => id !== bookId)];
  for (const cu of ids.slice(MAX_BOOKS)) removeEntry(cu);
  const giuLai = ids.slice(0, MAX_BOOKS);

  try {
    localStorage.setItem(PREFIX + bookId, JSON.stringify({ analysis, updatedAt }));
    writeIndex(giuLai);
  } catch {
    // Đầy: bỏ hết cache cũ rồi thử lại đúng một lần. Vẫn không được thì chịu,
    // app quay về đường tải từ server như trước khi có cache.
    for (const cu of giuLai) if (cu !== bookId) removeEntry(cu);
    try {
      localStorage.setItem(PREFIX + bookId, JSON.stringify({ analysis, updatedAt }));
      writeIndex([bookId]);
    } catch {
      removeEntry(bookId);
      writeIndex([]);
    }
  }
};

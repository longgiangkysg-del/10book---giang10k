/**
 * Cửa chặn kết quả phân tích rỗng hoặc là lời từ chối trá hình.
 *
 * AI không được đưa toàn văn sách, nên gặp tên sách lạ nó hay từ chối — mà lời
 * từ chối lại ĐÚNG khuôn JSON, thành một "phần tri thức" duy nhất tên kiểu
 * "Không thể trích xuất". Đếm số phần là cách nhận diện chắc chắn hơn dò từ khoá:
 * "không cung cấp" là câu hoàn toàn hợp lệ trong mục hạn chế của sách.
 *
 * Dùng chung cho web app (services/geminiService.ts) và script chạy tay
 * (scripts/analyze-books.ts) để hai bên không lệch ngưỡng.
 */

/** Prompt đòi 15-30 phần và nhiều ý tưởng — dưới ngưỡng này luôn là hỏng, không phải sách ngắn. */
export const MIN_KNOWLEDGE_PARTS = 3;
export const MIN_IDEAS = 2;

export const UNKNOWN_BOOK_MESSAGE =
  'UNKNOWN_BOOK: AI không nhận ra cuốn sách này hoặc đã từ chối phân tích. ' +
  'Kiểm lại tên sách và tên tác giả cho đúng chính tả rồi phân tích lại.';

export type AnalysisAgent = 'meta' | 'knowledge' | 'ideas' | 'full';

export const assertAnalysisUsable = (result: any, agent: AnalysisAgent) => {
  if (result?.error === 'UNKNOWN_BOOK') throw new Error(UNKNOWN_BOOK_MESSAGE);

  if (agent === 'meta' || agent === 'full') {
    if (!result?.centralThesis?.oneLiner) throw new Error(UNKNOWN_BOOK_MESSAGE);
  }
  if (agent === 'knowledge' || agent === 'full') {
    const parts = result?.knowledgeArchitecture;
    if (!Array.isArray(parts) || parts.length < MIN_KNOWLEDGE_PARTS) throw new Error(UNKNOWN_BOOK_MESSAGE);
  }
  if (agent === 'ideas' || agent === 'full') {
    const ideas = result?.ideaSystem;
    if (!Array.isArray(ideas) || ideas.length < MIN_IDEAS) throw new Error(UNKNOWN_BOOK_MESSAGE);
  }

  return result;
};

/**
 * Cắt lấy khối JSON trong câu trả lời của AI.
 * Model hay bọc thêm rào ```json hoặc một câu dẫn — cắt từ '{' đầu tới '}' cuối là đủ.
 */
export const parseAnalysisJson = (rawText: string): any => {
  let text = rawText || '{}';
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}') + 1;
  if (startIdx !== -1 && endIdx > startIdx) {
    text = text.substring(startIdx, endIdx);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('AI trả về dữ liệu không hợp lệ (JSON malformed). Vui lòng thử lại.');
  }
};

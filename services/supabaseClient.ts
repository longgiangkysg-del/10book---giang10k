
import { createClient } from '@supabase/supabase-js';
import { Book } from '../types';

const supabaseUrl = 'https://luhgjdvorwgridljhoar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1aGdqZHZvcndncmlkbGpob2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODUyMzMsImV4cCI6MjA4MjA2MTIzM30.Hgmjm_rAnPnHUdHaQxImOd1-SMKTiXzeerREaqnavKk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ═══════════════════════════════════════════════════════════
// ADMIN CONFIG
// ═══════════════════════════════════════════════════════════
const ADMIN_EMAILS = ['longgiangptit@gmail.com'];

export const authService = {
  async signInWithGoogle() {
    // Fix: Cast supabase.auth to any to bypass 'signInWithOAuth' does not exist error on the current type definition.
    const { data, error } = await (supabase.auth as any).signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    // Fix: Cast supabase.auth to any to bypass 'signOut' does not exist error on the current type definition.
    const { error } = await (supabase.auth as any).signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await (supabase.auth as any).getUser();
    return user;
  },

  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user?.email && ADMIN_EMAILS.includes(user.email);
  }
};

export const userService = {
  async ensureProfile() {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return null;

      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const metadata = user.user_metadata || {};

      const payload = {
        id: user.id,
        email: user.email,
        full_name: metadata.full_name || metadata.name || existingProfile?.full_name || 'Thành viên 10kBook',
        avatar_url: metadata.avatar_url || metadata.picture || existingProfile?.avatar_url || '',
        role: existingProfile?.role || 'user',
        is_active: existingProfile?.is_active ?? true,
        level: existingProfile?.level || 'Bậc Thầy Tập Sự',
        is_vip: existingProfile?.is_vip ?? false,
        updated_at: new Date().toISOString()
        // Note: gemini_api_key is NOT overwritten here — only updated via saveApiKey()
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) return existingProfile || null;
      return data;
    } catch (err) {
      return null;
    }
  },

  /**
   * Lưu Gemini API Key của user vào Supabase (backward compat)
   */
  async saveApiKey(apiKey: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) return;
    await supabase
      .from('users')
      .update({ gemini_api_key: apiKey || null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  },

  /**
   * Lưu toàn bộ cấu hình AI provider (multi-key)
   */
  async saveProviderConfig(config: { activeProvider: string; keys: Record<string, string>; selectedModels?: Record<string, string> }): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) return;

    // Try saving to new column first
    const payload: any = {
      ai_provider_config: JSON.stringify(config),
      updated_at: new Date().toISOString()
    };
    if (config.keys?.gemini !== undefined) {
      payload.gemini_api_key = config.keys.gemini || null;
    }

    const { error } = await supabase.from('users').update(payload).eq('id', user.id);

    // Fallback: if column doesn't exist yet, save only gemini_api_key
    if (error?.message?.includes('ai_provider_config')) {
      console.warn('ai_provider_config column not found, using legacy gemini_api_key only');
      await supabase.from('users').update({
        gemini_api_key: config.keys?.gemini || null,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    }
  },

  /**
   * Tải cấu hình AI provider từ Supabase
   * Backward compat: nếu chỉ có gemini_api_key cũ, tự chuyển đổi
   */
  async loadProviderConfig(): Promise<{ activeProvider: string; keys: Record<string, string>; selectedModels: Record<string, string> } | null> {
    const user = await authService.getCurrentUser();
    if (!user) return null;
    // Try new column first, fallback to legacy
    let data: any = null;
    const { data: newData, error: newErr } = await supabase
      .from('users')
      .select('gemini_api_key, ai_provider_config')
      .eq('id', user.id)
      .single();

    if (newErr?.message?.includes('ai_provider_config')) {
      // Column doesn't exist yet, use legacy only
      const { data: legacyData } = await supabase
        .from('users')
        .select('gemini_api_key')
        .eq('id', user.id)
        .single();
      data = legacyData;
    } else {
      data = newData;
    }

    if (!data) return null;

    // New format exists
    if (data.ai_provider_config) {
      try {
        return JSON.parse(data.ai_provider_config);
      } catch { /* fall through to legacy */ }
    }

    // Legacy: chỉ có gemini_api_key
    if (data.gemini_api_key) {
      return {
        activeProvider: 'gemini',
        keys: { gemini: data.gemini_api_key },
        selectedModels: {}
      };
    }

    return null;
  },

  /**
   * @deprecated Use loadProviderConfig() instead
   */
  async loadApiKey(): Promise<string | null> {
    const user = await authService.getCurrentUser();
    if (!user) return null;
    const { data } = await supabase
      .from('users')
      .select('gemini_api_key')
      .eq('id', user.id)
      .single();
    return data?.gemini_api_key || null;
  }
};

export const actionService = {
  async logAction(actionType: 'ADD_BOOK' | 'ANALYZE_BOOK' | 'SAVE_BOOK', bookTitle: string) {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const userName = user.user_metadata?.full_name || user.user_metadata?.name || 'Thành viên';

      await supabase.from('actions').insert({
        user_id: user.id,
        user_name: userName,
        action_type: actionType,
        book_title: bookTitle,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Lỗi log action:", err);
    }
  },

  async fetchRecentActions() {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return [];
    return data || [];
  }
};

export const bookService = {
  /**
   * Tối ưu: Chỉ select các trường nhẹ, loại bỏ cover_image và analysis (rất lớn) để load nhanh.
   */
  async fetchAllBooks() {
    // cover_image chỉ là URL ngắn (~95 ký tự) nên kéo kèm ở đây rất nhẹ, đổi lại
    // bỏ được N+1: trước đó mỗi thẻ sách tự gọi một query bìa riêng (24 request/trang lưới).
    // Vẫn cố ý KHÔNG kéo analysis — cột đó 50–90 KB/cuốn, để lazy-load lúc mở sách.
    const { data, error } = await supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        is_summarized,
        user_ids,
        tags,
        priority,
        cover_image,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Lỗi fetchAllBooks:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Lấy ảnh bìa của một cuốn sách cụ thể (Lazy Loading)
   */
  /** Tìm bìa sách tự động từ Tiki / Google Books qua Edge Function */
  async searchBookCover(title: string, author: string): Promise<{ coverUrl: string | null; source: string | null }> {
    try {
      const res = await fetch('https://luhgjdvorwgridljhoar.supabase.co/functions/v1/book-cover-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author }),
      });
      if (!res.ok) return { coverUrl: null, source: null };
      return await res.json();
    } catch (err) {
      console.warn('searchBookCover failed:', err);
      return { coverUrl: null, source: null };
    }
  },

  async fetchBookCover(bookId: string) {
    const { data, error } = await supabase
      .from('books')
      .select('cover_image')
      .eq('id', bookId)
      .single();

    if (error) {
      console.error(`Lỗi fetchBookCover cho sách ${bookId}:`, error);
      return '';
    }
    return data?.cover_image || '';
  },

  /**
   * Lấy analysis của một cuốn sách cụ thể (Lazy Loading)
   */
  async fetchBookAnalysis(bookId: string) {
    const { data, error } = await supabase
      .from('books')
      .select('analysis')
      .eq('id', bookId)
      .single();

    if (error) {
      console.error(`Lỗi fetchBookAnalysis cho sách ${bookId}:`, error);
      return null;
    }
    // Parse if stored as text
    let analysis = data?.analysis || null;
    if (typeof analysis === 'string') {
      try { analysis = JSON.parse(analysis); } catch { analysis = null; }
    }
    return analysis;
  },

  async fetchAvailableTags() {
    const { data, error } = await supabase
      .from('books_tags')
      .select('name')
      .order('name', { ascending: true });

    if (error) return [];
    return data.map(item => item.name);
  },

  async upsertBook(book: Partial<Book>) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("Yêu cầu đăng nhập để thực hiện hành động này.");

    // Logic tìm kiếm sách đã tồn tại: Ưu tiên theo ID, sau đó mới đến Title/Author
    let existing = null;

    if (book.id) {
      const { data } = await supabase
        .from('books')
        .select('*')
        .eq('id', book.id)
        .maybeSingle();
      existing = data;
    }

    if (!existing && book.title && book.author) {
      // Escape ILIKE wildcards: % và _ là ký tự đặc biệt trong ILIKE
      const escapeIlike = (s: string) => s.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const { data } = await supabase
        .from('books')
        .select('*')
        .ilike('title', escapeIlike(book.title))
        .ilike('author', escapeIlike(book.author))
        .maybeSingle();
      existing = data;
    }

    let newUserIds: string[] = existing?.user_ids || book.user_ids || [];
    const isNewSave = !newUserIds.includes(user.id);
    if (isNewSave) {
      newUserIds = [...newUserIds, user.id];
    }

    // Serialize analysis: DB column is text, not jsonb
    const rawAnalysis = book.analysis || existing?.analysis || null;
    const serializedAnalysis = rawAnalysis
      ? (typeof rawAnalysis === 'string' ? rawAnalysis : JSON.stringify(rawAnalysis))
      : null;

    const payload: any = {
      title: book.title || existing?.title,
      author: book.author || existing?.author,
      is_summarized: book.isSummarized ?? existing?.is_summarized ?? false,
      user_ids: newUserIds,
      tags: book.tags || existing?.tags || [],
      priority: book.priority || existing?.priority || 'Trung bình',
      cover_image: book.coverImage || existing?.cover_image || '',
      analysis: serializedAnalysis,
      updated_at: new Date().toISOString()
    };

    // Đảm bảo Payload có ID của bản ghi existing để thực hiện UPDATE thay vì INSERT mới
    if (existing?.id) {
      payload.id = existing.id;
    } else if (book.id) {
      payload.id = book.id;
    }

    const { data, error } = await supabase
      .from('books')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    // Log Activity
    if (!existing?.id) {
      await actionService.logAction('ADD_BOOK', payload.title);
    } else if (isNewSave) {
      await actionService.logAction('SAVE_BOOK', payload.title);
    }

    return data;
  },

  async deleteBook(bookId: string) {
    const isAdmin = await authService.isAdmin();
    if (!isAdmin) throw new Error('Chỉ admin mới có quyền xóa sách vĩnh viễn.');

    // .select() bắt buộc: khi RLS chặn DELETE, PostgREST trả 204 + error null.
    // Không đếm hàng thật sự bị xoá thì app báo "đã xoá" trong khi sách còn nguyên.
    const { data, error } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(
        'Cơ sở dữ liệu từ chối lệnh xoá (bảng books chưa có policy DELETE cho admin). ' +
        'Chạy supabase_admin_delete_policy.sql trong Supabase SQL Editor rồi thử lại.'
      );
    }
  },

  async removeUserFromBook(bookId: string) {
    const user = await authService.getCurrentUser();
    if (!user) return;

    const { data: book } = await supabase.from('books').select('*').eq('id', bookId).single();
    if (!book) return;

    const newUserIds = (book.user_ids || []).filter((id: string) => id !== user.id);
    // Cùng bẫy như deleteBook: UPDATE bị RLS chặn vẫn trả error null.
    const { data, error } = await supabase
      .from('books')
      .update({ user_ids: newUserIds, updated_at: new Date().toISOString() })
      .eq('id', bookId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Cơ sở dữ liệu từ chối lệnh cập nhật — không gỡ được sách khỏi tủ.');
    }
  }
};

// ═══════════════════════════════════════════════════════════
// RATING SERVICE
// ═══════════════════════════════════════════════════════════
export const ratingService = {
  async saveRating(bookId: string, rating: number): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) return;
    await supabase
      .from('book_ratings')
      .upsert(
        { user_id: user.id, book_id: bookId, rating, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,book_id' }
      );
  },

  async getUserRating(bookId: string): Promise<number | null> {
    const user = await authService.getCurrentUser();
    if (!user) return null;
    const { data } = await supabase
      .from('book_ratings')
      .select('rating')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle();
    return data?.rating ?? null;
  },

  async getBookRatingStats(bookId: string): Promise<{ avg: number; count: number }> {
    const { data } = await supabase
      .from('book_ratings')
      .select('rating')
      .eq('book_id', bookId);
    if (!data || data.length === 0) return { avg: 0, count: 0 };
    const sum = data.reduce((acc, r) => acc + r.rating, 0);
    return { avg: Math.round((sum / data.length) * 10) / 10, count: data.length };
  }
};

// ═══════════════════════════════════════════════════════════
// SHARED KEY SERVICE — Rate limiting cho Shared Gemini Key
// Giới hạn: 1 lượt phân tích miễn phí / user / tháng
// ═══════════════════════════════════════════════════════════
const MONTHLY_QUOTA = 1;

export const sharedKeyService = {
  /**
   * Lấy số lượt đã dùng THÁNG NÀY của user hiện tại
   */
  async getUsedThisMonth(): Promise<number> {
    const user = await authService.getCurrentUser();
    if (!user) return MONTHLY_QUOTA; // Chưa login → coi như hết quota

    const now = new Date();
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDay = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('shared_key_usage')
      .select('count')
      .eq('user_id', user.id)
      .gte('used_at', firstDayOfMonth)
      .lte('used_at', lastDay);

    if (!data || data.length === 0) return 0;
    return data.reduce((sum, row) => sum + (row.count ?? 0), 0);
  },

  /**
   * Kiểm tra user còn quota dùng shared key tháng này không
   */
  async canUseSharedKey(): Promise<boolean> {
    const used = await this.getUsedThisMonth();
    return used < MONTHLY_QUOTA;
  },

  /**
   * Ghi nhận 1 lượt dùng shared key của user hôm nay
   */
  async consumeSharedKey(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('increment_shared_key_usage', {
      p_user_id: user.id,
      p_date: today
    });
  },

  /**
   * Lấy số lượt còn lại tháng này
   */
  async getRemainingQuota(): Promise<number> {
    const used = await this.getUsedThisMonth();
    return Math.max(0, MONTHLY_QUOTA - used);
  }
};

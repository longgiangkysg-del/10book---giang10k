
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Menu, X, Library, LayoutDashboard, CheckCircle2, History, Compass, LogOut, Settings, Key, Save, ExternalLink, ShieldCheck, ShieldAlert, Activity, User, Loader2, Download, HelpCircle
} from 'lucide-react';
import { Book, Priority } from './types';
import { bookService, supabase, authService, userService, actionService } from './services/supabaseClient';
import { geminiService } from './services/geminiService';
import { apiKeyManager } from './services/apiKeyManager';
import { PROVIDERS, PROVIDER_LIST } from './services/aiProviders';
import { analysisManager } from './services/analysisManager';
import HomeView from './views/HomeView';
import InsightCenter from './views/InsightCenter';
import ActionTracker from './views/ActionTracker';
import DiscoveryView from './views/DiscoveryView';
import AuthView from './views/AuthView';
import HelpView from './views/HelpView';
import PublicBookView from './views/PublicBookView';
import { useToast } from './components/Toast';
import { DEV_PREVIEW, DEV_PREVIEW_SESSION } from './services/dev-preview';
import { parseHash, buildHash, DEFAULT_LAYER, type Route, type Overlay } from './services/routing';
import { readAnalysisCache, writeAnalysisCache } from './utils/analysisCache';

interface BookWithActivity extends Book {
  lastActivity: number;
}

/**
 * Custom hook to persist state in localStorage (survives app restart)
 */
function usePersistedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

/**
 * Chạy song song mà vẫn chịu được lỗi lẻ: Promise.all đổ cả cụm chỉ vì một
 * promise reject, nên mỗi việc phải tự gánh lỗi của mình. Không có lớp này thì
 * riêng việc tải danh sách hoạt động hỏng cũng đủ làm mất hồ sơ, quota và quyền admin.
 */
const nuotLoi = <T,>(viec: Promise<T>, macDinh: T, ten: string): Promise<T> =>
  viec.catch(err => {
    console.error(`Lỗi khi ${ten}:`, err);
    return macDinh;
  });

/**
 * Các trường suy ra từ bản phân tích. Tách riêng vì cả loadData (khi làm mới danh
 * sách) lẫn lúc nạp xong phân tích đều phải dựng chúng — để hai nơi tự viết thì
 * chỉ cần lệch một trường là màn hình thiếu dữ liệu mà không báo lỗi gì.
 */
const suyRaTuAnalysis = (analysis: any) => ({
  centralThesis: analysis?.centralThesis?.oneLiner || '',
  keyIdeas: (analysis?.ideaSystem || []).map((idea: any, i: number) => ({
    id: `k${i}`,
    description: idea.name || '',
    importance: 3 as 1 | 2 | 3,
  })),
  models: (analysis?.ideaSystem || []).map((idea: any) => idea.name).filter(Boolean),
  readingTimeMinutes: (analysis?.bookMeta?.estimatedReadingTime || 0) * 60,
});

const App: React.FC = () => {
  const { showToast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [books, setBooks] = useState<BookWithActivity[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = usePersistedState<boolean>('app_sidebarOpen', true);

  // ── Định tuyến ────────────────────────────────────────────
  // Link là nguồn chân lý cho "đang ở màn nào": tab, sách đang mở, lớp đang đọc
  // và hộp thoại đều nằm trong hash (services/routing.ts). localStorage chỉ còn
  // dùng để mở lại đúng chỗ khi vào app bằng link trống.
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  const navigate = useCallback((thayDoi: Partial<Route>, replace = false) => {
    setRoute(truoc => {
      const sau: Route = { ...truoc, ...thayDoi };
      const hash = buildHash(sau);
      if (hash !== window.location.hash) {
        // pushState/replaceState KHÔNG bắn hashchange nên state và link đi cùng
        // một nhịp — gán location.hash sẽ tạo lượt cập nhật thứ hai.
        const fn = replace ? 'replaceState' : 'pushState';
        window.history[fn]({ overlay: !!sau.overlay }, '', hash);
      }
      localStorage.setItem('app_route', hash);
      return sau;
    });
  }, []);

  /** Đóng hộp thoại: lùi lịch sử nếu chính app đã đẩy nó vào, không thì ghi đè link. */
  const closeOverlay = useCallback(() => {
    if (window.history.state?.overlay) window.history.back();
    else navigate({ overlay: null, overlayBookId: null }, true);
  }, [navigate]);

  // Vào app bằng link trống thì mở lại chỗ cũ đã lưu.
  useEffect(() => {
    if (!window.location.hash) {
      const luu = localStorage.getItem('app_route');
      const r = parseHash(luu || '');
      window.history.replaceState({ overlay: !!r.overlay }, '', buildHash(r));
      setRoute(r);
    }
    const doiHuong = () => setRoute(parseHash(window.location.hash));
    // popstate: nút Back/Forward · hashchange: người dùng tự sửa link trên thanh địa chỉ
    window.addEventListener('popstate', doiHuong);
    window.addEventListener('hashchange', doiHuong);
    return () => {
      window.removeEventListener('popstate', doiHuong);
      window.removeEventListener('hashchange', doiHuong);
    };
  }, []);

  const activeTab = route.bookId ? 'insight' : route.tab;
  const selectedBookId = route.bookId;
  const persistedLayer = route.layer;
  const isSettingsOpen = route.overlay === 'cai-dat';
  const setPersistedLayer = useCallback((layer: number) => navigate({ layer }, true), [navigate]);

  const handleOpenBook = (bookId: string) => {
    navigate({ bookId, layer: DEFAULT_LAYER, overlay: null, overlayBookId: null });
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  // Track global analysis running state for sidebar indicator
  const [globalAnalysisRunning, setGlobalAnalysisRunning] = useState(false);

  useEffect(() => {
    return analysisManager.subscribe((s) => {
      setGlobalAnalysisRunning(s.status === 'processing');
    });
  }, []);
  // API Key state: loaded from Supabase after login
  const [manualApiKey, setManualApiKey] = useState('');
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  // Multi-provider state
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [authorFilter, setAuthorFilter] = useState<string>('');

  // Handle Author Click
  const handleAuthorClick = (author: string) => {
    setAuthorFilter(author);
    handleTabChange('vault');
  };

  // PWA Install Event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // Sidebar responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsSidebarOpen]);

  const handleTabChange = (tab: string) => {
    // Rời Work Zone thì bỏ luôn sách đang mở khỏi link, kẻo tab mới vẫn mang id sách.
    navigate({ tab: tab as Route['tab'], bookId: null, overlay: null, overlayBookId: null });
    if (tab !== 'vault') {
      setAuthorFilter('');
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Ref giữ phiên bản mới nhất của handlePostLogin — tránh stale closure trong useEffect mount-only
  const handlePostLoginRef = useRef<() => Promise<void>>();

  // Phân tích đã nạp trong phiên, tách khỏi `books` để nó không phải chờ danh sách sách
  const analysisRef = useRef<Map<string, any>>(new Map());
  // Chặn gọi trùng: effect chạy lại (đổi tab, làm mới danh sách) không nên fetch lần nữa
  const dangTaiRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    apiKeyManager.clearKey();
    setIsKeyConfigured(false);

    // Chế độ xem thử lúc phát triển: vào thẳng app bằng một phiên giả, không
    // gọi Supabase Auth. Bản build thật không có nhánh này (xem services/dev-preview.ts).
    if (DEV_PREVIEW) {
      setSession(DEV_PREVIEW_SESSION);
      setIsAdmin(true);
      loadData().finally(() => setIsLoading(false));
      loadActivities();
      return;
    }

    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) handlePostLoginRef.current?.();
      else setIsLoading(false);
    });

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) handlePostLoginRef.current?.();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await bookService.fetchAllBooks();
      // Giữ lại analysis (và các trường suy ra từ nó) của cuốn đã mở. loadData chạy
      // lại mỗi khi quay lại app (visibilitychange); nếu đặt analysis về undefined thì
      // cuốn đang đọc bị xoá trắng rồi phải tải lại JSON 50–90 KB — đúng cảnh "chuyển
      // app rồi quay lại thấy màn hình trống". Metadata nhẹ (tên, tag, lượt lưu) vẫn
      // lấy mới từ server; server là chuẩn cho việc thêm/bớt sách.
      setBooks(prev => {
        const cu = new Map<string, any>(prev.map((b: any) => [b.id, b]));
        return data.map((b: any) => {
          const old: any = cu.get(b.id);
          // analysisRef giữ bản đã nạp trong phiên. Cần nó vì phân tích nay được
          // kéo SONG SONG với danh sách sách: lúc nó về, `books` có thể còn rỗng,
          // và nếu chỉ trông vào `old` thì kết quả vừa tải xong bị vứt đi.
          const analysis = old?.analysis ?? analysisRef.current.get(b.id);
          return {
            ...b,
            user_ids: b.user_ids || [],
            ...suyRaTuAnalysis(analysis),
            toc: old?.toc || [],
            checklist: [],
            coverImage: b.cover_image || '',
            isSummarized: b.is_summarized ?? false,
            isReading: old?.isReading || false,
            addedAt: new Date(b.created_at || Date.now()).getTime(),
            lastActivity: new Date(b.updated_at || b.created_at || Date.now()).getTime(),
            analysis,
            tags: b.tags || [],
            savesCount: (b.user_ids || []).length
          };
        });
      });
    } catch (err) {
      console.error("Lỗi tải danh sách sách:", err);
    }
  }, []);

  /** Đặt bản phân tích vào state, và giữ một bản trong ref cho loadData nhặt lại. */
  const apDungAnalysis = useCallback((bookId: string, analysis: any) => {
    analysisRef.current.set(bookId, analysis);
    setBooks(prev => prev.map(b => b.id === bookId
      ? {
          ...b,
          analysis,
          ...suyRaTuAnalysis(analysis),
          // Không nhồi customActionPlan vào checklist: ActionTracker đọc task AI thẳng
          // từ analysis, chép sang đây thì mỗi task hiện hai lần.
          checklist: [],
        }
      : b));
  }, []);

  /**
   * Nạp phân tích của một cuốn: lấy bản trong máy ra dùng ngay, rồi đối chiếu với
   * server ở phía sau. Cuốn đã xem qua sẽ hiện tức thì thay vì xoay vòng.
   */
  const loadBookAnalysis = useCallback(async (bookId: string) => {
    if (dangTaiRef.current.has(bookId)) return;
    dangTaiRef.current.add(bookId);
    try {
      const cache = readAnalysisCache(bookId);
      if (cache) apDungAnalysis(bookId, cache.analysis);

      const res = await bookService.fetchBookAnalysis(bookId);

      // Cuốn chưa phân tích thì không có gì để nạp — đây là chuyện bình thường,
      // đừng báo lỗi (màn hình "Sẵn sàng phân tích" mới là thứ người dùng cần thấy).
      if (res && !res.isSummarized) return;

      // Nạp hụt thì phải nói ra: bỏ qua lặng lẽ khiến màn hình đứng ở vòng xoay
      // "Đang tải phân tích..." vĩnh viễn, trông hệt như app hỏng. Nhưng nếu đã
      // có bản trong máy để đọc thì im lặng, kêu lên chỉ làm người dùng hoang mang.
      if (!res?.analysis) {
        if (!cache) showToast("Không tải được phân tích của cuốn này. Thử lại hoặc mở bản công khai.", "error");
        return;
      }

      if (cache && cache.updatedAt === res.updatedAt) return; // bản trong máy vẫn đúng
      apDungAnalysis(bookId, res.analysis);
      writeAnalysisCache(bookId, res.analysis, res.updatedAt);
    } finally {
      dangTaiRef.current.delete(bookId);
    }
  }, [showToast, apDungAnalysis]);

  // Nạp phân tích NGAY khi biết đang mở cuốn nào — cố ý không chờ `books`.
  // Trước đây effect này phải tìm cuốn sách trong `books`, nên nó xếp hàng sau cả
  // kho sách (630 cuốn, ~1,2 MB) dù chẳng cần gì từ đó: vào thẳng Work Zone bằng
  // link là phải nhìn vòng xoay khoảng 2 giây.
  useEffect(() => {
    if (!selectedBookId) return;
    if (analysisRef.current.has(selectedBookId)) return;
    loadBookAnalysis(selectedBookId);
  }, [selectedBookId, loadBookAnalysis]);

  const loadActivities = useCallback(async () => {
    const data = await actionService.fetchRecentActions();
    setActivities(data);
  }, []);

  const handlePostLogin = async () => {
    setIsLoading(true);
    try {
      // Sáu việc này không việc nào cần kết quả của việc nào, nhưng trước đây xếp
      // hàng nối đuôi: hồ sơ → cấu hình khoá → quota → kho sách → hoạt động.
      // Chạy cùng lúc thì tổng thời gian bằng việc lâu nhất chứ không phải tổng.
      const [profile, providerConfig, adminStatus] = await Promise.all([
        nuotLoi(userService.ensureProfile(), null, 'nạp hồ sơ'),
        nuotLoi(userService.loadProviderConfig(), null, 'nạp cấu hình khoá AI'),
        nuotLoi(authService.isAdmin(), false, 'kiểm quyền admin'),
        nuotLoi(loadData(), undefined, 'nạp kho sách'),
        nuotLoi(loadActivities(), undefined, 'nạp hoạt động gần đây'),
      ]);

      setUserProfile(profile);
      setIsAdmin(adminStatus);

      if (providerConfig) {
        apiKeyManager.loadConfig(providerConfig);
        const activeId = providerConfig.activeProvider || 'gemini';
        setSelectedProvider(activeId);
        const activeKey = providerConfig.keys?.[activeId] || '';
        setManualApiKey(activeKey);
        setIsKeyConfigured(activeKey.length > 0);
      } else {
        apiKeyManager.clearKey();
        setManualApiKey('');
        setIsKeyConfigured(false);
      }

    } catch (err) {
      console.error("Lỗi sau khi đăng nhập:", err);
    } finally {
      setIsLoading(false);
    }
  };
  handlePostLoginRef.current = handlePostLogin;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        loadData();
        loadActivities();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, loadData, loadActivities]);

  const libraryBooks = useMemo(() =>
    books.filter(b => session?.user?.id && b.user_ids.includes(session.user.id)),
    [books, session]
  );

  const discoveryBooks = books;

  const selectedBook = useMemo(() =>
    books.find(b => b.id === selectedBookId),
    [books, selectedBookId]
  );

  const updateBook = async (updatedBook: Book) => {
    const isAnalyzing = !selectedBook?.isSummarized && updatedBook.isSummarized;
    await bookService.upsertBook(updatedBook);

    if (isAnalyzing) {
      await actionService.logAction('ANALYZE_BOOK', updatedBook.title);
    }

    await loadData();
    await loadActivities();
  };

  const handleLogout = async () => {
    await authService.signOut();
    setSession(null);
    showToast("Đã đăng xuất thành công.", "info");
    sessionStorage.clear();
  };

  const handleOpenAiKey = () => navigate({ overlay: 'cai-dat' });

  const saveManualKey = async () => {
    const cleanKey = manualApiKey.trim();
    if (!cleanKey) {
      showToast("Vui lòng nhập API Key hợp lệ.", "error");
      return;
    }
    setIsValidating(true);
    const providerName = PROVIDERS[selectedProvider]?.name || selectedProvider;
    try {
      // Validate key with the selected provider
      await geminiService.validateProviderKey(selectedProvider, cleanKey);

      // Test thực tế
      let testReply = '';
      try {
        testReply = await geminiService.testProviderKey(selectedProvider, cleanKey);
      } catch (testErr: any) {
        // Key validate OK nhưng test fail — vẫn lưu
      }

      // Save to apiKeyManager
      apiKeyManager.setProviderKey(selectedProvider, cleanKey);
      apiKeyManager.setActiveProvider(selectedProvider);

      // Save full config to Supabase
      await userService.saveProviderConfig(apiKeyManager.exportConfig());
      // Backward compat: also save gemini key to legacy column
      if (selectedProvider === 'gemini') {
        await userService.saveApiKey(cleanKey);
      }

      setIsKeyConfigured(true);
      closeOverlay();

      if (testReply) {
        const short = testReply.length > 80 ? testReply.slice(0, 80) + '...' : testReply;
        showToast(`${providerName} hoạt động! AI: "${short}"`, "success");
      } else {
        showToast(`Đã lưu ${providerName} API Key.`, "success");
      }
    } catch (err: any) {
      showToast(`${providerName}: ${err.message}`, "error");
    } finally {
      setIsValidating(false);
    }
  };

  const removeManualKey = async () => {
    const providerName = PROVIDERS[selectedProvider]?.name || selectedProvider;
    if (window.confirm(`Xóa API Key của ${providerName}?`)) {
      apiKeyManager.setProviderKey(selectedProvider, '');
      // If removing active provider, check if any other provider has key
      const remaining = apiKeyManager.getConfiguredProviders();
      if (remaining.length > 0) {
        apiKeyManager.setActiveProvider(remaining[0]);
        setSelectedProvider(remaining[0]);
        setManualApiKey(apiKeyManager.getProviderKey(remaining[0]));
        setIsKeyConfigured(true);
      } else {
        setManualApiKey('');
        setIsKeyConfigured(false);
      }
      await userService.saveProviderConfig(apiKeyManager.exportConfig());
      if (selectedProvider === 'gemini') await userService.saveApiKey('');
      closeOverlay();
      showToast(`Đã gỡ bỏ API Key ${providerName}.`, "info");
    }
  };

  const saveToLibrary = async (book: Book) => {
    try {
      await bookService.upsertBook(book);
      await loadData();
      await loadActivities();
      handleTabChange('vault');
      showToast(`Đã thêm "${book.title}" vào tủ sách cá nhân.`, "success");
    } catch (err) {
      showToast("Không thể lưu sách. Vui lòng thử lại sau.", "error");
    }
  };

  const deleteBookPermanently = async (bookId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('⚠️ ADMIN: Xóa sách vĩnh viễn khỏi hệ thống?\nHành động này KHÔNG THỂ hoàn tác!')) return;
    try {
      await bookService.deleteBook(bookId);
      await loadData();
      await loadActivities();
      // Xoá cuốn đang mở thì phải rời Work Zone: hash cũ vẫn trỏ vào sách đã mất,
      // tải lại trang là mở ra một cuốn không còn tồn tại.
      if (selectedBookId === bookId) handleTabChange('vault');
      showToast('Đã xóa sách vĩnh viễn khỏi hệ thống.', 'success');
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, 'error');
    }
  };

  const unsaveFromLibrary = async (bookId: string) => {
    try {
      await bookService.removeUserFromBook(bookId);
      await loadData();
      await loadActivities();
      if (selectedBookId === bookId) handleTabChange('vault');
      showToast("Đã gỡ sách khỏi tủ cá nhân.", "info");
    } catch (err) {
      showToast("Lỗi khi gỡ sách.", "error");
    }
  };

  const addBook = async (title: string, author: string, coverImage?: string, tags: string[] = []) => {
    try {
      await bookService.upsertBook({ title, author, coverImage, tags });
      await loadData();
      await loadActivities();
      handleTabChange('vault');
      showToast("Thêm sách mới thành công.", "success");
    } catch (err) {
      showToast("Lỗi khi thêm sách.", "error");
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'ADD_BOOK': return 'vừa thêm sách';
      case 'ANALYZE_BOOK': return 'vừa phân tích tri thức';
      case 'SAVE_BOOK': return 'vừa lưu sách';
      default: return 'vừa hoạt động';
    }
  };

  if (!session && !isLoading) {
    // Link chia sẻ sách: khách chưa đăng nhập vẫn đọc được cuốn đó.
    if (route.bookId) {
      return <PublicBookView bookId={route.bookId} onLogin={() => authService.signInWithGoogle()} />;
    }
    return <AuthView />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#121317] text-white w-full font-sans text-sm relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar (Desktop Only) */}
      <aside
        className={`fixed md:relative z-40 h-full bg-[#1e2025] border-r border-[#2F3034]/50 transition-all duration-300 transform 
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'} hidden md:flex flex-col shrink-0 safe-top safe-bottom`}
      >
        <div className="p-4 flex items-center justify-between border-b border-[#2F3034]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-medium shadow-lg text-sm">10k</div>
            {(isSidebarOpen || window.innerWidth >= 768) && <span className="font-bold text-sm tracking-tight uppercase text-white">10kBook</span>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 text-slate-500 hover:text-white bg-white/5 rounded-md touch-target">
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} className="md:hidden" />}
          </button>
        </div>

        <div className="px-3 mt-4 flex flex-col gap-1">
          {/* Global Analysis Running Indicator */}
          {globalAnalysisRunning && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600/10 border border-blue-600/20 mb-1 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
              {isSidebarOpen && (
                <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wide">AI đang chạy...</p>
              )}
            </div>
          )}
          {[
            { id: 'vault', label: 'Kho sách', icon: Compass },
            { id: 'insight', label: 'Work Zone', icon: LayoutDashboard, disabled: !selectedBookId },
            { id: 'actions', label: 'Lộ Trình Thực Thi', icon: CheckCircle2 },
            { id: 'help', label: 'Hướng dẫn', icon: HelpCircle },
          ].map((item) => (
            <button key={item.id} onClick={() => !item.disabled && handleTabChange(item.id)} disabled={item.disabled} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border touch-target ${activeTab === item.id ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' : item.disabled ? 'text-slate-700 border-transparent cursor-not-allowed' : 'text-slate-400 border-transparent hover:bg-white/5'}`}>
              <item.icon size={18} />
              {isSidebarOpen && <span className="text-[11px] font-bold uppercase tracking-wide">{item.label}</span>}
            </button>
          ))}
        </div>

        {isSidebarOpen && (
          <div className="mt-4 px-3 flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-none border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 text-slate-500 px-1 mb-1">
              <Activity size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Hoạt động gần đây</span>
            </div>
            {activities.map((act, i) => {
              const matchedBook = books.find(b => b.title === act.book_title);
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (matchedBook) handleOpenBook(matchedBook.id);
                  }}
                  className={`flex flex-col p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/[0.08] transition-all ${matchedBook ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500">
                      <User size={12} />
                    </div>
                    <span className="text-[11px] font-bold text-blue-400 truncate">{act.user_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {getActionLabel(act.action_type)} <span className={`font-bold italic ${matchedBook ? 'text-amber-400 hover:text-amber-300' : 'text-white'}`}>"{act.book_title}"</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3 border-t border-[#2F3034]/30 mt-auto">
          {/* Settings / API Key */}
          <div
            onClick={handleOpenAiKey}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer group mb-2 transition-all ${isKeyConfigured ? 'bg-green-500/5 border-green-500/20' : isAdmin ? 'bg-blue-500/5 border-blue-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}
          >
            <Settings size={18} className={isKeyConfigured ? 'text-green-500' : isAdmin ? 'text-blue-500' : 'text-rose-500'} />
            {isSidebarOpen && (
              <div className="flex-1">
                <p className={`text-[11px] font-bold uppercase tracking-wide leading-none ${isKeyConfigured ? 'text-green-500' : isAdmin ? 'text-blue-500' : 'text-rose-500'}`}>
                  AI: {isKeyConfigured ? 'Kích hoạt' : isAdmin ? 'Khoá chung' : 'Chưa có key'}
                </p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition-all text-[11px] font-bold uppercase tracking-wide touch-target">
            <LogOut size={18} />{isSidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Mobile Only) */}
      < div className="md:hidden fixed bottom-0 left-0 w-full bg-[#18191D]/90 backdrop-blur-xl border-t border-[#2F3034] z-50 safe-bottom pb-safe flex justify-around items-center px-2 py-2" >
        {
          [
            { id: 'vault', label: 'Kho sách', icon: Compass },
            { id: 'insight', label: 'Work Zone', icon: LayoutDashboard, disabled: !selectedBookId },
            { id: 'actions', label: 'Lộ Trình', icon: CheckCircle2 },
            { id: 'help', label: 'Hướng dẫn', icon: HelpCircle },
            // Trên điện thoại thanh này là lối đi DUY NHẤT: thanh bên bị ẩn hẳn
            // (hidden md:flex), nên thiếu mục này thì không ai nhập được API Key,
            // không xem được còn mấy lượt, cũng không đăng xuất nổi.
            { id: 'cai-dat', label: 'Cài đặt', icon: Settings },
          ].map((item) => {
            const dangMo = item.id === 'cai-dat' ? isSettingsOpen : activeTab === item.id;
            return (
            <button
              key={item.id}
              onClick={() => {
                if (item.disabled) return;
                if (item.id === 'cai-dat') navigate({ overlay: 'cai-dat' });
                else handleTabChange(item.id);
              }}
              disabled={item.disabled}
              className={`flex flex-col items-center justify-center flex-1 max-w-[4.5rem] h-14 rounded-xl transition-all touch-manipulation ${dangMo
                ? 'text-blue-500 bg-blue-500/10'
                : item.disabled
                  ? 'text-slate-700 opacity-50'
                  : 'text-slate-400 hover:bg-white/5'
                }`}
            >
              <item.icon size={22} className="mb-1" />
              <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
            </button>
          );})
        }
      </div >

      {/* Main Content */}
      < main id="main-scroll" className="flex-1 overflow-y-auto bg-[#121317] relative pb-20 md:pb-0" >

        {/* PWA Install Banner */}
        {
          showInstallBanner && (
            <div className="m-4 bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-2xl flex items-center justify-between shadow-xl animate-pwa-in">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><Download className="text-white" size={20} /></div>
                <div>
                  <p className="text-white font-medium text-[10px] uppercase tracking-wider">Cài đặt ứng dụng</p>
                  <p className="text-white/80 text-[9px] font-medium">Trải nghiệm 10kBook mượt mà hơn</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowInstallBanner(false)} className="text-white/60 p-2"><X size={16} /></button>
                <button onClick={installPWA} className="bg-white text-blue-700 px-4 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-wider">CÀI ĐẶT</button>
              </div>
            </div>
          )
        }

        <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12">
          {isLoading ? (
            <div className="h-full flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div></div>
          ) : activeTab === 'help' ? (
            <HelpView />
          ) : activeTab === 'insight' && selectedBook ? (
            <InsightCenter book={selectedBook} onUpdate={updateBook} theme="dark" userProfile={userProfile} onOpenSettings={() => navigate({ overlay: 'cai-dat' })} isKeyConfigured={isKeyConfigured} isAdmin={isAdmin} onAuthorClick={handleAuthorClick} persistedLayer={persistedLayer} onLayerChange={setPersistedLayer} onDeleteBook={isAdmin ? () => deleteBookPermanently(selectedBook.id) : undefined} />
          ) : activeTab === 'actions' ? (
            <ActionTracker books={libraryBooks} onUpdateBook={updateBook} />
          ) : (
            <DiscoveryView onSelectBook={handleOpenBook} onSave={saveToLibrary} onUpdateBook={updateBook} allBooks={discoveryBooks} userBooks={libraryBooks} onAddBook={addBook} onUnsaveBook={unsaveFromLibrary} onDeleteBook={isAdmin ? deleteBookPermanently : undefined} isAdmin={isAdmin} initialSearch={authorFilter} overlay={route.overlay} overlayBookId={route.overlayBookId} onOverlay={(o: Overlay, bookId?: string) => navigate({ overlay: o, overlayBookId: bookId ?? null })} onCloseOverlay={closeOverlay} />
          )}
        </div>
      </main >

      {/* Settings Modal */}
      {
        isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 safe-top safe-bottom">
            <div className="w-full max-w-md bg-[#212226] border border-[#2F3034] rounded-[2rem] p-6 md:p-10 shadow-2xl space-y-6 md:space-y-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[85vh] scrollbar-none">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isKeyConfigured ? 'bg-green-500/10' : 'bg-rose-500/10'}`}>
                    <Key size={20} className={isKeyConfigured ? 'text-green-500' : 'text-rose-500'} />
                  </div>
                  <h2 className="text-lg md:text-xl font-medium text-white uppercase tracking-tighter">AI Cấu hình</h2>
                </div>
                <button onClick={() => !isValidating && closeOverlay()} className="text-slate-600 hover:text-white transition-colors touch-target" disabled={isValidating}>
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${isKeyConfigured ? 'bg-green-500/5 border-green-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                  {isKeyConfigured ? <ShieldCheck className="text-green-500 shrink-0" size={18} /> : <ShieldAlert className="text-amber-500 shrink-0" size={18} />}
                  <div className="flex-1">
                    <p className="text-slate-400 text-[9px] md:text-[10px] leading-relaxed font-medium">
                      {isKeyConfigured
                        ? `Đang dùng ${PROVIDERS[apiKeyManager.getActiveProvider()]?.name || 'AI'}. Chọn provider bên dưới để thêm/đổi.`
                        : "Chọn nhà cung cấp AI và nhập API Key của bạn để phân tích sách. Sách đã phân tích sẵn thì đọc được mà không cần key."}
                    </p>
                    {!isKeyConfigured && isAdmin && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Đang dùng khoá chung (quyền admin)
                      </div>
                    )}
                  </div>
                </div>

                {/* Provider selector chips */}
                <div className="space-y-2">
                  <label className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">Chọn AI Provider</label>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_LIST.map(p => {
                      const hasKey = apiKeyManager.hasProviderKey(p.id);
                      const isActive = selectedProvider === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedProvider(p.id);
                            setManualApiKey(apiKeyManager.getProviderKey(p.id));
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all border ${isActive
                            ? 'text-white border-blue-500/50 bg-blue-500/10'
                            : hasKey
                              ? 'text-green-400 border-green-500/20 bg-green-500/5 hover:bg-green-500/10'
                              : 'text-slate-500 border-[#2F3034] hover:border-slate-500/30 hover:text-slate-300'
                            }`}
                        >
                          {hasKey && !isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5" />}
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* API Key input for selected provider */}
                <div className="space-y-2">
                  <label className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">
                    {PROVIDERS[selectedProvider]?.name} API Key
                  </label>
                  <input
                    type="password"
                    value={manualApiKey}
                    onChange={(e) => setManualApiKey(e.target.value)}
                    placeholder={`Dán ${PROVIDERS[selectedProvider]?.name} API Key...`}
                    disabled={isValidating}
                    className="w-full bg-[#121317] border border-[#2F3034] rounded-xl p-4 text-[13px] text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                  />
                </div>
                <a href={PROVIDERS[selectedProvider]?.keyLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors pt-1">
                  Tạo Key tại {PROVIDERS[selectedProvider]?.name} <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={saveManualKey} disabled={isValidating} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl text-[11px] font-medium uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 touch-target">
                  {isValidating ? <><Loader2 size={16} className="animate-spin" /> KIỂM TRA...</> : <><Save size={16} /> LƯU & KÍCH HOẠT</>}
                </button>
                {isKeyConfigured && !isValidating && (
                  <button onClick={removeManualKey} className="w-full bg-transparent hover:bg-rose-500/5 text-rose-500 py-3 rounded-xl text-[9px] font-medium uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-rose-500/10 touch-target">
                    XÓA KEY HIỆN TẠI
                  </button>
                )}
                {/* Lối đăng xuất cho điện thoại: nút trên thanh bên nằm sau `hidden md:flex` */}
                <button onClick={handleLogout} className="md:hidden w-full bg-transparent hover:bg-white/5 text-slate-500 py-3 rounded-xl text-[9px] font-medium uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-[#2F3034] touch-target">
                  <LogOut size={14} /> ĐĂNG XUẤT
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default App;

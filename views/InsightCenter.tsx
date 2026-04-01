import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types';
import {
  Sparkles, Brain, RefreshCw, List, Clock, AlertTriangle, Target, CheckCircle2, ShieldCheck, HelpCircle, FileText, MessageSquareQuote, Zap, Lightbulb, Key, Lock, ExternalLink, Download
} from 'lucide-react';
import { analysisManager, AnalysisState, AgentProgress, AnalysisErrorType } from '../services/analysisManager';
import StarRating from '../components/StarRating';
import { exportBookToPdf } from '../utils/exportPdf';

interface InsightCenterProps {
  book: Book;
  onUpdate: (book: Book) => void;
  theme: 'light' | 'dark';
  userProfile?: any;
  onOpenSettings: () => void;
  isKeyConfigured: boolean;
  freeQuotaRemaining?: number | null;
  onAuthorClick?: (author: string) => void;
  persistedLayer?: number;
  onLayerChange?: (layer: number) => void;
}

const safeRender = (val: any): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return '';
};

/** Skeleton shimmer block */
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

/** Per-agent loading skeleton for Overview layer */
const OverviewSkeleton = () => (
  <div className="space-y-8">
    <div className="space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-40" /></div>
    <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-40" />)}</div>
    <Skeleton className="h-32" />
    <Skeleton className="h-28" />
  </div>
);

/** Per-agent loading skeleton for Architecture layer */
const ArchSkeleton = () => (
  <div className="space-y-6">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-36" />)}</div>
);

/** Per-agent loading skeleton for Ideas layer */
const IdeasSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}</div>
);

/** Status badge for layer tab */
const AgentBadge: React.FC<{ status: AgentProgress[keyof AgentProgress] }> = ({ status }) => {
  if (status === 'running') return <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />;
  if (status === 'done') return <span className="ml-1 text-[9px] text-green-400">✓</span>;
  if (status === 'error') return <span className="ml-1 text-[9px] text-rose-400">!</span>;
  return null;
};

const InsightCenter: React.FC<InsightCenterProps> = ({ book, onUpdate, userProfile, onOpenSettings, isKeyConfigured, freeQuotaRemaining, onAuthorClick, persistedLayer = 0, onLayerChange }) => {
  // Subscribe to global analysisManager — survives tab switches
  const [analysisState, setAnalysisState] = useState<AnalysisState>(() => analysisManager.getState());
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<AnalysisErrorType>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [activeLayer, setActiveLayer] = useState(persistedLayer);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Subscribe to analysisManager on mount — unsubscribe on unmount
  useEffect(() => {
    return analysisManager.subscribe((s) => {
      setAnalysisState({ ...s });
      if (s.status === 'error') {
        setError(s.error);
        setErrorType(s.errorType);
        setShowErrorPopup(true);
      }
      if (s.status === 'idle' || s.status === 'done') {
        setError(null);
        setErrorType(null);
        setShowErrorPopup(false);
      }
    });
  }, []);

  // Elapsed time counter while processing
  useEffect(() => {
    if (analysisState.status !== 'processing' || !analysisState.startedAt) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (analysisState.startedAt ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [analysisState.status, analysisState.startedAt]);

  const isProcessing = analysisState.status === 'processing' && analysisState.bookId === book.id;
  // During processing: use partialResult from manager; after done: use saved book.analysis
  const liveAnalysis = isProcessing ? (analysisState.partialResult || {}) : (book.analysis || {});
  const ap = analysisState.agentProgress;

  // Agent → layer mapping
  const layerAgentKey: Record<number, keyof AgentProgress> = { 1: 'meta', 2: 'knowledge', 3: 'ideas' };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/book/${book.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: book.title, text: `Đọc "${book.title}" - ${book.author}`, url });
        return;
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLayerChange = (id: number) => {
    // Save current scroll before switching layers
    const scrollEl = document.getElementById('main-scroll');
    if (scrollEl) {
      const key = `scroll_${book.id}_layer_${activeLayer}`;
      localStorage.setItem(key, String(scrollEl.scrollTop));
    }
    setActiveLayer(id);
    onLayerChange?.(id);
  };

  // Restore scroll when layer changes
  useEffect(() => {
    const scrollEl = document.getElementById('main-scroll');
    if (!scrollEl) return;
    const key = `scroll_${book.id}_layer_${activeLayer}`;
    const saved = localStorage.getItem(key);
    // Small delay to let content render before scrolling
    const timer = setTimeout(() => {
      scrollEl.scrollTo({ top: saved ? Number(saved) : 0, behavior: 'instant' as ScrollBehavior });
    }, 80);
    return () => clearTimeout(timer);
  }, [activeLayer, book.id]);

  // Continuously track scroll position
  useEffect(() => {
    const scrollEl = document.getElementById('main-scroll');
    if (!scrollEl) return;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        const key = `scroll_${book.id}_layer_${activeLayer}`;
        localStorage.setItem(key, String(scrollEl.scrollTop));
        throttleTimer = null;
      }, 400);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [activeLayer, book.id]);

  const layers = [
    { id: 1, label: 'Overview', icon: Brain },
    { id: 2, label: 'Architecture', icon: List },
    { id: 3, label: 'Ideas', icon: Lightbulb },
  ];

  const hasAccess = isKeyConfigured || (freeQuotaRemaining != null && freeQuotaRemaining > 0);

  const runAdvancedAnalysis = async (isRetry = false) => {
    if (!hasAccess) {
      onOpenSettings();
      return;
    }

    if (isRetry) {
      const confirmRetry = window.confirm("Bạn muốn phân tích lại bằng AI? Dữ liệu hiện tại sẽ bị ghi đè.");
      if (!confirmRetry) return;
    }

    setError(null);

    // Lấy checklist hiện tại trước khi bắt đầu (giữ snapshot)
    const existingManualActions = (book.checklist || []).filter(item => {
      const content = typeof item === 'object' ? (item as any).task : item;
      return content && content.length > 0;
    });

    // Delegate to global manager — chạy ẩn, không bị dừng khi chuyển tab
    await analysisManager.startAnalysis(
      book.id,
      book.title,
      book.author,
      'Trích xuất tri thức tối ưu và lộ trình thực thi',
      // onComplete
      (_bookId, result) => {
        onUpdate({
          ...book,
          isSummarized: true,
          analysis: result,
          checklist: [...existingManualActions],
        });
      },
      // onError
      (_bookId, errMsg) => {
        setError(errMsg);
      }
    );
  };

  // Sách đã phân tích nhưng analysis chưa lazy-load xong → hiện loading
  if (!isProcessing && !book.analysis && book.isSummarized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-medium">Đang tải phân tích...</p>
        </div>
      </div>
    );
  }

  // Only show hard-block if: not processing AND no analysis data AND no access (no key + no quota)
  if (!isProcessing && !book.analysis) {
    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] animate-in fade-in duration-700 px-4">
          <div className="w-full max-w-xl bg-[#212226] border border-rose-500/20 p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
            <div className="mb-6 md:mb-8 flex justify-center">
              <div className="p-5 md:p-6 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Lock size={32} className="text-rose-500" />
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-medium text-white mb-3 uppercase tracking-tighter">Tính năng đã bị khóa</h2>
            <p className="text-slate-500 text-xs md:text-sm mb-8 leading-relaxed max-w-sm mx-auto font-medium">
              Bạn cần cấu hình Gemini API Key cá nhân để bắt đầu phân tích tri thức chuyên sâu.
            </p>
            <button onClick={onOpenSettings} className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-medium text-[10px] md:text-[11px] uppercase tracking-widest transition-all bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-3 shadow-xl">
              <Key size={16} /> THIẾT LẬP API KEY
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] animate-in fade-in duration-700 px-4">
        <div className="w-full max-w-xl bg-[#212226] border border-[#2F3034] p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
          <div className="mb-6 md:mb-8 flex justify-center">
            <div className="p-5 bg-blue-600/10 rounded-full border border-blue-600/20">
              <Brain size={32} className="text-blue-500" />
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-medium text-white mb-3 uppercase tracking-tighter">Sẵn sàng phân tích</h2>
          <p className="text-slate-500 text-xs md:text-sm mb-6 leading-relaxed max-w-sm mx-auto font-medium">
            Hãy bắt đầu giải phẫu cuốn sách này để chiết xuất những tri thức giá trị nhất.
          </p>
          {error && (
            <div className={`mb-8 p-4 rounded-xl text-left animate-in fade-in slide-in-from-bottom-2 border ${errorType === 'api_key' ? 'bg-amber-500/10 border-amber-500/20' : errorType === 'quota' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              <div className="flex items-start gap-3">
                {errorType === 'api_key' ? <Key size={16} className="text-amber-400 shrink-0 mt-0.5" /> : errorType === 'quota' ? <Lock size={16} className="text-blue-400 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${errorType === 'api_key' ? 'text-amber-400' : errorType === 'quota' ? 'text-blue-400' : 'text-rose-400'}`}>
                    {errorType === 'api_key' ? 'API Key lỗi' : errorType === 'quota' ? 'Hết lượt miễn phí' : 'Đã xảy ra lỗi'}
                  </p>
                  <p className={`text-[11px] md:text-xs ${errorType === 'api_key' ? 'text-amber-300' : errorType === 'quota' ? 'text-blue-300' : 'text-rose-300'}`}>{error}</p>
                  {(errorType === 'api_key' || errorType === 'quota') && (
                    <button onClick={onOpenSettings} className="mt-3 text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors">
                      <Key size={12} /> Cài đặt API Key
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <button onClick={() => runAdvancedAnalysis(false)} className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-medium text-[10px] md:text-[11px] uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white shadow-xl transition-colors">
            {error ? 'THỬ LẠI LẦN NỮA' : (!isKeyConfigured && freeQuotaRemaining != null && freeQuotaRemaining > 0) ? `DÙNG ${freeQuotaRemaining} LƯỢT MIỄN PHÍ` : 'BẮT ĐẦU PHÂN TÍCH TRI THỨC'}
          </button>
        </div>
      </div>
    );
  }

  const analysis = isProcessing ? liveAnalysis : book.analysis;

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-32 animate-in fade-in">

      {/* ═══ Error Popup Modal ═══ */}
      {showErrorPopup && error && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#212226] border border-[#2F3034] rounded-[2rem] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className={`p-5 rounded-full border ${errorType === 'api_key' ? 'bg-amber-500/10 border-amber-500/20' : errorType === 'quota' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                {errorType === 'api_key' ? (
                  <Key size={32} className="text-amber-500" />
                ) : errorType === 'quota' ? (
                  <Lock size={32} className="text-blue-500" />
                ) : (
                  <AlertTriangle size={32} className="text-rose-500" />
                )}
              </div>
            </div>
            <h2 className="text-lg md:text-xl font-medium text-white text-center mb-3 uppercase tracking-tighter">
              {errorType === 'api_key' ? 'API Key không hợp lệ' : errorType === 'quota' ? 'Hết lượt miễn phí' : 'Lỗi phân tích'}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm text-center mb-8 leading-relaxed font-medium">
              {error}
            </p>
            <div className="flex flex-col gap-3">
              {(errorType === 'api_key' || errorType === 'quota') && (
                <button
                  onClick={() => { setShowErrorPopup(false); onOpenSettings(); }}
                  className="w-full py-4 rounded-xl font-medium text-[10px] md:text-[11px] uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white shadow-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Key size={16} />
                  {errorType === 'api_key' ? 'CẬP NHẬT API KEY' : 'NHẬP API KEY CÁ NHÂN'}
                </button>
              )}
              <button
                onClick={() => setShowErrorPopup(false)}
                className="w-full py-3 rounded-xl font-medium text-[10px] md:text-[11px] uppercase tracking-widest bg-transparent hover:bg-white/5 text-slate-400 border border-white/10 transition-colors"
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#2F3034] pb-6 md:pb-8 gap-4 mb-6">
        <div className="space-y-2 md:space-y-3 text-left">
          <h1 className="text-2xl md:text-4xl font-medium text-white tracking-tight leading-tight">{book.title}</h1>
          <p className="text-slate-500 text-sm md:text-base font-normal tracking-normal">
            Tác giả: {onAuthorClick ? (
              <button onClick={() => onAuthorClick(book.author)} className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">{book.author}</button>
            ) : (
              <span className="text-white">{book.author}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export PDF Button */}
          <button
            onClick={() => exportBookToPdf(book.title, book.author, analysis)}
            title="Xuất PDF"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium uppercase tracking-wider border bg-[#212226] border-[#2F3034] text-slate-400 hover:text-white hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all touch-manipulation"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Xuất PDF</span>
          </button>
          <button
            onClick={handleShare}
            title="Sao chép link chia sẻ"
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium uppercase tracking-wider border transition-all touch-manipulation ${copied
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-[#212226] border-[#2F3034] text-slate-400 hover:text-white hover:border-blue-500/30'
              }`}
          >
            {copied ? (
              <><CheckCircle2 size={14} /> <span className="hidden sm:inline">Link đã sao chép!</span></>
            ) : (
              <><ExternalLink size={14} /> <span className="hidden sm:inline">Chia sẻ</span></>
            )}
          </button>
          <button onClick={() => runAdvancedAnalysis(true)} className="p-3 bg-[#212226] border border-[#2F3034] rounded-xl text-slate-500 hover:text-white shrink-0 touch-manipulation">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tab Bar - Sticky at top */}
      <div className="sticky top-0 z-30 pt-4 pb-4 bg-[#121317]/95 backdrop-blur-xl mb-6 -mx-4 px-4 md:mx-0 md:px-0">
        {/* Processing inline banner */}
        {isProcessing && (
          <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl bg-blue-600/10 border border-blue-600/20 text-[11px]">
            <Sparkles size={13} className="text-blue-400 animate-spin shrink-0" />
            <span className="text-blue-300 font-medium flex-1">{analysisState.progress || 'AI đang phân tích...'}</span>
            <span className="text-slate-600 font-mono text-[10px]">
              {elapsed > 0 ? (elapsed > 59 ? `${Math.floor(elapsed / 60)}p ${elapsed % 60}s` : `${elapsed}s`) : ''}
            </span>
            <span className="text-slate-700 text-[10px] hidden sm:inline">· Bạn có thể chuyển tab</span>
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none p-1.5 bg-[#18191D] rounded-2xl border border-[#2F3034] shadow-sm mask-fade-right">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => handleLayerChange(layer.id)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[11px] md:text-[12px] font-medium whitespace-nowrap transition-all shrink-0 touch-manipulation ${activeLayer === layer.id
                ? 'bg-[#3279F9] text-white shadow-lg'
                : 'text-[#B2BBC5] hover:text-white hover:bg-white/5'
                }`}
            >
              <layer.icon size={14} className={activeLayer === layer.id ? 'opacity-100' : 'opacity-70'} />
              <span>{layer.label}</span>
              {isProcessing && <AgentBadge status={ap[layerAgentKey[layer.id]]} />}
            </button>
          ))}
        </div>
      </div>

      {/* Layer Content */}
      <div className="animate-in fade-in duration-300">

        {/* Layer 1: Overview = Thesis + Critical + Insights + Summary */}
        {activeLayer === 1 && (
          <div className="space-y-8 md:space-y-10 text-left">
            {(isProcessing && ap.meta !== 'done') ? <OverviewSkeleton /> : (<>
              {/* Book Meta Info Card */}
              {analysis.bookMeta && (
                <section className="bg-[#212226] border border-[#2F3034] rounded-2xl p-5 md:p-6 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {analysis.bookMeta.difficultyLevel && (
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border
                    ${analysis.bookMeta.difficultyLevel.includes('DỄ') ? 'bg-green-600/10 text-green-400 border-green-600/20'
                          : analysis.bookMeta.difficultyLevel.includes('CHUYÊN') ? 'bg-rose-600/10 text-rose-400 border-rose-600/20'
                            : 'bg-amber-600/10 text-amber-400 border-amber-600/20'}`}>
                        {analysis.bookMeta.difficultyLevel}
                      </span>
                    )}
                    {analysis.bookMeta.bookType && (
                      <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border bg-blue-600/10 text-blue-400 border-blue-600/20">
                        {analysis.bookMeta.bookType}
                      </span>
                    )}
                    {analysis.bookMeta.estimatedReadingTime > 0 && (
                      <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest border bg-white/5 text-slate-400 border-white/10 flex items-center gap-1.5">
                        <Clock size={11} /> {analysis.bookMeta.estimatedReadingTime}h đọc
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.bookMeta.targetAudience && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Đối tượng phù hợp</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{analysis.bookMeta.targetAudience}</p>
                      </div>
                    )}
                    {analysis.bookMeta.prerequisites && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Kiến thức nền cần có</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{analysis.bookMeta.prerequisites}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Central Thesis */}

              <section className="relative px-2 md:px-0">
                <div className="hidden md:block absolute -left-4 top-0 bottom-0 w-1.5 bg-blue-600 rounded-full"></div>
                <div className="md:pl-10 space-y-4 md:space-y-6">
                  <div className="flex items-center gap-2 md:gap-3 text-blue-500">
                    <Brain size={20} className="md:w-6 md:h-6" />
                    <h3 className="text-[11px] font-medium tracking-wide">Central Thesis</h3>
                  </div>
                  <h2 className="text-xl md:text-3xl font-medium text-white leading-tight italic max-w-4xl tracking-tight">"{safeRender(analysis.centralThesis?.oneLiner)}"</h2>
                  <p className="text-slate-50 leading-relaxed text-sm md:text-lg max-w-4xl border-l border-[#2F3034] pl-6 md:pl-10 py-4 font-medium italic opacity-80 whitespace-pre-line">
                    {safeRender(analysis.centralThesis?.expanded)}
                  </p>
                </div>
              </section>

              {/* Critical Analysis */}
              <section className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-rose-600/10 rounded-xl border border-rose-600/20"><ShieldCheck size={20} className="text-rose-500" /></div>
                  <h3 className="text-[11px] font-medium text-white tracking-wide">Critical Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {[
                    { label: 'Ưu điểm', color: 'text-green-500', icon: CheckCircle2, data: analysis.criticalAnalysis?.strengths },
                    { label: 'Hạn chế', color: 'text-rose-500', icon: AlertTriangle, data: analysis.criticalAnalysis?.weaknesses },
                    { label: 'Phản biện', color: 'text-blue-500', icon: HelpCircle, data: analysis.criticalAnalysis?.counterArguments }
                  ].map((section, idx) => (
                    <div key={idx} className="bg-[#212226] p-6 md:p-8 rounded-2xl border border-[#2F3034] space-y-4">
                      <h4 className={`${section.color} font-medium text-[11px] tracking-wide flex items-center gap-2`}><section.icon size={16} /> {section.label}</h4>
                      <ul className="space-y-3">
                        {section.data?.map((s: string, i: number) => (
                          <li key={i} className="text-[#E6EAF0] text-sm leading-relaxed flex gap-2">
                            <span className={`${section.color} opacity-50`}>•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Insights */}
              <section className="space-y-4 text-left">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-indigo-600/10 rounded-xl border border-indigo-600/20"><Target size={20} className="text-indigo-500" /></div>
                  <h3 className="text-[11px] font-medium text-white tracking-wide">Insights</h3>
                </div>
                <div className="bg-gradient-to-br from-indigo-900/10 to-transparent border border-indigo-600/20 p-6 md:p-10 rounded-2xl space-y-6">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center text-center md:text-left">
                    <div className="shrink-0">
                      <div className="text-5xl md:text-7xl font-medium text-white">{analysis.personalizedInsights?.relevanceScore}%</div>
                      <p className="text-[11px] font-medium text-indigo-500 tracking-wide mt-1">Độ tương thích</p>
                    </div>
                    <div className="hidden md:block w-px h-20 bg-indigo-600/20"></div>
                    <p className="text-slate-300 text-base md:text-xl font-normal leading-relaxed italic opacity-90 max-w-2xl whitespace-pre-line">
                      {analysis.personalizedInsights?.relevanceExplanation}
                    </p>
                  </div>
                </div>
              </section>

              {/* Summary */}
              <section className="bg-[#212226] p-6 md:p-10 rounded-2xl border border-[#2F3034] text-left">
                <div className="space-y-6 md:space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-xl border border-white/5"><FileText size={20} className="text-slate-500" /></div>
                    <h3 className="text-[11px] font-medium text-white tracking-wide">Summary</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-medium text-slate-600 tracking-wide">Tóm lược tinh hoa</h4>
                      <p className="text-[#E6EAF0] text-sm md:text-base leading-relaxed font-normal whitespace-pre-line">{analysis.executiveSummary?.forBusy}</p>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-medium text-slate-600 tracking-wide">Bài học đắt giá</h4>
                      <p className="text-xl md:text-2xl font-medium text-blue-500 tracking-tight leading-tight italic">
                        "{analysis.executiveSummary?.ifOnlyOneThing}"
                      </p>
                    </div>
                  </div>
                  {/* Rating + Export */}
                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <StarRating bookId={book.id} compact />
                    <button
                      onClick={() => exportBookToPdf(book.title, book.author, analysis)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg"
                    >
                      <Download size={14} /> Xuất PDF
                    </button>
                  </div>
                </div>
              </section>

            </>)}
          </div>
        )}

        {/* Layer 2: Architecture */}
        {activeLayer === 2 && (
          isProcessing && ap.knowledge !== 'done' ? <ArchSkeleton /> : (
            <section className="space-y-6 md:space-y-8 text-left">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-blue-600/10 rounded-xl border border-blue-600/20"><List size={20} className="text-blue-500" /></div>
                <h3 className="text-[11px] font-medium text-white tracking-wide">Knowledge Architecture</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 md:gap-8">
                {analysis.knowledgeArchitecture?.map((part: any, i: number) => (
                  <div key={i} className="group flex flex-col md:flex-row gap-4 md:gap-8 p-6 md:p-8 bg-[#212226] rounded-2xl border border-[#2F3034] hover:border-blue-600/30 transition-all">
                    <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 bg-blue-600/10 border border-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 font-medium text-lg">0{i + 1}</div>
                    <div className="flex-1 space-y-3 md:space-y-4">
                      <h4 className="text-white font-medium text-lg md:text-xl tracking-tight">{part.partTitle}</h4>
                      <div className="text-[#E6EAF0] leading-relaxed text-sm md:text-base font-normal opacity-90 whitespace-pre-line">{part.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        )}

        {/* Layer 3: Ideas */}
        {activeLayer === 3 && (
          isProcessing && ap.ideas !== 'done' ? <IdeasSkeleton /> : (
            <section className="space-y-6 md:space-y-8 text-left">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-amber-600/10 rounded-xl border border-amber-600/20"><Lightbulb size={20} className="text-amber-500" /></div>
                <h3 className="text-[11px] font-medium text-white tracking-wide">Idea System</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.ideaSystem?.map((idea: any, i: number) => (
                  <div key={i} className="bg-[#212226] border border-[#2F3034] p-6 md:p-8 rounded-2xl space-y-5">
                    <h3 className="text-lg md:text-2xl font-medium text-white tracking-tight leading-tight">{idea.name}</h3>
                    <p className="text-[#E6EAF0] text-sm md:text-base leading-relaxed border-l border-[#2F3034] pl-4 font-normal italic opacity-80 whitespace-pre-line">{idea.description}</p>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-blue-500" />
                        <p className="text-[11px] font-medium text-blue-500 tracking-wide">Giao thức</p>
                      </div>
                      <div className="text-sm md:text-base text-slate-200 leading-relaxed font-normal whitespace-pre-line">{idea.protocol}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        )}

      </div>
    </div>
  );
};

export default InsightCenter;
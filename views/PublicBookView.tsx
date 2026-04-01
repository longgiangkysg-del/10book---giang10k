import React, { useState, useEffect } from 'react';
import {
    Brain, List, Lightbulb, Clock, AlertTriangle, Target, CheckCircle2, ShieldCheck, HelpCircle,
    FileText, Zap, ExternalLink, Download, LogIn, BookOpen
} from 'lucide-react';
import { publicBookService, PublicBookData } from '../services/publicBookService';
import { exportBookToPdf } from '../utils/exportPdf';

interface PublicBookViewProps {
    bookId: string;
    onLogin: () => void;
}

const safeRender = (val: any): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    return '';
};

const PublicBookView: React.FC<PublicBookViewProps> = ({ bookId, onLogin }) => {
    const [bookData, setBookData] = useState<PublicBookData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeLayer, setActiveLayer] = useState(1);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await publicBookService.fetchPublicBook(bookId);
            if (!data) {
                setNotFound(true);
            } else {
                setBookData(data);
                // Dynamic SEO: update document title
                document.title = `${data.title} — ${data.author} | 10kBook`;
            }
            setIsLoading(false);
        };
        load();

        return () => { document.title = '10kBook - High Productivity System'; };
    }, [bookId]);

    const handleShare = async () => {
        const url = `${window.location.origin}${window.location.pathname}#/book/${bookId}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: bookData?.title, text: `Đọc "${bookData?.title}" - ${bookData?.author}`, url });
                return;
            } catch { /* cancelled */ }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const layers = [
        { id: 1, label: 'Overview', icon: Brain },
        { id: 2, label: 'Architecture', icon: List },
        { id: 3, label: 'Ideas', icon: Lightbulb },
    ];

    // ── Loading State ──
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#121317] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    // ── Not Found State ──
    if (notFound || !bookData) {
        return (
            <div className="min-h-screen bg-[#121317] flex flex-col items-center justify-center p-4 text-center">
                <div className="w-full max-w-md bg-[#212226] border border-[#2F3034] p-10 rounded-[2.5rem] shadow-2xl space-y-6">
                    <div className="p-5 bg-amber-500/10 rounded-full border border-amber-500/20 inline-flex">
                        <BookOpen size={32} className="text-amber-500" />
                    </div>
                    <h2 className="text-xl font-medium text-white uppercase tracking-tighter">Không tìm thấy sách</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Cuốn sách này chưa được phân tích hoặc không tồn tại. Hãy đăng nhập để khám phá kho sách.
                    </p>
                    <button onClick={onLogin} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] uppercase tracking-widest transition-colors flex items-center justify-center gap-3">
                        <LogIn size={16} /> ĐĂNG NHẬP
                    </button>
                </div>
            </div>
        );
    }

    const analysis = bookData.analysis;

    return (
        <div className="min-h-screen bg-[#121317] text-white font-sans text-sm">
            {/* ── Top Bar ── */}
            <header className="sticky top-0 z-50 bg-[#121317]/90 backdrop-blur-xl border-b border-[#2F3034]/50">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-medium text-[10px] shadow-lg">10k</div>
                        <span className="font-bold text-[11px] tracking-tight uppercase text-white">10kBook</span>
                    </div>
                    <button onClick={onLogin} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium uppercase tracking-widest transition-colors shadow-lg">
                        <LogIn size={14} /> Đăng nhập
                    </button>
                </div>
            </header>

            {/* ── Content ── */}
            <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-10 pb-32">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#2F3034] pb-6 md:pb-8 gap-4 mb-6">
                    <div className="space-y-2 md:space-y-3 text-left">
                        <h1 className="text-2xl md:text-4xl font-medium text-white tracking-tight leading-tight">{bookData.title}</h1>
                        <p className="text-slate-500 text-sm md:text-base font-normal tracking-normal">
                            Tác giả: <span className="text-white">{bookData.author}</span>
                        </p>
                        {bookData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {bookData.tags.map((tag, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-slate-400">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => exportBookToPdf(bookData.title, bookData.author, analysis)}
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
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="sticky top-[57px] z-30 pt-4 pb-4 bg-[#121317]/95 backdrop-blur-xl mb-6 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none p-1.5 bg-[#18191D] rounded-2xl border border-[#2F3034] shadow-sm">
                        {layers.map((layer) => (
                            <button
                                key={layer.id}
                                onClick={() => setActiveLayer(layer.id)}
                                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[11px] md:text-[12px] font-medium whitespace-nowrap transition-all shrink-0 touch-manipulation ${activeLayer === layer.id
                                    ? 'bg-[#3279F9] text-white shadow-lg'
                                    : 'text-[#B2BBC5] hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <layer.icon size={14} className={activeLayer === layer.id ? 'opacity-100' : 'opacity-70'} />
                                <span>{layer.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Layer Content */}
                <div className="animate-in fade-in duration-300">

                    {/* Layer 1: Overview */}
                    {activeLayer === 1 && (
                        <div className="space-y-8 md:space-y-10 text-left">
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
                                        {(analysis.bookMeta as any).targetAudience && (
                                            <div>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Đối tượng phù hợp</p>
                                                <p className="text-slate-300 text-sm leading-relaxed">{(analysis.bookMeta as any).targetAudience}</p>
                                            </div>
                                        )}
                                        {(analysis.bookMeta as any).prerequisites && (
                                            <div>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Kiến thức nền cần có</p>
                                                <p className="text-slate-300 text-sm leading-relaxed">{(analysis.bookMeta as any).prerequisites}</p>
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
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Layer 2: Architecture */}
                    {activeLayer === 2 && (
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
                    )}

                    {/* Layer 3: Ideas */}
                    {activeLayer === 3 && (
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
                    )}
                </div>

                {/* CTA Banner */}
                <div className="mt-12 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-600/20 p-6 md:p-10 rounded-2xl text-center space-y-4">
                    <h3 className="text-lg md:text-xl font-medium text-white tracking-tight">Phân tích sách của riêng bạn</h3>
                    <p className="text-slate-400 text-sm max-w-lg mx-auto">
                        Đăng ký miễn phí để sử dụng AI phân tích tri thức chuyên sâu cho bất kỳ cuốn sách nào bạn muốn.
                    </p>
                    <button onClick={onLogin} className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] uppercase tracking-widest transition-colors shadow-xl inline-flex items-center gap-3">
                        <LogIn size={16} /> BẮT ĐẦU MIỄN PHÍ
                    </button>
                </div>
            </main>
        </div>
    );
};

export default PublicBookView;

import React, { useState } from 'react';
import {
    ChevronRight, ChevronLeft, BookOpen, Key, Search, Bookmark,
    Plus, Brain, Layers, CheckSquare, Share2, Sparkles, ExternalLink,
    Zap, Target, FileText, Lightbulb, ArrowRight, LogIn
} from 'lucide-react';

interface Slide {
    id: number;
    icon: React.ReactNode;
    badge: string;
    title: string;
    subtitle: string;
    content: React.ReactNode;
    accentColor: string;
    bgGradient: string;
}

const accentStyles: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const slides: Slide[] = [
    {
        id: 0,
        icon: <BookOpen size={28} className="text-blue-400" />,
        badge: 'Chào mừng',
        title: '10kBook là gì?',
        subtitle: 'Hệ thống đọc sách thông minh nhất',
        accentColor: 'blue',
        bgGradient: 'from-blue-600/10 to-indigo-600/5',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                    <span className="text-white font-semibold">10kBook</span> là nền tảng giúp bạn đọc sách sâu hơn, nhanh hơn — bằng AI. Thay vì đọc cả cuốn sách, bạn nhận được <span className="text-blue-400">tri thức được chắt lọc</span>, phân tích phản biện và lộ trình hành động thực tiễn.
                </p>
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { icon: <Brain size={16} className="text-blue-400" />, text: 'AI phân tích sách chuyên sâu bằng 3 agent song song' },
                        { icon: <Layers size={16} className="text-indigo-400" />, text: '7 Layer tri thức — từ tổng quan đến chiến lược hành động' },
                        { icon: <Target size={16} className="text-violet-400" />, text: 'Lộ trình cá nhân hoá theo mục tiêu của bạn' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="mt-0.5 shrink-0">{item.icon}</div>
                            <p className="text-slate-400 text-xs leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 1,
        icon: <LogIn size={28} className="text-green-400" />,
        badge: 'Bước 1',
        title: 'Đăng nhập',
        subtitle: 'Tạo tài khoản bằng Google — miễn phí',
        accentColor: 'green',
        bgGradient: 'from-green-600/10 to-emerald-600/5',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">Tài khoản lưu toàn bộ dữ liệu lên đám mây — tủ sách, API key, lộ trình — đồng bộ trên mọi thiết bị.</p>
                <div className="space-y-3">
                    {[
                        { step: '01', title: 'Bấm "Đăng nhập bằng Google"', desc: 'Tại màn hình chào mừng' },
                        { step: '02', title: 'Chọn tài khoản Google', desc: 'Xác nhận trên popup Google' },
                        { step: '03', title: 'Vào app ngay lập tức', desc: 'Dữ liệu được tạo tự động' },
                    ].map((item) => (
                        <div key={item.step} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="w-8 h-8 bg-green-600/20 border border-green-600/30 rounded-lg flex items-center justify-center text-green-400 font-bold text-[10px] shrink-0">{item.step}</div>
                            <div>
                                <p className="text-white text-xs font-medium">{item.title}</p>
                                <p className="text-slate-500 text-[10px]">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 2,
        icon: <Key size={28} className="text-amber-400" />,
        badge: 'Bước 2',
        title: 'Thiết lập API Key',
        subtitle: 'Bắt buộc để dùng tính năng AI',
        accentColor: 'amber',
        bgGradient: 'from-amber-600/10 to-orange-600/5',
        content: (
            <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-amber-400 text-[11px] font-medium mb-1">⚡ Tại sao cần API Key?</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">App dùng Google Gemini AI để phân tích sách. Bạn cần key riêng để kiểm soát mức sử dụng. Key được lưu an toàn, chỉ bạn mới thấy.</p>
                </div>
                <div className="space-y-3">
                    {[
                        { step: '01', title: 'Vào Google AI Studio', desc: 'aistudio.google.com/app/apikey', link: 'https://aistudio.google.com/app/apikey' },
                        { step: '02', title: 'Bấm "Create API Key"', desc: 'Chọn project hoặc tạo mới' },
                        { step: '03', title: 'Copy key và dán vào app', desc: 'Sidebar → ⚙ AI: Bị khóa → Dán key → Lưu' },
                    ].map((item: any) => (
                        <div key={item.step} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="w-8 h-8 bg-amber-600/20 border border-amber-600/30 rounded-lg flex items-center justify-center text-amber-400 font-bold text-[10px] shrink-0">{item.step}</div>
                            <div className="flex-1">
                                <p className="text-white text-xs font-medium">{item.title}</p>
                                {item.link ? (
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] flex items-center gap-1 hover:underline">
                                        {item.desc} <ExternalLink size={10} />
                                    </a>
                                ) : (
                                    <p className="text-slate-500 text-[10px]">{item.desc}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 3,
        icon: <Search size={28} className="text-violet-400" />,
        badge: 'Bước 3',
        title: 'Khám phá Kho sách',
        subtitle: 'Tìm kiếm, lọc theo chủ đề',
        accentColor: 'violet',
        bgGradient: 'from-violet-600/10 to-purple-600/5',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">Tab <span className="text-white font-semibold">Kho sách</span> chứa toàn bộ kho tri thức của cộng đồng.</p>
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { icon: <Search size={14} className="text-violet-400" />, title: 'Tìm kiếm', desc: 'Tìm theo tên sách hoặc tên tác giả' },
                        { icon: <span className="text-[11px] font-bold text-violet-400">TAG</span>, title: 'Lọc theo chủ đề', desc: 'Bấm tag màu vàng: Kinh doanh, Tâm lý, Kỹ năng...' },
                        { icon: <Bookmark size={14} className="text-violet-400" />, title: '3 Tab lọc', desc: 'Tất cả | Cá nhân (tủ bạn) | Chưa lưu' },
                        { icon: <Zap size={14} className="text-amber-400" fill="currentColor" />, title: 'Icon sét ⚡ vàng', desc: 'Sách đã được AI phân tích — xem ngay không cần tốn key!' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="mt-0.5 w-6 flex items-center justify-center shrink-0">{item.icon}</div>
                            <div>
                                <p className="text-white text-xs font-medium">{item.title}</p>
                                <p className="text-slate-500 text-[10px] leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 4,
        icon: <Bookmark size={28} className="text-pink-400" />,
        badge: 'Bước 4',
        title: 'Lưu sách vào Tủ cá nhân',
        subtitle: 'Xây dựng thư viện tri thức của riêng bạn',
        accentColor: 'pink',
        bgGradient: 'from-pink-600/10 to-rose-600/5',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">Hover vào bìa sách → xuất hiện 2 nút hành động:</p>
                <div className="space-y-3">
                    <div className="p-4 bg-amber-600/10 border border-amber-600/20 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shrink-0"><Plus size={18} className="text-white" /></div>
                        <div>
                            <p className="text-white text-xs font-semibold">Lưu về tủ</p>
                            <p className="text-amber-400/70 text-[11px]">Thêm sách vào tủ cá nhân. Sách xuất hiện trong tab "Cá nhân".</p>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 border border-blue-600/30 rounded-xl flex items-center justify-center shrink-0"><BookOpen size={18} className="text-blue-400" /></div>
                        <div>
                            <p className="text-white text-xs font-semibold">Xem chi tiết</p>
                            <p className="text-blue-400/70 text-[11px]">Vào Work Zone để xem/tạo phân tích AI của sách này.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 5,
        icon: <Plus size={28} className="text-emerald-400" />,
        badge: 'Bước 5',
        title: 'Thêm sách mới',
        subtitle: 'Bổ sung cuốn sách bạn đang đọc',
        accentColor: 'emerald',
        bgGradient: 'from-emerald-600/10 to-teal-600/5',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">Sách bạn muốn chưa có trong kho? Thêm vào ngay!</p>
                <div className="space-y-3">
                    {[
                        { step: '01', title: 'Bấm nút "+ THÊM SÁCH"', desc: 'Góc phải trên, màu vàng cam, trong Kho sách' },
                        { step: '02', title: 'Nhập tên sách & tác giả', desc: 'Điền thông tin cơ bản vào form' },
                        { step: '03', title: 'Tải ảnh bìa (tuỳ chọn)', desc: 'Bấm vào ô ảnh để upload — được nén tự động' },
                        { step: '04', title: 'Chọn chủ đề (Tag)', desc: 'Giúp cộng đồng tìm kiếm dễ hơn' },
                        { step: '05', title: 'Bấm "Hoàn tất lưu"', desc: 'Sách xuất hiện trong kho ngay lập tức' },
                    ].map((item) => (
                        <div key={item.step} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="w-8 h-8 bg-emerald-600/20 border border-emerald-600/30 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-[10px] shrink-0">{item.step}</div>
                            <div>
                                <p className="text-white text-xs font-medium">{item.title}</p>
                                <p className="text-slate-500 text-[10px]">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 6,
        icon: <Brain size={28} className="text-blue-400" />,
        badge: 'Bước 6',
        title: 'Work Zone — Phân tích AI',
        subtitle: 'Khai thác toàn bộ tri thức từ một cuốn sách',
        accentColor: 'blue',
        bgGradient: 'from-blue-600/10 to-cyan-600/5',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">Tính năng cốt lõi — AI dùng <span className="text-blue-400 font-semibold">3 agent song song</span> (Gemini 2.5 Pro) để phân tích chuyên sâu.</p>
                <div className="space-y-3">
                    {[
                        { step: '01', title: 'Chọn một cuốn sách', desc: 'Hover → "Xem chi tiết" hoặc bấm tên sách' },
                        { step: '02', title: 'Vào tab Work Zone', desc: 'Tự động mở Work Zone cho sách đó' },
                        { step: '03', title: 'Bấm "BẮT ĐẦU PHÂN TÍCH"', desc: 'Cần đã thiết lập API Key ở Bước 2' },
                        { step: '04', title: 'Chờ AI phân tích', desc: 'Khoảng 1-3 phút — có thể chuyển tab, AI vẫn chạy!' },
                        { step: '05', title: 'Khám phá 7 Layer tri thức', desc: 'Kết quả xuất hiện với đầy đủ thông tin' },
                    ].map((item) => (
                        <div key={item.step} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="w-8 h-8 bg-blue-600/20 border border-blue-600/30 rounded-lg flex items-center justify-center text-blue-400 font-bold text-[10px] shrink-0">{item.step}</div>
                            <div>
                                <p className="text-white text-xs font-medium">{item.title}</p>
                                <p className="text-slate-500 text-[10px]">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-blue-400 text-[11px]">💡 Sách có icon ⚡ vàng <strong>đã được phân tích</strong> — mở Work Zone là xem ngay, không tốn quota!</p>
                </div>
            </div>
        )
    },
    {
        id: 7,
        icon: <Layers size={28} className="text-indigo-400" />,
        badge: 'Bước 7',
        title: '7 Layer Tri Thức',
        subtitle: 'Hiểu sâu từng tầng của cuốn sách',
        accentColor: 'indigo',
        bgGradient: 'from-indigo-600/10 to-violet-600/5',
        content: (
            <div className="space-y-2">
                <p className="text-slate-300 text-xs leading-relaxed mb-3">Mỗi layer khai thác một chiều khác nhau của cuốn sách:</p>
                {[
                    { layer: '0', name: 'Identity', desc: 'Tên sách, tác giả, tags chủ đề', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
                    { layer: '1', name: 'Central Thesis', desc: 'Luận điểm cốt lõi — "1 câu" của cả cuốn sách', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                    { layer: '2', name: 'Architecture', desc: '15-30 phần tri thức chi tiết từng chương', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
                    { layer: '3', name: 'Ideas', desc: '10-25 framework, model, công cụ tư duy', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                    { layer: '4', name: 'Critical', desc: 'Phân tích phản biện: Ưu điểm, Hạn chế', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
                    { layer: '5', name: 'Insights', desc: 'Điểm tương thích với mục tiêu cá nhân (0-100%)', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
                    { layer: '6', name: 'Summary', desc: 'Tóm lược tinh hoa + Bài học đắt giá nhất', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                ].map((item) => (
                    <div key={item.layer} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl border border-white/5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 ${item.color}`}>{item.layer}</div>
                        <div className="flex-1">
                            <span className="text-white text-[11px] font-semibold">{item.name}</span>
                            <span className="text-slate-500 text-[10px] ml-2">— {item.desc}</span>
                        </div>
                    </div>
                ))}
            </div>
        )
    },
    {
        id: 8,
        icon: <CheckSquare size={28} className="text-teal-400" />,
        badge: 'Bước 8',
        title: 'Lộ Trình Thực Thi',
        subtitle: 'Biến kiến thức thành hành động',
        accentColor: 'teal',
        bgGradient: 'from-teal-600/10 to-cyan-600/5',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">Tab <span className="text-white font-semibold">Lộ Trình Thực Thi</span> tổng hợp checklist hành động từ tất cả sách bạn đã đọc.</p>
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { icon: <Target size={14} className="text-teal-400" />, title: 'Lộ trình 4 giai đoạn', desc: 'Ngay lập tức → Tuần 1 → Tháng 1 → Quý 1' },
                        { icon: <CheckSquare size={14} className="text-teal-400" />, title: 'Đánh dấu hoàn thành', desc: 'Tick vào từng mục khi bạn đã thực hiện xong' },
                        { icon: <Lightbulb size={14} className="text-amber-400" />, title: 'Thêm hành động riêng', desc: 'Tự thêm task cá nhân không có trong sách' },
                        { icon: <Sparkles size={14} className="text-violet-400" />, title: 'Tổng hợp đa sách', desc: 'Xem lộ trình của từng cuốn hoặc toàn bộ tủ sách' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="mt-0.5 shrink-0">{item.icon}</div>
                            <div>
                                <p className="text-white text-xs font-medium">{item.title}</p>
                                <p className="text-slate-500 text-[10px] leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 9,
        icon: <Share2 size={28} className="text-cyan-400" />,
        badge: 'Bước 9',
        title: 'Chia sẻ & Cộng đồng',
        subtitle: 'Lan truyền tri thức đến mọi người',
        accentColor: 'cyan',
        bgGradient: 'from-cyan-600/10 to-blue-600/5',
        content: (
            <div className="space-y-4">
                {[
                    { icon: <Share2 size={16} className="text-cyan-400" />, title: 'Chia sẻ link sách', desc: 'Trong Work Zone → Nút "Chia sẻ" → copy link. Ai bấm link sẽ mở thẳng trang sách đó.' },
                    { icon: <FileText size={16} className="text-blue-400" />, title: 'Kết quả phân tích dùng chung', desc: 'Khi bạn phân tích 1 cuốn, kết quả lưu vào kho chung — mọi người đọc không tốn API Key.' },
                    { icon: <Sparkles size={16} className="text-violet-400" />, title: 'Hoạt động cộng đồng', desc: 'Sidebar hiển thị real-time: ai vừa thêm sách, ai vừa phân tích.' },
                ].map((item, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center gap-2">{item.icon}<p className="text-white text-xs font-semibold">{item.title}</p></div>
                        <p className="text-slate-500 text-[11px] leading-relaxed pl-6">{item.desc}</p>
                    </div>
                ))}
                <div className="p-4 bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/20 rounded-xl text-center">
                    <p className="text-white text-sm font-semibold mb-1">🎉 Bạn đã sẵn sàng!</p>
                    <p className="text-slate-400 text-xs">Bắt đầu bằng cách thiết lập API Key và chọn cuốn sách đầu tiên.</p>
                </div>
            </div>
        )
    },
];

// ── Full Page Component ──────────────────────────────────────
const HelpView: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const [animating, setAnimating] = useState(false);

    const goTo = (idx: number) => {
        if (animating || idx < 0 || idx >= slides.length) return;
        setAnimating(true);
        setTimeout(() => { setCurrent(idx); setAnimating(false); }, 200);
    };

    const slide = slides[current];
    const isFirst = current === 0;
    const isLast = current === slides.length - 1;

    return (
        <div className="h-full flex flex-col bg-[#111214] text-white">
            {/* Top progress bar */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Hướng dẫn sử dụng</h1>
                    <span className="text-[10px] text-slate-600 font-mono">{current + 1} / {slides.length}</span>
                </div>
                <div className="flex gap-1">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'flex-[2] bg-blue-500' : i < current ? 'flex-1 bg-blue-500/30' : 'flex-1 bg-white/10'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Main content — split layout on desktop */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left panel — slide title/nav (desktop only) */}
                <div className="hidden md:flex w-56 shrink-0 flex-col border-r border-white/5 overflow-y-auto py-4 px-2">
                    {slides.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 group ${i === current ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
                        >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${i === current ? `${accentStyles[s.accentColor]} border` : 'bg-white/5 text-slate-600'}`}>
                                {i < current ? '✓' : i}
                            </div>
                            <span className="text-[11px] font-medium leading-tight">{s.title}</span>
                        </button>
                    ))}
                </div>

                {/* Right panel — slide content */}
                <div className="flex-1 overflow-y-auto">
                    <div className={`transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
                        {/* Slide header */}
                        <div className={`px-5 md:px-8 py-6 bg-gradient-to-br ${slide.bgGradient} border-b border-white/5`}>
                            <div className="flex items-center gap-4 max-w-2xl">
                                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                                    {slide.icon}
                                </div>
                                <div>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${accentStyles[slide.accentColor]}`}>
                                        {slide.badge}
                                    </span>
                                    <h2 className="text-xl font-semibold text-white tracking-tight mt-1">{slide.title}</h2>
                                    <p className="text-slate-500 text-xs mt-0.5">{slide.subtitle}</p>
                                </div>
                            </div>
                        </div>

                        {/* Slide body */}
                        <div className="px-5 md:px-8 py-6 max-w-2xl">
                            {slide.content}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom nav */}
            <div className="shrink-0 px-4 md:px-6 py-4 border-t border-white/5 flex items-center justify-between gap-3">
                <button
                    onClick={() => goTo(current - 1)}
                    disabled={isFirst}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={15} /> Quay lại
                </button>

                {/* Dot indicators (mobile) */}
                <div className="flex gap-1.5 md:hidden">
                    {slides.map((_, i) => (
                        <button key={i} onClick={() => goTo(i)} className={`rounded-full transition-all ${i === current ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-white/20'}`} />
                    ))}
                </div>

                {isLast ? (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider">
                        <Sparkles size={14} /> Bắt đầu ngay
                    </div>
                ) : (
                    <button
                        onClick={() => goTo(current + 1)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium border border-white/10 transition-all"
                    >
                        Tiếp theo <ChevronRight size={15} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default HelpView;

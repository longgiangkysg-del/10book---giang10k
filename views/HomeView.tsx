import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, X, Edit3, Camera, Library, Trash2, BrainCircuit, Check, Zap, Loader2
} from 'lucide-react';
import { Book } from '../types';
import { bookService } from '../services/supabaseClient';
import { compressImage } from '../utils/imageUtils';
import { usePasteImage } from '../utils/usePasteImage';
import { useToast } from '../components/Toast';
import LazyBookCover from '../components/LazyBookCover';

interface HomeViewProps {
  books: Book[];
  onSelectBook: (id: string) => void;
  onAddBook: (title: string, author: string, coverImage?: string, tags?: string[]) => void;
  onUpdateBook?: (book: Book) => void;
  onUnsaveBook?: (id: string) => void;
}

const removeAccents = (str: any) => {
  if (!str || typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

const HomeView: React.FC<HomeViewProps> = ({ books, onSelectBook, onAddBook, onUpdateBook, onUnsaveBook }) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SUMMARIZED' | 'UNSUMMARIZED'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    id: '', title: '', author: '', coverImage: '', tags: [] as string[]
  });
  const [fetchingCover, setFetchingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+V dán ảnh bìa khi modal thêm/sửa đang mở
  usePasteImage(
    showAddModal || showEditModal,
    dataUrl => setFormData(p => ({ ...p, coverImage: dataUrl })),
    msg => showToast(msg, 'error')
  );

  const autoFetchCover = async (title: string, author: string) => {
    if (!title.trim() || showEditModal) return; // Chỉ fetch cho Add, không fetch cho Edit
    setFetchingCover(true);
    try {
      const { coverUrl } = await bookService.searchBookCover(title.trim(), author.trim());
      if (coverUrl) {
        setFormData(p => {
          if (!p.coverImage || !p.coverImage.startsWith('data:')) {
            return { ...p, coverImage: coverUrl };
          }
          return p;
        });
      }
    } catch { /* silent */ }
    finally { setFetchingCover(false); }
  };

  useEffect(() => {
    bookService.fetchAvailableTags().then(setAvailableTags);
  }, []);

  const stats = useMemo(() => {
    const total = books.length;
    const summarized = books.filter(b => b.isSummarized).length;
    return { total, summarized };
  }, [books]);

  const tagStats = useMemo(() => {
    const s: Record<string, number> = {};
    books.forEach(b => {
      b.tags?.forEach(t => {
        s[t] = (s[t] || 0) + 1;
      });
    });
    return s;
  }, [books]);

  const allTags = useMemo(() => {
    return Object.keys(tagStats).sort();
  }, [tagStats]);

  const filteredBooks = useMemo(() => {
    const normalizedSearch = removeAccents(searchTerm);
    return books.filter(b => {
      const titleMatch = removeAccents(b.title).includes(normalizedSearch);
      const authorMatch = removeAccents(b.author).includes(normalizedSearch);
      let matchesFilter = true;
      if (activeFilter === 'SUMMARIZED') matchesFilter = b.isSummarized;
      if (activeFilter === 'UNSUMMARIZED') matchesFilter = !b.isSummarized;
      const matchesTag = selectedTag ? b.tags.includes(selectedTag) : true;
      return (titleMatch || authorMatch) && matchesFilter && matchesTag;
    });
  }, [books, searchTerm, activeFilter, selectedTag]);

  const openEditModal = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    setFormData({
      id: book.id,
      title: book.title,
      author: book.author || '',
      coverImage: book.coverImage || '',
      tags: book.tags || []
    });
    setShowEditModal(true);
  };

  const handleModalSave = () => {
    if (showEditModal && onUpdateBook) {
      const original = books.find(b => b.id === formData.id);
      if (original) {
        onUpdateBook({ ...original, ...formData });
      }
    } else {
      onAddBook(formData.title, formData.author, formData.coverImage, formData.tags);
    }
    setShowAddModal(false);
    setShowEditModal(false);
  };

  const toggleTagInForm = (tagName: string) => {
    setFormData(prev => {
      if (prev.tags.includes(tagName)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tagName) };
      } else {
        return { ...prev, tags: [...prev.tags, tagName] };
      }
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in pb-20">
      {/* Header Bar - Multi-layout for mobile */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#212226] p-4 md:p-5 rounded-2xl border border-[#2F3034]">
        <div className="flex items-center gap-4 md:gap-6 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium text-xs shadow-lg">Z</div>
            <h1 className="text-sm font-medium text-white uppercase tracking-tight whitespace-nowrap hidden sm:block">TỦ SÁCH CÁ NHÂN</h1>
          </div>
          <div className="h-6 w-px bg-[#2F3034] hidden sm:block"></div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5 whitespace-nowrap">
              <Library size={12} className="text-blue-500" />
              <span className="text-[9px] md:text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{stats.total} CUỐN</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-500/5 rounded-lg border border-amber-500/10 whitespace-nowrap">
              <Zap size={12} className="text-amber-500" />
              <span className="text-[9px] md:text-[10px] font-medium text-amber-500 uppercase tracking-tighter">{stats.summarized} PHÂN TÍCH</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Tìm kiếm sách..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#121317] border border-[#2F3034] rounded-xl text-[11px] text-white outline-none focus:border-blue-600/40"
            />
          </div>
          <button
            onClick={() => { setFormData({ id: '', title: '', author: '', coverImage: '', tags: [] }); setShowAddModal(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-medium uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shrink-0"
          >
            <Plus size={14} /> <span className="hidden sm:inline">THÊM MỚI</span>
          </button>
        </div>
      </div>

      {/* Filters - Horizontal scroll on mobile */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 border-b border-[#2F3034]/30 pb-4">
        <div className="flex flex-nowrap gap-1.5 p-1 bg-[#212226] rounded-xl border border-[#2F3034] overflow-x-auto scrollbar-none shrink-0">
          {['ALL', 'SUMMARIZED', 'UNSUMMARIZED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab as any)}
              className={`px-4 py-2 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {tab === 'ALL' ? 'Tất cả' : tab === 'SUMMARIZED' ? 'Đã phân tích' : 'Chưa phân tích'}
            </button>
          ))}
        </div>

        <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-none pb-1 mask-fade-right">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-3 py-2 rounded-xl text-[9px] font-medium uppercase tracking-widest transition-all border shrink-0 flex items-center gap-2 ${selectedTag === tag ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#212226] border-[#2F3034] text-slate-500'}`}
            >
              {tag} <span className={`font-bold ${selectedTag === tag ? 'text-white' : 'text-amber-500'}`}>({tagStats[tag]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: 2 columns mobile, 6 on large desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 pt-2">
        {filteredBooks.map(book => (
          <div key={book.id} className="group flex flex-col animate-in fade-in">
            <div className="aspect-[2/3] w-full bg-[#212226] border border-[#2F3034] rounded-xl md:rounded-2xl overflow-hidden mb-3 relative shadow-lg group-hover:-translate-y-1 md:group-hover:-translate-y-2 transition-all duration-300">
              <LazyBookCover bookId={book.id} coverUrl={book.coverImage} className="opacity-90 group-hover:opacity-100 transition-all duration-500" />

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:flex gap-1.5">
                <button
                  onClick={(e) => openEditModal(e, book)}
                  className="p-2 bg-white/10 hover:bg-blue-600 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (onUnsaveBook && window.confirm(`Gỡ "${book.title}" khỏi tủ sách cá nhân?`)) onUnsaveBook(book.id); }}
                  className="p-2 bg-white/10 hover:bg-rose-600 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="absolute inset-0 bg-black/80 md:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end md:justify-center p-3 md:p-4 text-center backdrop-blur-sm">
                <button
                  onClick={() => onSelectBook(book.id)}
                  className="w-full py-2 md:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-medium uppercase tracking-widest shadow-xl"
                >
                  {book.isSummarized ? 'Xem tri thức' : 'Phân tích ngay'}
                </button>
              </div>
            </div>
            <h3 className="text-white font-bold text-[10px] md:text-[11px] leading-tight line-clamp-2 uppercase tracking-tight group-hover:text-blue-400 transition-colors">{book.title}</h3>
            <p className="text-slate-600 text-[8px] font-medium uppercase tracking-widest mt-1.5 truncate">{book.author}</p>
          </div>
        ))}
      </div>

      {/* Modal - Fully responsive design */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="bg-[#212226] border border-[#2F3034] w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-10 space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-none">
            <div className="flex justify-between items-center border-b border-[#2F3034] pb-4 md:pb-6">
              <h2 className="text-xl md:text-2xl font-medium text-white uppercase tracking-tighter italic">
                {showEditModal ? 'Cập nhật' : 'Thêm Mới'}
              </h2>
              <div className="flex items-center gap-3 md:gap-4">
                {showEditModal && (
                  <button onClick={() => { if (onUnsaveBook && window.confirm("Gỡ sách khỏi tủ cá nhân?")) { onUnsaveBook(formData.id); setShowEditModal(false); } }} className="text-rose-500 p-2 md:p-3 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/20">
                    <Trash2 size={18} />
                  </button>
                )}
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-slate-500 hover:text-white p-2 bg-white/5 rounded-xl">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div onClick={() => fileInputRef.current?.click()} className="aspect-[2/3] bg-[#121317] border-2 border-dashed border-[#2F3034] rounded-2xl md:rounded-[2.5rem] flex items-center justify-center cursor-pointer overflow-hidden group hover:border-blue-600/50 transition-all relative max-w-[200px] md:max-w-none mx-auto w-full">
                {fetchingCover ? (
                  <div className="text-center">
                    <Loader2 className="text-blue-500 mx-auto mb-2 animate-spin" size={24} />
                    <p className="text-[9px] font-medium text-blue-500/70 tracking-wide">Đang tìm bìa...</p>
                  </div>
                ) : formData.coverImage ? (
                  <img src={formData.coverImage} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="text-center">
                    <Camera className="text-slate-800 mx-auto mb-2" size={24} />
                    <p className="text-[9px] font-medium text-slate-700 uppercase tracking-widest">{showAddModal ? 'ẢNH BÌA (tự động tìm)' : 'ẢNH BÌA'}</p>
                    <p className="text-[8px] font-medium text-slate-700 tracking-wide mt-1">Bấm để chọn · Ctrl+V để dán</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressed = await compressImage(file);
                        setFormData(p => ({ ...p, coverImage: compressed }));
                      } catch (error: any) {
                        showToast(error.message, 'error');
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-1.5 md:space-y-2">
                  <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">Tên Sách</p>
                  <input className="w-full bg-[#121317] border border-[#2F3034] rounded-xl p-3 md:p-4 text-[12px] md:text-[13px] text-white outline-none focus:border-blue-600" placeholder="..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} onBlur={() => showAddModal && formData.title.trim() && autoFetchCover(formData.title, formData.author)} />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">Tác giả</p>
                  <input className="w-full bg-[#121317] border border-[#2F3034] rounded-xl p-3 md:p-4 text-[12px] md:text-[13px] text-white outline-none focus:border-blue-600" placeholder="..." value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} onBlur={() => showAddModal && formData.title.trim() && autoFetchCover(formData.title, formData.author)} />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">Chủ đề</p>
                  <div className="flex flex-wrap gap-2 p-3 bg-[#121317] border border-[#2F3034] rounded-xl min-h-[100px] max-h-[150px] overflow-y-auto scrollbar-none">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTagInForm(tag)}
                        className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-medium uppercase tracking-widest flex items-center gap-1.5 border transition-all ${formData.tags.includes(tag) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-slate-800 text-slate-600'}`}
                      >
                        {tag} {formData.tags.includes(tag) && <Check size={10} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleModalSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 md:py-5 rounded-2xl md:rounded-[2rem] text-[11px] md:text-[12px] font-medium uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">HOÀN TẤT LƯU</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Gem, Zap, Search, Crown, Plus, X, Users, Edit3, Camera, Check, ArrowUpDown } from 'lucide-react';
import { Book } from '../types';
import { bookService } from '../services/supabaseClient';
import { compressImage } from '../utils/imageUtils';
import { useToast } from '../components/Toast';
import LazyBookCover from '../components/LazyBookCover';

interface DiscoveryViewProps {
  onSelectBook: (id: string) => void;
  onSave: (book: Book) => void;
  onUpdateBook: (book: Book) => void;
  allBooks: Book[];
  userBooks?: Book[];
  onAddBook: (title: string, author: string, coverImage?: string, tags?: string[]) => void;
  onUnsaveBook?: (id: string) => void;
  onDeleteBook?: (id: string) => void;
  isAdmin?: boolean;
  initialSearch?: string;
}

const removeAccents = (str: any) => {
  if (!str || typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

const BOOKS_PER_PAGE = 24;

const DiscoveryView: React.FC<DiscoveryViewProps> = ({ onSelectBook, onSave, onUpdateBook, allBooks, userBooks = [], onAddBook, onUnsaveBook, onDeleteBook, isAdmin, initialSearch }) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'personal' | 'unsaved'>('all');
  const [sortMode, setSortMode] = useState<'default' | 'saves' | 'analyzed' | 'unanalyzed'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '', author: '', coverImage: '', tags: [] as string[]
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bookService.fetchAvailableTags().then(setAvailableTags);
  }, []);

  // Update searchTerm when initialSearch prop changes (e.g., clicking author link)
  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allBooks.forEach(b => {
      b.tags?.forEach(t => {
        stats[t] = (stats[t] || 0) + 1;
      });
    });
    return stats;
  }, [allBooks]);

  const allTags = useMemo(() => {
    return Object.keys(tagStats).sort();
  }, [tagStats]);

  const userBookIds = useMemo(() => new Set(userBooks.map(b => b.id)), [userBooks]);

  const filteredMasterList = useMemo(() => {
    const normalizedSearch = removeAccents(searchTerm);
    let list = allBooks.filter(b => {
      const titleMatch = removeAccents(b.title).includes(normalizedSearch);
      const authorMatch = removeAccents(b.author).includes(normalizedSearch);
      const tagMatch = selectedTag ? b.tags.includes(selectedTag) : true;
      return (titleMatch || authorMatch) && tagMatch;
    });
    if (libraryFilter === 'personal') {
      list = list.filter(b => userBookIds.has(b.id));
    } else if (libraryFilter === 'unsaved') {
      list = list.filter(b => !userBookIds.has(b.id));
    }
    // Apply sort
    if (sortMode === 'saves') {
      list = [...list].sort((a, b) => ((b as any).savesCount || 0) - ((a as any).savesCount || 0));
    } else if (sortMode === 'analyzed') {
      list = [...list].sort((a, b) => (b.isSummarized ? 1 : 0) - (a.isSummarized ? 1 : 0));
    } else if (sortMode === 'unanalyzed') {
      list = list.filter(b => !b.isSummarized);
    }
    return list;
  }, [allBooks, searchTerm, selectedTag, libraryFilter, userBookIds, sortMode]);

  const totalPages = Math.ceil(filteredMasterList.length / BOOKS_PER_PAGE);
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * BOOKS_PER_PAGE;
    return filteredMasterList.slice(start, start + BOOKS_PER_PAGE);
  }, [filteredMasterList, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag, libraryFilter, sortMode]);

  const handleSaveClick = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    e.stopPropagation();
    onSave(book);
  };

  const handleEditClick = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    e.stopPropagation();
    setEditData({ ...book });
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editData) return;
    onUpdateBook(editData);
    setShowEditModal(false);
    setEditData(null);
  };

  const toggleTagInEdit = (tagName: string) => {
    setEditData((prev: any) => {
      const currentTags = prev.tags || [];
      if (currentTags.includes(tagName)) {
        return { ...prev, tags: currentTags.filter((t: string) => t !== tagName) };
      } else {
        return { ...prev, tags: [...currentTags, tagName] };
      }
    });
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

  const handleAddBook = () => {
    if (formData.title.trim()) {
      onAddBook(formData.title, formData.author, formData.coverImage, formData.tags);
      setShowAddModal(false);
      setFormData({ title: '', author: '', coverImage: '', tags: [] });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in pb-20">
      {/* Search Header - Stack on mobile */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#212226] p-4 md:p-5 rounded-2xl border border-[#2F3034]">
        <div className="flex items-center gap-4 md:gap-6 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-medium text-xs shadow-lg">V</div>
            <h1 className="text-sm font-medium text-white tracking-tight whitespace-nowrap hidden sm:block">Kho sách</h1>
          </div>
          <div className="h-6 w-px bg-[#2F3034] hidden sm:block"></div>
          <div className="flex items-center gap-2 bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10 shrink-0">
            <Gem size={12} className="text-amber-500" />
            <span className="text-[10px] font-medium text-amber-500 tracking-tight whitespace-nowrap">{allBooks.length} cuốn</span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Tìm kiếm trí tuệ, tác giả, chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#121317] border border-[#2F3034] rounded-xl text-[11px] text-white outline-none focus:border-amber-600/40 transition-all"
            />
          </div>

          <button
            onClick={() => { setFormData({ title: '', author: '', coverImage: '', tags: [] }); setShowAddModal(true); }}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-medium uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shrink-0"
          >
            <Plus size={14} /> <span className="hidden sm:inline">THÊM SÁCH</span>
          </button>

          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-600/10 text-amber-500 rounded-xl border border-amber-500/20 text-[9px] font-medium uppercase tracking-widest shrink-0"
            >
              <X size={12} /> {selectedTag}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs + Sort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Library filter tabs */}
        <div className="flex gap-1.5 p-1.5 bg-[#18191D] rounded-xl border border-[#2F3034]">
          {[
            { id: 'all' as const, label: 'Tất cả', count: allBooks.length },
            { id: 'personal' as const, label: 'Cá nhân', count: userBooks.length },
            { id: 'unsaved' as const, label: 'Chưa lưu', count: allBooks.length - userBooks.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLibraryFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${libraryFilter === tab.id
                ? 'bg-[#3279F9] text-white shadow-lg'
                : 'text-[#B2BBC5] hover:text-white'
                }`}
            >
              {tab.label} <span className="opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown size={13} className="text-slate-600 shrink-0" />
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as any)}
            className="bg-[#18191D] border border-[#2F3034] text-slate-400 text-[11px] rounded-xl px-3 py-2 outline-none focus:border-amber-500/40 cursor-pointer hover:text-white transition-all"
          >
            <option value="default">Mặc định</option>
            <option value="saves">⭐ Nhiều lưu nhất</option>
            <option value="analyzed">⚡ Đã phân tích trước</option>
            <option value="unanalyzed">🔍 Chưa phân tích</option>
          </select>
          {sortMode !== 'default' && (
            <button
              onClick={() => setSortMode('default')}
              className="p-1.5 text-slate-600 hover:text-white bg-white/5 rounded-lg transition-all"
              title="Xóa sắp xếp"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tags Filter */}
      <div className="flex flex-nowrap gap-2 py-1 overflow-x-auto scrollbar-none pb-4 mask-fade-right">
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`px-3 py-2 rounded-xl text-[9px] font-medium tracking-wide transition-all border shrink-0 flex items-center gap-2 ${selectedTag === tag ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : 'bg-[#212226] border-[#2F3034] text-slate-500 hover:text-white'}`}
          >
            {tag} <span className={`font-bold ${selectedTag === tag ? 'text-white' : 'text-amber-500'}`}>({tagStats[tag]})</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 pt-2">
        {paginatedBooks.map((book) => (
          <div key={book.id} className="group flex flex-col animate-in fade-in">
            <div className="aspect-[2/3] w-full bg-[#212226] border border-[#2F3034] rounded-xl md:rounded-2xl overflow-hidden mb-3 relative shadow-lg group-hover:shadow-amber-900/10 transition-all duration-300">
              <LazyBookCover bookId={book.id} className="opacity-80 group-hover:opacity-100 transition-all" />

              <div className="absolute top-2 left-2 flex gap-2">
                {book.isSummarized && (
                  <div className="bg-amber-500 p-1 rounded md:p-1.5 md:rounded-lg text-white shadow-lg"><Zap size={10} fill="currentColor" /></div>
                )}
                {userBookIds.has(book.id) && (
                  <div className="bg-[#3279F9] p-1 rounded md:p-1.5 md:rounded-lg text-white shadow-lg"><Check size={10} /></div>
                )}
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:block">
                <button onClick={(e) => handleEditClick(e, book)} className="p-2 bg-white/10 hover:bg-amber-600 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all">
                  <Edit3 size={14} />
                </button>
              </div>

              <div className="absolute inset-0 bg-black/80 md:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end md:justify-center p-3 md:p-4 gap-2 md:gap-3 text-center backdrop-blur-sm">
                <button onClick={() => onSelectBook(book.id)} className="w-full py-2 md:py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg md:rounded-xl text-[9px] font-medium tracking-wide border border-white/10 transition-all">Xem chi tiết</button>
                {userBookIds.has(book.id) ? (
                  onUnsaveBook && <button onClick={(e) => { e.stopPropagation(); onUnsaveBook(book.id); }} className="w-full py-2 md:py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg md:rounded-xl text-[9px] font-medium tracking-wide shadow-xl transition-all">Bỏ khỏi tủ</button>
                ) : (
                  <button onClick={(e) => handleSaveClick(e, book)} className="w-full py-2 md:py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg md:rounded-xl text-[9px] font-medium tracking-wide shadow-xl transition-all flex items-center justify-center gap-2"><Plus size={12} /> Lưu về tủ</button>
                )}
                {isAdmin && onDeleteBook && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }} className="w-full py-2 md:py-2.5 bg-red-900 hover:bg-red-700 text-red-200 rounded-lg md:rounded-xl text-[9px] font-medium tracking-wide border border-red-700/50 transition-all flex items-center justify-center gap-1">🗑 XÓA VĨNH VIỄN</button>
                )}
              </div>
            </div>

            <h3 className="text-white font-medium text-[10px] md:text-[11px] leading-tight line-clamp-2 tracking-tight">{book.title}</h3>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-slate-600 text-[8px] font-medium tracking-wide truncate max-w-[70%]">{book.author}</p>
              <div className="flex items-center gap-1 opacity-40 shrink-0">
                <Users size={10} />
                <span className="text-[8px] font-bold">{book.savesCount || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-8 pb-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2.5 bg-[#212226] border border-[#2F3034] rounded-xl text-[11px] font-medium text-[#B2BBC5] hover:text-white hover:bg-[#2F3034] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >← Trước</button>
          <span className="text-[11px] font-medium text-[#B2BBC5]">Trang {currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2.5 bg-[#212226] border border-[#2F3034] rounded-xl text-[11px] font-medium text-[#B2BBC5] hover:text-white hover:bg-[#2F3034] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >Sau →</button>
        </div>
      )}

      {showEditModal && editData && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="bg-[#212226] border border-[#2F3034] w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-10 space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-[#2F3034] pb-4 md:pb-6">
              <h2 className="text-xl md:text-2xl font-medium text-white uppercase tracking-tighter italic">Cập nhật Kho Hệ Thống</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white p-2 bg-white/5 rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div onClick={() => fileInputRef.current?.click()} className="aspect-[2/3] bg-[#121317] border-2 border-dashed border-[#2F3034] rounded-2xl md:rounded-[2.5rem] flex items-center justify-center cursor-pointer overflow-hidden group hover:border-amber-600/50 transition-all relative">
                {editData.coverImage ? (
                  <img src={editData.coverImage} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="text-center">
                    <Camera className="text-slate-800 mx-auto mb-2" size={24} />
                    <p className="text-[9px] font-medium text-slate-700 uppercase tracking-widest">ẢNH BÌA</p>
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
                        setEditData((p: any) => ({ ...p, coverImage: compressed }));
                      } catch (error: any) {
                        showToast(error.message, 'error');
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-1.5 md:space-y-2">
                  <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">Tiêu đề Sách</p>
                  <input className="w-full bg-[#121317] border border-[#2F3034] rounded-xl p-3 md:p-4 text-[12px] md:text-[13px] text-white outline-none focus:border-amber-600" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">Tác giả</p>
                  <input className="w-full bg-[#121317] border border-[#2F3034] rounded-xl p-3 md:p-4 text-[12px] md:text-[13px] text-white outline-none focus:border-amber-600" value={editData.author} onChange={e => setEditData({ ...editData, author: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest ml-1">Chủ đề</p>
                  <div className="flex flex-wrap gap-2 p-3 bg-[#121317] border border-[#2F3034] rounded-xl min-h-[100px] max-h-[150px] overflow-y-auto scrollbar-none">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTagInEdit(tag)}
                        className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-medium uppercase tracking-widest flex items-center gap-1.5 border transition-all ${editData.tags?.includes(tag) ? 'bg-amber-600 border-amber-500 text-white' : 'bg-transparent border-slate-800 text-slate-600'}`}
                      >
                        {tag} {editData.tags?.includes(tag) && <Check size={10} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleUpdate} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 md:py-5 rounded-2xl md:rounded-[2rem] text-[11px] md:text-[12px] font-medium uppercase tracking-widest shadow-2xl active:scale-95 transition-all">LƯU THAY ĐỔI</button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="bg-[#212226] border border-[#2F3034] w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-10 space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] scrollbar-none">
            <div className="flex justify-between items-center border-b border-[#2F3034] pb-4 md:pb-6">
              <h2 className="text-xl md:text-2xl font-medium text-white tracking-tight">Thêm sách mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white p-2 bg-white/5 rounded-xl"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div onClick={() => addFileInputRef.current?.click()} className="aspect-[2/3] bg-[#121317] border-2 border-dashed border-[#2F3034] rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group hover:border-amber-600/50 transition-all relative max-w-[200px] md:max-w-none mx-auto w-full">
                {formData.coverImage ? (
                  <img src={formData.coverImage} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="text-center">
                    <Camera className="text-slate-800 mx-auto mb-2" size={24} />
                    <p className="text-[9px] font-medium text-slate-700 tracking-wide">Ảnh bìa</p>
                  </div>
                )}
                <input type="file" ref={addFileInputRef} className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const compressed = await compressImage(file); setFormData(p => ({ ...p, coverImage: compressed })); } catch (error: any) { showToast(error.message, 'error'); } } }} />
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-1.5"><p className="text-[9px] font-medium text-slate-600 tracking-wide ml-1">Tên sách</p><input className="w-full bg-[#121317] border border-[#2F3034] rounded-xl p-3 md:p-4 text-[12px] md:text-[13px] text-white outline-none focus:border-amber-600" placeholder="..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                <div className="space-y-1.5"><p className="text-[9px] font-medium text-slate-600 tracking-wide ml-1">Tác giả</p><input className="w-full bg-[#121317] border border-[#2F3034] rounded-xl p-3 md:p-4 text-[12px] md:text-[13px] text-white outline-none focus:border-amber-600" placeholder="..." value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} /></div>
                <div className="space-y-2"><p className="text-[9px] font-medium text-slate-600 tracking-wide ml-1">Chủ đề</p>
                  <div className="flex flex-wrap gap-2 p-3 bg-[#121317] border border-[#2F3034] rounded-xl min-h-[100px] max-h-[150px] overflow-y-auto scrollbar-none">
                    {availableTags.map(tag => (<button key={tag} onClick={() => toggleTagInForm(tag)} className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[9px] font-medium tracking-wide flex items-center gap-1.5 border transition-all ${formData.tags.includes(tag) ? 'bg-amber-600 border-amber-500 text-white' : 'bg-transparent border-slate-800 text-slate-600'}`}>{tag} {formData.tags.includes(tag) && <Check size={10} />}</button>))}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleAddBook} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 md:py-5 rounded-2xl text-[11px] md:text-[12px] font-medium tracking-wide shadow-2xl active:scale-95 transition-all">Hoàn tất lưu</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryView;
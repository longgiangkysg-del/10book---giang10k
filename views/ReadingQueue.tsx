
import React, { useState } from 'react';
import { Book, BookStatus, Priority } from '../types';
import { Plus, Search, Filter, BookOpen, CheckCircle, Clock, Library } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface ReadingQueueProps {
  books: Book[];
  onSelectBook: (id: string) => void;
  onAddBook: (title: string, author: string) => void;
}

const ReadingQueue: React.FC<ReadingQueueProps> = ({ books, onSelectBook, onAddBook }) => {
  const [filter, setFilter] = useState<BookStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '' });

  // Helper to get derived status
  const getBookStatus = (b: Book): BookStatus => {
    if (b.isSummarized) return BookStatus.SUMMARIZED;
    if (b.isReading) return BookStatus.READING;
    return BookStatus.UNREAD;
  };

  const filteredBooks = books.filter(b => {
    // Fix: Derive status for filtering
    const bStatus = getBookStatus(b);
    const matchesFilter = filter === 'ALL' || bStatus === filter;
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: BookStatus) => {
    switch (status) {
      case BookStatus.UNREAD: return 'bg-slate-100 text-slate-600';
      case BookStatus.READING: return 'bg-blue-100 text-blue-600';
      case BookStatus.SUMMARIZED: return 'bg-green-100 text-green-600';
    }
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'text-rose-500';
      case Priority.MEDIUM: return 'text-amber-500';
      case Priority.LOW: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          {(['ALL', ...Object.values(BookStatus)] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s === 'ALL' ? 'Tất cả' : s}
            </button>
          ))}
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm sách..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Thêm sách</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map(book => {
          // Fix: Derive status for display
          const bStatus = getBookStatus(book);
          return (
            <div 
              key={book.id}
              onClick={() => onSelectBook(book.id)}
              className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(bStatus)}`}>
                    {bStatus}
                  </span>
                  <div className={`text-xs font-bold uppercase tracking-wider ${getPriorityColor(book.priority)}`}>
                    {book.priority}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors">
                  {book.title}
                </h3>
                <p className="text-slate-500 text-sm mb-4">{book.author}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {book.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-[10px] font-bold uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={14} />
                  <span className="text-xs">{book.readingTimeMinutes} phút</span>
                </div>
                <BookOpen size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          );
        })}

        {filteredBooks.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Library size={32} className="text-slate-300" />
            </div>
            <h3 className="text-slate-800 font-bold">Không tìm thấy sách</h3>
            <p className="text-slate-500 text-sm">Hãy thử thay đổi bộ lọc hoặc thêm sách mới.</p>
          </div>
        )}
      </div>

      {/* Modal Mockup */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Thêm sách mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên sách</label>
                <input 
                  type="text" 
                  value={newBook.title}
                  onChange={(e) => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Nhập tên sách..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tác giả</label>
                <input 
                  type="text" 
                  value={newBook.author}
                  onChange={(e) => setNewBook(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Tên tác giả..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => {
                    if (newBook.title) {
                      onAddBook(newBook.title, newBook.author);
                      setShowAddModal(false);
                      setNewBook({ title: '', author: '' });
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Thêm vào hàng đợi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingQueue;

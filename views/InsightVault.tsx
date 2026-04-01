
import React, { useState, useMemo } from 'react';
import { Book, KeyIdea } from '../types';
import { Search, Lightbulb, Database, Filter, ChevronDown, Share2 } from 'lucide-react';

interface InsightVaultProps {
  books: Book[];
}

const InsightVault: React.FC<InsightVaultProps> = ({ books }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const allInsights = useMemo(() => {
    const list: { idea: KeyIdea; bookTitle: string; tags: string[] }[] = [];
    books.forEach(b => {
      b.keyIdeas.forEach(idea => {
        list.push({ idea, bookTitle: b.title, tags: b.tags });
      });
    });
    return list.filter(i => 
      i.idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [books, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 rounded-[2rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl font-black mb-4 uppercase tracking-tight">Kho Tri Thức Cá Nhân</h2>
          <p className="text-slate-400 text-lg mb-8">Nơi hội tụ tinh hoa từ tất cả các nguồn tri thức bạn đã xử lý. Kết nối các ý tưởng để tạo ra giá trị mới.</p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Tìm kiếm insight, chủ đề hoặc tác giả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:bg-white/20 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>
        <Database className="absolute right-[-20px] top-[-20px] text-white/5" size={300} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allInsights.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-1">
                {[...Array(item.idea.importance)].map((_, i) => (
                  <Lightbulb key={i} size={14} className="text-yellow-500" fill="currentColor" />
                ))}
              </div>
              <button className="text-slate-300 hover:text-indigo-600">
                <Share2 size={16} />
              </button>
            </div>
            
            <p className="text-lg font-bold text-slate-800 leading-snug mb-4 group-hover:text-indigo-600 transition-colors">
              "{item.idea.description}"
            </p>
            
            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-indigo-500 tracking-wider">
                {item.bookTitle}
              </span>
              <div className="flex gap-1">
                {item.tags.slice(0, 1).map(t => (
                  <span key={t} className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 rounded uppercase">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {allInsights.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-400 font-bold">Chưa có insight nào khớp với tìm kiếm của bạn.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightVault;

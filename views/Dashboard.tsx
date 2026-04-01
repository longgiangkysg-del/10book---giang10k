
import React from 'react';
import { Trophy, Flame, Clock, Zap, BookOpen, ChevronRight } from 'lucide-react';
import { Book, BookStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  books: Book[];
  onSelectBook: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ books, onSelectBook }) => {
  // Fix: Derive summarizedCount from isSummarized boolean
  const summarizedCount = books.filter(b => b.isSummarized).length;
  const progress = Math.min(100, (summarizedCount / 52) * 100);
  
  // Fix: Derive currentBook from isReading boolean
  const currentBook = books.find(b => b.isReading && !b.isSummarized);
  
  const statsByTag = React.useMemo(() => {
    const tagsMap: Record<string, number> = {};
    books.forEach(b => b.tags.forEach(t => tagsMap[t] = (tagsMap[t] || 0) + 1));
    return Object.entries(tagsMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [books]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Tiến độ năm 2024</span>
            <Trophy className="text-amber-500" size={24} />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-800">{summarizedCount}</span>
            <span className="text-slate-400 mb-1">/ 52 cuốn</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Chuỗi ngày (Streak)</span>
            <Flame className="text-orange-500" size={24} />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-800">12</span>
            <span className="text-slate-400 mb-1">ngày liên tiếp</span>
          </div>
          <p className="text-xs text-slate-400">Bạn đang làm rất tốt! Duy trì nhé.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Thời gian đọc thực tế</span>
            <Clock className="text-indigo-500" size={24} />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-800">42.5</span>
            <span className="text-slate-400 mb-1">giờ</span>
          </div>
          <p className="text-xs text-slate-400">Trung bình 45 phút/ngày.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Sách theo chủ đề</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsByTag} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                  {statsByTag.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current & Insights */}
        <div className="space-y-6">
          <div className="bg-indigo-600 p-8 rounded-2xl shadow-lg text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-indigo-100 font-medium mb-4">Cuốn đang đọc</h3>
              {currentBook ? (
                <div>
                  <h2 className="text-2xl font-bold mb-2">{currentBook.title}</h2>
                  <p className="text-indigo-100 mb-6">{currentBook.author}</p>
                  <button 
                    onClick={() => onSelectBook(currentBook.id)}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors"
                  >
                    Tiếp tục đọc <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <p>Bắt đầu cuốn sách mới từ Queue ngay!</p>
              )}
            </div>
            <BookOpen className="absolute right-[-20px] bottom-[-20px] text-white/10" size={180} />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 mb-4">3 Insight nổi bật nhất</h3>
             <div className="space-y-4">
                {[
                  "Hệ thống quan trọng hơn mục tiêu (Atomic Habits)",
                  "Tư duy nhanh là trực giác, tư duy chậm là logic (Thinking Fast & Slow)",
                  "Tài sản là thứ đưa tiền vào túi bạn (Rich Dad Poor Dad)"
                ].map((insight, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-default">
                    <Zap size={18} className="text-yellow-500 shrink-0 mt-1" />
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{insight}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useState, useMemo } from 'react';
import { Book } from '../types';
import {
   CheckCircle2,
   Circle,
   Search,
   BookOpen,
   Target,
   Zap,
   LayoutList,
   ArrowRight,
   ChevronRight,
   TrendingUp,
   Award,
   Plus,
   Send
} from 'lucide-react';

interface ActionTrackerProps {
   books: Book[];
   onUpdateBook?: (book: Book) => void;
}

const removeAccents = (str: any) => {
   if (!str || typeof str !== 'string') return '';
   return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
};

const ActionTracker: React.FC<ActionTrackerProps> = ({ books, onUpdateBook }) => {
   const [searchTerm, setSearchTerm] = useState('');
   const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
   const [activeInputBook, setActiveInputBook] = useState<string | null>(null);
   const [newTaskContent, setNewTaskContent] = useState('');

   const roadmaps = useMemo(() => {
      return books.map(book => {
         const tasks: any[] = [];

         const aiActions = book.analysis?.personalizedInsights?.customActionPlan || [];
         aiActions.forEach((action: any, index: number) => {
            if (action?.action) {
               tasks.push({
                  id: `ai-${book.id}-${index}`,
                  content: action.action,
                  timeframe: action.timeframe || 'Sớm',
                  completed: !!action.completed,
                  type: 'ai',
                  originalIndex: index
               });
            }
         });

         const manualList = book.checklist || [];
         manualList.forEach((item: any, index: number) => {
            if (item) {
               const content = typeof item === 'object' ? item.task : item;
               const completed = typeof item === 'object' ? !!item.completed : false;
               if (content) {
                  tasks.push({
                     id: `man-${book.id}-${index}`,
                     content: content,
                     timeframe: 'Cá nhân',
                     completed: completed,
                     type: 'manual',
                     originalIndex: index
                  });
               }
            }
         });

         const doneCount = tasks.filter(t => t.completed).length;
         const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

         return {
            bookId: book.id,
            bookTitle: book.title,
            bookAuthor: book.author,
            cover: book.coverImage,
            tasks,
            progress,
            totalTasks: tasks.length
         };
      }).filter(rm => rm.totalTasks > 0 || rm.bookId === activeInputBook);
   }, [books, activeInputBook]);

   const toggleTask = (bookId: string, task: any) => {
      if (!onUpdateBook) return;
      const book = books.find(b => b.id === bookId);
      if (!book) return;

      const updatedBook = { ...book };
      if (task.type === 'ai') {
         const plan = [...(updatedBook.analysis?.personalizedInsights?.customActionPlan || [])];
         plan[task.originalIndex] = { ...plan[task.originalIndex], completed: !task.completed };
         updatedBook.analysis = {
            ...updatedBook.analysis!,
            personalizedInsights: { ...updatedBook.analysis!.personalizedInsights, customActionPlan: plan }
         };
      } else {
         const list = [...(updatedBook.checklist || [])];
         const item = list[task.originalIndex];
         if (typeof item === 'string') {
            list[task.originalIndex] = { task: item, completed: !task.completed };
         } else if (item && typeof item === 'object') {
            list[task.originalIndex] = { ...item, completed: !task.completed };
         }
         updatedBook.checklist = list;
      }
      onUpdateBook(updatedBook);
   };

   const handleAddCustomTask = (bookId: string) => {
      if (!newTaskContent.trim() || !onUpdateBook) return;
      const book = books.find(b => b.id === bookId);
      if (!book) return;

      const updatedBook = { ...book };
      const currentList = [...(updatedBook.checklist || [])];
      currentList.push({ task: newTaskContent.trim(), completed: false });
      updatedBook.checklist = currentList;

      onUpdateBook(updatedBook);
      setNewTaskContent('');
      setActiveInputBook(null);
   };

   const globalStats = useMemo(() => {
      const all = roadmaps.flatMap(r => r.tasks);
      return {
         total: all.length,
         done: all.filter(t => t.completed).length,
         progress: all.length > 0 ? Math.round((all.filter(t => t.completed).length / all.length) * 100) : 0
      };
   }, [roadmaps]);

   return (
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in pb-20 md:pb-0">
         <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 bg-[#212226] p-5 md:p-6 rounded-2xl md:rounded-3xl border border-[#2F3034] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 md:p-12 opacity-5 pointer-events-none">
               <TrendingUp size={120} className="md:w-60 md:h-60" />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-10">
               <div className="space-y-2 md:space-y-4 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-2 md:gap-3">
                     {/* Fix: removed invalid property md:size and used className for responsive sizing */}
                     <Award className="text-amber-500 md:w-6 md:h-6" size={18} />
                     <span className="text-[8px] md:text-[10px] font-medium text-amber-500 uppercase tracking-widest">Master Action Roadmap</span>
                  </div>
                  <h1 className="text-2xl md:text-4xl font-medium text-white tracking-tighter uppercase leading-tight">
                     Lộ trình <span className="text-blue-500">Thực thi</span>
                  </h1>
                  <p className="text-slate-500 text-xs md:text-sm font-medium max-w-sm mx-auto lg:mx-0">Biến tri thức thành kết quả thực tế thông qua các bước cụ thể.</p>
               </div>

               <div className="flex items-center gap-6 md:gap-8">
                  <div className="text-center">
                     <p className="text-[8px] md:text-[10px] font-medium text-slate-600 uppercase tracking-widest mb-1 md:mb-2">Hoàn thành</p>
                     <p className="text-3xl md:text-5xl font-medium text-white">{globalStats.progress}<span className="text-sm md:text-xl text-blue-500">%</span></p>
                  </div>
                  <div className="w-px h-10 md:h-16 bg-[#2F3034]"></div>
                  <div className="text-center">
                     <p className="text-[8px] md:text-[10px] font-medium text-slate-600 uppercase tracking-widest mb-1 md:mb-2">Nhiệm vụ</p>
                     <p className="text-3xl md:text-5xl font-medium text-white">{globalStats.done}<span className="text-sm md:text-xl text-slate-700">/{globalStats.total}</span></p>
                  </div>
               </div>
            </div>
            <div className="mt-8 md:mt-10 h-1.5 md:h-2 bg-[#121317] rounded-full overflow-hidden border border-white/5">
               <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${globalStats.progress}%` }}></div>
            </div>
         </div>

         {/* Control Bar - Mobile Optimized Stack */}
         <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-center">
            <div className="relative flex-1">
               <Search size={16} className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-600" />
               <input
                  type="text"
                  placeholder="Tìm nhiệm vụ hoặc sách..."
                  className="w-full bg-[#212226] border border-[#2F3034] py-3.5 md:py-4 pl-12 md:pl-16 pr-4 md:pr-6 rounded-xl md:rounded-2xl text-[11px] md:text-xs text-white outline-none focus:border-blue-500/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-1 p-1 bg-[#212226] rounded-xl md:rounded-2xl border border-[#2F3034] overflow-x-auto scrollbar-none">
               {['ALL', 'PENDING', 'DONE'].map(f => (
                  <button
                     key={f}
                     onClick={() => setFilter(f as any)}
                     className={`px-4 md:px-6 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-medium uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                     {f === 'ALL' ? 'Tất cả' : f === 'PENDING' ? 'Chưa xong' : 'Đã xong'}
                  </button>
               ))}
            </div>
         </div>

         {/* Roadmap List */}
         <div className="space-y-12 md:space-y-16">
            {roadmaps.map((roadmap) => {
               const displayTasks = roadmap.tasks.filter(t => {
                  const matchesSearch = removeAccents(t.content).includes(removeAccents(searchTerm));
                  const matchesFilter = filter === 'ALL' ? true : filter === 'DONE' ? t.completed : !t.completed;
                  return matchesSearch && matchesFilter;
               });

               if (displayTasks.length === 0 && searchTerm && roadmap.bookId !== activeInputBook) return null;

               return (
                  <div key={roadmap.bookId} className="group px-1 md:px-0">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                        <div className="flex items-center gap-4 md:gap-6">
                           <div className="w-12 h-16 md:w-16 md:h-20 bg-[#212226] border border-[#2F3034] rounded-lg md:rounded-xl overflow-hidden shrink-0 shadow-xl">
                              {roadmap.cover ? <img src={roadmap.cover} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><BookOpen size={18} /></div>}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h3 className="text-base md:text-xl font-bold text-white uppercase tracking-tight leading-tight truncate">{roadmap.bookTitle}</h3>
                              <div className="flex items-center gap-3 md:gap-4 mt-1">
                                 <span className="text-[8px] md:text-[10px] font-medium text-slate-600 uppercase truncate max-w-[100px]">{roadmap.bookAuthor}</span>
                                 <div className="flex items-center gap-2">
                                    <div className="w-16 md:w-24 h-1 bg-[#212226] rounded-full overflow-hidden">
                                       <div className="h-full bg-blue-500" style={{ width: `${roadmap.progress}%` }}></div>
                                    </div>
                                    <span className="text-[8px] md:text-[10px] font-medium text-blue-500">{roadmap.progress}%</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <button
                           onClick={() => setActiveInputBook(activeInputBook === roadmap.bookId ? null : roadmap.bookId)}
                           className="bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white px-4 py-2.5 rounded-xl text-[8px] md:text-[10px] font-medium uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-blue-600/20"
                        >
                           <Plus size={14} /> Thêm hành động
                        </button>
                     </div>

                     {activeInputBook === roadmap.bookId && (
                        <div className="mb-6 p-4 md:p-6 bg-[#212226] rounded-2xl md:rounded-[2rem] border border-blue-600/30 animate-in slide-in-from-top-4">
                           <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                              <input
                                 autoFocus
                                 type="text"
                                 placeholder="Nhập hành động của bạn..."
                                 className="flex-1 bg-black/40 border border-[#2F3034] rounded-xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs text-white outline-none focus:border-blue-500"
                                 value={newTaskContent}
                                 onChange={(e) => setNewTaskContent(e.target.value)}
                                 onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTask(roadmap.bookId)}
                              />
                              <button
                                 onClick={() => handleAddCustomTask(roadmap.bookId)}
                                 className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                              >
                                 <Send size={16} />
                              </button>
                           </div>
                        </div>
                     )}

                     {/* Tasks Grid: 1 column on mobile, 2 on desktop */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {displayTasks.map(task => (
                           <div
                              key={task.id}
                              onClick={() => toggleTask(roadmap.bookId, task)}
                              className={`flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all cursor-pointer ${task.completed ? 'bg-blue-600/5 border-blue-600/10 opacity-50' : 'bg-[#212226] border-[#2F3034] hover:border-blue-600/30'}`}
                           >
                              <div className={`mt-0.5 md:mt-1 shrink-0 ${task.completed ? 'text-blue-500' : 'text-slate-700'}`}>
                                 {/* Fix: removed invalid property md:size and used className for responsive sizing */}
                                 {task.completed ? <CheckCircle2 size={18} className="md:w-5 md:h-5" /> : <Circle size={18} className="md:w-5 md:h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className={`text-[11px] md:text-[13px] font-bold leading-snug mb-2 ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.content}</p>
                                 <div className="flex items-center gap-2">
                                    <span className={`text-[7px] md:text-[8px] font-medium px-1.5 py-0.5 rounded uppercase tracking-widest ${task.type === 'ai' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-600/10 text-blue-500 border border-blue-600/20'}`}>
                                       {task.type === 'ai' ? 'AI' : 'Cá nhân'}
                                    </span>
                                    <span className="text-[7px] md:text-[8px] font-medium text-slate-700 uppercase tracking-widest">{task.timeframe}</span>
                                 </div>
                              </div>
                              <ChevronRight size={12} className="text-slate-800 mt-1 shrink-0" />
                           </div>
                        ))}
                     </div>
                  </div>
               );
            })}

            {roadmaps.length === 0 && (
               <div className="py-20 md:py-32 text-center border-2 border-dashed border-[#2F3034] rounded-[2rem] md:rounded-[3rem] px-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-[#212226] border border-[#2F3034] rounded-full flex items-center justify-center mx-auto mb-6">
                     <LayoutList size={28} className="text-slate-800" />
                  </div>
                  <h3 className="text-slate-500 font-medium uppercase tracking-widest text-[10px] md:text-xs">Chưa có lộ trình thực thi</h3>
                  <p className="text-slate-700 text-[8px] md:text-[9px] mt-2 font-bold uppercase">Lưu sách vào tủ để thiết lập kế hoạch</p>
               </div>
            )}
         </div>
      </div>
   );
};

export default ActionTracker;

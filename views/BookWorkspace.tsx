
import React, { useState, useEffect, useRef } from 'react';
import { Book, KeyIdea, BookStatus } from '../types';
import { 
  Info, 
  Search, 
  Lightbulb, 
  Layout, 
  Save, 
  Sparkles, 
  CheckSquare, 
  Plus, 
  Star,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface BookWorkspaceProps {
  book: Book;
  onUpdate: (book: Book) => void;
  onGoToSummary: () => void;
}

const AutoHeightTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onChange, className, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent border-none p-0 focus:ring-0 resize-none overflow-hidden transition-all duration-200 ${className}`}
      style={{ minHeight: '1.5em' }}
    />
  );
};

const BookWorkspace: React.FC<BookWorkspaceProps> = ({ book, onUpdate, onGoToSummary }) => {
  const [subTab, setSubTab] = useState('overview');
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  const handleUpdate = (updates: Partial<Book>) => {
    onUpdate({ ...book, ...updates });
  };

  const handleAddKeyIdea = () => {
    const newIdea: KeyIdea = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      importance: 2
    };
    handleUpdate({ keyIdeas: [...book.keyIdeas, newIdea] });
  };

  const updateKeyIdea = (id: string, updates: Partial<KeyIdea>) => {
    handleUpdate({
      keyIdeas: book.keyIdeas.map(ki => ki.id === id ? { ...ki, ...updates } : ki)
    });
  };

  const runQuickScan = async () => {
    setIsAIProcessing(true);
    try {
      const result = await geminiService.quickScan(book.title, book.author);
      const lines = result.split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
      handleUpdate({ toc: lines.map(l => l.replace(/^[- \d.]+/, '').trim()) });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const tabs = [
    { id: 'overview', label: '3.1 Tổng quan', icon: Info },
    { id: 'scan', label: '3.2 Quét nhanh', icon: Search },
    { id: 'ideas', label: '3.3 Ý tưởng chính', icon: Lightbulb },
    { id: 'models', label: '3.4 Mô hình', icon: Layout },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                subTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={onGoToSummary}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg"
        >
          Hoàn tất & Xem Tóm tắt <ArrowRight size={16} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[600px]">
        {subTab === 'overview' && (
          <div className="p-10 space-y-10 max-w-4xl mx-auto">
            <section>
              <label className="block text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">Luận điểm trung tâm (1-2 câu tóm gọn)</label>
              <div className="w-full bg-slate-50 border-none rounded-2xl p-6">
                <AutoHeightTextarea 
                  value={book.centralThesis || ''}
                  onChange={(val) => handleUpdate({ centralThesis: val })}
                  placeholder="Ý chính xuyên suốt cả tài liệu là gì?"
                  className="text-xl font-medium text-slate-800"
                />
              </div>
            </section>
          </div>
        )}

        {subTab === 'scan' && (
          <div className="p-10 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Cấu trúc tài liệu</h2>
              <button 
                onClick={runQuickScan}
                disabled={isAIProcessing}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all disabled:opacity-50"
              >
                <Sparkles size={18} /> {isAIProcessing ? 'Đang phân tích...' : 'AI Quét nhanh (3 phút)'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-600 flex items-center gap-2"><CheckSquare size={16} /> Mục lục / Chương</h3>
                <div className="space-y-2">
                  {(book.toc || ['Chưa có mục lục']).map((chapter, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl items-start">
                      <span className="text-slate-400 font-mono text-xs mt-1">{i + 1}.</span>
                      <AutoHeightTextarea 
                        value={chapter}
                        onChange={(val) => {
                          const newToc = [...(book.toc || [])];
                          newToc[i] = val;
                          handleUpdate({ toc: newToc });
                        }}
                        className="text-sm font-medium text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                <Search size={48} className="text-slate-300 mb-4" />
                <h4 className="font-bold text-slate-700 mb-2">Đánh dấu chương quan trọng</h4>
                <p className="text-sm text-slate-500 max-w-xs">AI sẽ gợi ý các chương cốt lõi nhất cần nghiên cứu kỹ để tối ưu thời gian.</p>
              </div>
            </div>
          </div>
        )}

        {subTab === 'ideas' && (
          <div className="p-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Danh sách Ý tưởng Cốt lõi</h2>
              <button 
                onClick={handleAddKeyIdea}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm"
              >
                <Plus size={18} /> Thêm ý tưởng
              </button>
            </div>

            <div className="space-y-6">
              {book.keyIdeas.map((idea, i) => (
                <div key={idea.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                  <div className="flex justify-between gap-4 mb-4">
                    <AutoHeightTextarea 
                      value={idea.description}
                      onChange={(val) => updateKeyIdea(idea.id, { description: val })}
                      placeholder="Mô tả ý tưởng ngắn gọn..."
                      className="text-lg font-bold text-slate-800"
                    />
                    <div className="flex gap-1 shrink-0">
                      {[1, 2, 3].map(star => (
                        <button 
                          key={star}
                          onClick={() => updateKeyIdea(idea.id, { importance: star as any })}
                          className={`${idea.importance >= star ? 'text-yellow-500' : 'text-slate-300'}`}
                        >
                          <Star size={18} fill={idea.importance >= star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                      <button 
                        onClick={() => handleUpdate({ keyIdeas: book.keyIdeas.filter(k => k.id !== idea.id) })}
                        className="text-slate-300 hover:text-rose-500 ml-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/50 border-none rounded-lg px-3 py-2">
                    <AutoHeightTextarea 
                      value={idea.quote || ''}
                      onChange={(val) => updateKeyIdea(idea.id, { quote: val })}
                      placeholder="Trích dẫn gốc (nếu có)..."
                      className="text-sm italic text-slate-500"
                    />
                  </div>
                </div>
              ))}
              {book.keyIdeas.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
                  <Lightbulb size={40} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Chưa có ý tưởng nào. Hãy bắt đầu chiết xuất tri thức!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === 'models' && (
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
            <section className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800">Mô hình / Sơ đồ tư duy</h3>
              <div className="space-y-3">
                {book.models.map((m, i) => (
                  <div key={i} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 group">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                      M
                    </div>
                    <AutoHeightTextarea 
                      value={m}
                      onChange={(val) => {
                        const newModels = [...book.models];
                        newModels[i] = val;
                        handleUpdate({ models: newModels });
                      }}
                      className="font-bold text-indigo-700"
                    />
                    <button 
                      onClick={() => handleUpdate({ models: book.models.filter((_, idx) => idx !== i) })}
                      className="opacity-0 group-hover:opacity-100 text-indigo-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => handleUpdate({ models: [...book.models, 'Mô hình mới'] })}
                  className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 transition-colors"
                >
                  + Thêm mô hình
                </button>
              </div>
            </section>
            
            <section className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800">Checklist hành động</h3>
              <div className="space-y-3">
                {book.checklist.map((c, i) => (
                  <div key={i} className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl group">
                    {/* Preserve completion status and update task object properties for mixed string/object checklist */}
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600" 
                      checked={typeof c === 'object' ? c.completed : false}
                      onChange={() => {
                        const newChecklist = [...book.checklist];
                        const item = newChecklist[i];
                        if (typeof item === 'string') {
                          newChecklist[i] = { task: item, completed: true };
                        } else {
                          newChecklist[i] = { ...item, completed: !item.completed };
                        }
                        handleUpdate({ checklist: newChecklist });
                      }}
                    />
                    <AutoHeightTextarea 
                      value={typeof c === 'string' ? c : c.task}
                      onChange={(val) => {
                        const newChecklist = [...book.checklist];
                        const item = newChecklist[i];
                        if (typeof item === 'string') {
                          newChecklist[i] = val;
                        } else {
                          newChecklist[i] = { ...item, task: val };
                        }
                        handleUpdate({ checklist: newChecklist });
                      }}
                      className="text-slate-700 font-medium"
                    />
                    <button 
                      onClick={() => handleUpdate({ checklist: book.checklist.filter((_, idx) => idx !== i) })}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => handleUpdate({ checklist: [...book.checklist, 'Nhiệm vụ mới'] })}
                  className="w-full p-3 text-sm text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition-colors text-left"
                >
                  + Thêm việc cần làm
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookWorkspace;

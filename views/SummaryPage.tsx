
import React from 'react';
import { Book } from '../types';
import { Download, Share2, Copy, FileText, Quote } from 'lucide-react';

interface SummaryPageProps {
  book: Book;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ book }) => {
  const summary = book.finalSummary || {
    thesis: book.centralThesis || 'Đang cập nhật...',
    bigIdeas: book.keyIdeas.slice(0, 4).map(k => k.description) || [],
    models: book.models || [],
    topActions: book.checklist.slice(0, 3) || [],
    personalQuote: 'Sách là người thầy vĩ đại.'
  };

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-4 sticky top-20 z-10 bg-slate-50/80 backdrop-blur py-2">
        <h2 className="text-2xl font-bold text-slate-800">Bản Tổng Hợp 1 Trang (A4)</h2>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50">
            <Copy size={16} /> Copy
          </button>
          <button className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50">
            <Share2 size={16} /> Chia sẻ
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg"
          >
            <Download size={16} /> Xuất PDF
          </button>
        </div>
      </div>

      <div className="a4-page shadow-2xl relative">
        <div className="border-b-4 border-indigo-600 pb-8 mb-8 flex justify-between items-end">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 block mb-2">Book Summary Report</span>
            <h1 className="text-4xl font-black text-slate-900 leading-tight uppercase">{book.title}</h1>
            <p className="text-xl font-medium text-slate-500 mt-2">Tác giả: {book.author}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase">Ngày tổng hợp</span>
            <p className="font-bold text-slate-800">{new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {/* Section 1: Thesis */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="text-indigo-600" size={20} />
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-800">Luận điểm trung tâm</h3>
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl border-l-8 border-indigo-600">
              <p className="text-xl font-medium leading-relaxed text-indigo-900">
                "{summary.thesis}"
              </p>
            </div>
          </section>

          {/* Section 2: Big Ideas & Models */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-800">1</div>
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-800">3-5 Ý tưởng lớn</h3>
              </div>
              <ul className="space-y-4">
                {summary.bigIdeas.map((idea, i) => (
                  <li key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-indigo-500 font-bold">0{i+1}</span>
                    <p className="text-slate-700 font-medium">{idea}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-800">2</div>
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-800">Mô hình / Khung tư duy</h3>
              </div>
              <div className="space-y-4">
                {summary.models.map((model, i) => (
                  <div key={i} className="p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <p className="font-bold text-slate-800 uppercase text-sm">{model}</p>
                  </div>
                ))}
                {summary.models.length === 0 && <p className="text-slate-400 italic text-sm">Chưa xác định mô hình.</p>}
              </div>
            </section>
          </div>

          {/* Section 3: Action & Quote */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-slate-100">
             <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-800">3</div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-slate-800">3 Điều áp dụng ngay</h3>
                </div>
                <div className="space-y-3">
                  {summary.topActions.map((action, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-indigo-600/5 rounded-xl border border-indigo-100">
                      <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {i+1}
                      </div>
                      {/* Fix: Safely display task text whether stored as a simple string or an object */}
                      <span className="text-slate-800 font-semibold">
                        {typeof action === 'string' ? action : action.task}
                      </span>
                    </div>
                  ))}
                </div>
             </section>

             <section className="flex flex-col justify-center bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
                <Quote className="absolute top-4 left-4 text-white/10" size={60} />
                <div className="relative z-10">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Đúc kết cá nhân</h4>
                  <p className="text-2xl font-bold leading-tight">
                    {summary.personalQuote}
                  </p>
                </div>
             </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;


import React from 'react';
import PauseNotice from '../components/PauseNotice';

/**
 * Dự án tạm ngưng: màn này chỉ còn tin nhắn thông báo.
 * Nút đăng nhập Google đã gỡ theo yêu cầu, nên khách chưa có phiên
 * sẽ dừng ở đây; ai còn phiên đăng nhập cũ thì vẫn vào app như thường.
 */
const AuthView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#121317] flex flex-col items-center justify-center gap-6 p-4 py-10 relative">
      {/* Background Aura */}
      <div className="fixed top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#3279F9]/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#3279F9]/3 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-[680px] w-full relative z-10">
        <PauseNotice />
      </div>

      {/* Bottom Copyright */}
      <p className="relative z-10 text-[9px] font-medium text-slate-800 uppercase tracking-[1em]">SuccessCode x 10kBook</p>
    </div>
  );
};

export default AuthView;

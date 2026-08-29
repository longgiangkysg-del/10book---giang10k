
import React, { useState } from 'react';
import { authService } from '../services/supabaseClient';
import { Code2 } from 'lucide-react';
import { useToast } from '../components/Toast';

const AuthView: React.FC = () => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      showToast("Đăng nhập thất bại. Vui lòng thử lại.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121317] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Aura */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#3279F9]/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#3279F9]/3 blur-[120px] rounded-full"></div>

      <div className="max-w-[440px] w-full bg-[#212226] border border-[#2F3034] rounded-[3rem] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative z-10 transition-all duration-500">

        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3279F9] to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-[#3279F9]/20 mb-6">
            <Code2 size={40} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-medium text-white tracking-tighter uppercase mb-1">
              10K<span className="text-[#3279F9]">BOOK</span>
            </h1>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.3em]">Hệ thống quản trị tri thức</p>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-[#2F3034] hover:bg-[#45474D] border border-[#2F3034] text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 group"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <div className="bg-white p-1 rounded-md">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-4 h-4" alt="G" />
              </div>
              Tiếp tục với Google
            </>
          )}
        </button>

        {/* Đăng nhập lần đầu tự tạo tài khoản, nên không cần màn đăng ký riêng. */}
        <p className="mt-6 text-center text-[10px] font-medium text-slate-600 leading-relaxed">
          Lần đầu đăng nhập, tài khoản của bạn sẽ được tạo tự động.
        </p>

      </div>

      {/* Absolute Bottom Copyright */}
      <p className="absolute bottom-8 text-[9px] font-medium text-slate-800 uppercase tracking-[1em]">SuccessCode x 10kBook</p>
    </div>
  );
};

export default AuthView;

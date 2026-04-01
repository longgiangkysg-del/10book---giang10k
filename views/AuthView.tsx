
import React, { useState } from 'react';
import { authService } from '../services/supabaseClient';
import { Chrome, Mail, Lock, Code2, ArrowRight } from 'lucide-react';
import { useToast } from '../components/Toast';

const AuthView: React.FC = () => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Tính năng đăng nhập bằng Email đang được cấu hình. Vui lòng sử dụng Google.", "info");
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

        {/* Separator */}
        <div className="flex items-center gap-4 my-8">
          <div className="h-px bg-white/5 flex-1"></div>
          <span className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">Hoặc</span>
          <div className="h-px bg-white/5 flex-1"></div>
        </div>

        {/* Form Login */}
        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-widest ml-1">
              <Mail size={12} /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#121317] border border-[#2F3034] rounded-2xl p-4 text-white text-sm outline-none focus:border-[#3279F9]/50 transition-all placeholder:text-slate-800"
              placeholder="ten@congty.com"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-widest ml-1">
              <Lock size={12} /> Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121317] border border-[#2F3034] rounded-2xl p-4 text-white text-sm outline-none focus:border-[#3279F9]/50 transition-all placeholder:text-slate-800"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#3279F9] hover:bg-[#4A8FFF] text-white py-5 rounded-2xl font-medium text-sm uppercase tracking-widest transition-all shadow-xl shadow-[#3279F9]/20 active:scale-95"
          >
            Đăng nhập
          </button>
        </form>

        {/* Footer */}
        <div className="mt-10 text-center">
          <button className="text-[10px] font-medium text-slate-600 uppercase tracking-widest hover:text-[#3279F9] transition-colors">
            Chưa có tài khoản? <span className="text-[#3279F9]">Đăng ký ngay</span>
          </button>
        </div>

      </div>

      {/* Absolute Bottom Copyright */}
      <p className="absolute bottom-8 text-[9px] font-medium text-slate-800 uppercase tracking-[1em]">SuccessCode x 10kBook</p>
    </div>
  );
};

export default AuthView;

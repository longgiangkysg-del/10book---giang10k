import React from 'react';
import { Pause, ArrowUpRight, MessageCircle, Play } from 'lucide-react';

/**
 * Thông báo tạm ngưng dự án 10K Book + giới thiệu các app khác của team.
 * Dùng ở cả màn đăng nhập (khách chưa vào) và đầu màn chính (người đã vào).
 *
 * Video demo và ảnh poster lấy thẳng từ 10kvideo.giauco.vn để khỏi nhân đôi
 * file nặng trong repo này; preload="none" nên chưa bấm thì chưa tải gì.
 */

const DEMO_BASE = 'https://10kvideo.giauco.vn/anh';

const DEMOS = [
  {
    src: `${DEMO_BASE}/van-con-so-that.mp4`,
    poster: `${DEMO_BASE}/poster/van.jpg`,
    label: 'Vân · chủ tiệm',
    caption: 'Từ cả một đội làm video xuống còn một người',
    length: '1 phút 56',
  },
  {
    src: `${DEMO_BASE}/tungpu-phong-van.mp4`,
    poster: `${DEMO_BASE}/poster/tungpu.jpg`,
    label: 'Tùng Pu · phỏng vấn khách',
    caption: 'Clip phỏng vấn khách hàng, do app dựng',
    length: '3 phút 31',
  },
];

const DemoClip: React.FC<{ demo: typeof DEMOS[number] }> = ({ demo }) => {
  const [playing, setPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const play = () => {
    setPlaying(true);
    videoRef.current?.play();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-2xl overflow-hidden border border-[#2F3034] bg-black aspect-[9/16]">
        <video
          ref={videoRef}
          src={demo.src}
          poster={demo.poster}
          preload="none"
          playsInline
          controls={playing}
          onPlay={() => setPlaying(true)}
          className="w-full h-full object-cover"
          aria-label={demo.caption}
        />
        {!playing && (
          <button
            onClick={play}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group"
            aria-label={`Xem clip: ${demo.caption}`}
          >
            <span className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-active:scale-95 transition-transform">
              <Play size={20} className="text-[#121317] ml-0.5" fill="currentColor" />
            </span>
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium">
              {demo.length}
            </span>
          </button>
        )}
      </div>
      <div>
        <p className="text-[11px] font-bold text-blue-400">{demo.label}</p>
        <p className="text-[11px] text-slate-400 leading-snug">{demo.caption}</p>
      </div>
    </div>
  );
};

const PauseNotice: React.FC = () => {
  return (
    <div className="w-full bg-[#212226] border border-[#2F3034] rounded-[2rem] p-6 md:p-8 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)]">

      {/* Tin nhắn tạm ngưng */}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 shrink-0 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Pause size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-medium text-white tracking-tight mb-2">
            Kho Tri Thức 10K Book tạm ngưng
          </h2>
          <p className="text-[13px] text-slate-300 leading-relaxed">
            Dự án tạm dừng phát triển. Cám ơn anh chị đã đồng hành cùng 10K Book suốt thời gian qua.
          </p>
        </div>
      </div>

      <div className="my-6 border-t border-white/5" />

      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
        Ủng hộ các app khác của team
      </p>

      <div className="flex flex-col gap-4">

        {/* App cắt video */}
        <div className="rounded-3xl border border-[#2F3034] bg-[#18191D] p-5">
          <h3 className="text-base font-medium text-white mb-1">10K Video · app tự cắt video</h3>
          <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
            Bỏ cả loạt video vào, máy tự cắt lời thừa, làm chữ chạy, chèn hình minh hoạ,
            ra clip sẵn đăng. Hai clip dưới đây do chính app dựng.
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-[380px] mb-5">
            {DEMOS.map((demo) => (
              <DemoClip key={demo.src} demo={demo} />
            ))}
          </div>

          <a
            href="https://10kvideo.giauco.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#3279F9] hover:bg-[#4A8FFF] text-white px-5 py-3 rounded-xl text-[13px] font-bold transition-colors active:scale-95"
          >
            Xem 10kvideo.giauco.vn
            <ArrowUpRight size={16} />
          </a>
        </div>

        {/* Dịch vụ tăng tương tác */}
        <div className="rounded-3xl border border-[#2F3034] bg-[#18191D] p-5">
          <h3 className="text-base font-medium text-white mb-1">Dịch vụ tăng tương tác</h3>
          <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
            Tăng like, tăng sub người theo dõi, tăng đánh giá cho các kênh TikTok, fanpage
            và Facebook cá nhân.
          </p>
          <a
            href="https://zalo.me/0382789888"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-[#2F3034] text-white px-5 py-3 rounded-xl text-[13px] font-bold transition-colors active:scale-95"
          >
            <MessageCircle size={16} className="text-blue-400" />
            Liên hệ Zalo 0382789888
          </a>
        </div>

      </div>
    </div>
  );
};

export default PauseNotice;

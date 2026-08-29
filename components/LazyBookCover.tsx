import React, { useState, useEffect, useRef } from 'react';
import { Library } from 'lucide-react';
import { bookService } from '../services/supabaseClient';

interface LazyBookCoverProps {
  bookId: string;
  /** URL bìa đã có sẵn từ danh sách sách. Có thì dùng luôn, khỏi gọi API riêng cho từng thẻ. */
  coverUrl?: string;
  className?: string;
}

const LazyBookCover: React.FC<LazyBookCoverProps> = ({ bookId, coverUrl: coverUrlProp, className = '' }) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(coverUrlProp || null);
  // Đã có URL từ danh sách thì không phải chờ tải gì cả.
  const [isLoading, setIsLoading] = useState(!coverUrlProp);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer - chỉ load khi element visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Pre-load khi còn cách 100px
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [bookId]);

  // Chỉ gọi API bìa khi danh sách không kèm sẵn URL (đường lùi cho chỗ gọi chưa truyền prop).
  useEffect(() => {
    if (!isVisible || coverUrlProp) return;

    const loadCover = async () => {
      setIsLoading(true);
      try {
        const cover = await bookService.fetchBookCover(bookId);
        setCoverUrl(cover);
      } catch (error) {
        console.error("Failed to load cover:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCover();
  }, [bookId, isVisible, coverUrlProp]);

  return (
    <div ref={imgRef} className={`w-full h-full ${className}`}>
      {isLoading ? (
        // Skeleton loading
        <div className="w-full h-full bg-[#2F3034] animate-pulse flex items-center justify-center">
          <Library size={32} className="text-slate-700" />
        </div>
      ) : coverUrl ? (
        <img
          src={coverUrl}
          className="w-full h-full object-cover"
          alt=""
          loading="lazy"
        />
      ) : (
        // Placeholder khi không có ảnh
        <div className="w-full h-full flex items-center justify-center bg-[#212226]">
          <Library size={32} className="text-slate-800" />
        </div>
      )}
    </div>
  );
};

export default LazyBookCover;
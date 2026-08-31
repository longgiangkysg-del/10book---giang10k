import { useEffect, useRef } from 'react';
import { compressImage } from './imageUtils';

/**
 * Cho phép dán ảnh bìa bằng Ctrl+V (Cmd+V) khi một modal đang mở.
 *
 * Ảnh trong clipboard tới dưới dạng File nên đi chung đường nén với nút chọn file —
 * không có nhánh xử lý riêng nào để lệch nhau về sau.
 */
export function usePasteImage(
  enabled: boolean,
  onImage: (dataUrl: string) => void,
  onError?: (message: string) => void
) {
  // Giữ handler mới nhất trong ref: nếu phụ thuộc thẳng vào onImage/onError thì
  // effect gỡ và gắn lại listener sau MỖI lần render.
  const onImageRef = useRef(onImage);
  const onErrorRef = useRef(onError);
  onImageRef.current = onImage;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || [])
        .find(i => i.kind === 'file' && i.type.startsWith('image/'));
      if (!item) return;

      const file = item.getAsFile();
      if (!file) return;

      e.preventDefault();
      try {
        onImageRef.current(await compressImage(file));
      } catch (err: any) {
        onErrorRef.current?.(err?.message || 'Không dán được ảnh từ clipboard.');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [enabled]);
}


interface CompressOptions {
  maxWidth?: number;      // default 800
  maxHeight?: number;     // default 1200
  quality?: number;       // default 0.8
  maxSizeMB?: number;     // default 10 (file gốc)
}

/**
 * Nén ảnh và chuyển đổi sang base64
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeMB = 10
  } = options;

  // 1. Validate định dạng
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error("Vui lòng chọn file ảnh (JPG, PNG, WEBP)");
  }

  // 2. Validate kích thước file gốc
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`Ảnh quá lớn. Vui lòng chọn ảnh dưới ${maxSizeMB}MB`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 3. Tính toán tỷ lệ resize giữ nguyên aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Không thể khởi tạo canvas context"));
          return;
        }

        // 4. Vẽ và nén
        ctx.drawImage(img, 0, 0, width, height);
        
        // Xuất ra base64 với chất lượng chỉ định
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Lỗi khi load ảnh để nén"));
    };
    reader.onerror = () => reject(new Error("Lỗi khi đọc file"));
  });
}

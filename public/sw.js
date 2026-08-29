// Service worker cho 10kBook.
//
// Nằm trong public/ để Vite copy nguyên xi ra gốc dist/ — index.html đăng ký
// nó ở '/sw.js', đường dẫn này không đi qua bước biến đổi của Vite.
//
// Không precache theo danh sách cố định: bản build chỉ sinh ra file có băm tên
// (/assets/index-<hash>.js), nên mọi danh sách chép cứng đều trỏ vào file không
// tồn tại, mà cache.addAll thì all-or-nothing — một URL 404 là hỏng cả lượt cài.

const CACHE_NAME = '10kbook-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

/** Lưu bản sao vào cache, bỏ qua mọi lỗi ghi (hết dung lượng, chế độ riêng tư...). */
const putInCache = async (request, response) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch {
    // Cache hỏng thì thôi, không được để ảnh hưởng tới response trả cho trang.
  }
};

/** Ưu tiên mạng, offline thì lấy bản đã lưu. Dùng cho HTML và dữ liệu. */
const networkFirst = async (request, fallbackUrl) => {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      putInCache(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }
    throw err;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Khác origin (Supabase, ảnh bìa, CDN): để trình duyệt tự lo, service worker
  // đứng ngoài. Cache dữ liệu động ở đây chỉ tổ khiến app hiển thị bản cũ.
  if (url.origin !== self.location.origin) return;

  // File trong /assets/ có băm nội dung trong tên nên bất biến — cache thẳng.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) putInCache(request, response.clone());
          return response;
        });
      })
    );
    return;
  }

  // Vỏ HTML phải luôn ưu tiên mạng: mỗi lần deploy nó trỏ sang bundle băm mới,
  // giữ bản cũ trong cache là dẫn người dùng tới file đã bị xoá — màn hình trắng.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  event.respondWith(networkFirst(request));
});

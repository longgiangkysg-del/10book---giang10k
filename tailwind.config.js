/** @type {import('tailwindcss').Config} */
// Thay cho Tailwind Play CDN (cdn.tailwindcss.com) vốn biên dịch CSS ngay trong trình
// duyệt lúc chạy — mỗi lần React vẽ lại là một đợt quét DOM + sinh CSS, nhân mọi
// re-render lên. content phải phủ mọi file có class thì JIT mới không bỏ sót.
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './constants.tsx',
    './views/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
}

/**
 * Định tuyến bằng hash — nguồn chân lý DUY NHẤT cho "đang ở màn nào".
 *
 * Trước đây chỉ Work Zone có link (`#/book/<id>`); tab, lớp đang đọc và mọi
 * hộp thoại đều nằm trong state nên không copy link được, tải lại thì mất chỗ,
 * và bấm Back giữa lúc đang sửa sách thì văng thẳng ra màn chính.
 *
 * Khuôn đường dẫn:
 *   #/kho-sach                     · #/lo-trinh · #/huong-dan
 *   #/book/<id>                    (lớp mặc định, giữ nguyên link cũ đã chia sẻ)
 *   #/book/<id>/architecture       · /overview · /ideas
 *   #/cai-dat                      (mở đè lên màn đang xem)
 *   #/kho-sach/them-sach           · /tim-ai · /sua/<id>
 */

export type Tab = 'vault' | 'actions' | 'help';
export type Overlay = 'cai-dat' | 'them-sach' | 'tim-ai' | 'sua';

export interface Route {
  tab: Tab;
  /** Sách đang mở trong Work Zone; có giá trị là đang ở Work Zone. */
  bookId: string | null;
  /** 1 = Overview, 2 = Architecture, 3 = Ideas. */
  layer: number;
  overlay: Overlay | null;
  /** Sách mà hộp thoại "sửa" đang nhắm tới. */
  overlayBookId: string | null;
}

export const DEFAULT_LAYER = 1;

const TAB_SLUG: Record<Tab, string> = {
  vault: 'kho-sach',
  actions: 'lo-trinh',
  help: 'huong-dan',
};
const SLUG_TAB: Record<string, Tab> = { 'kho-sach': 'vault', 'lo-trinh': 'actions', 'huong-dan': 'help' };

const LAYER_SLUG: Record<number, string> = { 1: 'overview', 2: 'architecture', 3: 'ideas' };
const SLUG_LAYER: Record<string, number> = { overview: 1, architecture: 2, ideas: 3 };

export const EMPTY_ROUTE: Route = {
  tab: 'vault', bookId: null, layer: DEFAULT_LAYER, overlay: null, overlayBookId: null,
};

/** Đọc hash thành trạng thái. Hash lạ hoặc rỗng đều rơi về Kho sách. */
export const parseHash = (rawHash: string): Route => {
  const parts = (rawHash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const route: Route = { ...EMPTY_ROUTE };
  if (parts.length === 0) return route;

  // '#/cai-dat' trần vẫn nhận, nhưng dạng đầy đủ luôn gắn vào màn đang xem
  // (#/book/<id>/cai-dat) để tải lại trang không đánh mất cuốn đang đọc.
  if (parts.includes('cai-dat')) route.overlay = 'cai-dat';

  if (parts[0] === 'book' && parts[1]) {
    route.bookId = parts[1];
    route.layer = SLUG_LAYER[parts[2]] ?? DEFAULT_LAYER;
    // Hộp thoại sửa mở ngay trong Work Zone: #/book/<id>/architecture/sua
    if (parts.includes('sua')) { route.overlay = 'sua'; route.overlayBookId = parts[1]; }
    return route;
  }

  route.tab = SLUG_TAB[parts[0]] ?? 'vault';
  const sau = parts[1];
  if (sau === 'them-sach' || sau === 'tim-ai') route.overlay = sau;
  if (sau === 'sua' && parts[2]) { route.overlay = 'sua'; route.overlayBookId = parts[2]; }
  return route;
};

/** Dựng hash từ trạng thái. Luôn có tiền tố '#'. */
export const buildHash = (route: Route): string => {
  if (route.bookId) {
    let path = `#/book/${route.bookId}`;
    // Lớp mặc định không ghi vào link, để link chia sẻ cũ giữ nguyên hình dạng.
    if (route.layer !== DEFAULT_LAYER) path += `/${LAYER_SLUG[route.layer]}`;
    if (route.overlay === 'sua') path += '/sua';
    if (route.overlay === 'cai-dat') path += '/cai-dat';
    return path;
  }

  let path = `#/${TAB_SLUG[route.tab]}`;
  if (route.overlay === 'them-sach' || route.overlay === 'tim-ai' || route.overlay === 'cai-dat') {
    path += `/${route.overlay}`;
  }
  if (route.overlay === 'sua' && route.overlayBookId) path += `/sua/${route.overlayBookId}`;
  return path;
};

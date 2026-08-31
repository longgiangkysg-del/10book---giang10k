#!/usr/bin/env python3
"""
Quản trị kho sách 10kBook từ dòng lệnh — soát, gỡ cờ, xoá.

Khoá quản trị (service_role) KHÔNG nằm trong kho mã. Cất ở
`~/.config/10kbook/service-role-key.txt` (quyền 600). Lấy khoá tại
Supabase Dashboard → Project Settings → API keys → service_role.

    python3 scripts/quan_tri_kho_sach.py soat          # liệt kê sách hỏng
    python3 scripts/quan_tri_kho_sach.py go-co-hong    # gỡ cờ "đã phân tích" của sách hỏng
    python3 scripts/quan_tri_kho_sach.py xoa <id> ...  # xoá hẳn sách khỏi hệ thống

Khoá service_role đi vòng qua mọi luật chặn quyền của cơ sở dữ liệu, nên
mọi lệnh ghi đều hỏi lại trước khi chạy và in ra đúng số dòng đã đổi.
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

DUONG_DAN_KHOA = Path.home() / '.config' / '10kbook' / 'service-role-key.txt'
API = 'https://luhgjdvorwgridljhoar.supabase.co/rest/v1/books'
APP = 'https://10kbook.giauco.vn/#/book/'

# Ngưỡng lấy từ services/analysis-guard.ts — giữ khớp, lệch là hai bên nói khác nhau.
MIN_PARTS, MIN_IDEAS = 3, 2


def doc_khoa() -> str:
    if not DUONG_DAN_KHOA.exists():
        sys.exit(
            f'Chưa có khoá quản trị ở {DUONG_DAN_KHOA}.\n'
            'Lấy tại Supabase Dashboard → Project Settings → API keys → service_role, rồi cất bằng:\n'
            '  mkdir -p ~/.config/10kbook && chmod 700 ~/.config/10kbook\n'
            '  bash -c \'read -rsp "Dán khoá rồi Enter: " K; printf "%s" "$K" > ~/.config/10kbook/service-role-key.txt\'\n'
            '  chmod 600 ~/.config/10kbook/service-role-key.txt'
        )
    khoa = DUONG_DAN_KHOA.read_text(encoding='utf-8').strip()
    if not khoa:
        sys.exit(f'{DUONG_DAN_KHOA} rỗng.')
    return khoa


def goi(duong_dan: str, method: str = 'GET', body=None, tra_ve_ban_ghi=False):
    khoa = doc_khoa()
    headers = {'apikey': khoa, 'Authorization': f'Bearer {khoa}'}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    if tra_ve_ban_ghi:
        headers['Prefer'] = 'return=representation'
    req = urllib.request.Request(
        duong_dan, method=method, headers=headers,
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            noi_dung = r.read().decode()
            return json.loads(noi_dung) if noi_dung else []
    except urllib.error.HTTPError as e:
        sys.exit(f'Máy chủ từ chối ({e.code}): {e.read().decode()[:300]}')


def tai_tat_ca():
    return goi(f'{API}?select=id,title,author,is_summarized&order=title.asc')


def do_ruot(books):
    """Trả về danh sách cuốn hỏng kèm lý do. Tải cột analysis theo lô cho nhẹ."""
    hong = []
    for i in range(0, len(books), 20):
        lot = books[i:i + 20]
        rows = goi(f"{API}?id=in.({','.join(b['id'] for b in lot)})&select=id,analysis")
        amap = {r['id']: r.get('analysis') for r in rows}
        for b in lot:
            a = amap.get(b['id'])
            if isinstance(a, str):
                try:
                    a = json.loads(a)
                except Exception:
                    a = None
            if not a:
                hong.append({**b, 'phan': 0, 'y_tuong': 0, 'ly_do': 'trắng hoàn toàn'})
                continue
            phan = len(a.get('knowledgeArchitecture') or [])
            y_tuong = len(a.get('ideaSystem') or [])
            ct = a.get('centralThesis')
            # Vài cuốn cũ lưu centralThesis là chuỗi thay vì object.
            tom_y = (ct if isinstance(ct, str) else (ct or {}).get('oneLiner') or '').strip()
            thieu = []
            if phan < MIN_PARTS:
                thieu.append(f'thiếu phần ({phan})')
            if y_tuong < MIN_IDEAS:
                thieu.append(f'thiếu ý tưởng ({y_tuong})')
            if not tom_y:
                thieu.append('thiếu câu tóm ý')
            if thieu:
                hong.append({**b, 'phan': phan, 'y_tuong': y_tuong, 'ly_do': ' · '.join(thieu)})
    return hong


def xac_nhan(cau: str):
    if input(f'{cau} [g/K] ').strip().lower() not in ('g', 'gõ', 'y', 'yes'):
        sys.exit('Bỏ qua.')


def lenh_soat():
    books = tai_tat_ca()
    hong = do_ruot(books)
    print(f'{len(books)} cuốn · {len(hong)} cuốn hỏng\n')
    for i, b in enumerate(hong, 1):
        print(f"{i:2}. {b['title']} — {b['author'] or '—'}")
        print(f"    {b['ly_do']} · {APP}{b['id']}")
    return hong


def lenh_go_co():
    hong = lenh_soat()
    if not hong:
        return
    chua_go = [b for b in hong if b['is_summarized']]
    if not chua_go:
        print('\nCả danh sách đã ở trạng thái chưa phân tích rồi.')
        return
    print()
    xac_nhan(f'Gỡ cờ "đã phân tích" của {len(chua_go)} cuốn? Nội dung cũ giữ nguyên.')
    ids = ','.join(b['id'] for b in chua_go)
    doi = goi(f'{API}?id=in.({ids})&select=id', method='PATCH',
              body={'is_summarized': False}, tra_ve_ban_ghi=True)
    print(f'Đã gỡ cờ {len(doi)}/{len(chua_go)} cuốn.')


def lenh_xoa(ids):
    for book_id in ids:
        sach = goi(f'{API}?id=eq.{book_id}&select=id,title,author')
        if not sach:
            print(f'Không có sách nào mang id {book_id}.')
            continue
        b = sach[0]
        xac_nhan(f"Xoá HẲN \"{b['title']}\" — {b['author'] or '—'}? Không lùi lại được.")
        xoa = goi(f'{API}?id=eq.{book_id}&select=id', method='DELETE', tra_ve_ban_ghi=True)
        print(f"Đã xoá {len(xoa)} dòng." if xoa else 'Không dòng nào bị xoá.')


if __name__ == '__main__':
    lenh = sys.argv[1] if len(sys.argv) > 1 else ''
    if lenh == 'soat':
        lenh_soat()
    elif lenh == 'go-co-hong':
        lenh_go_co()
    elif lenh == 'xoa' and sys.argv[2:]:
        lenh_xoa(sys.argv[2:])
    else:
        print(__doc__)
        sys.exit(1)

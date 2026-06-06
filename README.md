# GreenBox — Trò chơi mô phỏng dòng tiền 12 tháng

Một web game React dạy founder startup về **kế hoạch tài chính**: bạn điều hành một
nông trại rau hữu cơ giao hộp rau theo tuần qua 12 tháng. Bài học cốt lõi —
**lãi trên sổ sách ≠ dòng tiền thực**: một dự án có lãi cả năm vẫn có thể "chết"
vì hết tiền mặt giữa năm.

HUD hiển thị song song hai con số quan trọng nhất: **Tiền mặt trong két** và
**Lãi sổ sách lũy kế**.

## Công nghệ

- [Vite](https://vite.dev/) + [React 18](https://react.dev/) (JavaScript)
- Inline styles + Google Fonts **Lora** (tiêu đề) & **Be Vietnam Pro** (thân) — hỗ trợ tiếng Việt đầy đủ
- Bảng màu MCG "Forest & Moss"
- Responsive: chạy tốt trên desktop và điện thoại

## Chạy ở máy (local)

Yêu cầu Node.js 18+ (khuyến nghị 20/22).

```bash
npm install      # cài dependencies
npm run dev      # chạy dev server (mặc định http://localhost:5173)
```

Build production và xem thử bản build:

```bash
npm run build    # xuất ra thư mục dist/
npm run preview  # phục vụ thử bản build tĩnh
```

## Deploy lên Vercel

Dự án đã có sẵn `vercel.json` (framework `vite`, output `dist`). Có hai cách:

### Cách 1 — Qua giao diện web (khuyến nghị)

1. Đẩy mã nguồn lên một repo GitHub/GitLab/Bitbucket.
2. Vào [vercel.com/new](https://vercel.com/new) → **Import** repo đó.
3. Vercel tự nhận diện Vite. Giữ nguyên mặc định:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Bấm **Deploy**. Mỗi lần push sẽ tự deploy lại (preview cho nhánh, production cho nhánh chính).

### Cách 2 — Qua Vercel CLI

```bash
npm i -g vercel      # cài CLI (một lần)
vercel               # deploy bản preview, làm theo hướng dẫn lần đầu
vercel --prod        # deploy lên production
```

Không cần biến môi trường nào — đây là app tĩnh thuần front-end.

## Cấu trúc

```
.
├── index.html              # nhúng font Lora + Be Vietnam Pro (subset vietnamese)
├── vercel.json             # cấu hình deploy Vercel
├── vite.config.js
└── src/
    ├── main.jsx            # entry, mount React
    ├── index.css           # reset + lưới responsive (.gb-grid2)
    └── App.jsx             # toàn bộ game GreenBox (mô hình tài chính + UI)
```

## Mô hình tài chính (tóm tắt)

Đơn vị: **triệu đồng**. Người chơi ra 3 quyết định lớn (T1 chiến lược bán · T2 lớp
xanh · T4 cách mở rộng vụ cao điểm), rồi dòng tiền chạy qua từng tháng. Nút thắt:
kênh sỉ (siêu thị) trả tiền chậm **2 tháng**, trong khi chi phí trồng trọt dồn vào
vụ cao điểm giữa năm → tiền mặt có thể âm. Khi đó game bật màn "khủng hoảng thanh
khoản" với 4 lựa chọn cứu nguy. Toàn bộ tham số nằm ở đầu `src/App.jsx`.

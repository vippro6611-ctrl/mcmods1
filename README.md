# MCMods MVP

## Yêu cầu
Node.js 18+.

## Chạy
```bash
npm install
npm start
```
Mở http://localhost:3000

## Có sẵn
- Frontend responsive
- Express backend/API
- SQLite database tự tạo tại `data/mcmods.db`
- Upload file tối đa 200 MB
- Download và đếm lượt tải
- Tìm kiếm + lọc danh mục
- Xóa bản ghi qua `DELETE /api/mods/:id`

## Lưu ý
Đây là MVP. Trước khi public Internet nên thêm đăng nhập/admin, kiểm tra MIME/extension, antivirus scanning, rate limit, CSRF/auth, giới hạn quota và object storage (S3/R2) cho file lớn.

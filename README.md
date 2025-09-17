# Thăng Long - FC (Angular skeleton)

This repository is a minimal Angular app skeleton that implements:
- Login (superadmin/admin)
- Thông tin trận đấu (editable by admin/superadmin)
- Lưu trận đấu vào lịch sử (localStorage)
- Xem Lịch Sử
- Danh sách cầu thủ (players.json)
- Quỹ hiện tại (calculated and stored in localStorage)
- Thống kê đơn giản theo tháng

## Users
- NamLuu (superadmin)
- SyNguyen (admin)

Passwords are stored as SHA-256 hashes in the header component.

## How to run

1. Make sure you have Node.js and Angular CLI installed.
2. Extract the project and run:
```bash
npm install
ng serve
```
3. Open http://localhost:4200

## Notes
- This is a minimal skeleton designed for local use and demonstration.
- Data (match history and current fund) are stored in `localStorage`.
- You can push this folder to GitHub as a repository.

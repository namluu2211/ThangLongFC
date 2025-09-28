# Thăng Long - FC (Angular skeleton)

This repository is a minimal Angular app skeleton that implements:
- Login (superadmin/admin)
- Chia đội 
- Lưu trận đấu vào lịch sử (localStorage)
- Xem Lịch Sử (editable by admin/superadmin)
- Danh sách cầu thủ (players.json)
- Quỹ hiện tại (calculated and stored in localStorage)
- Thống kê đơn giản theo tháng/năm

## Users
- NamLuu (superadmin)
- SyNguyen (admin)

Passwords are stored as SHA-256 hashes in the header component.

## 🛠️ **Available Build Commands**

| Command | Description | Uses .env? |
|---------|-------------|------------|
| `npm run build` | Standard Angular build | ❌ Uses fallbacks |
| `npm run build:env` | Build with .env (development) | ✅ Loads from .env |
| `npm run build:env:prod` | Build with .env (production) | ✅ Loads from .env |
| `npm run start` | Serve development server | ✅ Uses environment |

3. Open http://localhost:4200

## How to deploy Prod
- Run:
```bash
npm run deploy
```

## Notes
- This is a minimal skeleton designed for local use and demonstration.
- Data (match history and current fund) are stored in `localStorage`.
- You can push this folder to GitHub as a repository.

# webapp-expense-tracker

Responsive personal finance web app untuk mencatat pengeluaran, pemasukan, transfer antar rekening/e-wallet, dan monitoring total saldo.

## Status MVP Foundation

Sudah ada:
- Core finance logic dengan unit test
- Akun saldo customizable per user
- Kategori income/expense customizable
- Income menambah saldo akun tujuan
- Expense mengurangi saldo akun sumber
- Transfer mengurangi sumber dan menambah tujuan
- Salary-cycle period default tanggal 25
- Dashboard summary API
- Responsive vanilla frontend
- SQLite persistence

## Run Lokal

```bash
python3 -m unittest discover -s tests -v
export ADMIN_USERNAME='your-admin-username'
export ADMIN_PASSWORD='your-admin-password'
PORT=8097 python3 -m app.server
```

Buka:

```text
http://127.0.0.1:8097
```

Login awal:

```text
username: sesuai ADMIN_USERNAME yang dikonfigurasi di environment
password: sesuai ADMIN_PASSWORD saat run
```

Catatan: sebelum dipublish publik, pakai password kuat lewat env `ADMIN_PASSWORD`.

## Environment

```bash
PORT=8097
FINANCE_DB=/path/to/finance.db
```

Default database:

```text
./data/finance.db
```

## Docker

```bash
docker build -t webapp-expense-tracker:latest .
docker run -d \
  --name webapp-expense-tracker \
  -p 8097:8097 \
  -e ADMIN_USERNAME='your-admin-username' \
  -e ADMIN_PASSWORD='your-admin-password' \
  -v "$PWD/data:/app/data" \
  --restart unless-stopped \
  webapp-expense-tracker:latest
```

## Dev Flow

Flow yang dipakai:
1. Feature branch dari `main`
2. Tulis failing test dulu
3. Implement minimal sampai test pass
4. Run full test suite
5. Smoke test server/API
6. Commit + push branch

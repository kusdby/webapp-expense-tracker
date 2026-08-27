# PRD — Personal Expense & Balance Tracker

## 1. Overview
Personal Expense & Balance Tracker adalah web app responsive untuk mencatat pengeluaran pribadi, memonitor total saldo dari beberapa rekening/e-wallet, dan melihat dashboard kesehatan cashflow harian/bulanan.

Web harus nyaman dipakai di HP maupun komputer: input transaksi cepat dari mobile, sedangkan dashboard dan analisis tetap enak dilihat di layar desktop.

Tujuan utama: membantu user tahu uangnya ada di mana, keluar untuk apa saja, dan sisa saldo real-time secara simpel tanpa spreadsheet manual.

---

## 2. Goals
- User bisa mencatat pengeluaran dan pemasukan harian dengan cepat.
- User bisa mencatat beberapa sumber saldo: rekening bank, e-wallet, cash, investasi liquid, atau kategori saldo lain.
- Sistem bisa menghitung total saldo keseluruhan dari semua akun.
- Sistem bisa menampilkan dashboard monitoring pengeluaran per hari, minggu, bulan, kategori, dan akun.
- Web responsive, smooth, dan usable di HP maupun komputer.
- Data tersimpan aman dan mudah di-backup di server pribadi.
- UI sederhana, cepat, dan tidak ribet untuk pemakaian harian.

---

## 3. Non-Goals
- Integrasi otomatis ke API bank/e-wallet pada versi awal.
- Multi-user accounting kompleks.
- Fitur akuntansi bisnis seperti invoice, pajak, jurnal debit/kredit formal.
- AI financial advisor otomatis.
- Trading/investment portfolio tracking detail.
- OCR struk belanja pada MVP, kecuali nanti diputuskan sebagai fitur lanjutan.

---

## 4. Target Users
### 4.1 Primary User
- User pribadi yang ingin mencatat pengeluaran dan memantau saldo lintas rekening/e-wallet.
- Sering input dari HP, tapi ingin review lebih nyaman dari laptop/PC.

### 4.2 Usage Context
- Mobile: input cepat setelah transaksi, cek saldo, cek pengeluaran periode berjalan.
- Desktop: review dashboard, koreksi data, export laporan, analisis kategori.

---

## 5. Target Platform
- Mobile browser sebagai prioritas input harian.
- Desktop browser sebagai prioritas dashboard dan review.
- Self-hosted di server pribadi user.
- Data disimpan di storage server `kusdby storage`.
- Akses idealnya bisa lewat domain pribadi jika nanti sudah deploy.

---

## 6. Product Principles
- Fast capture: tambah transaksi harus bisa selesai dalam beberapa detik.
- Mobile-first, desktop-enhanced.
- Dashboard harus menjawab pertanyaan utama tanpa banyak klik.
- Saldo harus transparan: total saldo terlihat jelas dan bisa ditelusuri per akun.
- Data pribadi harus aman, tidak bocor, dan mudah di-backup.
- Jangan over-engineer di awal; prioritaskan fitur yang dipakai tiap hari.

---

## 7. Core User Flow

### 7.1 First Setup
- User membuka web app.
- User membuat/masuk ke akun admin pribadi.
- User membuat daftar akun saldo awal, misalnya:
  - BRI
  - BCA
  - GoPay
  - OVO
  - ShopeePay
  - Cash
- User mengisi saldo awal setiap akun.
- Sistem menghitung total saldo awal.

### 7.2 Daily Expense Input
- User klik tombol `Tambah Transaksi`.
- User memilih tipe transaksi: pengeluaran, pemasukan, transfer antar akun, koreksi saldo.
- Untuk pengeluaran, user mengisi:
  - tanggal/waktu
  - nominal
  - akun sumber
  - kategori
  - catatan opsional
- Sistem menyimpan transaksi.
- Sistem otomatis mengurangi saldo akun sumber.
- Dashboard langsung update.

### 7.3 Income Input
- User memilih tipe `Pemasukan`.
- User mengisi nominal, akun tujuan, kategori/source pemasukan, dan catatan opsional.
- Sistem menambah saldo akun tujuan.

### 7.4 Transfer Antar Akun
- User memilih tipe `Transfer`.
- User memilih akun asal dan akun tujuan.
- User mengisi nominal dan fee opsional.
- Sistem mengurangi saldo akun asal dan menambah saldo akun tujuan.
- Fee, jika ada, tercatat sebagai pengeluaran.

### 7.5 Dashboard Monitoring
- User membuka dashboard.
- Sistem menampilkan:
  - total saldo semua akun
  - saldo per akun
  - total pengeluaran bulan berjalan
  - total pemasukan bulan berjalan
  - net cashflow bulan berjalan
  - pengeluaran per kategori
  - tren pengeluaran harian/mingguan
  - transaksi terakhir

---

## 8. Functional Requirements

### 8.1 Account / Wallet Management
- Setiap user/login memiliki data akun saldo masing-masing.
- Akun saldo milik satu user tidak bercampur dengan user lain.
- Akun saldo harus customizable oleh user.
- User bisa menambah sendiri rekening/saldo/e-wallet sesuai kebutuhan.
- User bisa membuat akun saldo baru, misalnya:
  - BCA
  - BRI
  - Jenius
  - Mandiri
  - GoPay
  - OVO
  - ShopeePay
  - Cash
- User bisa mengedit nama akun.
- User bisa menentukan tipe akun:
  - bank
  - e-wallet
  - cash
  - investasi liquid
  - other
- User bisa mengatur warna/icon akun untuk tampilan dashboard.
- User bisa mengarsipkan akun yang tidak dipakai tanpa menghapus histori transaksi.
- Setiap akun memiliki saldo berjalan yang dihitung dari saldo awal + transaksi.
- Jika user mencatat pemasukan ke akun tertentu, saldo akun tersebut bertambah.
- Jika user mencatat pengeluaran dari akun tertentu, saldo akun tersebut berkurang.
- Contoh: pemasukan ke Jenius menambah saldo Jenius; pengeluaran dari BRI mengurangi saldo BRI.

### 8.2 Transaction Management
- User bisa membuat transaksi baru.
- Tipe transaksi minimal:
  - pengeluaran
  - pemasukan
  - transfer antar akun
  - adjustment/koreksi saldo
- User bisa mengedit transaksi.
- User bisa menghapus transaksi dengan konfirmasi.
- Setiap perubahan transaksi harus memperbarui saldo terkait.
- Field transaksi minimal:
  - transaction_id
  - type
  - amount
  - account_id/source_account_id
  - destination_account_id untuk transfer
  - category_id
  - note
  - transaction_datetime
  - created_at
  - updated_at

### 8.3 Category Management
- Kategori pengeluaran dan pemasukan harus customizable oleh user.
- User bisa membuat kategori pengeluaran sendiri.
- User bisa membuat kategori pemasukan sendiri.
- User bisa mengedit nama, warna, dan icon kategori.
- Kategori default disediakan sebagai starter, misalnya:
  - Makan & Minum
  - Transport
  - Belanja
  - Tagihan
  - Hiburan
  - Kesehatan
  - Rumah
  - Keluarga/Pasangan
  - Gaji
  - Bonus
  - Freelance
  - Lain-lain
- User bisa edit kategori default.
- User bisa menandai kategori sebagai aktif/nonaktif.
- Kategori transaksi harus bisa dipakai untuk dashboard, search, filter, dan laporan.
- Dashboard bisa filter berdasarkan satu atau beberapa kategori.

### 8.4 Balance Calculation
- Sistem menghitung saldo per akun berdasarkan:
  - initial_balance
  - total pemasukan ke akun
  - total pengeluaran dari akun
  - transfer masuk
  - transfer keluar
  - adjustment
- Sistem menghitung total saldo keseluruhan dari semua akun aktif.
- Saldo tidak boleh hanya bergantung pada nilai frontend.
- Perhitungan saldo harus dilakukan di backend/server-side.

### 8.5 Dashboard
Dashboard harus memiliki komponen:
- Total saldo saat ini.
- Saldo per akun/e-wallet.
- Total pengeluaran periode berjalan.
- Total pemasukan periode berjalan.
- Net cashflow periode berjalan.
- Grafik pengeluaran per hari.
- Grafik pengeluaran per kategori.
- List transaksi terbaru.
- Filter periode:
  - hari ini
  - 7 hari terakhir
  - periode berjalan
  - periode sebelumnya
  - bulan kalender ini
  - bulan kalender lalu
  - custom range

### 8.6 Monthly Spending Period / Salary Cycle
- Sistem harus mendukung periode pencatatan pengeluaran bulanan yang bisa di-adjust user.
- Default reset periode adalah setiap tanggal **25** tiap bulan.
- Contoh: jika salary cycle diset tanggal 25, maka periode berjalan adalah tanggal 25 bulan ini sampai tanggal 24 bulan berikutnya.
- Dashboard utama harus memakai periode berjalan berdasarkan salary cycle, bukan selalu tanggal 1 sampai akhir bulan.
- User bisa mengubah tanggal reset periode, misalnya dari tanggal 25 ke tanggal 1, 15, atau tanggal lain.
- Perubahan tanggal reset tidak menghapus transaksi lama; hanya mengubah cara dashboard dan laporan mengelompokkan data.
- Sistem tetap harus menyediakan filter bulan kalender biasa untuk kebutuhan review standar.

### 8.7 Search & Filter
- User bisa mencari transaksi berdasarkan catatan, kategori, akun, dan nominal.
- User bisa filter transaksi berdasarkan:
  - periode berjalan
  - periode sebelumnya
  - bulan kalender
  - custom date range
  - akun/rekening/e-wallet
  - kategori pengeluaran
  - kategori pemasukan
  - satu kategori atau multi-kategori
  - tipe transaksi
  - range nominal
- User bisa melihat ringkasan pengeluaran/pemasukan per kategori untuk periode tertentu.
- User bisa memilih periode lalu melihat kategori mana yang paling besar pengeluarannya.
- Search dan filter harus tersedia di mobile maupun desktop.
- Desktop boleh memakai tabel + sidebar/filter bar.
- Mobile harus memakai filter sheet/dropdown yang mudah dipakai.

### 8.8 Reporting & Export
- User bisa export transaksi ke CSV.
- User bisa melihat ringkasan bulanan.
- Ringkasan bulanan minimal berisi:
  - total pemasukan
  - total pengeluaran
  - net cashflow
  - top kategori pengeluaran
  - saldo akhir per akun

### 8.9 Authentication
- MVP minimal memiliki satu akun admin pribadi.
- Login harus dilindungi password.
- Session login harus aman.
- App tidak boleh terbuka publik tanpa autentikasi.

---

## 9. Responsive UX Requirements

### 9.1 Mobile Requirements
- Layout mobile-first.
- Tombol tambah transaksi selalu mudah dijangkau.
- Form transaksi harus pendek dan cepat diisi.
- Gunakan input numeric khusus untuk nominal.
- Dropdown kategori/akun harus mudah dipilih dengan jempol.
- Dashboard mobile menampilkan kartu ringkasan, bukan tabel lebar.
- Transaksi terbaru tampil sebagai card list.

### 9.2 Desktop Requirements
- Dashboard memanfaatkan lebar layar dengan grid.
- Tabel transaksi lengkap tersedia di desktop.
- Filter dan chart bisa tampil berdampingan.
- Form tambah/edit bisa berupa modal atau side panel.

### 9.3 Smoothness Requirements
- Navigasi antar halaman terasa cepat.
- Input transaksi tidak reload halaman penuh jika memungkinkan.
- Loading state wajib terlihat saat save/filter/export.
- UI harus tetap usable saat koneksi lambat.
- Hindari animasi berlebihan; fokus ke responsif dan ringan.

---

## 10. Data Model Draft

### 10.1 users
- id
- name
- email/username
- password_hash
- created_at
- updated_at

### 10.2 accounts
- id
- user_id
- name
- type
- initial_balance
- color
- icon
- is_archived
- created_at
- updated_at

### 10.3 categories
- id
- user_id
- name
- type: expense/income
- color
- icon
- is_active
- created_at
- updated_at

### 10.4 transactions
- id
- user_id
- type: expense/income/transfer/adjustment
- amount
- source_account_id
- destination_account_id
- category_id
- note
- transaction_datetime
- created_at
- updated_at
- deleted_at nullable

### 10.5 monthly_snapshots (optional future)
- id
- user_id
- month
- total_income
- total_expense
- net_cashflow
- ending_balance
- created_at

---

## 11. Security Requirements
- Semua halaman utama harus membutuhkan login.
- Password harus disimpan sebagai hash, bukan plaintext.
- Session cookie harus aman.
- Validasi nominal transaksi di backend.
- Nominal tidak boleh negatif kecuali adjustment didefinisikan jelas.
- User input seperti note/kategori harus dicegah dari XSS.
- Export CSV tidak boleh mengekspos data sistem sensitif.
- Backup file/database harus tidak bisa diakses publik langsung.
- Rate limit login untuk mencegah brute force.

---

## 12. Performance Requirements
- Dashboard awal harus load cepat untuk data transaksi personal.
- Target MVP: nyaman untuk minimal 10.000 transaksi.
- Query dashboard harus menggunakan agregasi backend/database, bukan hitung berat di frontend.
- Chart harus lazy-load jika diperlukan.
- Asset frontend harus ringan untuk mobile.

---

## 13. Backup & Data Ownership
- Data harus tersimpan di server pribadi.
- Database/file data harus mudah di-backup.
- Export CSV harus tersedia sebagai fallback ownership data.
- Struktur deployment harus jelas supaya gampang dipindah ke server lain.

---

## 14. Suggested Architecture

### 14.1 MVP Architecture
- Frontend: responsive web app.
- Backend: REST API untuk auth, accounts, categories, transactions, dashboard.
- Database: SQLite untuk MVP personal-use.
- Storage: folder app di RAID1 `kusdby storage`.
- Deployment: Docker Compose agar mudah jalan di ZimaBoard/server pribadi.

### 14.2 Suggested Tech Stack
Opsi yang cocok:
- Next.js full-stack + SQLite/Prisma
- atau React + FastAPI + SQLite
- atau SvelteKit + SQLite

Rekomendasi awal: **Next.js + SQLite/Prisma + Docker Compose**, karena cukup ringkas untuk full-stack personal app dan gampang dibuat responsive.

---

## 15. MVP Scope

### Must Have
- Login admin pribadi.
- CRUD akun saldo/e-wallet.
- CRUD kategori.
- Tambah/edit/hapus transaksi.
- Tipe transaksi: expense, income, transfer, adjustment.
- Perhitungan saldo per akun.
- Total saldo semua akun.
- Dashboard ringkasan bulan berjalan.
- Grafik pengeluaran per kategori.
- List transaksi terbaru.
- Responsive mobile + desktop.
- Export CSV transaksi.

### Should Have
- Filter transaksi advanced.
- Ringkasan bulanan.
- Dark mode.
- Quick-add transaction button di mobile.
- Import CSV manual.

### Could Have
- Budget per kategori.
- Recurring transaction.
- Attachment foto struk.
- OCR struk.
- Notifikasi kalau pengeluaran mendekati limit budget.
- Multi-currency.

---

## 16. Acceptance Criteria
- User bisa login dan app tidak bisa diakses tanpa login.
- Setiap user/login hanya bisa melihat dan mengelola data miliknya sendiri.
- User bisa membuat minimal 3 akun saldo dan melihat total saldo gabungan.
- User bisa membuat akun bank/e-wallet seperti BCA, BRI, Jenius, GoPay, dan Cash.
- User bisa mencatat pengeluaran dari salah satu akun dan saldo akun tersebut berkurang otomatis.
- User bisa mencatat pemasukan ke salah satu akun dan saldo akun tersebut bertambah otomatis.
- Contoh wajib valid: pemasukan ke Jenius menambah saldo Jenius; pengeluaran dari BRI mengurangi saldo BRI.
- User bisa transfer antar akun dan saldo kedua akun berubah benar.
- Dashboard menampilkan total saldo, pengeluaran periode berjalan, pemasukan periode berjalan, dan transaksi terbaru.
- Default periode berjalan reset setiap tanggal 25 tiap bulan.
- User bisa mengubah tanggal reset periode dan dashboard menyesuaikan agregasi tanpa menghapus transaksi.
- Di HP, user bisa tambah transaksi tanpa horizontal scroll dan tanpa UI patah.
- Di desktop, dashboard tampil rapi dengan grid dan tabel transaksi nyaman dibaca.
- Export CSV menghasilkan file transaksi yang bisa dibuka di spreadsheet.
- Perhitungan saldo tetap benar setelah transaksi diedit/dihapus.

---

## 17. Open Questions
- Nama final aplikasi apa? Contoh: `DuitTrack`, `SaldoKu`, `Kusdby Finance`, `MoneyBoard`.
- Perlu multi-user atau cukup satu user admin?
- Perlu target budget bulanan per kategori dari awal?
- Perlu domain khusus, misalnya `finance.kusdby.com`?
- Perlu dark mode dari MVP?
- Data awal mau diinput manual atau import dari spreadsheet lama?
- Apakah perlu attachment/foto struk di versi pertama?

---

## 18. Future Roadmap

### Phase 1 — MVP Personal Tracker
- Auth
- Accounts
- Categories
- Transactions
- Dashboard
- CSV export

### Phase 2 — Better Monitoring
- Budget per kategori
- Monthly report
- Recurring transaction
- Spending trend insight

### Phase 3 — Automation
- CSV import template
- Receipt attachment
- OCR struk
- Reminder input transaksi

### Phase 4 — Advanced Personal Finance
- Goal saving tracker
- Net worth snapshot
- Multi-currency
- Optional AI summary bulanan

---

## 19. Proposed Repository & Folder
- Local folder: `/media/kusdby storage/Apps/webapp-expense-tracker`
- GitHub repo suggestion: `webapp-expense-tracker`
- App type: self-hosted personal finance web app

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, NativeSelect } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import './styles.css';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const emptySummary = { reset_day: 25, accounts: [], categories: [], recent_transactions: [], period_start: '', period_end: '', total_balance: 0, period_income: 0, period_expense: 0, net_cashflow: 0, expense_category_breakdown: [], income_category_breakdown: [] };

function moneyText(amount, hidden) { return hidden ? '****' : rupiah.format(Number(amount || 0)); }
function safeCategoryColor(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#64748b'; }
function parseYmd(value) { const [y, m, d] = String(value).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); }
function toYmd(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function addMonths(value, offset) { const d = parseYmd(value); return new Date(d.getFullYear(), d.getMonth() + offset, d.getDate()); }
function formatDateLong(value) { return value ? parseYmd(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Loading periode...'; }
function formatDateCompact(value) { return value ? parseYmd(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : 'Loading'; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; }
function parseRupiahInput(value) { if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(String(value).trim())) return NaN; const cleaned = String(value).replace(/\./g, '').trim(); if (!cleaned || cleaned === '-') return NaN; const number = Number(cleaned); return Number.isSafeInteger(number) ? number : NaN; }
function accountPalette(id) { return Array.from(String(id)).reduce((hash, char) => (hash * 31 + char.codePointAt(0)) >>> 0, 0) % 5; }

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) { const error = new Error('Request failed'); error.status = res.status; throw error; }
  return res.json();
}

function CategoryChip({ name, color }) { return <span className="category-chip" style={{ '--category-color': safeCategoryColor(color) }}><i aria-hidden="true" /><span>{name || 'Tanpa kategori'}</span></span>; }
function Money({ amount, hidden }) { return <span className="money-amount" data-money={Number(amount || 0)}>{moneyText(amount, hidden)}</span>; }

function useHideAmounts() {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('finance.hideAmounts') === 'true'; } catch { return false; } });
  const toggle = () => setHidden(v => { const next = !v; try { localStorage.setItem('finance.hideAmounts', String(next)); } catch {} return next; });
  return [hidden, toggle];
}

export default function App() {
  const [auth, setAuth] = useState('checking');
  const [summary, setSummary] = useState(emptySummary);
  const [transactions, setTransactions] = useState([]);
  const [hidden, toggleHidden] = useHideAmounts();
  const [status, setStatus] = useState('Memuat sesi…');
  const [loginError, setLoginError] = useState('');
  const [detail, setDetail] = useState(false);
  const [filters, setFilters] = useState({ query: '', account_id: '', category_id: '' });
  const [modal, setModal] = useState(null);
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState([]);
  const [actionStatus, setActionStatus] = useState('');
  const [formError, setFormError] = useState('');
  const amountRef = useRef(null);
  const periodPickerRef = useRef(null);

  useEffect(() => { boot(); }, []);

  async function boot() {
    setStatus('Memuat sesi…');
    try { await api('/api/me'); setAuth('authed'); await loadSummary(); }
    catch (error) { if (error.status === 401) { setAuth('login'); setStatus(''); } else { setAuth('authed'); setStatus('Data dashboard gagal dimuat. Coba lagi.'); } }
  }
  async function loadSummary(periodStart = null) {
    setStatus('Memuat ringkasan dan transaksi…');
    const path = periodStart ? `/api/summary?period_start=${encodeURIComponent(periodStart)}` : '/api/summary';
    const data = await api(path);
    setSummary(data);
    await loadTransactions(data, filters);
    setStatus('');
  }
  async function loadTransactions(sum = summary, activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.query) params.set('query', activeFilters.query);
    if (activeFilters.account_id) params.set('account_id', activeFilters.account_id);
    if (activeFilters.category_id) params.set('category_id', activeFilters.category_id);
    const rows = await api(`/api/transactions?${params.toString()}`);
    const scoped = rows.filter(tx => tx.occurred_at.slice(0, 10) >= sum.period_start && tx.occurred_at.slice(0, 10) <= sum.period_end);
    setTransactions(scoped);
  }
  async function login(event) {
    event.preventDefault(); setLoginError(''); setActionStatus('Login…');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await api('/api/login', { method: 'POST', body: JSON.stringify(data) }); setAuth('authed'); await loadSummary(); }
    catch { setLoginError('Login gagal. Cek username/password.'); }
    finally { setActionStatus(''); }
  }
  async function shiftPeriod(offset) { await loadSummary(toYmd(addMonths(summary.period_start, offset))); }
  async function selectPeriod(value) { if (value) await loadSummary(`${value}-${String(summary.reset_day || 25).padStart(2, '0')}`); }
  function openPeriodPicker() {
    const picker = periodPickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.focus();
  }
  async function currentPeriod() { await loadSummary(null); }
  async function applyFilters(event) { event.preventDefault(); await loadTransactions(summary, filters); }
  async function runGlobalSearch(event) { event.preventDefault(); const rows = globalQuery.trim() ? await api(`/api/transactions?${new URLSearchParams({ query: globalQuery.trim() })}`) : []; setGlobalResults(rows); }
  async function saveTransaction(event) {
    event.preventDefault(); setFormError(''); setActionStatus('Simpan transaksi…');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const amount = parseRupiahInput(data.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) { setFormError('Nominal harus berupa rupiah bulat lebih dari 0.'); setActionStatus(''); amountRef.current?.focus(); return; }
    const payload = { type: data.type, amount: data.amount, source_account_id: data.type !== 'income' ? data.source_account_id : '', destination_account_id: data.type !== 'expense' ? data.destination_account_id : '', category_id: data.category_id, note: data.note || '' };
    await api(data.id ? `/api/transactions/${data.id}` : '/api/transactions', { method: data.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    setModal(null); setActionStatus(''); await loadSummary(summary.period_start);
  }
  async function saveAccount(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); await api('/api/accounts', { method: 'POST', body: JSON.stringify({ name: data.name, type: data.type, initial_balance: data.initial_balance }) }); setModal(null); await loadSummary(summary.period_start); }
  async function saveCategory(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); await api(data.id ? `/api/categories/${data.id}` : '/api/categories', { method: data.id ? 'PUT' : 'POST', body: JSON.stringify({ name: data.name, type: data.type, color: data.color, icon: '' }) }); setModal(null); await loadSummary(summary.period_start); }
  async function saveBalance(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); await api(`/api/accounts/${data.id}/balance`, { method: 'PUT', body: JSON.stringify({ balance: parseRupiahInput(data.balance) }) }); setModal(null); await loadSummary(summary.period_start); }
  async function remove(kind, id) { if (!confirm('Hapus data ini?')) return; await api(`/api/${kind}/${id}`, { method: 'DELETE' }); await loadSummary(summary.period_start); }

  const categoryById = useMemo(() => Object.fromEntries(summary.categories.map(c => [c.id, c])), [summary.categories]);
  const periodText = summary.period_start ? `${formatDateLong(summary.period_start)} - ${formatDateLong(summary.period_end)}` : 'Loading periode...';
  const periodCompactText = summary.period_start ? `${formatDateCompact(summary.period_start)} - ${formatDateCompact(summary.period_end)}` : 'Loading';

  if (auth === 'login') return <main className="login-panel"><form className="login-card" onSubmit={login}><p className="eyebrow">Private finance app</p><h1>Expense Tracker</h1><p className="muted">Masuk untuk mencatat transaksi dan melihat saldo akunmu.</p><Field label="Username"><Input name="username" autoComplete="username" required /></Field><Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field><Button type="submit">Masuk</Button><p className="error" role="alert">{loginError}</p><p role="status">{actionStatus}</p></form></main>;

  return <div className="app-shell" aria-busy={Boolean(status)}>
    <p role="status" aria-live="polite" className="status-line">{status}</p>
    <header className="hero">
      <div>
        <p className="eyebrow">Keuangan pribadi</p>
        <h1>Expense Tracker</h1>
        <div className="period-row">
          <div className="period-nav" aria-label="Navigasi periode">
            <Button variant="outline" type="button" aria-label="Periode sebelumnya" onClick={() => shiftPeriod(-1)}>←</Button>
            <button className="period-range-button" type="button" onClick={openPeriodPicker} aria-label={`Pilih periode, sekarang ${periodText}`}>
              <span className="period-full">{periodText}</span>
              <span className="period-compact">{periodCompactText}</span>
            </button>
            <input
              ref={periodPickerRef}
              className="period-picker-input"
              type="month"
              aria-label="Pilih bulan mulai periode"
              tabIndex={-1}
              value={summary.period_start?.slice(0, 7) || ''}
              onChange={e => selectPeriod(e.target.value)}
            />
            <Button variant="outline" type="button" aria-label="Periode berikutnya" onClick={() => shiftPeriod(1)}>→</Button>
          </div>
          <Button className="current-period-button" variant="outline" onClick={currentPeriod}>Periode ini</Button>
        </div>
      </div>
      <div className="hero-actions"><Button variant="outline" aria-label="Cari transaksi global" onClick={() => { setModal('search'); setGlobalQuery(''); setGlobalResults([]); }}><Search size={18} /></Button><Button variant="outline" onClick={() => setDetail(v => !v)}>{detail ? 'Dashboard' : 'Detail'}</Button><Button onClick={() => { setFormError(''); setModal('transaction'); }}>+ Transaksi</Button></div>
    </header>
    <main>
      {!detail && <><section className="cards" aria-label="Ringkasan keuangan"><Card className="balance-card"><div className="balance-heading"><span>Total Saldo</span><span className="balance-badge">Semua akun</span></div><div className="balance-value-row"><strong><Money amount={summary.total_balance} hidden={hidden} /></strong><Button variant="ghost" className="balance-visibility" type="button" onClick={toggleHidden} aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'} aria-pressed={hidden}>{hidden ? <EyeOff size={22} /> : <Eye size={22} />}</Button></div><span className="card-caption">Saldo gabungan seluruh akunmu</span></Card><Card className="expense-card"><span className="metric-label">Expenses</span><strong><Money amount={summary.period_expense} hidden={hidden} /></strong><span className="card-caption">Pengeluaran periode</span></Card><Card className="income-card"><span className="metric-label">Incomes</span><strong><Money amount={summary.period_income} hidden={hidden} /></strong><span className="card-caption">Pemasukan periode</span></Card></section><div className="cashflow-summary"><span>Net Cashflow <span className="muted">· periode ini</span></span><strong><Money amount={summary.net_cashflow} hidden={hidden} /></strong></div><section className="grid two-col chart-grid"><Pie title="Pengeluaran per kategori" rows={summary.expense_category_breakdown} hidden={hidden} empty="Belum ada data pengeluaran periode ini." /><Pie title="Pemasukan per kategori" rows={summary.income_category_breakdown} hidden={hidden} empty="Belum ada data pemasukan periode ini." /></section></>}
      {detail && <section className="grid detail-grid"><Card><div className="panel-title"><h2>Akun Saldo</h2><Button variant="outline" onClick={() => setModal('account')}>Tambah</Button></div><p className="muted swipe-hint">Geser daftar akun ke samping untuk melihat akun lainnya.</p><div className="account-carousel" tabIndex={0} aria-label="Daftar akun saldo, geser untuk akun lainnya">{summary.accounts.length ? summary.accounts.map(a => <div className="row account-row" data-palette={accountPalette(a.id)} key={a.id}><div><strong>{a.name}</strong><small>{a.type}</small></div><div className="account-actions"><strong><Money amount={a.balance} hidden={hidden} /></strong><div><Button variant="outline" size="sm" onClick={() => setModal({ type: 'balance', account: a })}>Edit saldo</Button><Button variant="danger" size="sm" onClick={() => remove('accounts', a.id)}>Hapus</Button></div></div></div>) : <p className="muted">Belum ada akun.</p>}</div></Card><Card><div className="panel-title"><h2>Kategori</h2><Button variant="outline" onClick={() => setModal('category')}>Tambah</Button></div><div className="category-columns"><CategoryList type="expense" categories={summary.categories} onEdit={c => setModal({ type: 'category', category: c })} onDelete={id => remove('categories', id)} /><CategoryList type="income" categories={summary.categories} onEdit={c => setModal({ type: 'category', category: c })} onDelete={id => remove('categories', id)} /></div></Card></section>}
      <Card className="transaction-panel"><div className="panel-title wrap"><h2>Transaksi periode terpilih</h2><form className="filters" onSubmit={applyFilters}><Input aria-label="Cari transaksi periode terpilih" type="search" placeholder="Cari catatan/kategori/nominal" value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} /><NativeSelect aria-label="Filter akun" value={filters.account_id} onChange={e => setFilters({ ...filters, account_id: e.target.value })}><option value="">Semua akun</option>{summary.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</NativeSelect><NativeSelect aria-label="Filter kategori" value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value })}><option value="">Semua kategori</option>{summary.categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}</NativeSelect><Button variant="outline" type="submit">Filter</Button></form></div><div className="ledger-heading" aria-hidden="true"><span>Transaksi / akun / kategori</span><span>Nominal & tindakan</span></div><TransactionList transactions={transactions} categories={categoryById} hidden={hidden} onEdit={tx => { setFormError(''); setModal({ type: 'transaction', tx }); }} onDelete={id => remove('transactions', id)} empty={filters.query || filters.account_id || filters.category_id ? 'Tidak ada transaksi yang cocok dengan filter pada periode ini. Ubah atau kosongkan filter.' : 'Belum ada transaksi pada periode ini.'} /></Card>
    </main>
    <TransactionModal open={modal === 'transaction' || modal?.type === 'transaction'} tx={modal?.tx} summary={summary} onClose={() => setModal(null)} onSubmit={saveTransaction} error={formError} amountRef={amountRef} />
    <AccountModal open={modal === 'account'} onClose={() => setModal(null)} onSubmit={saveAccount} />
    <CategoryModal open={modal === 'category' || modal?.type === 'category'} category={modal?.category} onClose={() => setModal(null)} onSubmit={saveCategory} />
    <BalanceModal open={modal?.type === 'balance'} account={modal?.account} onClose={() => setModal(null)} onSubmit={saveBalance} />
    <Modal open={modal === 'search'} title="Cari transaksi semua periode" onClose={() => setModal(null)} wide><form className="modal" onSubmit={runGlobalSearch}><div className="panel-title"><h2>Cari transaksi semua periode</h2><Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)}><X size={16} />Tutup</Button></div><Field label="Cari global"><Input type="search" value={globalQuery} onChange={e => setGlobalQuery(e.target.value)} autoComplete="off" /></Field><Button type="submit">Cari</Button><TransactionList transactions={globalResults} categories={categoryById} hidden={hidden} onEdit={tx => { setFormError(''); setModal({ type: 'transaction', tx }); }} onDelete={id => remove('transactions', id)} empty={globalQuery ? 'Tidak ada transaksi yang cocok. Ubah kata pencarian.' : 'Cari transaksi dari semua periode.'} /></form></Modal>
  </div>;
}

function Pie({ title, rows = [], hidden, empty }) { return <Card><div className="panel-title"><h2>{title}</h2></div>{rows.length ? <div className="pie-wrap"><div className="pie" aria-hidden="true" style={{ background: `conic-gradient(${rows.reduce((acc, item) => { const start = acc.total; const end = start + item.percentage; acc.parts.push(`${safeCategoryColor(item.color)} ${start}% ${end}%`); acc.total = end; return acc; }, { total: 0, parts: [] }).parts.join(', ')})` }} /><div className="pie-legend" role="list">{rows.map(item => <div className="legend-row" role="listitem" key={item.name}><span><i style={{ background: safeCategoryColor(item.color) }} />{item.name}</span><strong>{item.percentage}%</strong><small><Money amount={item.amount} hidden={hidden} /></small></div>)}</div></div> : <p className="muted">{empty}</p>}</Card>; }
function CategoryList({ type, categories, onEdit, onDelete }) { const rows = categories.filter(c => c.type === type); return <section className="category-group" aria-labelledby={`${type}CategoryHeading`}><h3 id={`${type}CategoryHeading`}>{type === 'expense' ? 'Expenses' : 'Incomes'}</h3><div className="category-grid" tabIndex={0}>{rows.length ? rows.map(c => <div className="row category-item" key={c.id}><strong><CategoryChip name={c.name} color={c.color} /></strong><div className="account-actions"><Button variant="outline" size="sm" onClick={() => onEdit(c)}>Edit</Button><Button variant="danger" size="sm" onClick={() => onDelete(c.id)}>Hapus</Button></div></div>) : <p className="muted">Belum ada kategori {type === 'expense' ? 'pengeluaran' : 'pemasukan'}.</p>}</div>{rows.length > 3 && <p className="category-hint">Gulir untuk kategori lainnya. Gunakan tombol panah saat daftar terfokus.</p>}</section>; }
function TransactionList({ transactions, categories, hidden, onEdit, onDelete, empty }) { if (!transactions.length) return <div className="transactions"><p className="muted">{empty}</p></div>; return <div className="transactions">{transactions.map(tx => { const category = categories[tx.category_id] || { name: tx.category_name, color: tx.category_color }; const account = tx.type === 'income' ? tx.destination_account_name : tx.source_account_name; return <div className="row transaction-row" key={tx.id}><div><strong className={tx.type}>{tx.type}</strong><small>{formatDate(tx.occurred_at)} · {account || '-'} · <CategoryChip name={category?.name} color={category?.color} /></small><small>{tx.note || ''}</small></div><div className="account-actions"><strong><Money amount={tx.amount} hidden={hidden} /></strong><div><Button type="button" variant="outline" size="sm" onClick={() => onEdit(tx)}>Edit</Button><Button type="button" variant="danger" size="sm" onClick={() => onDelete(tx.id)}>Hapus</Button></div></div></div>; })}</div>; }
function TransactionModal({ open, tx, summary, onClose, onSubmit, error, amountRef }) { const [type, setType] = useState(tx?.type || 'expense'); useEffect(() => { if (open) setType(tx?.type || 'expense'); }, [open, tx]); return <Modal open={open} title={tx ? 'Edit Transaksi' : 'Tambah Transaksi'} onClose={onClose}><form className="modal" onSubmit={onSubmit}><h2>{tx ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2><input type="hidden" name="id" value={tx?.id || ''} readOnly /><Field label="Tipe"><NativeSelect name="type" value={type} onChange={e => setType(e.target.value)} required><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></NativeSelect></Field><Field label="Nominal"><Input name="amount" ref={amountRef} inputMode="numeric" defaultValue={tx?.amount || ''} /></Field>{type !== 'income' && <Field label="Akun sumber"><NativeSelect name="source_account_id" defaultValue={tx?.source_account_id || ''}><option value="">Pilih akun</option>{summary.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</NativeSelect></Field>}{type !== 'expense' && <Field label="Akun tujuan"><NativeSelect name="destination_account_id" defaultValue={tx?.destination_account_id || ''}><option value="">Pilih akun</option>{summary.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</NativeSelect></Field>}<Field label="Kategori"><NativeSelect name="category_id" defaultValue={tx?.category_id || ''}><option value="">Tanpa kategori</option>{summary.categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field><Field label="Catatan"><Input name="note" defaultValue={tx?.note || ''} placeholder="contoh: makan siang" /></Field>{error && <p className="error" role="alert">{error}</p>}<div className="actions"><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button type="submit">Simpan</Button></div></form></Modal>; }
function AccountModal({ open, onClose, onSubmit }) { return <Modal open={open} title="Tambah Akun" onClose={onClose}><form className="modal" onSubmit={onSubmit}><h2>Tambah Akun</h2><Field label="Nama akun"><Input name="name" required /></Field><Field label="Tipe"><NativeSelect name="type"><option value="bank">Bank</option><option value="e-wallet">E-wallet</option><option value="cash">Cash</option><option value="investasi liquid">Investasi liquid</option><option value="other">Other</option></NativeSelect></Field><Field label="Saldo awal"><Input name="initial_balance" inputMode="numeric" defaultValue="0" /></Field><div className="actions"><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button type="submit">Simpan</Button></div></form></Modal>; }
function CategoryModal({ open, category, onClose, onSubmit }) { return <Modal open={open} title={category ? 'Edit Kategori' : 'Tambah Kategori'} onClose={onClose}><form className="modal" onSubmit={onSubmit}><h2>{category ? 'Edit Kategori' : 'Tambah Kategori'}</h2><input type="hidden" name="id" value={category?.id || ''} readOnly /><Field label="Nama kategori"><Input name="name" defaultValue={category?.name || ''} required /></Field><Field label="Tipe"><NativeSelect name="type" defaultValue={category?.type || 'expense'}><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></NativeSelect></Field><Field label="Warna"><Input name="color" type="color" defaultValue={category?.color || '#a78bfa'} /></Field><div className="actions"><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button type="submit">Simpan</Button></div></form></Modal>; }
function BalanceModal({ open, account, onClose, onSubmit }) { return <Modal open={open} title="Edit saldo" onClose={onClose}><form className="modal" onSubmit={onSubmit}><h2>Edit saldo</h2><p>{account?.name}</p><input type="hidden" name="id" value={account?.id || ''} readOnly /><Field label="Saldo baru (Rp)"><Input name="balance" inputMode="numeric" defaultValue={account?.balance || ''} required /></Field><p className="muted">Rupiah bulat. Saldo awal disesuaikan; transaksi lama tidak berubah.</p><div className="actions"><Button type="button" variant="outline" onClick={onClose}>Batal</Button><Button type="submit">Simpan saldo</Button></div></form></Modal>; }

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

const summary = {
  reset_day: 25,
  accounts: [
    { id: 'a1', name: 'DEMO Tabungan', type: 'bank', balance: 1250000 },
    { id: 'a2', name: 'DEMO Dompet', type: 'cash', balance: 50000 },
  ],
  categories: [
    { id: 'c1', name: 'DEMO Makan', type: 'expense', color: '#ff8800' },
    { id: 'c2', name: 'DEMO Gaji', type: 'income', color: '#228844' },
    { id: 'c3', name: 'DEMO Transport', type: 'expense', color: '#334455' },
    { id: 'c4', name: 'DEMO Kesehatan', type: 'expense', color: '#445566' },
    { id: 'c5', name: 'DEMO Rumah', type: 'expense', color: '#556677' },
  ],
  period_start: '2026-08-25',
  period_end: '2026-09-24',
  total_balance: 1300000,
  period_income: 5000000,
  period_expense: 75000,
  net_cashflow: 4925000,
  expense_category_breakdown: [{ name: 'DEMO Makan', color: '#ff8800', percentage: 100, amount: 75000 }],
  income_category_breakdown: [{ name: 'DEMO Gaji', color: '#228844', percentage: 100, amount: 5000000 }]
};
const transactions = [
  { id: 't1', type: 'expense', amount: 75000, occurred_at: '2026-08-25T10:00:00', source_account_id: 'a1', source_account_name: 'DEMO Tabungan', category_id: 'c1', category_name: 'DEMO Makan', note: 'DEMO makan siang' },
  { id: 't2', type: 'income', amount: 5000000, occurred_at: '2026-09-01T10:00:00', destination_account_id: 'a1', destination_account_name: 'DEMO Tabungan', category_id: 'c2', category_name: 'DEMO Gaji', note: 'DEMO gaji' },
  { id: 'old', type: 'expense', amount: 1, occurred_at: '2026-08-24T23:59:59', source_account_id: 'a1', source_account_name: 'DEMO Tabungan', category_id: 'c1', category_name: 'DEMO Makan', note: 'old period' },
];

function json(data, ok = true, status = 200) { return Promise.resolve({ ok, status, json: () => Promise.resolve(data) }); }
function mockFetch() {
  global.fetch = vi.fn((url, options = {}) => {
    const path = String(url);
    if (path === '/api/me') return json({ authenticated: true, user: { name: 'Demo' } });
    if (path.startsWith('/api/summary')) return json(summary);
    if (path.startsWith('/api/transactions') && !options.method) return json(transactions);
    if (path === '/api/login') return json({ ok: true });
    return json({ id: 'created' }, true, options.method === 'POST' ? 201 : 200);
  });
}

beforeEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); mockFetch(); });

describe('React finance frontend', () => {
  it('loads authenticated dashboard, period scoped rows, shadcn-style detail and category colors', async () => {
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent(/Memuat/);
    expect(await screen.findByText('Expense Tracker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pilih periode, sekarang 25 Agustus 2026 - 24 September 2026/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Pilih bulan mulai periode')).toHaveClass('period-picker-input');
    expect(screen.queryByText('Mulai periode')).not.toBeInTheDocument();
    const periodRow = screen.getByLabelText('Navigasi periode').parentElement;
    expect(periodRow).toHaveClass('period-row');
    expect(periodRow.children[0]).toHaveClass('period-nav');
    expect(periodRow.children[1]).toHaveTextContent('Periode ini');
    expect(screen.getByText(/Rp\s*1\.300\.000/)).toBeInTheDocument();
    expect(screen.getByText('DEMO makan siang')).toBeInTheDocument();
    expect(screen.queryByText('old period')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Detail' }));
    expect(screen.getByRole('heading', { name: 'Akun Saldo' })).toBeInTheDocument();
    const chip = screen.getAllByText('DEMO Makan').map(node => node.closest('.category-chip')).find(Boolean);
    expect(chip).toHaveStyle({ '--category-color': '#ff8800' });
    expect(document.body.textContent).not.toMatch(/Visa|Mastercard|Expire|Account number/);
  });

  it('persists hide balances and masks all rendered money without mutating form fields', async () => {
    render(<App />);
    await screen.findByText(/Rp\s*1\.300\.000/);
    const button = screen.getByRole('button', { name: 'Sembunyikan nominal' });
    await userEvent.click(screen.getByRole('button', { name: /Transaksi/ }));
    await userEvent.type(screen.getByLabelText('Nominal'), '125000');
    await userEvent.click(button);
    expect(localStorage.getItem('finance.hideAmounts')).toBe('true');
    expect(screen.getAllByText('****').length).toBeGreaterThan(3);
    expect(screen.getByLabelText('Nominal')).toHaveValue('125000');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps global search across all periods while local list stays period-scoped', async () => {
    render(<App />);
    await screen.findByText('DEMO makan siang');
    await userEvent.click(screen.getByRole('button', { name: 'Cari transaksi global' }));
    await userEvent.type(screen.getByLabelText('Cari global'), 'DEMO');
    await userEvent.click(screen.getByRole('button', { name: 'Cari' }));
    const dialog = screen.getByRole('dialog', { name: 'Cari transaksi semua periode' });
    await waitFor(() => expect(within(dialog).getByText('old period')).toBeInTheDocument());
  });

  it('exercises login failure, CRUD payloads, validation, focus recovery and period controls', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const path = String(url);
      if (path === '/api/me') return json({ error: 'Login required' }, false, 401);
      if (path === '/api/login') return json({ error: 'Invalid' }, false, 401);
      if (path.startsWith('/api/summary')) return json(summary);
      if (path.startsWith('/api/transactions') && !options.method) return json(transactions);
      return json({ id: 'created' }, true, 201);
    });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Masuk' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Username'), 'wrong');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText(/Login gagal/)).toBeInTheDocument();

    mockFetch();
    await userEvent.clear(screen.getByLabelText('Username'));
    await userEvent.type(screen.getByLabelText('Username'), 'fixture');
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), 'fixture-only');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await screen.findByText('DEMO makan siang');
    await userEvent.click(screen.getByRole('button', { name: /Transaksi/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText(/Nominal harus/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nominal')).toHaveFocus();
    await userEvent.type(screen.getByLabelText('Nominal'), '125000');
    await userEvent.selectOptions(screen.getByLabelText('Akun sumber'), 'a1');
    await userEvent.selectOptions(screen.getByLabelText('Kategori'), 'c1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/transactions', expect.objectContaining({ method: 'POST' })));
    await userEvent.click(screen.getByRole('button', { name: 'Periode sebelumnya' }));
    expect(global.fetch).toHaveBeenCalledWith('/api/summary?period_start=2026-07-25', expect.any(Object));
  });
});

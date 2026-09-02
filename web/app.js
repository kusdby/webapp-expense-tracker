let state = { accounts: [], categories: [], recent_transactions: [] };
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadSummary() {
  state = await api('/api/summary');
  totalBalance.textContent = rupiah.format(state.total_balance);
  periodExpense.textContent = rupiah.format(state.period_expense);
  periodIncome.textContent = rupiah.format(state.period_income);
  netCashflow.textContent = rupiah.format(state.net_cashflow);
  periodText.textContent = `Periode berjalan ${formatDate(state.period_start)} – ${formatDate(state.period_end)} · reset tanggal ${state.reset_day}`;
  renderAccounts();
  renderCategories();
  fillSelects();
  renderTransactions(state.recent_transactions);
}

function renderAccounts() {
  accountList.innerHTML = state.accounts.map(account => `
    <div class="row account-row">
      <div>
        <strong>${escapeHtml(account.name)}</strong>
        <small>${escapeHtml(account.type)}</small>
      </div>
      <div class="account-actions">
        <strong>${rupiah.format(account.balance)}</strong>
        <div>
          <button class="ghost small" onclick='editAccountBalance(${JSON.stringify(account.id)}, ${JSON.stringify(account.name)}, ${account.balance})'>Edit saldo</button>
          <button class="ghost small danger" onclick='deleteAccount(${JSON.stringify(account.id)}, ${JSON.stringify(account.name)})'>Hapus</button>
        </div>
      </div>
    </div>
  `).join('') || '<p class="muted">Belum ada akun.</p>';
}

function renderCategories() {
  const entries = Object.entries(state.expense_by_category || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  categoryChart.innerHTML = entries.map(([name, value]) => `
    <div class="row">
      <div style="width:100%">
        <div class="between"><strong>${escapeHtml(name)}</strong> <span>${rupiah.format(value)}</span></div>
        <div class="bar"><div style="width:${Math.max(4, (value / max) * 100)}%"></div></div>
      </div>
    </div>
  `).join('') || '<p class="muted">Belum ada pengeluaran periode ini.</p>';
}

function renderTransactions(transactions) {
  transactionList.innerHTML = transactions.map(tx => {
    const account = tx.type === 'income' ? tx.destination_account_name : tx.source_account_name;
    return `
      <div class="row">
        <div>
          <strong class="${tx.type}">${tx.type}</strong>
          <small>${formatDate(tx.occurred_at)} · ${escapeHtml(account || '-')} · ${escapeHtml(tx.category_name || 'Tanpa kategori')}</small>
          <small>${escapeHtml(tx.note || '')}</small>
        </div>
        <strong>${rupiah.format(tx.amount)}</strong>
      </div>
    `;
  }).join('') || '<p class="muted">Belum ada transaksi.</p>';
}

function fillSelects() {
  const accountOptions = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  const categoryOptions = state.categories.map(c => `<option value="${c.id}" data-type="${c.type}">${escapeHtml(c.name)} (${c.type})</option>`).join('');
  accountFilter.innerHTML = '<option value="">Semua akun</option>' + accountOptions;
  categoryFilter.innerHTML = '<option value="">Semua kategori</option>' + categoryOptions;
  txSource.innerHTML = '<option value="">Pilih akun</option>' + accountOptions;
  txDestination.innerHTML = '<option value="">Pilih akun</option>' + accountOptions;
  txCategory.innerHTML = '<option value="">Tanpa kategori</option>' + categoryOptions;
}

async function loadTransactions() {
  const params = new URLSearchParams();
  if (searchInput.value) params.set('query', searchInput.value);
  if (accountFilter.value) params.set('account_id', accountFilter.value);
  if (categoryFilter.value) params.set('category_id', categoryFilter.value);
  renderTransactions(await api('/api/transactions?' + params.toString()));
}

function openTransactionForm() {
  syncTransactionFields();
  transactionDialog.showModal();
}

function openAccountForm() {
  accountDialog.showModal();
}

function syncTransactionFields() {
  const type = txType.value;
  txSource.closest('label').style.display = type === 'income' ? 'none' : 'grid';
  txDestination.closest('label').style.display = type === 'expense' ? 'none' : 'grid';
}

async function saveTransaction(event) {
  event.preventDefault();
  const type = txType.value;
  await api('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      type,
      amount: txAmount.value,
      source_account_id: type !== 'income' ? txSource.value : '',
      destination_account_id: type !== 'expense' ? txDestination.value : '',
      category_id: txCategory.value,
      note: txNote.value,
    }),
  });
  transactionDialog.close();
  event.target.reset();
  await loadSummary();
}

async function saveAccount(event) {
  event.preventDefault();
  await api('/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name: accountName.value, type: accountType.value, initial_balance: accountInitial.value }),
  });
  accountDialog.close();
  event.target.reset();
  await loadSummary();
}

async function editAccountBalance(accountId, accountName, currentBalance) {
  const input = prompt(`Saldo baru untuk ${accountName}:`, String(currentBalance));
  if (input === null) return;
  const balance = parseRupiahInput(input);
  if (!Number.isFinite(balance)) {
    alert('Saldo harus berupa angka.');
    return;
  }
  await api(`/api/accounts/${accountId}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ balance }),
  });
  await loadSummary();
}

async function deleteAccount(accountId, accountName) {
  if (!confirm(`Hapus akun saldo ${accountName}? Transaksi lama tetap tersimpan, tapi akun ini disembunyikan dari dashboard.`)) return;
  await api(`/api/accounts/${accountId}`, { method: 'DELETE' });
  await loadSummary();
}

function parseRupiahInput(value) {
  const cleaned = String(value).replace(/[^0-9-]/g, '');
  if (!cleaned || cleaned === '-') return NaN;
  return Number(cleaned);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function login(event) {
  event.preventDefault();
  loginError.textContent = '';
  try {
    await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: loginUsername.value, password: loginPassword.value }),
    });
    await boot();
  } catch (err) {
    loginError.textContent = 'Login gagal. Cek username/password.';
  }
}

async function boot() {
  try {
    await api('/api/me');
    loginPanel.classList.add('hidden');
    appShell.classList.remove('hidden');
    await loadSummary();
  } catch {
    appShell.classList.add('hidden');
    loginPanel.classList.remove('hidden');
  }
}

boot();

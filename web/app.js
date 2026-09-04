let state = { accounts: [], categories: [], recent_transactions: [], visible_transactions: [], activeCategoryTab: 'expense' };
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
  const activeCategoryTab = state.activeCategoryTab || 'expense';
  state = await api('/api/summary');
  state.activeCategoryTab = activeCategoryTab;
  totalBalance.textContent = rupiah.format(state.total_balance);
  periodExpense.textContent = rupiah.format(state.period_expense);
  periodIncome.textContent = rupiah.format(state.period_income);
  netCashflow.textContent = rupiah.format(state.net_cashflow);
  periodText.textContent = `Periode berjalan ${formatDate(state.period_start)} – ${formatDate(state.period_end)} · reset tanggal ${state.reset_day}`;
  renderAccounts();
  renderCategories();
  renderCategoryPies();
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
  const type = state.activeCategoryTab || 'expense';
  const categories = state.categories.filter(category => category.type === type);
  categoryTabList.innerHTML = renderCategoryList(
    categories,
    type === 'expense' ? 'Belum ada kategori expenses.' : 'Belum ada kategori incomes.'
  );
  expenseCategoryTab.classList.toggle('active', type === 'expense');
  incomeCategoryTab.classList.toggle('active', type === 'income');
  expenseCategoryTab.setAttribute('aria-selected', String(type === 'expense'));
  incomeCategoryTab.setAttribute('aria-selected', String(type === 'income'));
}

function switchCategoryTab(type) {
  state.activeCategoryTab = type;
  renderCategories();
}

function renderCategoryList(categories, emptyText) {
  return categories.map(category => `
    <div class="row account-row category-item">
      <div style="width:100%">
        <div class="between">
          <strong>${escapeHtml(category.name)}</strong>
        </div>
      </div>
      <div class="account-actions">
        <div>
          <button class="ghost small" onclick='editCategory(${JSON.stringify(category.id)})'>Edit</button>
          <button class="ghost small danger" onclick='deleteCategory(${JSON.stringify(category.id)})'>Hapus</button>
        </div>
      </div>
    </div>
  `).join('') || `<p class="muted">${emptyText}</p>`;
}

function renderCategoryPies() {
  renderPieChart(expensePie, state.expense_category_breakdown || [], 'Belum ada data pengeluaran periode ini.');
  renderPieChart(incomePie, state.income_category_breakdown || [], 'Belum ada data pemasukan periode ini.');
}

function renderPieChart(container, breakdown, emptyText) {
  if (!breakdown.length) {
    container.innerHTML = `<p class="muted">${emptyText}</p>`;
    return;
  }
  let current = 0;
  const segments = breakdown.map(item => {
    const start = current;
    current += item.percentage;
    return `${escapeHtml(item.color || '#64748b')} ${start}% ${current}%`;
  }).join(', ');
  container.innerHTML = `
    <div class="pie-wrap">
      <div class="pie" style="background: conic-gradient(${segments})"></div>
      <div class="pie-legend">
        ${breakdown.map(item => `
          <div class="legend-row">
            <span><i style="background:${escapeHtml(item.color || '#64748b')}"></i>${escapeHtml(item.name)}</span>
            <strong>${item.percentage}%</strong>
            <small>${rupiah.format(item.amount)}</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTransactions(transactions) {
  state.visible_transactions = transactions;
  transactionList.innerHTML = transactions.map(tx => {
    const account = tx.type === 'income' ? tx.destination_account_name : tx.source_account_name;
    return `
      <div class="row transaction-row">
        <div>
          <strong class="${tx.type}">${tx.type}</strong>
          <small>${formatDate(tx.occurred_at)} · ${escapeHtml(account || '-')} · ${escapeHtml(tx.category_name || 'Tanpa kategori')}</small>
          <small>${escapeHtml(tx.note || '')}</small>
        </div>
        <div class="account-actions">
          <strong>${rupiah.format(tx.amount)}</strong>
          <div>
            <button class="ghost small" onclick='editTransaction(${JSON.stringify(tx.id)})'>Edit</button>
            <button class="ghost small danger" onclick='deleteTransaction(${JSON.stringify(tx.id)})'>Hapus</button>
          </div>
        </div>
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
  fillTransactionCategorySelect(txType.value || 'expense');
}

function fillTransactionCategorySelect(type, selectedValue = '') {
  const filteredCategories = state.categories.filter(category => category.type === type);
  txCategory.innerHTML = '<option value="">Tanpa kategori</option>' + filteredCategories.map(category => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
  txCategory.value = selectedValue;
}

async function loadTransactions() {
  const params = new URLSearchParams();
  if (searchInput.value) params.set('query', searchInput.value);
  if (accountFilter.value) params.set('account_id', accountFilter.value);
  if (categoryFilter.value) params.set('category_id', categoryFilter.value);
  renderTransactions(await api('/api/transactions?' + params.toString()));
}

function openTransactionForm() {
  transactionDialogTitle.textContent = 'Tambah Transaksi';
  txId.value = '';
  txOccurredAt.value = '';
  txType.value = 'expense';
  txAmount.value = '';
  txSource.value = '';
  txDestination.value = '';
  txCategory.value = '';
  txNote.value = '';
  syncTransactionFields();
  transactionDialog.showModal();
}

function editTransaction(transactionId) {
  const tx = state.visible_transactions.find(item => item.id === transactionId) || state.recent_transactions.find(item => item.id === transactionId);
  if (!tx) return;
  transactionDialogTitle.textContent = 'Edit Transaksi';
  txId.value = tx.id;
  txOccurredAt.value = tx.occurred_at || '';
  txType.value = tx.type;
  txAmount.value = tx.amount;
  txSource.value = tx.source_account_id || '';
  txDestination.value = tx.destination_account_id || '';
  txCategory.value = tx.category_id || '';
  txNote.value = tx.note || '';
  syncTransactionFields(tx.category_id || '');
  transactionDialog.showModal();
}

function openAccountForm() {
  accountDialog.showModal();
}

function openCategoryForm() {
  categoryDialogTitle.textContent = 'Tambah Kategori';
  categoryId.value = '';
  categoryName.value = '';
  categoryType.value = state.activeCategoryTab || 'expense';
  categoryColor.value = '#a78bfa';
  categoryDialog.showModal();
}

function editCategory(categoryIdValue) {
  const category = state.categories.find(item => item.id === categoryIdValue);
  if (!category) return;
  categoryDialogTitle.textContent = 'Edit Kategori';
  categoryId.value = category.id;
  categoryName.value = category.name;
  categoryType.value = category.type;
  categoryColor.value = category.color || '#a78bfa';
  categoryDialog.showModal();
}

function syncTransactionFields(selectedCategory = txCategory.value) {
  const type = txType.value;
  txSource.closest('label').style.display = type === 'income' ? 'none' : 'grid';
  txDestination.closest('label').style.display = type === 'expense' ? 'none' : 'grid';
  fillTransactionCategorySelect(type, selectedCategory);
}

async function saveTransaction(event) {
  event.preventDefault();
  const type = txType.value;
  const id = txId.value;
  const payload = {
    type,
    amount: txAmount.value,
    source_account_id: type !== 'income' ? txSource.value : '',
    destination_account_id: type !== 'expense' ? txDestination.value : '',
    category_id: txCategory.value,
    note: txNote.value,
  };
  if (id && txOccurredAt.value) payload.occurred_at = txOccurredAt.value;
  await api(id ? `/api/transactions/${id}` : '/api/transactions', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  transactionDialog.close();
  event.target.reset();
  await loadSummary();
}

async function deleteTransaction(transactionId) {
  const tx = state.visible_transactions.find(item => item.id === transactionId) || state.recent_transactions.find(item => item.id === transactionId);
  const label = tx ? `${tx.type} ${rupiah.format(tx.amount)}` : 'transaksi ini';
  if (!confirm(`Hapus ${label}? Saldo akun akan dihitung ulang otomatis.`)) return;
  await api(`/api/transactions/${transactionId}`, { method: 'DELETE' });
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

async function saveCategory(event) {
  event.preventDefault();
  const payload = {
    name: categoryName.value,
    type: categoryType.value,
    color: categoryColor.value,
    icon: '',
  };
  const id = categoryId.value;
  await api(id ? `/api/categories/${id}` : '/api/categories', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  categoryDialog.close();
  event.target.reset();
  state.activeCategoryTab = payload.type;
  await loadSummary();
}

async function deleteCategory(categoryIdValue) {
  const category = state.categories.find(item => item.id === categoryIdValue);
  const name = category ? category.name : 'ini';
  if (!confirm(`Hapus kategori ${name}? Transaksi yang memakai kategori ini akan berubah jadi Tanpa kategori.`)) return;
  await api(`/api/categories/${categoryIdValue}`, { method: 'DELETE' });
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

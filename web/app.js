let state = { accounts: [], categories: [], recent_transactions: [], visible_transactions: [], activeCategoryTab: 'expense', selectedPeriodStart: null };
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = new Error('Request failed');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function loadSummary(periodStart = state.selectedPeriodStart) {
  appShell.setAttribute('aria-busy', 'true');
  dashboardStatus.textContent = 'Memuat ringkasan dan transaksi…';
  try {
    await refreshSummary(periodStart);
    dashboardStatus.textContent = '';
  } catch (error) {
    dashboardStatus.innerHTML = 'Data dashboard gagal dimuat. <button class="ghost" onclick="boot()">Coba lagi</button>';
    throw error;
  } finally {
    appShell.setAttribute('aria-busy', 'false');
  }
}
async function refreshSummary(periodStart) {
  const activeCategoryTab = state.activeCategoryTab || 'expense';
  const params = new URLSearchParams();
  if (periodStart) params.set('period_start', periodStart);
  const query = params.toString();
  state = await api(query ? `/api/summary?${query}` : '/api/summary');
  state.activeCategoryTab = activeCategoryTab;
  state.selectedPeriodStart = state.period_start;
  totalBalance.textContent = rupiah.format(state.total_balance);
  periodExpense.textContent = rupiah.format(state.period_expense);
  periodIncome.textContent = rupiah.format(state.period_income);
  netCashflow.textContent = rupiah.format(state.net_cashflow);
  periodText.textContent = formatPeriodRange(state.period_start, state.period_end);
  renderAccounts();
  renderCategories();
  renderCategoryPies();
  fillSelects();
  periodPicker.value = state.period_start.slice(0, 7);
  await refreshTransactions();
  if (globalSearchDialog.open && globalSearchInput.value.trim()) await refreshGlobalSearch();
}

function showDetailPage() {
  const isDetailOpen = !detailPage.classList.contains('hidden');
  detailPage.classList.toggle('hidden', isDetailOpen);
  dashboardPage.classList.toggle('hidden', !isDetailOpen);
  transactionPanel.classList.toggle('hidden', !isDetailOpen);
  detailToggleButton.textContent = isDetailOpen ? 'Detail' : 'Dashboard';
}

async function shiftPeriod(offset) {
  const currentStart = parseYmd(state.selectedPeriodStart || state.period_start);
  const nextStart = addMonths(currentStart, offset);
  await loadSummary(toYmd(nextStart));
}

function addMonths(dateValue, offset) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth() + offset, dateValue.getDate());
}

function parseYmd(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toYmd(dateValue) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPeriodRange(start, end) {
  return `${formatDateLong(start)} - ${formatDateLong(end)}`;
}

function formatDateLong(value) {
  return parseYmd(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function accountPalette(id) {
  return Array.from(String(id)).reduce((hash, char) => (hash * 31 + char.codePointAt(0)) >>> 0, 0) % 5;
}

function renderAccounts() {
  accountList.innerHTML = state.accounts.map(account => `
    <div class="row account-row" data-palette="${accountPalette(account.id)}">
      <div>
        <strong>${escapeHtml(account.name)}</strong>
        <small>${escapeHtml(account.type)}</small>
      </div>
      <div class="account-actions">
        <strong>${rupiah.format(account.balance)}</strong>
        <div>
          <button type="button" class="ghost small" onclick='editAccountBalance(${JSON.stringify(account.id)}, ${escapeHtml(JSON.stringify(account.name))}, ${account.balance})'>Edit saldo</button>
          <button type="button" class="ghost small danger" onclick='deleteAccount(${JSON.stringify(account.id)}, ${escapeHtml(JSON.stringify(account.name))})'>Hapus</button>
        </div>
      </div>
    </div>
  `).join('') || '<p class="muted">Belum ada akun.</p>';
}

function renderCategories() {
  expenseCategoryList.innerHTML = renderCategoryList(state.categories.filter(c => c.type === 'expense'), 'Belum ada kategori pengeluaran.');
  incomeCategoryList.innerHTML = renderCategoryList(state.categories.filter(c => c.type === 'income'), 'Belum ada kategori pemasukan.');
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
          <button type="button" class="ghost small" onclick='editCategory(${JSON.stringify(category.id)})'>Edit</button>
          <button type="button" class="ghost small danger" onclick='deleteCategory(${JSON.stringify(category.id)})'>Hapus</button>
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
      <div class="pie" aria-hidden="true" style="background: conic-gradient(${segments})"></div>
      <div class="pie-legend" role="list">
        ${breakdown.map(item => `
          <div class="legend-row" role="listitem">
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
  transactionList.innerHTML = transactions.length ? renderTransactionRows(transactions)
    : `<p class="muted">${searchInput.value || accountFilter.value || categoryFilter.value ? 'Tidak ada transaksi yang cocok dengan filter pada periode ini. Ubah atau kosongkan filter.' : 'Belum ada transaksi pada periode ini.'}</p>`;
}

function renderTransactionRows(transactions) {
  return transactions.map(tx => {
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
            <button type="button" class="ghost small" onclick='editTransaction(${JSON.stringify(tx.id)})'>Edit</button>
            <button type="button" class="ghost small danger" onclick='deleteTransaction(${JSON.stringify(tx.id)})'>Hapus</button>
          </div>
        </div>
      </div>
    `;
  }).join('') || '<p class="muted">Belum ada transaksi.</p>';
}

function fillSelects() {
  const accountValue = accountFilter.value, categoryValue = categoryFilter.value;
  const accountOptions = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  const categoryOptions = state.categories.map(c => `<option value="${c.id}" data-type="${c.type}">${escapeHtml(c.name)} (${c.type})</option>`).join('');
  accountFilter.innerHTML = '<option value="">Semua akun</option>' + accountOptions;
  categoryFilter.innerHTML = '<option value="">Semua kategori</option>' + categoryOptions;
  accountFilter.value = state.accounts.some(a => a.id === accountValue) ? accountValue : '';
  categoryFilter.value = state.categories.some(c => c.id === categoryValue) ? categoryValue : '';
  txSource.innerHTML = '<option value="">Pilih akun</option>' + accountOptions;
  txDestination.innerHTML = '<option value="">Pilih akun</option>' + accountOptions;
  fillTransactionCategorySelect(txType.value || 'expense');
}

function fillTransactionCategorySelect(type, selectedValue = '') {
  const filteredCategories = state.categories.filter(category => category.type === type);
  txCategory.innerHTML = '<option value="">Tanpa kategori</option>' + filteredCategories.map(category => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
  txCategory.value = selectedValue;
}

async function loadTransactions() { return refreshTransactions(); }
async function refreshTransactions() {
  const params = new URLSearchParams();
  if (searchInput.value) params.set('query', searchInput.value);
  if (accountFilter.value) params.set('account_id', accountFilter.value);
  if (categoryFilter.value) params.set('category_id', categoryFilter.value);
  state.visible_transactions = [];
  transactionList.innerHTML = '<p role="status">Memuat transaksi…</p>';
  let transactions;
  try {
    transactions = await api('/api/transactions?' + params.toString());
  } catch (error) {
    transactionList.innerHTML = '<p role="alert">Daftar transaksi gagal dimuat. Coba lagi dengan tombol Filter.</p>';
    throw error;
  }
  renderTransactions(transactions.filter(tx => {
    const day = tx.occurred_at.slice(0, 10);
    return day >= state.period_start && day <= state.period_end;
  }));
}

function openGlobalSearch() {
  globalSearchInput.value = '';
  globalSearchResults.innerHTML = '<p class="muted">Cari transaksi dari semua periode.</p>';
  globalSearchDialog.showModal();
  setTimeout(() => globalSearchInput.focus(), 50);
}

async function runGlobalSearch(event) {
  event.preventDefault();
  await refreshGlobalSearch();
}

async function refreshGlobalSearch() {
  const query = globalSearchInput.value.trim();
  if (!query) {
    globalSearchResults.innerHTML = '<p class="muted">Masukkan kata pencarian.</p>';
    return;
  }
  const params = new URLSearchParams({ query });
  const results = await api(`/api/transactions?${params.toString()}`);
  state.global_transactions = results;
  renderGlobalSearchResults(results);
}

function renderGlobalSearchResults(results) {
  globalSearchResults.innerHTML = results.length
    ? renderTransactionRows(results)
    : '<p class="muted">Tidak ada transaksi yang cocok. Ubah kata pencarian.</p>';
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
  const tx = (state.global_transactions || []).find(item => item.id === transactionId) || state.visible_transactions.find(item => item.id === transactionId) || state.recent_transactions.find(item => item.id === transactionId);
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
  txSource.required = type !== 'income';
  txDestination.required = type !== 'expense';
  txSource.closest('label').style.display = type === 'income' ? 'none' : 'grid';
  txDestination.closest('label').style.display = type === 'expense' ? 'none' : 'grid';
  fillTransactionCategorySelect(type, selectedCategory);
}

async function saveTransaction(event) {
  event.preventDefault();
  const type = txType.value;
  if (!Number.isSafeInteger(parseRupiahInput(txAmount.value)) || parseRupiahInput(txAmount.value) <= 0) {
    const error = new Error('Invalid amount');
    error.userMessage = 'Nominal harus berupa rupiah bulat lebih dari 0.';
    error.field = txAmount;
    throw error;
  }
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
  const tx = (state.global_transactions || []).find(item => item.id === transactionId) || state.visible_transactions.find(item => item.id === transactionId) || state.recent_transactions.find(item => item.id === transactionId);
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

function editAccountBalance(accountId, accountName, currentBalance) {
  balanceId.value = accountId;
  balanceAccount.textContent = accountName;
  balanceAmount.value = currentBalance;
  balanceDialog.showModal();
  balanceAmount.focus();
}
async function saveBalance(event) {
  event.preventDefault();
  const balance = parseRupiahInput(balanceAmount.value);
  if (!Number.isSafeInteger(balance)) throw new Error('Invalid balance');
  await api(`/api/accounts/${balanceId.value}/balance`, {method: 'PUT', body: JSON.stringify({balance})});
  balanceDialog.close();
  await loadSummary();
}
async function selectPeriod(value) {
  if (!value) return;
  await loadSummary(`${value}-${String(state.reset_day || 25).padStart(2, '0')}`);
}
async function currentPeriod() { await loadSummary(null); }

async function deleteAccount(accountId, accountName) {
  if (!confirm(`Hapus akun saldo ${accountName}? Transaksi lama tetap tersimpan, tapi akun ini disembunyikan dari dashboard.`)) return;
  await api(`/api/accounts/${accountId}`, { method: 'DELETE' });
  await loadSummary();
}

function parseRupiahInput(value) {
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(String(value).trim())) return NaN;
  const cleaned = String(value).replace(/\./g, '').trim();
  if (!cleaned || cleaned === '-') return NaN;
  return Number.isSafeInteger(Number(cleaned)) ? Number(cleaned) : NaN;
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
  } catch (error) {
    if (error.status === 401) {
      appShell.classList.add('hidden');
      loginPanel.classList.remove('hidden');
    } else {
      loginPanel.classList.add('hidden');
      appShell.classList.remove('hidden');
      dashboardStatus.innerHTML = 'Data dashboard gagal dimuat. <button class="ghost" onclick="boot()">Coba lagi</button>';
    }
  }
}
let actionPending = false;
function safeAction(label, action) {
  return async function (...args) {
    args[0]?.preventDefault?.();
    if (actionPending) return;
    actionPending = true;
    const scope = document.activeElement.closest('dialog[open]') || [...document.querySelectorAll('dialog[open]')].pop() || document.body;
    let status = scope.querySelector(':scope > .action-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'action-status';
      status.setAttribute('role', 'status');
      scope.prepend(status);
    }
    status.textContent = `${label}…`;
    let focused = document.activeElement;
    const controls = [...document.querySelectorAll('button, input, select')];
    const disabled = controls.map(el => el.disabled);
    controls.forEach(el => el.disabled = true);
    document.body.setAttribute('aria-busy', 'true');
    try {
      await action(...args);
      status.textContent = '';
    } catch (error) {
      if (scope.tagName === 'DIALOG' && !scope.open) document.body.prepend(status);
      status.textContent = error.userMessage || `${label} gagal. Coba lagi dengan tombol aksi.${/Simpan|Hapus/.test(label) ? ' Jika koneksi terputus, muat ulang untuk memeriksa data sebelum mengirim ulang.' : ' Periksa koneksi Anda.'}`;
      if (error.field) focused = error.field;
    } finally {
      controls.forEach((el, i) => el.disabled = disabled[i]);
      const openDialog = scope.tagName === 'DIALOG' && scope.open ? scope : [...document.querySelectorAll('dialog[open]')].pop();
      if (focused.isConnected && !focused.disabled && (!focused.closest('dialog') || focused.closest('dialog').open) && (!openDialog || openDialog.contains(focused))) {
        focused.focus();
      } else if (openDialog) {
        (openDialog.querySelector('[autofocus], input:not([type=hidden]), button') || openDialog).focus();
      }
      document.body.setAttribute('aria-busy', 'false');
      actionPending = false;
    }
  };
}
for (const name of ['saveTransaction', 'deleteTransaction', 'saveAccount', 'saveCategory', 'deleteCategory', 'deleteAccount', 'loadTransactions', 'runGlobalSearch', 'shiftPeriod', 'login', 'saveBalance', 'selectPeriod', 'currentPeriod']) {
  const labels = {saveTransaction:'Simpan transaksi',deleteTransaction:'Hapus transaksi',saveAccount:'Simpan akun',saveCategory:'Simpan kategori',deleteCategory:'Hapus kategori',deleteAccount:'Hapus akun',loadTransactions:'Filter transaksi',runGlobalSearch:'Pencarian transaksi',shiftPeriod:'Muat periode',login:'Login',saveBalance:'Simpan saldo',selectPeriod:'Muat periode',currentPeriod:'Muat periode'};
  window[name] = safeAction(labels[name], window[name]);
}
boot();

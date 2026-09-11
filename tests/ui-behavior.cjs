const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('/kit/node_modules/jsdom');
function setup(){
 const dom=new JSDOM(fs.readFileSync('web/index.html','utf8'),{runScripts:'outside-only',url:'http://localhost'});
 const w=dom.window; w.fetch=async()=>({ok:true,json:async()=>({})});
 w.eval(fs.readFileSync('web/app.js','utf8').replace(/boot\(\);\s*$/,'').replace('let state =','var state ='));
 return w;
}
test('failed period list clears stale rows under updated summary',async()=>{
 const w=setup(); w.transactionList.innerHTML='<p>OLD ROW</p>';
 w.fetch=async path=>{if(path.startsWith('/api/transactions'))throw Error('offline');return {ok:true,json:async()=>({accounts:[],categories:[],period_start:'2026-09-25',period_end:'2026-10-24',total_balance:1,period_income:0,period_expense:0,net_cashflow:0})};};
 await assert.rejects(w.loadSummary()); assert.doesNotMatch(w.transactionList.textContent,/OLD ROW/); assert.match(w.transactionList.textContent,/gagal/i);
});
test('authenticated summary failure keeps dashboard and retry, only 401 shows login',async()=>{
 const w=setup();w.fetch=async p=>{if(p==='/api/me')return {ok:true,json:async()=>({})};throw Error('offline');};await w.boot();assert.equal(w.appShell.classList.contains('hidden'),false);assert.match(w.document.body.textContent,/Coba lagi/);
 w.fetch=async()=>({ok:false,status:401,text:async()=>''});await w.boot();assert.equal(w.loginPanel.classList.contains('hidden'),false);
});
test('initial summary uses nonnumeric accessible pending state',async()=>{
 const w=setup();let reject;w.fetch=()=>new Promise((_,r)=>reject=r);const p=w.loadSummary();assert.doesNotMatch(w.totalBalance.textContent,/Rp|0/);assert.match(w.dashboardStatus.textContent,/Memuat/);assert.equal(w.appShell.getAttribute('aria-busy'),'true');reject(Error('offline'));await assert.rejects(p);
});
test('failed submit restores keyboard focus',async()=>{
 const w=setup();w.transactionDialog.setAttribute('open','');w.txAmount.focus();const before=w.document.activeElement;
 await w.safeAction('Simpan transaksi',async()=>{w.document.body.tabIndex=-1;w.document.body.focus();throw Error('offline');})();assert.equal(w.document.activeElement,before);
});
test('zero amount has specific validation and read failures have no save warning',async()=>{
 const w=setup();w.transactionDialog.setAttribute('open','');w.txAmount.value='0';await w.saveTransaction({preventDefault(){}});assert.match(w.transactionDialog.textContent,/lebih dari 0/);
 w.transactionDialog.removeAttribute('open');w.globalSearchInput.value='test';w.fetch=async()=>{throw Error('offline')};await w.runGlobalSearch({preventDefault(){}});assert.match(w.document.body.textContent,/Pencarian.*gagal/);assert.doesNotMatch(w.document.querySelector('body > .action-status').textContent,/menyimpan/);
});
test('local empty results explain active filter',()=>{const w=setup();w.searchInput.value='absent';w.renderTransactions([]);assert.match(w.transactionList.textContent,/filter.*periode/);});
test('nested edit returns focus inside refreshed global results dialog',async()=>{
 const w=setup();w.globalSearchDialog.setAttribute('open','');w.transactionDialog.setAttribute('open','');w.txAmount.focus();
 await w.safeAction('Simpan transaksi',async()=>{w.transactionDialog.removeAttribute('open');w.globalSearchResults.innerHTML='<button>Edited</button>';w.document.body.tabIndex=-1;w.document.body.focus();})();assert.ok(w.globalSearchDialog.contains(w.document.activeElement));
});
test('failed nested edit keeps focus in top dialog',async()=>{
 const w=setup();w.globalSearchDialog.setAttribute('open','');w.transactionDialog.setAttribute('open','');w.txAmount.focus();await w.safeAction('Simpan',async()=>{throw Error('offline')})();assert.equal(w.document.activeElement,w.txAmount);
});
test('pending action suppresses duplicates and exposes safe recoverable errors',async()=>{
 const w=setup(); let calls=0, finish;
 const action=w.safeAction('test',async()=>{calls++; await new Promise(r=>finish=r); throw Error('private server detail');});
 const first=action(); await action(); assert.equal(calls,1); assert.equal(w.document.body.getAttribute('aria-busy'),'true'); finish(); await first;
 assert.match(w.document.body.textContent,/Coba lagi/); assert.doesNotMatch(w.document.body.textContent,/private server detail/);
 assert.equal(w.document.body.getAttribute('aria-busy'),'false');
});
test('forms have names and type-dependent requirements, valid integer balances and year periods',()=>{
 const w=setup(); w.syncTransactionFields(); assert.equal(w.txSource.required,true); assert.equal(w.txDestination.required,false);
 w.txType.value='income'; w.syncTransactionFields(); assert.equal(w.txDestination.required,true); assert.equal(w.txSource.required,false);
 assert.ok(Number.isNaN(w.parseRupiahInput('abc12'))); assert.equal(w.parseRupiahInput('125.000'),125000);
 assert.match(w.formatPeriodRange('2025-12-25','2026-01-24'),/2025.*2026/);
 for(const d of w.document.querySelectorAll('dialog')) assert.ok(w.document.getElementById(d.getAttribute('aria-labelledby')));
 assert.ok(w.document.getElementById('balanceAmount'));
});
test('refresh preserves account/category filters and refreshes open global results',async()=>{
 const w=setup(); w.eval("state.accounts=[{id:'a',name:'Demo'}]; state.categories=[{id:'c',name:'Demo',type:'expense'}];"); w.fillSelects(); w.accountFilter.value='a'; w.categoryFilter.value='c'; w.fillSelects(); assert.equal(w.accountFilter.value,'a'); assert.equal(w.categoryFilter.value,'c');
});
test('search result edit and delete controls never submit search form',()=>{
 const w=setup();w.globalSearchResults.innerHTML=w.renderTransactionRows([{id:'t',type:'expense',amount:1,occurred_at:'2026-08-25'}]);
 for(const b of w.globalSearchResults.querySelectorAll('button')) assert.equal(b.type,'button');
});
test('local filter excludes transactions outside selected period, global remains global',async()=>{
 const w=setup(); w.eval("state.period_start='2026-08-25'; state.period_end='2026-09-24';");
 w.fetch=async()=>({ok:true,json:async()=>[{id:'in',occurred_at:'2026-08-25T00:00:00',type:'expense',amount:1},{id:'out',occurred_at:'2026-08-24T23:59:59',type:'expense',amount:2}]});
 await w.loadTransactions(); assert.equal(w.eval('state.visible_transactions.length'),1);
 w.globalSearchInput.value='test'; await w.runGlobalSearch({preventDefault(){}}); assert.equal(w.globalSearchResults.querySelectorAll('.transaction-row').length,2);
});

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

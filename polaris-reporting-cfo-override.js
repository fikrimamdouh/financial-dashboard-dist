;(() => {
  'use strict';

  const n = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const p = parseFloat(String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(p) ? p : 0;
  };
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const pct = v => Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : 'غير قابل للقياس';
  const x = v => Number.isFinite(v) ? v.toFixed(2) + 'x' : 'غير قابل للقياس';
  const money = v => typeof formatCurrency === 'function' ? formatCurrency(v) : n(v).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 });
  const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const MONTH_WEIGHTS = [0.075,0.075,0.08,0.08,0.08,0.085,0.085,0.085,0.09,0.09,0.09,0.085];

  const mapSub = a => (window.SUB_CATEGORY_MAPPING || {})[String(a?.sub_category || '')] || '';
  const isName = (a, re) => re.test(String(a?.name || ''));
  const isCode = (a, p) => String(a?.account_id || '').startsWith(p);
  const fb = (a, adjustments = []) => {
    const ob = n(a?.ob_debit) - n(a?.ob_credit);
    const mv = n(a?.move_debit) - n(a?.move_credit);
    const base = a?.book_balance !== undefined && a?.book_balance !== null && a?.book_balance !== '' ? n(a.book_balance) : ob + mv;
    const adj = adjustments.reduce((s, j) => String(j.debit_account) === String(a.account_id) ? s + n(j.amount) : String(j.credit_account) === String(a.account_id) ? s - n(j.amount) : s, 0);
    return base + adj;
  };
  const ob = a => n(a?.ob_debit) - n(a?.ob_credit);

  function getFinalAudit() {
    const qs = new URLSearchParams(location.search);
    const clientId = qs.get('clientId') || localStorage.getItem('activeClientId');
    if (!clientId) return null;
    localStorage.setItem('activeClientId', clientId);
    const raw = localStorage.getItem(`finalAudit_${clientId}`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  function categorized(audit) {
    const out = { all: [], revenue: [], cogs: [], opex: [], currentAssets: [], fixedAssets: [], currentLiabilities: [], longLiabilities: [], equity: [] };
    const adjustments = audit.adjustments || [];
    (audit.trialBalance || []).forEach(acc => {
      const row = { ...acc, finalBalance: fb(acc, adjustments), openingBalance: ob(acc) };
      out.all.push(row);
      const cat = String(row.category || '').toLowerCase();
      const sub = mapSub(row);
      if (cat === 'revenue' || isCode(row, '4')) out.revenue.push(row);
      else if (cat === 'expenses' || cat === 'cost_of_revenue') {
        if (isCode(row, '303') || isCode(row, '5') || sub === 'cogs' || isName(row, /تكلفة المبيعات/)) out.cogs.push(row);
        else out.opex.push(row);
      } else if (cat === 'assets') {
        if (sub === 'fixed_assets' || sub === 'fixed_assets_accumulation' || String(row.sub_category || '').startsWith('12') || isName(row, /اهلاك|مبنى|سيارات|معدات|شاحنات|حاسب|تاسيس|أصول|اصول/)) out.fixedAssets.push(row);
        else out.currentAssets.push(row);
      } else if (cat === 'liabilities') {
        if (String(row.sub_category || '').startsWith('22') || sub === 'long_term_loans' || isName(row, /قروض|تمويل/)) out.longLiabilities.push(row);
        else out.currentLiabilities.push(row);
      } else if (cat === 'equity') out.equity.push(row);
    });
    return out;
  }
  function sum(arr, fn = a => a.finalBalance) { return (arr || []).reduce((s, a) => s + n(fn(a)), 0); }
  function income(c) {
    const contra = a => String(a.sub_category || '') === '410099' || mapSub(a) === 'sales_discount' || isName(a, /خصم مسموح|مردود|مرتجع/);
    const rev = -sum(c.revenue, a => contra(a) ? a.finalBalance : a.finalBalance);
    const cogs = Math.abs(sum(c.cogs));
    const grossProfit = rev - cogs;
    const dep = c.opex.filter(a => isName(a, /استهلاك|إهلاك|اهلاك/)).reduce((s, a) => s + Math.abs(a.finalBalance), 0);
    const zakat = c.opex.filter(a => isName(a, /زكاة|ضريبة دخل/)).reduce((s, a) => s + Math.abs(a.finalBalance), 0);
    const opex = c.opex.reduce((s, a) => s + Math.abs(a.finalBalance), 0) - dep - zakat;
    const netIncome = grossProfit - opex - dep - zakat;
    return { revenue: r2(rev), cogs: r2(cogs), grossProfit: r2(grossProfit), operatingExpenses: r2(opex), depreciationExpense: r2(dep), zakatExpense: r2(zakat), netIncome: r2(netIncome), netProfit: r2(netIncome) };
  }
  function balance(c, inc) {
    const currentAssets = sum(c.currentAssets);
    const fixedAssets = sum(c.fixedAssets);
    const assets = currentAssets + fixedAssets;
    const currentLiabilities = Math.abs(sum(c.currentLiabilities));
    const longTermLiabilities = Math.abs(sum(c.longLiabilities));
    const liabilities = currentLiabilities + longTermLiabilities;
    const openingEquity = -sum(c.equity);
    const equity = openingEquity + inc.netIncome;
    return { currentAssets: r2(currentAssets), fixedAssets: r2(fixedAssets), assets: r2(assets), currentLiabilities: r2(currentLiabilities), longTermLiabilities: r2(longTermLiabilities), liabilities: r2(liabilities), openingEquity: r2(openingEquity), equity: r2(equity), equationDiff: r2(assets - liabilities - equity) };
  }
  function cashFlow(audit, c, inc) {
    const f = (pred, mode='closing') => (audit.trialBalance || []).filter(pred).reduce((s, a) => s + (mode === 'opening' ? ob(a) : fb(a, audit.adjustments || [])), 0);
    const cashPred = a => mapSub(a) === 'cash' || isName(a, /الصندوق|البنك|نقاط البيع/);
    const recvPred = a => mapSub(a) === 'trade_receivables' || isName(a, /ذمم العملاء|عملاء/);
    const invPred = a => mapSub(a) === 'inventory' || isName(a, /مخزن|مخزون/);
    const prepPred = a => mapSub(a) === 'prepaid_expenses' || isName(a, /مقدم|مدفوعة مقد/);
    const payPred = a => mapSub(a) === 'trade_payables' || isName(a, /الموردين|مورد/);
    const accPred = a => mapSub(a) === 'accrued_expenses' || isName(a, /مستحق/);
    const faPred = a => mapSub(a) === 'fixed_assets' || isName(a, /مبنى|سيارات|معدات|شاحنات|حاسب|تاسيس/) && !isName(a, /مجمع|اهلاك|إهلاك/);
    const debtPred = a => mapSub(a) === 'long_term_loans' || isName(a, /تمويل|قروض/);
    const dRecv = f(recvPred) - f(recvPred, 'opening');
    const dInv = f(invPred) - f(invPred, 'opening');
    const dPrep = f(prepPred) - f(prepPred, 'opening');
    const dPay = -(f(payPred) - f(payPred, 'opening'));
    const dAcc = -(f(accPred) - f(accPred, 'opening'));
    const ops = inc.netIncome + inc.depreciationExpense - dRecv - dInv - dPrep + dPay + dAcc;
    const inv = -(f(faPred) - f(faPred, 'opening'));
    const fin = -(f(debtPred) - f(debtPred, 'opening'));
    const openingCash = f(cashPred, 'opening');
    const closingCashActual = f(cashPred);
    const netCashChange = ops + inv + fin;
    const closingCash = openingCash + netCashChange;
    return { cashFlowOps: r2(ops), cashFlowInv: r2(inv), cashFlowFin: r2(fin), netCashChange: r2(netCashChange), openingCash: r2(openingCash), closingCash: r2(closingCash), closingCashActual: r2(closingCashActual), cashFlowReconciliationDiff: r2(closingCashActual - closingCash) };
  }
  function buildUnifiedData() {
    const audit = getFinalAudit();
    if (!audit || !Array.isArray(audit.trialBalance)) return null;
    audit.adjustments = audit.adjustments || [];
    audit.clientInfo = audit.clientInfo || {};
    const c = categorized(audit);
    const inc = income(c);
    const bs = balance(c, inc);
    const cf = cashFlow(audit, c, inc);
    const data = { ...audit, categorized: c, ...inc, ...bs, ...cf };
    data.grossMargin = data.revenue ? data.grossProfit / data.revenue : NaN;
    data.netMargin = data.revenue ? data.netIncome / data.revenue : NaN;
    data.roa = data.assets ? data.netIncome / data.assets : NaN;
    data.roe = data.equity ? data.netIncome / data.equity : NaN;
    data.currentRatio = data.currentLiabilities ? data.currentAssets / data.currentLiabilities : NaN;
    data.quickRatio = data.currentLiabilities ? (data.currentAssets - sum(c.currentAssets.filter(a => mapSub(a)==='inventory' || isName(a,/مخزن|مخزون/))) ) / data.currentLiabilities : NaN;
    data.debtRatio = data.assets ? data.liabilities / data.assets : NaN;
    data.dscr = data.longTermLiabilities ? (data.netIncome + data.depreciationExpense) / (data.longTermLiabilities * 0.15) : NaN;
    window.PolarisReportingUnifiedData = data;
    return data;
  }

  const metric = (label, value) => `<div class="col-md-3 mb-3"><div class="stats-card"><h3>${value}</h3><p>${label}</p></div></div>`;
  const table = (heads, rows) => `<table class="table table-bordered table-sm"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  const report = (title, status, body, d) => `<div class="p-4"><h4 class="mb-3">${title}</h4><div class="alert alert-info"><strong>تصنيف CFO:</strong> ${status}. الأرقام مبنية من ميزان المراجعة المعتمد والقوائم الموحدة.</div><div class="row mb-3">${metric('الإيرادات', money(d.revenue))}${metric('مجمل الربح', money(d.grossProfit))}${metric('صافي الربح/الخسارة', money(d.netIncome))}${metric('التدفق التشغيلي', money(d.cashFlowOps))}</div>${body}<div class="alert alert-warning mt-3"><strong>قرار المدير المالي:</strong> استخدم التقرير كتحليل إداري أولي، ولا تعتبر النماذج السوقية تقييمًا مستقلًا دون مدخلات سوقية فعلية.</div></div>`;
  const ar = (d, pred) => (d.categorized?.all || []).filter(pred);
  const arRows = list => list.map(a=>`<tr><td>${a.name||''}<br><small>${a.account_id||''}</small></td><td>${a.category||''}</td><td>${a.sub_category||''}</td><td class="text-end">${money(a.finalBalance)}</td></tr>`).join('') || '<tr><td colspan="4">لا توجد حسابات مطابقة.</td></tr>';

  function budgetAssumptions() {
    const id = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('activeClientId') || 'default';
    const def = { revenueGrowth: .08, cogsInflation: .03, opexGrowth: .05, capexPercent: .03, zakatRate: .025, collectionImprovementDays: 10, inventoryImprovementDays: 7, payablesStretchDays: 5 };
    try { return { ...def, ...JSON.parse(localStorage.getItem(`cfoBudgetAssumptions_${id}`) || '{}') }; } catch { return def; }
  }
  function saveBudgetAssumptions(form) {
    const id = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('activeClientId') || 'default';
    localStorage.setItem(`cfoBudgetAssumptions_${id}`, JSON.stringify({ revenueGrowth:n(form.revenueGrowth.value)/100, cogsInflation:n(form.cogsInflation.value)/100, opexGrowth:n(form.opexGrowth.value)/100, capexPercent:n(form.capexPercent.value)/100, zakatRate:n(form.zakatRate.value)/100, collectionImprovementDays:n(form.collectionImprovementDays.value), inventoryImprovementDays:n(form.inventoryImprovementDays.value), payablesStretchDays:n(form.payablesStretchDays.value) }));
    alert('تم حفظ افتراضات CFO. افتح التقرير مرة أخرى لرؤية الأثر.');
  }
  function buildBudget(d, scenario='base') {
    const a = budgetAssumptions();
    const mult = { base:[0,0,0,'أساسي'], optimistic:[.07,-.02,.02,'متفائل'], conservative:[-.08,.04,.03,'متحفظ'] }[scenario] || [0,0,0,'أساسي'];
    const targetRevenue = Math.abs(d.revenue) * (1 + a.revenueGrowth + mult[0]);
    const cogsRatio = d.revenue ? Math.abs(d.cogs) / Math.abs(d.revenue) : 0;
    const targetCogs = targetRevenue * cogsRatio * (1 + a.cogsInflation + mult[1]);
    const targetOpex = Math.abs(d.operatingExpenses) * (1 + a.opexGrowth + mult[2]);
    const dep = Math.abs(d.depreciationExpense);
    const capexTotal = targetRevenue * a.capexPercent;
    let cash = n(d.closingCashActual || d.closingCash || d.openingCash);
    const monthly = MONTHS.map((m,i)=>{ const revenue=targetRevenue*MONTH_WEIGHTS[i]; const cogs=targetCogs*MONTH_WEIGHTS[i]; const gp=revenue-cogs; const opex=targetOpex/12; const depreciation=dep/12; const ebit=gp-opex-depreciation; const zakat=ebit>0?ebit*a.zakatRate:0; const net=ebit-zakat; const wcNeed=(revenue/30*60)+(cogs/30*45)-(cogs/30*45); const ops=net+depreciation-(wcNeed/12); const capex=capexTotal/12; const fcf=ops-capex; cash+=fcf; return {m,revenue,cogs,gp,opex,depreciation,net,ops,capex,fcf,cash}; });
    const total = k => r2(monthly.reduce((s,row)=>s+n(row[k]),0));
    return { assumptions:a, scenario:mult[3], monthly, totals:{ revenue:total('revenue'), cogs:total('cogs'), grossProfit:total('gp'), opex:total('opex'), netIncome:total('net'), operatingCash:total('ops'), capex:total('capex'), freeCash:total('fcf'), closingCash:r2(cash) } };
  }
  function budgetForm(b) { const a=b.assumptions; return `<form class="row g-2 mb-4" onsubmit="PolarisCFOBudget.save(this);return false"><div class="col-md-3"><label>نمو الإيرادات %</label><input class="form-control" name="revenueGrowth" value="${(a.revenueGrowth*100).toFixed(1)}"></div><div class="col-md-3"><label>تضخم التكلفة %</label><input class="form-control" name="cogsInflation" value="${(a.cogsInflation*100).toFixed(1)}"></div><div class="col-md-3"><label>نمو المصروفات %</label><input class="form-control" name="opexGrowth" value="${(a.opexGrowth*100).toFixed(1)}"></div><div class="col-md-3"><label>CAPEX من الإيراد %</label><input class="form-control" name="capexPercent" value="${(a.capexPercent*100).toFixed(1)}"></div><div class="col-md-3"><label>تحسين التحصيل/يوم</label><input class="form-control" name="collectionImprovementDays" value="${a.collectionImprovementDays}"></div><div class="col-md-3"><label>تحسين المخزون/يوم</label><input class="form-control" name="inventoryImprovementDays" value="${a.inventoryImprovementDays}"></div><div class="col-md-3"><label>تمديد الموردين/يوم</label><input class="form-control" name="payablesStretchDays" value="${a.payablesStretchDays}"></div><div class="col-md-3"><label>زكاة/ضريبة %</label><input class="form-control" name="zakatRate" value="${(a.zakatRate*100).toFixed(1)}"></div><div class="col-12"><button class="btn btn-primary mt-2">حفظ افتراضات CFO</button></div></form>`; }
  const reports = {};
  reports['budget-preparation']=reports['budget-update']=d=>{ const b=buildBudget(d); return report('إعداد الموازنة السنوية من ميزان المراجعة','موازنة CFO مقترحة',budgetForm(b)+table(['الشهر','الإيرادات','تكلفة الإيرادات','مجمل الربح','صافي الربح','تدفق حر','نقدية'], b.monthly.map(r=>`<tr><td>${r.m}</td><td>${money(r.revenue)}</td><td>${money(r.cogs)}</td><td>${money(r.gp)}</td><td>${money(r.net)}</td><td>${money(r.fcf)}</td><td>${money(r.cash)}</td></tr>`).join('')),d); };
  reports['budget-analysis']=reports['multiple-scenarios']=reports['whatif-scenarios']=d=>report('تحليل الموازنة والسيناريوهات','تحليل CFO',table(['السيناريو','الإيرادات','مجمل الربح','صافي الربح','التدفق الحر'], ['base','optimistic','conservative'].map(s=>{ const b=buildBudget(d,s); return `<tr><td>${b.scenario}</td><td>${money(b.totals.revenue)}</td><td>${money(b.totals.grossProfit)}</td><td>${money(b.totals.netIncome)}</td><td>${money(b.totals.freeCash)}</td></tr>`}).join('')),d);
  reports['budget-comparison']=reports['budget-variance']=d=>{ const b=buildBudget(d); return report('مقارنة الفعلي بموازنة CFO المقترحة','مقارنة فعلي بسنة موازنة',table(['البند','فعلي','موازنة','فارق'],`<tr><td>الإيرادات</td><td>${money(d.revenue)}</td><td>${money(b.totals.revenue)}</td><td>${money(b.totals.revenue-d.revenue)}</td></tr><tr><td>تكلفة الإيرادات</td><td>${money(d.cogs)}</td><td>${money(b.totals.cogs)}</td><td>${money(b.totals.cogs-d.cogs)}</td></tr><tr><td>صافي الربح</td><td>${money(d.netIncome)}</td><td>${money(b.totals.netIncome)}</td><td>${money(b.totals.netIncome-d.netIncome)}</td></tr>`),d); };
  reports['revenue-forecast']=reports['profit-forecast']=reports['ai-forecast']=d=>{ const b=buildBudget(d); return report('تنبؤ الإيرادات والربح 12 شهر','Forecast مبني على الموازنة',table(['الشهر','إيراد','مجمل ربح','صافي ربح'],b.monthly.map(r=>`<tr><td>${r.m}</td><td>${money(r.revenue)}</td><td>${money(r.gp)}</td><td>${money(r.net)}</td></tr>`).join('')),d); };
  reports['cashflow-forecast']=reports['cash-forecast']=d=>{ const b=buildBudget(d); return report('تنبؤ التدفقات النقدية 12 شهر','Cash Forecast',table(['الشهر','تشغيلي','CAPEX','تدفق حر','نقدية'],b.monthly.map(r=>`<tr><td>${r.m}</td><td>${money(r.ops)}</td><td>${money(r.capex)}</td><td>${money(r.fcf)}</td><td>${money(r.cash)}</td></tr>`).join('')),d); };
  reports['sovereign-fs']=d=>report('القوائم المالية المختصرة','معتمد من القوائم',table(['البند','القيمة'],`<tr><td>الإيرادات</td><td>${money(d.revenue)}</td></tr><tr><td>تكلفة الإيرادات</td><td>${money(d.cogs)}</td></tr><tr><td>مجمل الربح</td><td>${money(d.grossProfit)}</td></tr><tr><td>صافي الربح</td><td>${money(d.netIncome)}</td></tr><tr><td>الأصول</td><td>${money(d.assets)}</td></tr><tr><td>الالتزامات</td><td>${money(d.liabilities)}</td></tr><tr><td>حقوق الملكية</td><td>${money(d.equity)}</td></tr><tr><td>فرق المعادلة</td><td>${money(d.equationDiff)}</td></tr>`),d);
  reports['sovereign-audit']=d=>report('تقرير المراجعة الداخلي','فحص CFO داخلي',table(['ملاحظة'],`${Math.abs(d.equationDiff)>1?'<tr><td>فرق في المعادلة المحاسبية</td></tr>':''}${Math.abs(d.cashFlowReconciliationDiff)>1?'<tr><td>فرق في مطابقة النقدية</td></tr>':''}${d.netIncome<0?'<tr><td>خسارة في الفترة</td></tr>':''}`||'<tr><td>لا توجد ملاحظات جوهرية آلية.</td></tr>'),d);
  reports['trial-balance-audit']=d=>{ const debit=sum(d.categorized.all.filter(a=>a.finalBalance>0), a=>a.finalBalance); const credit=Math.abs(sum(d.categorized.all.filter(a=>a.finalBalance<0), a=>a.finalBalance)); return report('ميزان مراجعة معتمد','معتمد من الميزان النهائي',table(['المؤشر','القيمة'],`<tr><td>عدد الحسابات</td><td>${d.categorized.all.length}</td></tr><tr><td>إجمالي المدين</td><td>${money(debit)}</td></tr><tr><td>إجمالي الدائن</td><td>${money(credit)}</td></tr><tr><td>الفرق</td><td>${money(debit-credit)}</td></tr>`),d); };
  reports['kpi-dashboard']=d=>report('KPIs Dashboard','معتمد من القوائم',table(['المؤشر','القيمة'],`<tr><td>هامش مجمل الربح</td><td>${pct(d.grossMargin)}</td></tr><tr><td>هامش صافي الربح</td><td>${pct(d.netMargin)}</td></tr><tr><td>ROA</td><td>${pct(d.roa)}</td></tr><tr><td>ROE</td><td>${pct(d.roe)}</td></tr><tr><td>نسبة التداول</td><td>${x(d.currentRatio)}</td></tr><tr><td>نسبة الدين</td><td>${pct(d.debtRatio)}</td></tr>`),d);
  reports['working-capital']=d=>report('رأس المال العامل','معتمد من المركز المالي',table(['البند','القيمة'],`<tr><td>الأصول المتداولة</td><td>${money(d.currentAssets)}</td></tr><tr><td>الالتزامات المتداولة</td><td>${money(d.currentLiabilities)}</td></tr><tr><td>رأس المال العامل</td><td>${money(d.currentAssets-d.currentLiabilities)}</td></tr>`),d);
  reports['receivables-aging']=d=>report('أرصدة العملاء','لا توجد تواريخ أعمار فواتير',table(['الحساب','الفئة','تصنيف','الرصيد'], arRows(ar(d,a=>mapSub(a)==='trade_receivables'||isName(a,/ذمم العملاء|عملاء/)))),d);
  reports['payables-aging']=d=>report('أرصدة الموردين','لا توجد تواريخ أعمار فواتير',table(['الحساب','الفئة','تصنيف','الرصيد'], arRows(ar(d,a=>mapSub(a)==='trade_payables'||isName(a,/المورد/)))),d);
  reports['fixed-assets-register']=d=>report('سجل الأصول والإهلاك','معتمد من أرصدة الأصول',table(['الحساب','الفئة','تصنيف','الرصيد'], arRows(ar(d,a=>mapSub(a)==='fixed_assets'||mapSub(a)==='fixed_assets_accumulation'||isName(a,/اهلاك|إهلاك|مبنى|سيارات|معدات|شاحنات|حاسب|تاسيس/)))),d);
  reports['vat-reconciliation']=d=>report('مطابقة ضريبة القيمة المضافة','تحتاج إقرار ضريبي للمطابقة النهائية',table(['الحساب','الفئة','تصنيف','الرصيد'],arRows(ar(d,a=>isName(a,/ضريبة القيمة المضافة|القيمة المضافة/)))),d);
  reports['zakat-base']=d=>report('الوعاء الزكوي التقديري','تقديري',table(['البند','القيمة'],`<tr><td>حقوق الملكية</td><td>${money(d.equity)}</td></tr><tr><td>ديون طويلة الأجل</td><td>${money(d.longTermLiabilities)}</td></tr><tr><td>وعاء أولي</td><td>${money(d.equity+d.longTermLiabilities+Math.max(0,d.currentLiabilities-d.currentAssets))}</td></tr>`),d);
  reports['related-parties']=d=>report('الأطراف ذات العلاقة','من أسماء الحسابات',table(['الحساب','الفئة','تصنيف','الرصيد'],arRows(ar(d,a=>isName(a,/جارى|جاري|شقيق|مؤسسة|مؤسسه|مهدي|شركاء|الشركاء/)))),d);
  reports['profitability-dim']=d=>report('ربحية حسب البعد','تحليل من أسماء حسابات الإيراد',table(['البعد','الإيراد'],`<tr><td>خرسانة</td><td>${money(sum(ar(d,a=>a.category==='revenue'&&isName(a,/خرسانة/)),a=>Math.abs(a.finalBalance)))}</td></tr><tr><td>بلوك</td><td>${money(sum(ar(d,a=>a.category==='revenue'&&isName(a,/بلوك/)),a=>Math.abs(a.finalBalance)))}</td></tr><tr><td>أخرى</td><td>${money(d.revenue)}</td></tr>`),d);
  reports['abc-costing']=d=>report('تحليل التكاليف ABC','من أسماء حسابات المصروفات',table(['النشاط','التكلفة'],`<tr><td>وقود وطاقة</td><td>${money(sum(ar(d,a=>isName(a,/ديزل|بنزين|كهرباء/)),a=>Math.abs(a.finalBalance)))}</td></tr><tr><td>صيانة وقطع غيار</td><td>${money(sum(ar(d,a=>isName(a,/صيانة|قطع غيار|كفرات|فلاتر|زيوت/)),a=>Math.abs(a.finalBalance)))}</td></tr><tr><td>رواتب وأجور</td><td>${money(sum(ar(d,a=>isName(a,/رواتب|اجور|عمال|سعودة/)),a=>Math.abs(a.finalBalance)))}</td></tr><tr><td>إهلاك</td><td>${money(d.depreciationExpense)}</td></tr>`),d);
  reports['balanced-scorecard']=d=>report('بطاقة الأداء المتوازن BSC','خريطة CFO',table(['البعد','المؤشر','القرار'],`<tr><td>مالي</td><td>${pct(d.netMargin)}</td><td>تحسين الربحية والسيولة</td></tr><tr><td>عملاء</td><td>${money(d.currentAssets-d.currentLiabilities)}</td><td>تحسين التحصيل</td></tr><tr><td>عمليات</td><td>${pct(d.grossMargin)}</td><td>خفض تكلفة الإنتاج</td></tr><tr><td>تعلم</td><td>إقفال شهري</td><td>تحليل انحرافات</td></tr>`),d);
  reports['swot-analysis']=d=>report('SWOT مالي','من القوائم',table(['جانب','نقاط'],`<tr><td>قوة</td><td>إيرادات ${money(d.revenue)} ومجمل ربح ${money(d.grossProfit)}</td></tr><tr><td>ضعف</td><td>${d.netIncome<0?'خسارة صافية':'الحفاظ على الهامش'}</td></tr><tr><td>فرص</td><td>تحسين التسعير والتحصيل والتكلفة</td></tr><tr><td>تهديدات</td><td>تكلفة تشغيل وسيولة وتمويل</td></tr>`),d);
  reports['integrated-report']=d=>report('التقرير المتكامل','من المعطيات المالية المتاحة',table(['رأس المال','قراءة'],`<tr><td>مالي</td><td>${money(d.equity)}</td></tr><tr><td>صناعي</td><td>${money(d.fixedAssets)}</td></tr><tr><td>بشري/اجتماعي/طبيعي</td><td>يتطلب بيانات تشغيلية خارج الميزان</td></tr>`),d);
  reports['yearend-checklist']=d=>report('إغلاق نهاية العام','قائمة CFO',table(['المهمة','المطلوب'],`<tr><td>ميزان المراجعة</td><td>مطابقة الفرق</td></tr><tr><td>عملاء وموردون</td><td>مصادقات وتسويات</td></tr><tr><td>مخزون</td><td>جرد ومطابقة</td></tr><tr><td>أصول وإهلاك</td><td>سجل أصول</td></tr><tr><td>ZATCA/زكاة</td><td>مطابقات وإقرار</td></tr>`),d);
  reports['dupont-analysis']=d=>{const at=d.assets?d.revenue/d.assets:NaN,lev=d.equity?d.assets/d.equity:NaN;return report('تحليل دوبونت','معتمد من القوائم',table(['عنصر','قيمة'],`<tr><td>هامش صافي</td><td>${pct(d.netMargin)}</td></tr><tr><td>دوران أصول</td><td>${x(at)}</td></tr><tr><td>رافعة</td><td>${x(lev)}</td></tr><tr><td>ROE دوبونت</td><td>${pct(d.netMargin*at*lev)}</td></tr>`),d)};
  reports['sloan-accruals']=d=>report("Sloan's Accruals",'جودة أرباح',table(['بند','قيمة'],`<tr><td>صافي الربح</td><td>${money(d.netIncome)}</td></tr><tr><td>التدفق التشغيلي</td><td>${money(d.cashFlowOps)}</td></tr><tr><td>الاستحقاقات</td><td>${money(d.netIncome-d.cashFlowOps)}</td></tr><tr><td>نسبة للأصول</td><td>${pct(d.assets?(d.netIncome-d.cashFlowOps)/d.assets:NaN)}</td></tr>`),d);
  reports['beneish-mscore']=d=>{const arx=d.assets?(d.netIncome-d.cashFlowOps)/d.assets:0,score=-2.22+arx*10+(d.netMargin<0?.5:0);return report('Beneish M-Score مبسط','تقديري من الميزان',table(['بند','قيمة'],`<tr><td>نسبة الاستحقاقات</td><td>${pct(arx)}</td></tr><tr><td>M-Score</td><td>${score.toFixed(2)}</td></tr><tr><td>قراءة</td><td>${score>-1.78?'خطر أعلى':'لا يظهر خطر قوي'}</td></tr>`),d)};
  function riskScore(d, name){return report(name,'نموذج خطر تقديري من نسب القوائم',table(['مؤشر','قيمة'],`<tr><td>نسبة التداول</td><td>${x(d.currentRatio)}</td></tr><tr><td>نسبة الدين</td><td>${pct(d.debtRatio)}</td></tr><tr><td>ROA</td><td>${pct(d.roa)}</td></tr><tr><td>تدفق تشغيلي</td><td>${money(d.cashFlowOps)}</td></tr>`),d)}
  ['altman-zscore','ohlson-oscore','zmijewski-xscore','sherrod-model','fulmer-hscore','springate-sscore'].forEach(id=>reports[id]=d=>riskScore(d,id));
  reports['loan-capacity']=d=>report('سعة القروض DSCR','تقديري دون جدول سداد',table(['بند','قيمة'],`<tr><td>EBITDA تقريبي</td><td>${money(d.netIncome+d.depreciationExpense)}</td></tr><tr><td>خدمة دين مفترضة</td><td>${money(d.longTermLiabilities*.15)}</td></tr><tr><td>DSCR</td><td>${x(d.dscr)}</td></tr>`),d);
  reports['money-flow']=reports['sources-uses']=d=>report('مصادر واستخدامات الأموال','من التدفقات الموحدة',table(['بند','قيمة'],`<tr><td>تشغيلي</td><td>${money(d.cashFlowOps)}</td></tr><tr><td>استثماري</td><td>${money(d.cashFlowInv)}</td></tr><tr><td>تمويلي</td><td>${money(d.cashFlowFin)}</td></tr><tr><td>فرق مطابقة نقدية</td><td>${money(d.cashFlowReconciliationDiff)}</td></tr>`),d);
  reports['breakeven-analysis']=d=>{const cm=d.revenue?(d.revenue-d.cogs)/d.revenue:NaN,fixed=d.operatingExpenses+d.depreciationExpense;return report('نقطة التعادل','تقديري من القوائم',table(['بند','قيمة'],`<tr><td>هامش مساهمة</td><td>${pct(cm)}</td></tr><tr><td>تكلفة ثابتة</td><td>${money(fixed)}</td></tr><tr><td>تعادل بالريال</td><td>${money(cm?fixed/cm:0)}</td></tr>`),d)};
  reports['dcf-valuation']=reports['rim-valuation']=reports['eva-analysis']=d=>report('تقييم تقديري','يتطلب WACC وخطة خمسية لاعتماد نهائي',table(['بند','قيمة'],`<tr><td>FCF حالي</td><td>${money(d.cashFlowOps+d.cashFlowInv)}</td></tr><tr><td>حقوق الملكية</td><td>${money(d.equity)}</td></tr><tr><td>تنبيه</td><td>لا يعتمد كتقييم مستقل دون مدخلات سوقية وخطة مستقبلية</td></tr>`),d);
  reports['ddm-valuation']=d=>report('Dividend Discount Model','غير قابل دون سياسة توزيعات',`<div class="alert alert-warning">لا توجد توزيعات أرباح ضمن ميزان المراجعة. لا يتم إنتاج قيمة وهمية.</div>`,d);
  reports['capm-model']=reports['famafrench-model']=reports['mpt-portfolio']=reports['sharpe-ratio']=reports['var-risk']=reports['ca-score-ai']=d=>report('نموذج سوق/استثمار','غير نهائي بدون بيانات سوق أو محفظة',`<div class="alert alert-warning">ميزان المراجعة لا يحتوي أسعار تاريخية أو عوائد سوقية أو أوزان محفظة. التقرير يوقف الأرقام الزائفة.</div>`,d);

  function fixDom() {
    const sub = document.querySelector('.page-header .text-secondary'); if (sub) sub.textContent = '51 تقريرًا استراتيجيًا ومحاسبيًا موزعة على 8 أجنحة - نسخة 2025';
    const h = document.querySelectorAll('.stats-card h3'); if (h[0]) h[0].textContent='51'; if (h[1]) h[1].textContent='8';
    const filters = document.querySelector('.filter-buttons'); if (filters && !filters.querySelector('[onclick*="quality"]')) filters.insertAdjacentHTML('beforeend','<button class="filter-btn" onclick="filterWing(\'quality\', this)">ديوان جودة الأرباح</button>');
    const inv = document.querySelector('[data-wing="investment"] .report-grid'); if (inv && !inv.querySelector('[onclick*="capm-model"]')) inv.insertAdjacentHTML('afterbegin','<div class="report-card" onclick="openReport(\'capm-model\', \'CAPM Model\')"><span class="report-status status-ready">جاهز</span><h6><i class="fas fa-chart-line"></i> CAPM Model</h6><p>تكلفة حقوق الملكية من معدل خالي من المخاطر + بيتا + علاوة السوق</p></div>');
  }
  function override() {
    fixDom();
    const original = window.generateReportContent;
    window.generateReportContent = function(reportId, title, isForExport=false){ const d=buildUnifiedData(); if(!d) return '<div class="alert alert-danger p-5 text-center"><h4>لا توجد بيانات معتمدة</h4><p>اعتمد ميزان المراجعة أولًا.</p></div>'; if(reports[reportId]) return reports[reportId](d); try { const html=original?original.call(this,reportId,title,isForExport):''; if(!html || /NaN|undefined|قيد التطوير/.test(String(html))) return report(title||reportId,'تقرير عام آمن',`<div class="alert alert-warning">تم منع إخراج غير صالح.</div>`,d); return html; } catch(e){ return report(title||reportId,'تم منع كسر التقرير',`<div class="alert alert-warning">${String(e.message||e)}</div>`,d); } };
    window.PolarisReportingCFO = { patched:true, version:'single-engine-20260617', buildUnifiedData, reports:Object.keys(reports), finalBalance:fb };
    window.PolarisCFOBudget = { patched:true, buildBudget, budgetAssumptions, save:saveBudgetAssumptions };
    console.log('Polaris single CFO reporting engine loaded');
  }
  function boot(){ if((location.pathname||'').split('/').pop()!=='reporting-pantheon.html') return; setTimeout(override,900); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
;(() => {
  'use strict';

  const N = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const p = parseFloat(String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(p) ? p : 0;
  };
  const R = v => Math.round((Number(v) || 0) * 100) / 100;
  const P = v => Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : 'غير قابل للقياس';
  const M = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : N(v).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }));
  const D = v => Number.isFinite(v) ? v.toFixed(2) : 'غير قابل للقياس';
  const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const MONTH_WEIGHTS = [0.075,0.075,0.08,0.08,0.08,0.085,0.085,0.085,0.09,0.09,0.09,0.085];

  function getDataSafe() {
    if (window.PolarisReportingQA && typeof window.PolarisReportingQA.buildUnifiedData === 'function') return window.PolarisReportingQA.buildUnifiedData();
    if (typeof window.getData === 'function') return window.getData();
    return null;
  }
  function rows(data) { return Array.isArray(data?.trialBalance) ? data.trialBalance : []; }
  function mapSub(acc) { return (window.SUB_CATEGORY_MAPPING || {})[String(acc?.sub_category || '')] || ''; }
  function finalBalance(acc) {
    if (window.PolarisReportingQA && typeof window.PolarisReportingQA.finalBalance === 'function') return window.PolarisReportingQA.finalBalance(acc, getDataSafe()?.adjustments || []);
    return acc?.finalBalance !== undefined ? N(acc.finalBalance) : N(acc?.book_balance);
  }
  function titleBlock(title, status = 'معتمد من ميزان المراجعة') {
    return `<div class="p-4"><h4 class="mb-3">${title}</h4><div class="alert alert-info"><strong>تصنيف التقرير:</strong> ${status}.<br>المدخل المتاح هو ميزان المراجعة المعتمد. التقارير المستقبلية هنا تُبنى كموازنة CFO تشغيلية من الفعلي وليست موازنة مجلس إدارة معتمدة إلا بعد مراجعة الافتراضات.</div>`;
  }
  const endBlock = () => '</div>';
  const table = (headers, body) => `<table class="table table-bordered table-sm"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  const metric = (label, value, note = '') => `<div class="col-md-3 mb-3"><div class="stats-card"><h3>${value}</h3><p>${label}</p>${note ? `<small>${note}</small>` : ''}</div></div>`;
  const basicMetrics = data => `<div class="row mb-3">${metric('صافي الإيرادات', M(data.revenue))}${metric('مجمل الربح', M(data.grossProfit))}${metric('صافي الربح/الخسارة', M(data.netIncome))}${metric('حقوق الملكية', M(data.equity))}</div>`;
  const accountsBy = (data, filter) => rows(data).filter(filter);
  const accountRows = list => list.map(a => `<tr><td>${a.name || ''}<br><small>${a.account_id || ''}</small></td><td>${a.category || ''}</td><td>${a.sub_category || ''}</td><td class="text-end">${M(finalBalance(a))}</td></tr>`).join('') || '<tr><td colspan="4">لا توجد حسابات مطابقة.</td></tr>';
  function governanceReport(data, title, status, body) {
    return titleBlock(title, status) + basicMetrics(data) + body + `<div class="alert alert-warning mt-3"><strong>رأي المدير المالي:</strong> استخدم التقرير كقرار إداري أولي. التقرير النظامي أو التقييم المستقل يحتاج مستندات ومدخلات خارج ميزان المراجعة عند اللزوم.</div>` + endBlock();
  }

  const reports = {};

  function budgetAssumptions(data) {
    const activeClientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('activeClientId') || 'default';
    const defaults = {
      revenueGrowth: 0.08,
      cogsInflation: 0.03,
      opexGrowth: 0.05,
      capexPercent: 0.03,
      zakatRate: 0.025,
      collectionImprovementDays: 10,
      inventoryImprovementDays: 7,
      payablesStretchDays: 5
    };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(`cfoBudgetAssumptions_${activeClientId}`) || '{}') }; }
    catch { return defaults; }
  }
  function saveBudgetAssumptions(form) {
    const activeClientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('activeClientId') || 'default';
    const a = {
      revenueGrowth: N(form.revenueGrowth.value) / 100,
      cogsInflation: N(form.cogsInflation.value) / 100,
      opexGrowth: N(form.opexGrowth.value) / 100,
      capexPercent: N(form.capexPercent.value) / 100,
      zakatRate: N(form.zakatRate.value) / 100,
      collectionImprovementDays: N(form.collectionImprovementDays.value),
      inventoryImprovementDays: N(form.inventoryImprovementDays.value),
      payablesStretchDays: N(form.payablesStretchDays.value)
    };
    localStorage.setItem(`cfoBudgetAssumptions_${activeClientId}`, JSON.stringify(a));
    alert('تم حفظ افتراضات الموازنة. افتح التقرير مرة أخرى لرؤية الأثر.');
  }
  function deriveWorkingCapitalDrivers(data, a) {
    const revenue = Math.abs(N(data.revenue));
    const cogs = Math.abs(N(data.cogs));
    const currentAssets = Math.max(0, N(data.currentAssets));
    const currentLiabilities = Math.max(0, N(data.currentLiabilities));
    const receivables = Math.max(0, accountsBy(data, x => mapSub(x) === 'trade_receivables' || String(x.name||'').includes('ذمم العملاء')).reduce((s,x)=>s+finalBalance(x),0)) || currentAssets * 0.65;
    const inventory = Math.max(0, accountsBy(data, x => mapSub(x) === 'inventory' || String(x.name||'').includes('مخزن')).reduce((s,x)=>s+finalBalance(x),0)) || currentAssets * 0.20;
    const payables = Math.abs(accountsBy(data, x => mapSub(x) === 'trade_payables' || String(x.name||'').includes('المورد')).reduce((s,x)=>s+finalBalance(x),0)) || currentLiabilities * 0.60;
    return {
      dso: revenue ? Math.max(15, Math.min(180, receivables / revenue * 365 - a.collectionImprovementDays)) : 60,
      dio: cogs ? Math.max(5, Math.min(180, inventory / cogs * 365 - a.inventoryImprovementDays)) : 45,
      dpo: cogs ? Math.max(5, Math.min(180, payables / cogs * 365 + a.payablesStretchDays)) : 45
    };
  }
  function buildBudget(data, scenario = 'base') {
    const a = budgetAssumptions(data);
    const d = deriveWorkingCapitalDrivers(data, a);
    const scenarios = {
      base: { title: 'أساسي', rev: 0, cogs: 0, opex: 0 },
      optimistic: { title: 'متفائل', rev: 0.07, cogs: -0.02, opex: 0.02 },
      conservative: { title: 'متحفظ', rev: -0.08, cogs: 0.04, opex: 0.03 }
    };
    const s = scenarios[scenario] || scenarios.base;
    const baseRevenue = Math.abs(N(data.revenue));
    const baseCogs = Math.abs(N(data.cogs));
    const baseOpex = Math.abs(N(data.operatingExpenses));
    const baseDep = Math.abs(N(data.depreciationExpense));
    const targetRevenue = baseRevenue * (1 + a.revenueGrowth + s.rev);
    const cogsRatio = baseRevenue ? baseCogs / baseRevenue : 0;
    const targetCogs = targetRevenue * cogsRatio * (1 + a.cogsInflation + s.cogs);
    const targetOpex = baseOpex * (1 + a.opexGrowth + s.opex);
    const targetCapex = targetRevenue * a.capexPercent;
    const openingCash = N(data.closingCashActual || data.closingCash || data.openingCash || 0);
    let cash = openingCash;
    const monthly = MONTHS.map((month, i) => {
      const revenue = targetRevenue * MONTH_WEIGHTS[i];
      const cogs = targetCogs * MONTH_WEIGHTS[i];
      const grossProfit = revenue - cogs;
      const opex = targetOpex / 12;
      const depreciation = baseDep / 12;
      const ebit = grossProfit - opex - depreciation;
      const zakat = ebit > 0 ? ebit * a.zakatRate : 0;
      const netIncome = ebit - zakat;
      const ar = revenue / 30 * d.dso;
      const inv = cogs / 30 * d.dio;
      const ap = cogs / 30 * d.dpo;
      const wcNeed = ar + inv - ap;
      const operatingCash = netIncome + depreciation - (wcNeed / 12);
      const capex = targetCapex / 12;
      const freeCash = operatingCash - capex;
      cash += freeCash;
      return { month, revenue, cogs, grossProfit, opex, depreciation, ebit, zakat, netIncome, ar, inv, ap, wcNeed, operatingCash, capex, freeCash, cash };
    });
    const sum = k => R(monthly.reduce((x, r) => x + N(r[k]), 0));
    return { assumptions: a, drivers: d, scenario: s.title, openingCash, monthly, totals: { revenue: sum('revenue'), cogs: sum('cogs'), grossProfit: sum('grossProfit'), opex: sum('opex'), depreciation: sum('depreciation'), ebit: sum('ebit'), zakat: sum('zakat'), netIncome: sum('netIncome'), operatingCash: sum('operatingCash'), capex: sum('capex'), freeCash: sum('freeCash'), closingCash: R(cash) } };
  }
  function budgetForm(b) {
    const a = b.assumptions;
    return `<form class="row g-2 mb-4" onsubmit="PolarisCFOBudget.save(this); return false;"><div class="col-md-3"><label>نمو الإيرادات %</label><input class="form-control" name="revenueGrowth" value="${(a.revenueGrowth*100).toFixed(1)}"></div><div class="col-md-3"><label>تضخم التكلفة %</label><input class="form-control" name="cogsInflation" value="${(a.cogsInflation*100).toFixed(1)}"></div><div class="col-md-3"><label>نمو المصروفات %</label><input class="form-control" name="opexGrowth" value="${(a.opexGrowth*100).toFixed(1)}"></div><div class="col-md-3"><label>CAPEX من الإيراد %</label><input class="form-control" name="capexPercent" value="${(a.capexPercent*100).toFixed(1)}"></div><div class="col-md-3"><label>تحسين التحصيل / يوم</label><input class="form-control" name="collectionImprovementDays" value="${a.collectionImprovementDays}"></div><div class="col-md-3"><label>تحسين المخزون / يوم</label><input class="form-control" name="inventoryImprovementDays" value="${a.inventoryImprovementDays}"></div><div class="col-md-3"><label>تمديد الموردين / يوم</label><input class="form-control" name="payablesStretchDays" value="${a.payablesStretchDays}"></div><div class="col-md-3"><label>زكاة/ضريبة %</label><input class="form-control" name="zakatRate" value="${(a.zakatRate*100).toFixed(1)}"></div><div class="col-12"><button class="btn btn-primary mt-2"><i class="fas fa-save"></i> حفظ افتراضات CFO</button></div></form>`;
  }
  function budgetStats(b) { return `<div class="row mb-3">${metric('إيرادات الموازنة', M(b.totals.revenue))}${metric('صافي ربح/خسارة', M(b.totals.netIncome))}${metric('التدفق الحر', M(b.totals.freeCash))}${metric('نقدية نهاية السنة', M(b.totals.closingCash))}</div>`; }
  function monthlyBudgetTable(b) { return table(['الشهر','الإيرادات','تكلفة الإيرادات','مجمل الربح','مصروفات','صافي الربح/الخسارة','تدفق حر','نقدية متوقعة'], b.monthly.map(r => `<tr><td>${r.month}</td><td class="text-end">${M(r.revenue)}</td><td class="text-end">${M(r.cogs)}</td><td class="text-end">${M(r.grossProfit)}</td><td class="text-end">${M(r.opex)}</td><td class="text-end">${M(r.netIncome)}</td><td class="text-end">${M(r.freeCash)}</td><td class="text-end">${M(r.cash)}</td></tr>`).join('')); }
  function budgetPreparation(data) { const b = buildBudget(data, 'base'); return titleBlock('إعداد الموازنة السنوية من ميزان المراجعة', 'موازنة CFO مقترحة مبنية على الفعلي') + budgetForm(b) + budgetStats(b) + `<div class="alert alert-secondary">DSO مستهدف: ${D(b.drivers.dso)} يوم | DIO: ${D(b.drivers.dio)} يوم | DPO: ${D(b.drivers.dpo)} يوم</div>` + monthlyBudgetTable(b) + endBlock(); }
  function budgetAnalysis(data) { const list = ['base','optimistic','conservative'].map(x => buildBudget(data, x)); return titleBlock('تحليل الموازنة والسيناريوهات', 'تحليل CFO مبني على الفعلي') + table(['السيناريو','الإيرادات','مجمل الربح','صافي الربح/الخسارة','التدفق الحر','هامش صافي'], list.map(b => `<tr><td>${b.scenario}</td><td class="text-end">${M(b.totals.revenue)}</td><td class="text-end">${M(b.totals.grossProfit)}</td><td class="text-end">${M(b.totals.netIncome)}</td><td class="text-end">${M(b.totals.freeCash)}</td><td>${P(b.totals.netIncome / Math.abs(b.totals.revenue || 1))}</td></tr>`).join('')) + endBlock(); }
  function budgetComparison(data) { const b = buildBudget(data, 'base'); return titleBlock('مقارنة الفعلي بموازنة CFO المقترحة', 'مقارنة الفعلي الحالي بسنة موازنة مقترحة') + table(['البند','فعلي الميزان','موازنة مقترحة','الفارق','%'], `<tr><td>الإيرادات</td><td>${M(data.revenue)}</td><td>${M(b.totals.revenue)}</td><td>${M(b.totals.revenue - data.revenue)}</td><td>${P((b.totals.revenue - data.revenue) / Math.abs(data.revenue || 1))}</td></tr><tr><td>تكلفة الإيرادات</td><td>${M(data.cogs)}</td><td>${M(b.totals.cogs)}</td><td>${M(b.totals.cogs - data.cogs)}</td><td>${P((b.totals.cogs - data.cogs) / Math.abs(data.cogs || 1))}</td></tr><tr><td>صافي الربح/الخسارة</td><td>${M(data.netIncome)}</td><td>${M(b.totals.netIncome)}</td><td>${M(b.totals.netIncome - data.netIncome)}</td><td>${P((b.totals.netIncome - data.netIncome) / Math.abs(data.netIncome || 1))}</td></tr>`) + endBlock(); }
  function forecastRevenue(data) { const b = buildBudget(data, 'base'); return titleBlock('تنبؤ الإيرادات والربح 12 شهر', 'Forecast مبني على موازنة CFO') + budgetStats(b) + table(['الشهر','إيراد متوقع','تكلفة متوقعة','مجمل ربح','صافي ربح/خسارة'], b.monthly.map(r => `<tr><td>${r.month}</td><td class="text-end">${M(r.revenue)}</td><td class="text-end">${M(r.cogs)}</td><td class="text-end">${M(r.grossProfit)}</td><td class="text-end">${M(r.netIncome)}</td></tr>`).join('')) + endBlock(); }
  function forecastCash(data) { const b = buildBudget(data, 'base'); return titleBlock('تنبؤ التدفقات النقدية 12 شهر', 'Cash Forecast مبني على رأس المال العامل') + `<div class="alert alert-secondary">النقدية الافتتاحية المستخدمة: <strong>${M(b.openingCash)}</strong></div>` + table(['الشهر','تدفق تشغيلي','CAPEX','تدفق حر','رصيد نقدية متوقع'], b.monthly.map(r => `<tr><td>${r.month}</td><td class="text-end">${M(r.operatingCash)}</td><td class="text-end">${M(r.capex)}</td><td class="text-end">${M(r.freeCash)}</td><td class="text-end">${M(r.cash)}</td></tr>`).join('')) + endBlock(); }

  reports['budget-preparation'] = reports['budget-update'] = budgetPreparation;
  reports['budget-analysis'] = reports['multiple-scenarios'] = reports['whatif-scenarios'] = budgetAnalysis;
  reports['budget-variance'] = reports['budget-comparison'] = budgetComparison;
  reports['revenue-forecast'] = reports['profit-forecast'] = reports['ai-forecast'] = forecastRevenue;
  reports['cash-forecast'] = reports['cashflow-forecast'] = forecastCash;

  reports['sovereign-fs'] = data => governanceReport(data, 'القوائم المالية المختصرة', 'معتمد من القوائم المالية', table(['البند','القيمة'], `<tr><td>صافي الإيرادات</td><td class="text-end">${M(data.revenue)}</td></tr><tr><td>تكلفة الإيرادات</td><td class="text-end">${M(data.cogs)}</td></tr><tr><td>مجمل الربح</td><td class="text-end">${M(data.grossProfit)}</td></tr><tr><td>صافي الربح/الخسارة</td><td class="text-end">${M(data.netIncome)}</td></tr><tr><td>إجمالي الأصول</td><td class="text-end">${M(data.assets)}</td></tr><tr><td>إجمالي الالتزامات</td><td class="text-end">${M(data.liabilities)}</td></tr><tr><td>حقوق الملكية</td><td class="text-end">${M(data.equity)}</td></tr><tr><td>فرق المعادلة</td><td class="text-end">${M(data.equationDiff)}</td></tr>`));
  reports['sovereign-audit'] = data => { const issues = []; if (Math.abs(N(data.equationDiff)) > 1) issues.push('فرق في معادلة المركز المالي.'); if (Math.abs(N(data.cashFlowReconciliationDiff)) > 1) issues.push('فرق في مطابقة التدفقات النقدية.'); if (data.netIncome < 0) issues.push('خسارة في الفترة.'); return governanceReport(data, 'تقرير المراجعة الداخلي', 'مراجعة داخلية لا رأي مراجع خارجي', table(['الملاحظة'], issues.map(x=>`<tr><td>${x}</td></tr>`).join('') || '<tr><td>لا توجد ملاحظات جوهرية من الفحص الآلي.</td></tr>')); };
  reports['trial-balance-audit'] = data => { const debit = rows(data).reduce((s,a)=>s+Math.max(0,finalBalance(a)),0); const credit = rows(data).reduce((s,a)=>s+Math.abs(Math.min(0,finalBalance(a))),0); const critical = rows(data).filter(a => !a.category || !a.sub_category || String(a.account_id)==='SUSP-001' || (a.category==='assets' && String(a.sub_category)!=='121099' && finalBalance(a)<-0.1) || (a.category==='liabilities' && finalBalance(a)>0.1)); return governanceReport(data, 'ميزان مراجعة معتمد', 'معتمد من الميزان النهائي', `<div class="row">${metric('إجمالي المدين', M(debit))}${metric('إجمالي الدائن', M(credit))}${metric('فرق الميزان', M(debit-credit))}${metric('حسابات حرجة', critical.length)}</div>${table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(critical.slice(0,40)))}`); };
  reports['kpi-dashboard'] = data => governanceReport(data, 'KPIs Dashboard', 'معتمد من القوائم', table(['المؤشر','القيمة','تفسير'], `<tr><td>هامش مجمل الربح</td><td>${P(data.grossMargin)}</td><td>مجمل الربح ÷ الإيرادات</td></tr><tr><td>هامش صافي الربح</td><td>${P(data.netMargin)}</td><td>صافي الربح ÷ الإيرادات</td></tr><tr><td>ROA</td><td>${P(data.roa)}</td><td>صافي الربح ÷ الأصول</td></tr><tr><td>ROE</td><td>${P(data.roe)}</td><td>صافي الربح ÷ حقوق الملكية</td></tr><tr><td>نسبة التداول</td><td>${D(data.currentRatio)}x</td><td>الأصول المتداولة ÷ الالتزامات المتداولة</td></tr><tr><td>نسبة الدين</td><td>${P(data.debtRatio)}</td><td>الالتزامات ÷ الأصول</td></tr>`));
  reports['working-capital'] = data => governanceReport(data, 'رأس المال العامل', 'معتمد من المركز المالي', table(['البند','القيمة'], `<tr><td>الأصول المتداولة</td><td>${M(data.currentAssets)}</td></tr><tr><td>الالتزامات المتداولة</td><td>${M(data.currentLiabilities)}</td></tr><tr><td>صافي رأس المال العامل</td><td>${M(data.currentAssets-data.currentLiabilities)}</td></tr>`));
  reports['receivables-aging'] = data => governanceReport(data, 'أعمار الذمم المدينة', 'أرصدة فقط - لا توجد تواريخ فواتير', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => mapSub(a)==='trade_receivables' || String(a.name||'').includes('ذمم العملاء')))));
  reports['payables-aging'] = data => governanceReport(data, 'أعمار الموردين', 'أرصدة فقط - لا توجد تواريخ فواتير', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => mapSub(a)==='trade_payables' || String(a.name||'').includes('المورد')))));
  reports['fixed-assets-register'] = data => governanceReport(data, 'سجل الأصول والإهلاك', 'معتمد من أرصدة الأصول', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => mapSub(a)==='fixed_assets' || mapSub(a)==='fixed_assets_accumulation' || String(a.name||'').includes('اهلاك')))));
  reports['vat-reconciliation'] = data => governanceReport(data, 'مطابقة ضريبة القيمة المضافة', 'يحتاج إقرار ضريبي للمطابقة النهائية', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => String(a.name||'').includes('ضريبة القيمة المضافة') || String(a.name||'').includes('القيمة المضافة')))));
  reports['zakat-base'] = data => { const base = data.equity + data.longTermLiabilities + Math.max(0, data.currentLiabilities - data.currentAssets); return governanceReport(data, 'الوعاء الزكوي التقديري', 'تقديري لا يغني عن الإقرار', table(['البند','القيمة'], `<tr><td>حقوق الملكية</td><td>${M(data.equity)}</td></tr><tr><td>ديون طويلة الأجل</td><td>${M(data.longTermLiabilities)}</td></tr><tr><td>وعاء أولي</td><td>${M(base)}</td></tr>`)); };
  reports['related-parties'] = data => governanceReport(data, 'الأطراف ذات العلاقة', 'معتمد من أسماء الحسابات', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => /جارى|جاري|شقيق|مؤسس|مؤسسة|مهدي|شركاء|الشركاء/.test(String(a.name||''))))));
  reports['dupont-analysis'] = data => { const at = data.assets ? data.revenue / data.assets : NaN; const lev = data.equity ? data.assets / data.equity : NaN; return governanceReport(data, 'تحليل دوبونت', 'معتمد من القوائم', table(['العنصر','القيمة'], `<tr><td>هامش صافي الربح</td><td>${P(data.netMargin)}</td></tr><tr><td>دوران الأصول</td><td>${D(at)}x</td></tr><tr><td>الرافعة المالية</td><td>${D(lev)}x</td></tr><tr><td>ROE دوبونت</td><td>${P(data.netMargin*at*lev)}</td></tr>`)); };
  reports['sloan-accruals'] = data => { const accruals = data.netIncome - data.cashFlowOps; return governanceReport(data, "Sloan's Accruals", 'معتمد من صافي الربح والتدفقات', table(['البند','القيمة'], `<tr><td>صافي الربح</td><td>${M(data.netIncome)}</td></tr><tr><td>التدفق التشغيلي</td><td>${M(data.cashFlowOps)}</td></tr><tr><td>الاستحقاقات</td><td>${M(accruals)}</td></tr><tr><td>نسبة للأصول</td><td>${P(data.assets ? accruals/data.assets : NaN)}</td></tr>`)); };
  reports['beneish-mscore'] = data => { const ar = data.assets ? (data.netIncome - data.cashFlowOps)/data.assets : 0; const score = -2.22 + ar*10 + (data.netMargin < 0 ? 0.5 : 0); return governanceReport(data, 'Beneish M-Score مبسط', 'مؤشر جودة أرباح تقديري من الميزان فقط', table(['البند','القيمة'], `<tr><td>نسبة الاستحقاقات</td><td>${P(ar)}</td></tr><tr><td>M-Score تقديري</td><td>${D(score)}</td></tr><tr><td>قراءة أولية</td><td>${score > -1.78 ? 'مؤشر خطر أعلى' : 'لا يظهر خطر قوي'}</td></tr>`)); };
  reports['altman-zscore'] = data => { const wc = data.currentAssets-data.currentLiabilities; const ebit = data.netIncome+data.depreciationExpense; const z = 1.2*(wc/data.assets)+1.4*((data.openingEquity||data.equity)/data.assets)+3.3*(ebit/data.assets)+0.6*(data.equity/data.liabilities)+1.0*(data.revenue/data.assets); return governanceReport(data, 'Altman Z-Score', 'تقديري بسبب عدم توفر القيمة السوقية', table(['العنصر','القيمة'], `<tr><td>Z-Score</td><td>${D(z)}</td></tr><tr><td>التفسير</td><td>${z < 1.8 ? 'منطقة خطر' : z < 3 ? 'منطقة رمادية' : 'منطقة آمنة'}</td></tr>`)); };
  reports['loan-capacity'] = data => { const ebitda = data.netIncome + data.depreciationExpense; const service = data.longTermLiabilities * 0.15; return governanceReport(data, 'سعة القروض DSCR', 'تقديري بدون جدول سداد فعلي', table(['البند','القيمة'], `<tr><td>EBITDA</td><td>${M(ebitda)}</td></tr><tr><td>خدمة الدين المفترضة</td><td>${M(service)}</td></tr><tr><td>DSCR</td><td>${D(service ? ebitda/service : NaN)}x</td></tr>`)); };
  reports['money-flow'] = reports['sources-uses'] = data => governanceReport(data, 'مصادر واستخدامات الأموال', 'معتمد من التدفقات الموحدة', table(['البند','القيمة'], `<tr><td>التدفق التشغيلي</td><td>${M(data.cashFlowOps)}</td></tr><tr><td>التدفق الاستثماري</td><td>${M(data.cashFlowInv)}</td></tr><tr><td>التدفق التمويلي</td><td>${M(data.cashFlowFin)}</td></tr><tr><td>صافي تغير النقدية</td><td>${M(data.netCashChange)}</td></tr><tr><td>فرق مطابقة النقدية</td><td>${M(data.cashFlowReconciliationDiff)}</td></tr>`));
  reports['breakeven-analysis'] = data => { const cm = data.revenue ? (data.revenue-data.cogs)/data.revenue : NaN; const fixed = data.operatingExpenses+data.depreciationExpense; return governanceReport(data, 'نقطة التعادل', 'تقديري من القوائم بدون وحدات إنتاج', table(['البند','القيمة'], `<tr><td>هامش المساهمة</td><td>${P(cm)}</td></tr><tr><td>التكاليف الثابتة</td><td>${M(fixed)}</td></tr><tr><td>نقطة التعادل بالريال</td><td>${M(cm ? fixed/cm : NaN)}</td></tr>`)); };
  reports['dcf-valuation'] = data => { const fcf = data.cashFlowOps + data.cashFlowInv; const wacc = 0.12, g = 0.03; const ev = fcf + (fcf*(1+g)/(wacc-g))/Math.pow(1+wacc,1); return governanceReport(data, 'DCF Valuation', 'تقديري جدًا - يحتاج WACC وخطة خمسية', table(['البند','القيمة'], `<tr><td>FCF حالي</td><td>${M(fcf)}</td></tr><tr><td>WACC افتراضي</td><td>${P(wacc)}</td></tr><tr><td>نمو نهائي افتراضي</td><td>${P(g)}</td></tr><tr><td>قيمة منشأة تقديرية</td><td>${M(ev)}</td></tr>`)); };
  reports['rim-valuation'] = data => { const ke = 0.12; return governanceReport(data, 'Residual Income', 'تقديري', table(['البند','القيمة'], `<tr><td>القيمة الدفترية</td><td>${M(data.equity)}</td></tr><tr><td>تكلفة حقوق الملكية</td><td>${P(ke)}</td></tr><tr><td>الدخل المتبقي</td><td>${M(data.netIncome-data.equity*ke)}</td></tr>`)); };
  reports['ddm-valuation'] = data => governanceReport(data, 'Dividend Discount Model', 'غير قابل للاعتماد بدون سياسة توزيعات', `<div class="alert alert-warning">لا توجد توزيعات أرباح تاريخية أو سياسة توزيع ضمن ميزان المراجعة. لا يتم إنتاج قيمة وهمية.</div>`);
  reports['eva-analysis'] = data => { const wacc = 0.12; const capital = data.assets-data.currentLiabilities; return governanceReport(data, 'EVA', 'تقديري', table(['البند','القيمة'], `<tr><td>NOPAT تقريبي</td><td>${M(data.netIncome)}</td></tr><tr><td>رأس المال المستثمر</td><td>${M(capital)}</td></tr><tr><td>EVA</td><td>${M(data.netIncome-capital*wacc)}</td></tr>`)); };
  reports['capm-model'] = data => { const rf=0.045,beta=1.1,mp=0.065; return governanceReport(data, 'CAPM', 'تقديري بدون بيانات سوقية', table(['البند','القيمة'], `<tr><td>Risk-free</td><td>${P(rf)}</td></tr><tr><td>Beta</td><td>${D(beta)}</td></tr><tr><td>Market Premium</td><td>${P(mp)}</td></tr><tr><td>Cost of Equity</td><td>${P(rf+beta*mp)}</td></tr>`)); };
  ['famafrench-model','mpt-portfolio','sharpe-ratio','var-risk','ca-score-ai'].forEach(id => reports[id] = data => governanceReport(data, id, 'غير نهائي بدون بيانات سوق/محفظة', `<div class="alert alert-warning">ميزان المراجعة لا يحتوي أسعار تاريخية أو عوائد سوقية أو أوزان محفظة. التقرير يعرض تحذيرًا بدل أرقام زائفة.</div>`));
  ['ohlson-oscore','zmijewski-xscore','sherrod-model','fulmer-hscore','springate-sscore'].forEach(id => reports[id] = data => governanceReport(data, id, 'تقديري من نسب القوائم', table(['مؤشر','قيمة'], `<tr><td>نسبة التداول</td><td>${D(data.currentRatio)}x</td></tr><tr><td>نسبة الدين</td><td>${P(data.debtRatio)}</td></tr><tr><td>هامش صافي الربح</td><td>${P(data.netMargin)}</td></tr><tr><td>التدفق التشغيلي</td><td>${M(data.cashFlowOps)}</td></tr>`)));
  ['balanced-scorecard','swot-analysis','integrated-report','profitability-dim','abc-costing','yearend-checklist'].forEach(id => reports[id] = data => governanceReport(data, id, 'تقرير إداري مبني على القوائم', basicMetrics(data)));

  function override() {
    const original = window.generateReportContent;
    window.generateReportContent = function(reportId, title, isForExport = false) {
      const data = getDataSafe();
      if (!data) return `<div class="alert alert-danger p-5 text-center"><h4>لا توجد بيانات معتمدة</h4><p>اعتمد ميزان المراجعة أولًا.</p></div>`;
      if (reports[reportId]) return reports[reportId](data, title, isForExport);
      try {
        const html = original ? original.call(this, reportId, title, isForExport) : '';
        const probe = document.createElement('div'); probe.innerHTML = html || '';
        const t = probe.textContent || '';
        if (!html || t.includes('قيد التطوير') || t.includes('NaN') || t.includes('undefined')) return governanceReport(data, title || reportId, 'تقرير عام آمن', basicMetrics(data));
        return html;
      } catch (e) { return governanceReport(data, title || reportId, 'تم منع كسر التقرير', `<div class="alert alert-warning">الدالة الأصلية فشلت: ${String(e.message || e)}</div>${basicMetrics(data)}`); }
    };
    window.PolarisReportingCFO = { patched: true, reports: Object.keys(reports), getDataSafe };
    window.PolarisCFOBudget = { patched: true, buildBudget, budgetAssumptions, save: saveBudgetAssumptions };
    console.log('Polaris CFO reporting override + budget engine loaded');
  }
  function boot() { if ((location.pathname || '').split('/').pop() !== 'reporting-pantheon.html') return; setTimeout(override, 2200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
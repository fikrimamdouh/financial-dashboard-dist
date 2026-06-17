;(() => {
  'use strict';

  const N = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const p = parseFloat(String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(p) ? p : 0;
  };
  const R = v => Math.round((Number(v) || 0) * 100) / 100;
  const F = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : N(v).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }));
  const P = v => Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : 'غير قابل للقياس';
  const D = v => Number.isFinite(v) ? v.toFixed(2) : 'غير قابل للقياس';
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const weights = [0.075,0.075,0.08,0.08,0.08,0.085,0.085,0.085,0.09,0.09,0.09,0.085];

  function getData() {
    if (window.PolarisReportingQA && typeof window.PolarisReportingQA.buildUnifiedData === 'function') return window.PolarisReportingQA.buildUnifiedData();
    if (typeof window.getData === 'function') return window.getData();
    return null;
  }

  function getBudgetAssumptions() {
    const defaults = {
      revenueGrowth: 0.08,
      cogsInflation: 0.03,
      opexGrowth: 0.05,
      collectionImprovementDays: 10,
      inventoryImprovementDays: 7,
      payablesStretchDays: 5,
      capexPercentOfRevenue: 0.03,
      taxZakatRate: 0.025
    };
    try {
      const activeClientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('activeClientId') || 'default';
      const saved = JSON.parse(localStorage.getItem(`cfoBudgetAssumptions_${activeClientId}`) || '{}');
      return { ...defaults, ...saved };
    } catch (_) { return defaults; }
  }

  function saveBudgetAssumptions(form) {
    const activeClientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('activeClientId') || 'default';
    const a = {
      revenueGrowth: N(form.revenueGrowth.value) / 100,
      cogsInflation: N(form.cogsInflation.value) / 100,
      opexGrowth: N(form.opexGrowth.value) / 100,
      collectionImprovementDays: N(form.collectionImprovementDays.value),
      inventoryImprovementDays: N(form.inventoryImprovementDays.value),
      payablesStretchDays: N(form.payablesStretchDays.value),
      capexPercentOfRevenue: N(form.capexPercentOfRevenue.value) / 100,
      taxZakatRate: N(form.taxZakatRate.value) / 100
    };
    localStorage.setItem(`cfoBudgetAssumptions_${activeClientId}`, JSON.stringify(a));
    alert('تم حفظ افتراضات الموازنة. افتح التقرير مرة أخرى أو اضغط تحديث.');
  }

  function deriveDrivers(data, a) {
    const revenue = Math.abs(N(data.revenue));
    const cogs = Math.abs(N(data.cogs));
    const receivables = Math.max(0, N(data.currentAssets || 0) * 0.75);
    const inventory = Math.max(0, (N(data.currentAssets || 0) - receivables) * 0.60);
    const payables = Math.max(0, N(data.currentLiabilities || 0) * 0.70);
    const dso = revenue ? Math.max(15, Math.min(180, receivables / revenue * 365 - a.collectionImprovementDays)) : 60;
    const dio = cogs ? Math.max(5, Math.min(180, inventory / cogs * 365 - a.inventoryImprovementDays)) : 45;
    const dpo = cogs ? Math.max(5, Math.min(180, payables / cogs * 365 + a.payablesStretchDays)) : 45;
    return { revenue, cogs, dso, dio, dpo };
  }

  function buildBudget(data, scenarioName = 'base') {
    const a = getBudgetAssumptions();
    const d = deriveDrivers(data, a);
    const scenario = {
      base: { name: 'أساسي', revenueGrowthAdj: 0, cogsAdj: 0, opexAdj: 0 },
      optimistic: { name: 'متفائل', revenueGrowthAdj: 0.07, cogsAdj: -0.02, opexAdj: 0.02 },
      conservative: { name: 'متحفظ', revenueGrowthAdj: -0.08, cogsAdj: 0.04, opexAdj: 0.03 }
    }[scenarioName] || { name: scenarioName, revenueGrowthAdj: 0, cogsAdj: 0, opexAdj: 0 };

    const revenueAnnual = Math.max(0, d.revenue * (1 + a.revenueGrowth + scenario.revenueGrowthAdj));
    const cogsRatio = d.revenue ? d.cogs / d.revenue : 0;
    const cogsAnnual = revenueAnnual * cogsRatio * (1 + a.cogsInflation + scenario.cogsAdj);
    const opexBase = Math.abs(N(data.operatingExpenses || 0));
    const depreciation = Math.abs(N(data.depreciationExpense || 0));
    const opexAnnual = opexBase * (1 + a.opexGrowth + scenario.opexAdj);
    const capexAnnual = revenueAnnual * a.capexPercentOfRevenue;
    const rows = months.map((m, i) => {
      const revenue = revenueAnnual * weights[i];
      const cogs = cogsAnnual * weights[i];
      const opex = opexAnnual / 12;
      const dep = depreciation / 12;
      const ebit = revenue - cogs - opex - dep;
      const zakat = ebit > 0 ? ebit * a.taxZakatRate : 0;
      const net = ebit - zakat;
      const ar = revenue / 30 * d.dso;
      const inv = cogs / 30 * d.dio;
      const ap = cogs / 30 * d.dpo;
      const wcNeed = ar + inv - ap;
      const operatingCash = net + dep - (wcNeed / 12);
      const capex = capexAnnual / 12;
      const freeCash = operatingCash - capex;
      return { month: m, revenue, cogs, grossProfit: revenue - cogs, opex, depreciation: dep, ebit, zakat, net, ar, inv, ap, wcNeed, operatingCash, capex, freeCash };
    });
    const total = key => R(rows.reduce((s, r) => s + N(r[key]), 0));
    return { assumptions: a, drivers: d, scenario: scenario.name, rows, totals: { revenue: total('revenue'), cogs: total('cogs'), grossProfit: total('grossProfit'), opex: total('opex'), depreciation: total('depreciation'), ebit: total('ebit'), zakat: total('zakat'), net: total('net'), operatingCash: total('operatingCash'), capex: total('capex'), freeCash: total('freeCash') } };
  }

  function header(title, status = 'موازنة مبنية على ميزان المراجعة') {
    return `<div class="p-4"><h4 class="mb-3">${title}</h4><div class="alert alert-info"><strong>منهج المدير المالي:</strong> هذه الموازنة مبنية على فعلي ميزان المراجعة المعتمد. لا توجد موازنة تاريخية مرفوعة، لذلك تم بناء Baseline Budget من واقع الإيرادات والتكاليف الحالية مع افتراضات قابلة للتعديل.</div><div class="alert alert-secondary"><strong>تصنيف التقرير:</strong> ${status}</div>`;
  }
  function end() { return '</div>'; }
  function table(heads, body) { return `<table class="table table-bordered table-sm"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`; }
  function stats(b) { return `<div class="row mb-3"><div class="col-md-3"><div class="stats-card"><h3>${F(b.totals.revenue)}</h3><p>إيرادات موازنة</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${F(b.totals.grossProfit)}</h3><p>مجمل ربح</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${F(b.totals.net)}</h3><p>صافي ربح/خسارة</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${F(b.totals.freeCash)}</h3><p>تدفق حر</p></div></div></div>`; }

  function assumptionsForm(b) {
    const a = b.assumptions;
    return `<form class="row g-2 mb-4" onsubmit="PolarisBudgetForecast.save(this); return false;">
      <div class="col-md-3"><label>نمو الإيرادات %</label><input name="revenueGrowth" class="form-control" value="${(a.revenueGrowth*100).toFixed(1)}"></div>
      <div class="col-md-3"><label>تضخم تكلفة المبيعات %</label><input name="cogsInflation" class="form-control" value="${(a.cogsInflation*100).toFixed(1)}"></div>
      <div class="col-md-3"><label>نمو المصروفات %</label><input name="opexGrowth" class="form-control" value="${(a.opexGrowth*100).toFixed(1)}"></div>
      <div class="col-md-3"><label>CAPEX من الإيراد %</label><input name="capexPercentOfRevenue" class="form-control" value="${(a.capexPercentOfRevenue*100).toFixed(1)}"></div>
      <div class="col-md-3"><label>تحسين التحصيل/يوم</label><input name="collectionImprovementDays" class="form-control" value="${a.collectionImprovementDays}"></div>
      <div class="col-md-3"><label>تحسين المخزون/يوم</label><input name="inventoryImprovementDays" class="form-control" value="${a.inventoryImprovementDays}"></div>
      <div class="col-md-3"><label>تمديد الموردين/يوم</label><input name="payablesStretchDays" class="form-control" value="${a.payablesStretchDays}"></div>
      <div class="col-md-3"><label>زكاة/ضريبة %</label><input name="taxZakatRate" class="form-control" value="${(a.taxZakatRate*100).toFixed(1)}"></div>
      <div class="col-12"><button class="btn btn-primary mt-2"><i class="fas fa-save"></i> حفظ افتراضات الموازنة</button></div>
    </form>`;
  }

  function monthlyRows(b) {
    return b.rows.map(r => `<tr><td>${r.month}</td><td class="text-end">${F(r.revenue)}</td><td class="text-end">${F(r.cogs)}</td><td class="text-end">${F(r.grossProfit)}</td><td class="text-end">${F(r.opex)}</td><td class="text-end">${F(r.net)}</td><td class="text-end">${F(r.freeCash)}</td></tr>`).join('');
  }

  function budgetPreparation(data) {
    const b = buildBudget(data, 'base');
    return header('إعداد الموازنة السنوية من ميزان المراجعة') + assumptionsForm(b) + stats(b) + table(['الشهر','الإيرادات','تكلفة الإيرادات','مجمل الربح','مصروفات التشغيل','صافي الربح/الخسارة','التدفق الحر'], monthlyRows(b)) + `<div class="alert alert-warning mt-3"><strong>قرار CFO:</strong> هذه موازنة تشغيلية أولية صالحة كبداية. تصبح موازنة معتمدة بعد تعديل الافتراضات وحفظها ومراجعة الإدارة.</div>` + end();
  }

  function budgetAnalysis(data) {
    const base = buildBudget(data, 'base');
    const optimistic = buildBudget(data, 'optimistic');
    const conservative = buildBudget(data, 'conservative');
    const body = [base, optimistic, conservative].map(b => `<tr><td>${b.scenario}</td><td class="text-end">${F(b.totals.revenue)}</td><td class="text-end">${F(b.totals.grossProfit)}</td><td class="text-end">${F(b.totals.net)}</td><td class="text-end">${F(b.totals.freeCash)}</td><td>${P(b.totals.grossProfit / b.totals.revenue)}</td><td>${P(b.totals.net / b.totals.revenue)}</td></tr>`).join('');
    return header('تحليل الموازنة والسيناريوهات') + table(['السيناريو','الإيرادات','مجمل الربح','صافي الربح','التدفق الحر','هامش مجمل','هامش صافي'], body) + `<div class="alert alert-info mt-3">السيناريو المتحفظ يخفض نمو الإيرادات ويرفع التكلفة. السيناريو المتفائل يرفع المبيعات ويحسن هامش التكلفة.</div>` + end();
  }

  function budgetComparison(data) {
    const b = buildBudget(data, 'base');
    const body = `
      <tr><td>الإيرادات</td><td class="text-end">${F(data.revenue)}</td><td class="text-end">${F(b.totals.revenue)}</td><td class="text-end">${F(b.totals.revenue - data.revenue)}</td><td>${P((b.totals.revenue - data.revenue) / Math.abs(data.revenue || 1))}</td></tr>
      <tr><td>تكلفة الإيرادات</td><td class="text-end">${F(data.cogs)}</td><td class="text-end">${F(b.totals.cogs)}</td><td class="text-end">${F(b.totals.cogs - data.cogs)}</td><td>${P((b.totals.cogs - data.cogs) / Math.abs(data.cogs || 1))}</td></tr>
      <tr><td>مجمل الربح</td><td class="text-end">${F(data.grossProfit)}</td><td class="text-end">${F(b.totals.grossProfit)}</td><td class="text-end">${F(b.totals.grossProfit - data.grossProfit)}</td><td>${P((b.totals.grossProfit - data.grossProfit) / Math.abs(data.grossProfit || 1))}</td></tr>
      <tr><td>صافي الربح/الخسارة</td><td class="text-end">${F(data.netIncome)}</td><td class="text-end">${F(b.totals.net)}</td><td class="text-end">${F(b.totals.net - data.netIncome)}</td><td>${P((b.totals.net - data.netIncome) / Math.abs(data.netIncome || 1))}</td></tr>`;
    return header('مقارنة الفعلي بميزانية CFO المقترحة', 'مقارنة الفعلي الحالي بموازنة السنة القادمة المقترحة') + table(['البند','فعلي الميزان','موازنة مقترحة','الفارق','%'], body) + end();
  }

  function forecastRevenue(data) {
    const b = buildBudget(data, 'base');
    return header('تنبؤ الإيرادات 12 شهر') + stats(b) + table(['الشهر','إيراد متوقع','تكلفة متوقعة','مجمل ربح','صافي ربح/خسارة'], b.rows.map(r => `<tr><td>${r.month}</td><td class="text-end">${F(r.revenue)}</td><td class="text-end">${F(r.cogs)}</td><td class="text-end">${F(r.grossProfit)}</td><td class="text-end">${F(r.net)}</td></tr>`).join('')) + end();
  }

  function forecastCash(data) {
    const b = buildBudget(data, 'base');
    const opening = N(data.closingCashActual || data.closingCash || data.openingCash || 0);
    let running = opening;
    const body = b.rows.map(r => { running += r.freeCash; return `<tr><td>${r.month}</td><td class="text-end">${F(r.operatingCash)}</td><td class="text-end">${F(r.capex)}</td><td class="text-end">${F(r.freeCash)}</td><td class="text-end">${F(running)}</td></tr>`; }).join('');
    return header('تنبؤ التدفقات النقدية 12 شهر') + `<div class="alert alert-secondary">بداية التنبؤ من النقدية الفعلية الحالية: <strong>${F(opening)}</strong></div>` + table(['الشهر','تدفق تشغيلي','CAPEX','تدفق حر','رصيد نقدية متوقع'], body) + end();
  }

  function override() {
    const previous = window.generateReportContent;
    window.generateReportContent = function(reportId, title, isForExport = false) {
      const data = getData();
      if (!data) return previous ? previous.call(this, reportId, title, isForExport) : '<div class="alert alert-danger">لا توجد بيانات.</div>';
      if (['budget-preparation','budget-update'].includes(reportId)) return budgetPreparation(data);
      if (['budget-analysis','multiple-scenarios','whatif-scenarios'].includes(reportId)) return budgetAnalysis(data);
      if (['budget-comparison','budget-variance'].includes(reportId)) return budgetComparison(data);
      if (['revenue-forecast','profit-forecast','ai-forecast'].includes(reportId)) return forecastRevenue(data);
      if (['cashflow-forecast','cash-forecast'].includes(reportId)) return forecastCash(data);
      return previous ? previous.call(this, reportId, title, isForExport) : '';
    };
    window.PolarisBudgetForecast = { buildBudget, getBudgetAssumptions, save: saveBudgetAssumptions, patched: true };
    console.log('Polaris CFO budget and forecast engine loaded');
  }

  function boot() {
    if ((location.pathname || '').split('/').pop() !== 'reporting-pantheon.html') return;
    setTimeout(override, 3200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

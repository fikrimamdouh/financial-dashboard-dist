;(() => {
  'use strict';

  const num = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const x = String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, '');
    const p = parseFloat(x);
    return Number.isFinite(p) ? p : 0;
  };
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const fmt = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : num(v).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }));
  const subMap = () => window.SUB_CATEGORY_MAPPING || {};
  const mapSub = a => subMap()[String(a?.sub_category || '')] || '';
  const rows = d => Array.isArray(d?.trialBalance) ? d.trialBalance : [];

  function finalBalance(account, adjustments = [], prior = false) {
    if (!account) return 0;
    const ob = num(account.ob_debit) - num(account.ob_credit);
    if (prior) return ob;
    const movement = num(account.move_debit) - num(account.move_credit);
    const book = account.book_balance !== undefined && account.book_balance !== null && account.book_balance !== '' ? num(account.book_balance) : ob + movement;
    const aje = (adjustments || []).reduce((sum, adj) => {
      const amount = num(adj.amount);
      if (String(adj.debit_account) === String(account.account_id)) return sum + amount;
      if (String(adj.credit_account) === String(account.account_id)) return sum - amount;
      return sum;
    }, 0);
    return book + aje;
  }
  const openingBalance = a => num(a?.ob_debit) - num(a?.ob_credit);
  const isContraRevenue = a => String(a?.sub_category || '') === '410099' || mapSub(a) === 'sales_discount' || String(a?.name || '').includes('خصم مسموح') || String(a?.name || '').includes('مردود') || String(a?.name || '').includes('مرتجع');
  const isMainRevenue = a => {
    if (isContraRevenue(a)) return true;
    const code = String(a?.account_id || '');
    const name = String(a?.name || '').toLowerCase();
    return code.startsWith('401') || code.startsWith('410') || name.includes('مبيعات') || name.includes('خرسانة') || name.includes('بلوك') || name.includes('كسارة');
  };

  function categorize(trialBalance, adjustments = []) {
    const out = { revenue: [], cogs: [], operatingExpenses: [], currentAssets: [], fixedAssets: [], currentLiabilities: [], longTermLiabilities: [], equity: [], all: [] };
    (trialBalance || []).forEach(acc => {
      const a = { ...acc, finalBalance: finalBalance(acc, adjustments, false), openingBalance: openingBalance(acc) };
      const main = String(a.category || '').toLowerCase();
      const mapped = mapSub(a);
      const code = String(a.account_id || '');
      out.all.push(a);
      if (main === 'assets') {
        if (mapped === 'fixed_assets' || mapped === 'fixed_assets_accumulation') out.fixedAssets.push(a);
        else out.currentAssets.push(a);
      } else if (main === 'liabilities') {
        if (String(a.sub_category || '').startsWith('22') || mapped === 'long_term_loans') out.longTermLiabilities.push(a);
        else out.currentLiabilities.push(a);
      } else if (main === 'equity') out.equity.push(a);
      else if (main === 'revenue') out.revenue.push(a);
      else if (main === 'expenses' || main === 'cost_of_revenue') {
        if (code.startsWith('303') || code.startsWith('5') || mapped === 'cogs') out.cogs.push(a);
        else out.operatingExpenses.push(a);
      }
    });
    return out;
  }

  function income(c) {
    const rev = c.revenue || [];
    const mainRev = rev.filter(isMainRevenue);
    const otherRev = rev.filter(a => !isMainRevenue(a));
    const revenue = -mainRev.reduce((s, a) => s + num(a.finalBalance), 0);
    const otherIncome = -otherRev.reduce((s, a) => s + num(a.finalBalance), 0);
    const cogs = (c.cogs || []).reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
    const grossProfit = revenue - cogs;
    const opex = c.operatingExpenses || [];
    const depreciation = opex.filter(a => String(a.account_id || '').startsWith('601010003')).reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
    const zakat = opex.filter(a => String(a.account_id || '') === '601020030' || mapSub(a) === 'zakat_expense').reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
    const adminExpenses = opex.filter(a => String(a.account_id || '').startsWith('60102') && String(a.account_id || '') !== '601020030').reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
    const operatingExpenses = opex.filter(a => String(a.account_id || '').startsWith('60101') && !String(a.account_id || '').startsWith('601010003')).reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
    const totalExpenses = operatingExpenses + adminExpenses + depreciation;
    const netIncomeBeforeZakat = grossProfit + otherIncome - totalExpenses;
    const netIncome = netIncomeBeforeZakat - zakat;
    return { revenue: r2(revenue), cogs: r2(cogs), grossProfit: r2(grossProfit), operatingExpenses: r2(operatingExpenses + adminExpenses), adminExpenses: r2(adminExpenses), depreciationExpense: r2(depreciation), otherIncome: r2(otherIncome), zakatExpense: r2(zakat), netIncome: r2(netIncome), netProfit: r2(netIncome), netIncomeBeforeZakat: r2(netIncomeBeforeZakat) };
  }

  function balance(c, netIncome) {
    const sum = a => (a || []).reduce((s, x) => s + num(x.finalBalance), 0);
    const currentAssets = sum(c.currentAssets);
    const fixedAssets = sum(c.fixedAssets);
    const assets = currentAssets + fixedAssets;
    const currentLiabilities = Math.abs(sum(c.currentLiabilities));
    const longTermLiabilities = Math.abs(sum(c.longTermLiabilities));
    const liabilities = currentLiabilities + longTermLiabilities;
    const openingEquity = -sum(c.equity);
    const equity = openingEquity + num(netIncome);
    return { currentAssets: r2(currentAssets), fixedAssets: r2(fixedAssets), assets: r2(assets), currentLiabilities: r2(currentLiabilities), longTermLiabilities: r2(longTermLiabilities), liabilities: r2(liabilities), openingEquity: r2(openingEquity), equity: r2(equity), equationDiff: r2(assets - liabilities - equity) };
  }

  function accountSum(audit, filter, mode = 'closing') {
    const adjustments = audit?.adjustments || [];
    return rows(audit).filter(filter).reduce((s, a) => s + (mode === 'opening' ? openingBalance(a) : finalBalance(a, adjustments, false)), 0);
  }

  function cashFlow(audit, inc) {
    const mapped = key => a => mapSub(a) === key;
    const mappedAny = keys => a => keys.includes(mapSub(a));
    const getClosing = f => accountSum(audit, f, 'closing');
    const getOpening = f => accountSum(audit, f, 'opening');
    const netIncome = num(inc.netIncome);
    const depreciation = Math.abs(num(inc.depreciationExpense));
    const receivables = getClosing(mappedAny(['trade_receivables', 'other_receivables'])) - getOpening(mappedAny(['trade_receivables', 'other_receivables']));
    const inventory = getClosing(mapped('inventory')) - getOpening(mapped('inventory'));
    const prepaid = getClosing(mapped('prepaid_expenses')) - getOpening(mapped('prepaid_expenses'));
    const payables = -(getClosing(mapped('trade_payables')) - getOpening(mapped('trade_payables')));
    const accruals = -(getClosing(mappedAny(['other_payables', 'accrued_expenses', 'zakat_tax_provision'])) - getOpening(mappedAny(['other_payables', 'accrued_expenses', 'zakat_tax_provision'])));
    const cashFlowOps = netIncome + depreciation - receivables - inventory - prepaid + payables + accruals;
    const fixedAssetCost = getClosing(a => mapSub(a) === 'fixed_assets') - getOpening(a => mapSub(a) === 'fixed_assets');
    const cashFlowInv = -fixedAssetCost;
    const debtMove = -(getClosing(a => mapSub(a) === 'long_term_loans' || String(a.sub_category || '').startsWith('22')) - getOpening(a => mapSub(a) === 'long_term_loans' || String(a.sub_category || '').startsWith('22')));
    const equityMove = -(getClosing(a => String(a.category || '').toLowerCase() === 'equity') - getOpening(a => String(a.category || '').toLowerCase() === 'equity')) - netIncome;
    const cashFlowFin = debtMove + equityMove;
    const netCashChange = cashFlowOps + cashFlowInv + cashFlowFin;
    const openingCash = getOpening(mapped('cash'));
    const closingCashActual = getClosing(mapped('cash'));
    const closingCash = openingCash + netCashChange;
    return { cashFlowOps: r2(cashFlowOps), cashFlowInv: r2(cashFlowInv), cashFlowFin: r2(cashFlowFin), netCashChange: r2(netCashChange), openingCash: r2(openingCash), closingCash: r2(closingCash), closingCashActual: r2(closingCashActual), cashFlowReconciliationDiff: r2(closingCashActual - closingCash), depreciation: r2(depreciation) };
  }

  function buildUnifiedData() {
    const activeClientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('activeClientId');
    if (!activeClientId) return null;
    localStorage.setItem('activeClientId', activeClientId);
    const finalJSON = localStorage.getItem(`finalAudit_${activeClientId}`);
    if (!finalJSON) return null;
    const audit = JSON.parse(finalJSON);
    audit.trialBalance = audit.trialBalance || [];
    audit.adjustments = audit.adjustments || [];
    audit.clientInfo = audit.clientInfo || {};
    const isolated = JSON.parse(JSON.stringify(audit.trialBalance));
    const auditForCalc = { ...audit, trialBalance: isolated };
    const c = categorize(isolated, audit.adjustments);
    const inc = income(c);
    const bs = balance(c, inc.netIncome);
    const cf = cashFlow(auditForCalc, inc);
    const data = {
      clientInfo: audit.clientInfo,
      companyName: audit.clientInfo.clientName || audit.clientInfo.company_name || audit.clientInfo.name || 'اسم العميل غير متوفر',
      fiscalYear: audit.clientInfo.endDate ? new Date(audit.clientInfo.endDate).getFullYear() : new Date().getFullYear(),
      trialBalance: isolated,
      adjustments: audit.adjustments,
      categorized: c,
      revenue: inc.revenue,
      cogs: inc.cogs,
      grossProfit: inc.grossProfit,
      operatingExpenses: inc.operatingExpenses,
      depreciationExpense: inc.depreciationExpense,
      otherIncome: inc.otherIncome,
      netIncome: inc.netIncome,
      netProfit: inc.netIncome,
      currentAssets: bs.currentAssets,
      fixedAssets: bs.fixedAssets,
      assets: bs.assets,
      currentLiabilities: bs.currentLiabilities,
      longTermLiabilities: bs.longTermLiabilities,
      liabilities: bs.liabilities,
      equity: bs.equity,
      openingEquity: bs.openingEquity,
      equationDiff: bs.equationDiff,
      cashFlow: cf.cashFlowOps,
      cashFlowOps: cf.cashFlowOps,
      cashFlowInv: cf.cashFlowInv,
      cashFlowFin: cf.cashFlowFin,
      netCashChange: cf.netCashChange,
      openingCash: cf.openingCash,
      closingCash: cf.closingCash,
      closingCashActual: cf.closingCashActual,
      cashFlowReconciliationDiff: cf.cashFlowReconciliationDiff,
      currentRatio: bs.currentLiabilities ? bs.currentAssets / bs.currentLiabilities : 0,
      quickRatio: bs.currentLiabilities ? (bs.currentAssets - accountSum(auditForCalc, a => mapSub(a) === 'inventory')) / bs.currentLiabilities : 0,
      roe: bs.equity ? inc.netIncome / bs.equity : 0,
      roa: bs.assets ? inc.netIncome / bs.assets : 0,
      grossMargin: inc.revenue ? inc.grossProfit / inc.revenue : 0,
      netMargin: inc.revenue ? inc.netIncome / inc.revenue : 0,
      debtRatio: bs.assets ? bs.liabilities / bs.assets : 0,
      dscr: (bs.longTermLiabilities * 0.15) ? (inc.netIncome + inc.depreciationExpense) / (bs.longTermLiabilities * 0.15) : 0
    };
    window.PolarisReportingUnifiedData = data;
    return data;
  }

  function capmCardHtml() {
    return `<div class="report-card" onclick="openReport('capm-model', 'CAPM Model')"><span class="report-status status-ready">جاهز</span><h6><i class="fas fa-chart-line"></i> CAPM Model</h6><p>تكلفة حقوق الملكية: معدل خالي من المخاطر + بيتا × علاوة السوق</p></div>`;
  }

  function accountingCardsHtml() {
    return [
      ['trial-balance-audit', 'ميزان مراجعة معتمد', 'fas fa-balance-scale', 'ميزان المراجعة بعد التصنيف والتسويات'],
      ['receivables-aging', 'أعمار الذمم المدينة', 'fas fa-user-clock', 'تحليل العملاء والتحصيل ومخاطر الائتمان'],
      ['payables-aging', 'أعمار الموردين', 'fas fa-file-invoice-dollar', 'تحليل الموردين والالتزامات التجارية'],
      ['fixed-assets-register', 'سجل الأصول والإهلاك', 'fas fa-industry', 'تكلفة الأصول، مجمع الإهلاك، صافي القيمة الدفترية'],
      ['vat-reconciliation', 'مطابقة ضريبة القيمة المضافة', 'fas fa-receipt', 'مخرجات ومدخلات الضريبة وموقف المطابقة'],
      ['zakat-base', 'الوعاء الزكوي التقديري', 'fas fa-mosque', 'حقوق الملكية والديون والأصول المعدلة'],
      ['related-parties', 'الأطراف ذات العلاقة', 'fas fa-people-arrows', 'جاري الشركاء والمنشآت الشقيقة']
    ].map(([id, title, icon, desc]) => `<div class="report-card" onclick="openReport('${id}', '${title}')"><span class="report-status status-ready">جاهز</span><h6><i class="${icon}"></i> ${title}</h6><p>${desc}</p></div>`).join('');
  }

  function fixDom() {
    const subtitle = document.querySelector('.page-header .text-secondary');
    if (subtitle) subtitle.textContent = '51 تقريرًا استراتيجيًا ومحاسبيًا موزعة على 8 أجنحة - نسخة 2025';
    const cards = document.querySelectorAll('.stats-card h3');
    if (cards[0]) cards[0].textContent = '51';
    if (cards[1]) cards[1].textContent = '8';

    const filters = document.querySelector('.filter-buttons');
    if (filters && !filters.querySelector('[data-filter-quality]')) {
      filters.insertAdjacentHTML('beforeend', `<button class="filter-btn" data-filter-quality="true" onclick="filterWing('quality', this)">ديوان جودة الأرباح</button>`);
    }

    const investmentGrid = document.querySelector('[data-wing="investment"] .report-grid');
    if (investmentGrid && !investmentGrid.querySelector('[onclick*="capm-model"]')) {
      investmentGrid.insertAdjacentHTML('afterbegin', capmCardHtml());
    }
    const investmentBadge = document.querySelector('[data-wing="investment"] .wing-badge');
    if (investmentBadge) investmentBadge.textContent = '4 تقارير';

    const financeGrid = document.querySelector('[data-wing="finance"] .report-grid');
    if (financeGrid && !financeGrid.querySelector('[onclick*="trial-balance-audit"]')) {
      financeGrid.insertAdjacentHTML('beforeend', accountingCardsHtml());
    }
    const financeBadge = document.querySelector('[data-wing="finance"] .wing-badge');
    if (financeBadge) financeBadge.textContent = '15 تقريرًا';
  }

  function table(title, rowsHtml) {
    return `<div class="p-4"><h4 class="mb-4">${title}</h4>${professionalNotice()}<table class="table table-bordered table-sm"><tbody>${rowsHtml}</tbody></table></div>`;
  }
  function professionalNotice() {
    return `<div class="alert alert-info"><i class="fas fa-info-circle"></i> البيانات موحدة مع منطق صفحة القوائم المالية المعتمد. النتائج التحليلية التي تعتمد على افتراضات تظهر كمؤشرات إرشادية وليست رأيًا مهنيًا مستقلًا.</div>`;
  }

  const byName = (data, patterns) => rows(data).filter(a => patterns.some(p => String(a.name || '').includes(p)));
  const tr = (a, amount = null) => `<tr><td>${a.name || ''}<br><small>${a.account_id || ''}</small></td><td>${a.category || ''} / ${a.sub_category || ''}</td><td class="text-end">${fmt(amount === null ? finalBalance(a, window.PolarisReportingAudit?.adjustments || []) : amount)}</td></tr>`;

  function generateTrialBalanceAudit(data) {
    const audit = window.PolarisReportingAudit || { adjustments: [] };
    const debit = data.trialBalance.reduce((s, a) => s + Math.max(0, finalBalance(a, audit.adjustments)), 0);
    const credit = data.trialBalance.reduce((s, a) => s + Math.abs(Math.min(0, finalBalance(a, audit.adjustments))), 0);
    const diff = r2(debit - credit);
    const critical = data.trialBalance.filter(a => !a.category || !a.sub_category || String(a.account_id) === 'SUSP-001' || (a.category === 'assets' && String(a.sub_category) !== '121099' && finalBalance(a, audit.adjustments) < -0.1) || (a.category === 'liabilities' && finalBalance(a, audit.adjustments) > 0.1));
    return `<div class="p-4"><h4>ميزان مراجعة معتمد</h4>${professionalNotice()}<div class="row mb-3"><div class="col-md-3"><div class="stats-card"><h3>${data.trialBalance.length}</h3><p>عدد الحسابات</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${fmt(debit)}</h3><p>إجمالي المدين</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${fmt(credit)}</h3><p>إجمالي الدائن</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${fmt(diff)}</h3><p>فرق الميزان</p></div></div></div><h6>الحسابات الحرجة</h6><table class="table table-bordered table-sm"><tbody>${critical.slice(0, 30).map(a => tr(a, finalBalance(a, audit.adjustments))).join('') || '<tr><td>لا توجد حسابات حرجة ظاهرة</td></tr>'}</tbody></table></div>`;
  }
  function generateReceivablesAging(data) { const items = data.categorized.currentAssets.filter(a => mapSub(a) === 'trade_receivables'); return table('أعمار الذمم المدينة', items.map(a => tr(a)).join('') || '<tr><td>لا توجد أرصدة عملاء مصنفة.</td></tr>'); }
  function generatePayablesAging(data) { const items = data.categorized.currentLiabilities.filter(a => mapSub(a) === 'trade_payables'); return table('أعمار الموردين', items.map(a => tr(a)).join('') || '<tr><td>لا توجد أرصدة موردين مصنفة.</td></tr>'); }
  function generateFixedAssetsRegister(data) { const items = data.categorized.fixedAssets; const cost = items.filter(a => mapSub(a) === 'fixed_assets').reduce((s,a)=>s+num(a.finalBalance),0); const accDep = items.filter(a => mapSub(a) === 'fixed_assets_accumulation').reduce((s,a)=>s+num(a.finalBalance),0); return table('سجل الأصول والإهلاك', `<tr><td>تكلفة الأصول الثابتة</td><td class="text-end">${fmt(cost)}</td></tr><tr><td>مجمع الإهلاك</td><td class="text-end">${fmt(accDep)}</td></tr><tr class="table-primary"><td><strong>صافي القيمة الدفترية</strong></td><td class="text-end"><strong>${fmt(cost + accDep)}</strong></td></tr>` + items.map(a => tr(a)).join('')); }
  function generateVatReconciliation(data) { const vat = byName(data, ['ضريبة القيمة المضافة', 'القيمة المضافة']); return table('مطابقة ضريبة القيمة المضافة', vat.map(a => tr(a)).join('') || '<tr><td>لا توجد حسابات ضريبة قيمة مضافة مصنفة بالاسم.</td></tr>'); }
  function generateZakatBase(data) { const base = data.equity + data.longTermLiabilities + Math.max(0, data.currentLiabilities - data.currentAssets); return table('الوعاء الزكوي التقديري', `<tr><td>حقوق الملكية بعد نتيجة الفترة</td><td class="text-end">${fmt(data.equity)}</td></tr><tr><td>الديون طويلة الأجل</td><td class="text-end">${fmt(data.longTermLiabilities)}</td></tr><tr><td>فائض الالتزامات المتداولة على الأصول المتداولة</td><td class="text-end">${fmt(Math.max(0, data.currentLiabilities - data.currentAssets))}</td></tr><tr class="table-warning"><td><strong>وعاء تقديري أولي</strong></td><td class="text-end"><strong>${fmt(base)}</strong></td></tr><tr><td colspan="2">هذا حساب تقديري أولي ولا يغني عن إقرار الزكاة الرسمي.</td></tr>`); }
  function generateRelatedParties(data) { const items = byName(data, ['جارى', 'جاري', 'شقيقه', 'شقيقة', 'مؤسسه', 'مؤسسة', 'مهدي', 'الشركاء']); return table('الأطراف ذات العلاقة', items.map(a => tr(a)).join('') || '<tr><td>لا توجد حسابات أطراف ذات علاقة ظاهرة بالاسم.</td></tr>'); }
  function generateCAPMFallback(data) { const rf = 0.045, beta = 1.1, marketPremium = 0.065; const cost = rf + beta * marketPremium; return table('CAPM Model', `<tr><td>معدل خالي من المخاطر - افتراضي</td><td class="text-end">${(rf*100).toFixed(1)}%</td></tr><tr><td>Beta - افتراضي</td><td class="text-end">${beta.toFixed(2)}</td></tr><tr><td>علاوة السوق - افتراضية</td><td class="text-end">${(marketPremium*100).toFixed(1)}%</td></tr><tr class="table-primary"><td><strong>تكلفة حقوق الملكية التقديرية</strong></td><td class="text-end"><strong>${(cost*100).toFixed(1)}%</strong></td></tr>`); }

  function patchReports() {
    const originalGenerate = window.generateReportContent;
    window.getData = buildUnifiedData;
    window.generateReportContent = function(reportId, title, isForExport = false) {
      const data = buildUnifiedData();
      if (!data) return `<div class="alert alert-danger text-center p-5"><h4>لا توجد بيانات معتمدة</h4><p>ارجع لصفحة المراجعة واعتمد الميزان النهائي.</p></div>`;
      window.PolarisReportingAudit = { trialBalance: data.trialBalance, adjustments: data.adjustments };
      const custom = {
        'trial-balance-audit': generateTrialBalanceAudit,
        'receivables-aging': generateReceivablesAging,
        'payables-aging': generatePayablesAging,
        'fixed-assets-register': generateFixedAssetsRegister,
        'vat-reconciliation': generateVatReconciliation,
        'zakat-base': generateZakatBase,
        'related-parties': generateRelatedParties,
        'capm-model': typeof window.generateCAPM === 'function' ? window.generateCAPM : generateCAPMFallback
      };
      if (custom[reportId]) return custom[reportId](data);
      try {
        const html = originalGenerate ? originalGenerate.call(this, reportId, title, isForExport) : '';
        return html.replace('<div class="p-4">', `<div class="p-4">${professionalNotice()}`);
      } catch (e) {
        console.warn('Report fallback used:', reportId, e);
        return `<div class="alert alert-warning p-4"><h4>${title}</h4>${professionalNotice()}<p>هذا التقرير يحتاج مدخلات إضافية أو دالة مخصصة. تم منع كسر الصفحة وعرض هذا التنبيه بدل الخطأ.</p><pre class="small">${String(e.message || e)}</pre></div>`;
      }
    };
  }

  function boot() {
    if ((location.pathname || '').split('/').pop() !== 'reporting-pantheon.html') return;
    fixDom();
    patchReports();
    window.PolarisReportingQA = { patched: true, buildUnifiedData, fixDom, finalBalance, categorize, income, balance, cashFlow };
    console.log('Polaris reporting QA patch loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 500));
  else setTimeout(boot, 500);
})();

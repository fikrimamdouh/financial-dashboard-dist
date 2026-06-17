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
  const subMap = () => window.SUB_CATEGORY_MAPPING || {};

  function finalBalance(account, adjustments = [], isPriorYear = false) {
    if (!account) return 0;
    const ob = num(account.ob_debit) - num(account.ob_credit);
    if (isPriorYear) return ob;
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

  function openingBalance(account) {
    return num(account?.ob_debit) - num(account?.ob_credit);
  }

  function mapSub(account) {
    return subMap()[String(account?.sub_category || '')] || '';
  }

  function isContraRevenue(account) {
    const name = String(account?.name || '');
    const sub = String(account?.sub_category || '');
    return sub === '410099' || mapSub(account) === 'sales_discount' || name.includes('خصم مسموح') || name.includes('مردود') || name.includes('مرتجع');
  }

  function isMainRevenue(account) {
    if (isContraRevenue(account)) return true;
    const id = String(account?.account_id || '');
    const name = String(account?.name || '').toLowerCase();
    return id.startsWith('401') || id.startsWith('410') || name.includes('مبيعات') || name.includes('خرسانة') || name.includes('الخرسانة') || name.includes('بلوك') || name.includes('البلوك') || name.includes('كسارة') || name.includes('الكسارة');
  }

  function patchCategorizeAccounts() {
    window.categorizeAccounts = function(trialBalance, adjustments = []) {
      const categorized = {
        revenue: [], cogs: [], operatingExpenses: [], currentAssets: [], fixedAssets: [], currentLiabilities: [], longTermLiabilities: [], equity: [],
        note3_cash: [], note4_tradeReceivables: [], note5_otherReceivables: [], note6_inventory: [], note_prepaid_expenses: []
      };

      (trialBalance || []).forEach(account => {
        if (!account || !account.category) return;
        const final = finalBalance(account, adjustments, false);
        const a = { ...account, finalBalance: final };
        const main = String(account.category || '').toLowerCase();
        const mapped = mapSub(account);
        const code = String(account.account_id || '');

        if (main === 'assets') {
          if (mapped === 'fixed_assets' || mapped === 'fixed_assets_accumulation') categorized.fixedAssets.push(a);
          else if (['cash', 'trade_receivables', 'other_receivables', 'prepaid_expenses', 'inventory'].includes(mapped)) categorized.currentAssets.push(a);
          if (mapped === 'cash') categorized.note3_cash.push(a);
          if (mapped === 'trade_receivables') categorized.note4_tradeReceivables.push(a);
          if (mapped === 'other_receivables') categorized.note5_otherReceivables.push(a);
          if (mapped === 'inventory') categorized.note6_inventory.push(a);
          if (mapped === 'prepaid_expenses') categorized.note_prepaid_expenses.push(a);
          return;
        }

        if (main === 'liabilities') {
          if (String(account.sub_category || '').startsWith('22') || mapped === 'long_term_loans') categorized.longTermLiabilities.push(a);
          else categorized.currentLiabilities.push(a);
          return;
        }

        if (main === 'equity') { categorized.equity.push(a); return; }
        if (main === 'revenue') { categorized.revenue.push(a); return; }
        if (main === 'expenses' || main === 'cost_of_revenue') {
          if (code.startsWith('303') || mapped === 'cogs' || code.startsWith('5')) categorized.cogs.push(a);
          else categorized.operatingExpenses.push(a);
        }
      });
      return categorized;
    };
  }

  function patchIncomeStatement() {
    window.generateIncomeStatement = function(categorizedData) {
      if (!categorizedData) return { totalRevenue: 0, totalCOGS: 0, grossProfit: 0, operatingExpenses: 0, adminExpenses: 0, depreciationExpense: 0, totalExpenses: 0, otherRevenues: 0, netIncomeBeforeZakat: 0, zakatExpense: 0, finalNetIncome: 0, netProfit: 0, allAccounts: {} };

      const revenue = categorizedData.revenue || [];
      const mainRevenueAccounts = revenue.filter(isMainRevenue);
      const otherRevenueAccounts = revenue.filter(a => !isMainRevenue(a));
      const totalRevenue = -mainRevenueAccounts.reduce((sum, a) => sum + num(a.finalBalance), 0);
      const otherRevenues = -otherRevenueAccounts.reduce((sum, a) => sum + num(a.finalBalance), 0);
      const totalCOGS = (categorizedData.cogs || []).reduce((sum, a) => sum + Math.abs(num(a.finalBalance)), 0);
      const grossProfit = totalRevenue - totalCOGS;

      const opexAccounts = categorizedData.operatingExpenses || [];
      const depreciationExpense = opexAccounts.filter(a => String(a.account_id || '').startsWith('601010003')).reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
      const zakatExpense = opexAccounts.filter(a => String(a.account_id || '').startsWith('72') || String(a.account_id || '') === '601020030').reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
      const adminExpenses = opexAccounts.filter(a => String(a.account_id || '').startsWith('60102') && String(a.account_id || '') !== '601020030').reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
      const operatingExpenses = opexAccounts.filter(a => String(a.account_id || '').startsWith('60101') && !String(a.account_id || '').startsWith('601010003')).reduce((s, a) => s + Math.abs(num(a.finalBalance)), 0);
      const totalExpenses = operatingExpenses + adminExpenses + depreciationExpense;
      const netIncomeBeforeZakat = grossProfit + otherRevenues - totalExpenses;
      const finalNetIncome = netIncomeBeforeZakat - zakatExpense;

      return { totalRevenue: r2(totalRevenue), totalCOGS: r2(totalCOGS), grossProfit: r2(grossProfit), operatingExpenses: r2(operatingExpenses), adminExpenses: r2(adminExpenses), depreciationExpense: r2(depreciationExpense), totalExpenses: r2(totalExpenses), otherRevenues: r2(otherRevenues), netIncomeBeforeZakat: r2(netIncomeBeforeZakat), zakatExpense: r2(zakatExpense), finalNetIncome: r2(finalNetIncome), netProfit: r2(finalNetIncome), allAccounts: categorizedData };
    };
  }

  function patchBalanceSheet() {
    window.generateBalanceSheet = function(categorizedData, netProfit, isPriorYear = false) {
      if (!categorizedData) return { currentAssets: 0, fixedAssets: 0, totalAssets: 0, currentLiabilities: 0, longTermLiabilities: 0, totalLiabilities: 0, totalEquity: 0, isBalanced: false, accountingEquationBalance: 0, allAccounts: {} };
      const sum = arr => (arr || []).reduce((s, a) => s + num(a.finalBalance), 0);
      const currentAssets = sum(categorizedData.currentAssets);
      const fixedAssets = sum(categorizedData.fixedAssets);
      const totalAssets = currentAssets + fixedAssets;
      const currentLiabilities = Math.abs(sum(categorizedData.currentLiabilities));
      const longTermLiabilities = Math.abs(sum(categorizedData.longTermLiabilities));
      const totalLiabilities = currentLiabilities + longTermLiabilities;
      const equityBeforeResult = -sum(categorizedData.equity);
      const totalEquity = equityBeforeResult + num(netProfit);
      const accountingEquationBalance = r2(totalAssets - totalLiabilities - totalEquity);
      return { currentAssets: r2(currentAssets), fixedAssets: r2(fixedAssets), totalAssets: r2(totalAssets), currentLiabilities: r2(currentLiabilities), longTermLiabilities: r2(longTermLiabilities), totalLiabilities: r2(totalLiabilities), totalEquity: r2(totalEquity), isBalanced: Math.abs(accountingEquationBalance) <= 1, accountingEquationBalance, allAccounts: categorizedData };
    };
  }

  function accountSum(auditData, filter, mode = 'closing') {
    const adjustments = auditData?.adjustments || [];
    return (auditData?.trialBalance || []).filter(filter).reduce((sum, account) => {
      if (mode === 'opening') return sum + openingBalance(account);
      return sum + finalBalance(account, adjustments, false);
    }, 0);
  }

  function cashFlowDiagnostics(auditData, cf) {
    const cashFilter = acc => mapSub(acc) === 'cash';
    const openingCashActual = accountSum(auditData, cashFilter, 'opening');
    const closingCashActual = accountSum(auditData, cashFilter, 'closing');
    const computedClosingCash = num(cf.openingCash) + num(cf.netCashChange);
    const reconciliationDiff = r2(closingCashActual - computedClosingCash);
    const qualityRatio = Math.abs(num(cf.netIncome)) > 0.000001 ? num(cf.cashFlowFromOps) / Math.abs(num(cf.netIncome)) : NaN;
    const warnings = [];
    if (Math.abs(reconciliationDiff) > 1) warnings.push('النقدية الختامية في التدفقات لا تطابق أرصدة النقد والبنوك.');
    if (num(cf.netIncome) < 0 && num(cf.cashFlowFromOps) < 0) warnings.push('خسارة تشغيلية ونقدية تشغيلية سالبة: مؤشر ضغط سيولة.');
    if (Number.isFinite(qualityRatio) && qualityRatio < 0) warnings.push('جودة الربح/الخسارة نقديًا ضعيفة: التدفق التشغيلي عكس اتجاه النتيجة.');
    return { openingCashActual: r2(openingCashActual), closingCashActual: r2(closingCashActual), computedClosingCash: r2(computedClosingCash), reconciliationDiff, qualityRatio: Number.isFinite(qualityRatio) ? r2(qualityRatio) : null, warnings };
  }

  function patchCashFlow() {
    window.generateCashFlowUnified = function(auditData, incomeData) {
      const getClosing = filter => accountSum(auditData, filter, 'closing');
      const getOpening = filter => accountSum(auditData, filter, 'opening');
      const mapped = key => acc => mapSub(acc) === key;
      const mappedAny = keys => acc => keys.includes(mapSub(acc));
      const isFixedAssetCost = acc => mapSub(acc) === 'fixed_assets';
      const isLongDebt = acc => String(acc.sub_category || '').startsWith('22') || mapSub(acc) === 'long_term_loans';
      const isEquity = acc => String(acc.category || '').toLowerCase() === 'equity';

      const netIncome = num(incomeData.netProfit || incomeData.finalNetIncome || 0);
      const depreciation = Math.abs(num(incomeData.depreciationExpense || 0));
      const changeInReceivables = getClosing(mappedAny(['trade_receivables', 'other_receivables'])) - getOpening(mappedAny(['trade_receivables', 'other_receivables']));
      const changeInInventory = getClosing(mapped('inventory')) - getOpening(mapped('inventory'));
      const changeInPrepaidExpenses = getClosing(mapped('prepaid_expenses')) - getOpening(mapped('prepaid_expenses'));
      const changeInPayablesSigned = getClosing(mapped('trade_payables')) - getOpening(mapped('trade_payables'));
      const changeInOtherPayablesSigned = getClosing(mappedAny(['other_payables', 'accrued_expenses'])) - getOpening(mappedAny(['other_payables', 'accrued_expenses']));
      const changeInZakatSigned = getClosing(mapped('zakat_tax_provision')) - getOpening(mapped('zakat_tax_provision'));
      const changeInPayables = -changeInPayablesSigned;
      const changeInOtherPayables = -changeInOtherPayablesSigned;
      const changeInZakat = -changeInZakatSigned;
      const cashFlowFromOps = netIncome + depreciation - changeInReceivables - changeInInventory - changeInPrepaidExpenses + changeInPayables + changeInOtherPayables + changeInZakat;

      const changeInFixedAssetsCost = getClosing(isFixedAssetCost) - getOpening(isFixedAssetCost);
      const cashFlowFromInv = -changeInFixedAssetsCost;
      const changeInLongTermLiabilities = -(getClosing(isLongDebt) - getOpening(isLongDebt));
      const equityMovementBeforeResult = -(getClosing(isEquity) - getOpening(isEquity));
      const changeInEquity = equityMovementBeforeResult - netIncome;
      const cashFlowFromFin = changeInLongTermLiabilities + changeInEquity;
      const netCashChange = cashFlowFromOps + cashFlowFromInv + cashFlowFromFin;
      const openingCash = getOpening(mapped('cash'));
      const closingCash = openingCash + netCashChange;

      const cf = { netIncome: r2(netIncome), depreciation: r2(depreciation), changeInReceivables: r2(changeInReceivables), changeInInventory: r2(changeInInventory), changeInPrepaidExpenses: r2(changeInPrepaidExpenses), changeInPayables: r2(changeInPayables), changeInOtherPayables: r2(changeInOtherPayables), changeInZakat: r2(changeInZakat), cashFlowFromOps: r2(cashFlowFromOps), changeInFixedAssets: r2(changeInFixedAssetsCost), cashFlowFromInv: r2(cashFlowFromInv), changeInLongTermLiabilities: r2(changeInLongTermLiabilities), changeInEquity: r2(changeInEquity), cashFlowFromFin: r2(cashFlowFromFin), netCashChange: r2(netCashChange), openingCash: r2(openingCash), closingCash: r2(closingCash) };
      cf.diagnostics = cashFlowDiagnostics(auditData, cf);
      return cf;
    };

    window.generateCashFlowStatement = function(incomeData, currentBalance, priorBalance, auditData) {
      return window.generateCashFlowUnified(auditData, { netProfit: incomeData.finalNetIncome || incomeData.netProfit || 0, depreciationExpense: incomeData.depreciationExpense || 0 });
    };

    if (typeof window.displayCashFlowStatement === 'function') {
      const originalDisplayCashFlow = window.displayCashFlowStatement;
      window.displayCashFlowStatement = function(cashFlowData, categorizedData, categorizedDataPrior, auditData, comparisonMode, currentYear, priorYear) {
        const out = originalDisplayCashFlow.apply(this, arguments);
        const cf = cashFlowData?.current || {};
        const diag = cf.diagnostics || cashFlowDiagnostics(auditData, cf);
        const container = document.getElementById('cashFlowContent');
        if (container && !document.getElementById('cashFlowDiagnosticsBox')) {
          const statusClass = Math.abs(num(diag.reconciliationDiff)) <= 1 ? 'alert-success' : 'alert-danger';
          const warnings = (diag.warnings || []).map(w => `<li>${w}</li>`).join('');
          container.insertAdjacentHTML('beforeend', `<div id="cashFlowDiagnosticsBox" class="alert ${statusClass} mt-3"><strong>فحص التدفقات النقدية:</strong><br>النقدية الفعلية آخر الفترة: ${formatCurrency(diag.closingCashActual)}<br>النقدية حسب قائمة التدفقات: ${formatCurrency(diag.computedClosingCash)}<br>فرق المطابقة: ${formatCurrency(diag.reconciliationDiff)}${warnings ? `<ul class="mb-0 mt-2">${warnings}</ul>` : '<div class="mt-2">قائمة التدفقات النقدية متطابقة مع أرصدة النقد والبنوك ضمن حد السماحية.</div>'}</div>`);
        }
        return out;
      };
    }
  }

  function patchCharts() {
    if (typeof Chart === 'undefined') return;
    window.initializeCharts = function(incomeData, balanceData) {
      Object.values(window.chartInstances || {}).forEach(chart => { try { chart.destroy(); } catch {} });
      window.chartInstances = window.chartInstances || {};
      const currentIncome = incomeData.current || {};
      const priorIncome = incomeData.prior || {};
      const currentBalance = balanceData.current || {};
      const make = (id, cfg) => { const ctx = document.getElementById(id)?.getContext('2d'); if (ctx) window.chartInstances[id] = new Chart(ctx, cfg); };
      make('revenueChart', { type: 'bar', data: { labels: ['السنة الحالية', 'السنة السابقة'], datasets: [{ label: 'صافي الإيرادات', data: [num(currentIncome.totalRevenue), num(priorIncome.totalRevenue)], backgroundColor: 'rgba(0, 170, 255, 0.6)' }, { label: 'صافي الربح', data: [num(currentIncome.finalNetIncome), num(priorIncome.finalNetIncome)], backgroundColor: 'rgba(40, 167, 69, 0.6)' }] }, options: { responsive: true, maintainAspectRatio: false } });
      make('assetsChart', { type: 'doughnut', data: { labels: ['أصول متداولة', 'أصول ثابتة'], datasets: [{ data: [num(currentBalance.currentAssets), num(currentBalance.fixedAssets)], backgroundColor: ['rgba(0, 170, 255, 0.7)', 'rgba(0, 100, 150, 0.7)'] }] }, options: { responsive: true, maintainAspectRatio: false } });
      make('liabilitiesChart', { type: 'pie', data: { labels: ['التزامات متداولة', 'التزامات طويلة الأجل', 'حقوق الملكية'], datasets: [{ data: [num(currentBalance.currentLiabilities), num(currentBalance.longTermLiabilities), num(currentBalance.totalEquity)], backgroundColor: ['rgba(255, 193, 7, 0.7)', 'rgba(220, 53, 69, 0.7)', 'rgba(40, 167, 69, 0.7)'] }] }, options: { responsive: true, maintainAspectRatio: false } });
      const grossMargin = num(currentIncome.totalRevenue) ? num(currentIncome.grossProfit) / num(currentIncome.totalRevenue) * 100 : 0;
      const netMargin = num(currentIncome.totalRevenue) ? num(currentIncome.finalNetIncome) / num(currentIncome.totalRevenue) * 100 : 0;
      make('marginsChart', { type: 'bar', data: { labels: ['هامش الربح الإجمالي', 'هامش الربح الصافي'], datasets: [{ label: 'هوامش الربح (%)', data: [grossMargin, netMargin], backgroundColor: ['rgba(23, 162, 184, 0.6)', 'rgba(40, 167, 69, 0.6)'] }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => v + '%' } } } } });
    };
  }

  function patchWorkingCapitalNote() {
    window.renderNote13 = function(balanceData, comparisonMode) {
      const container = document.getElementById('note15Content') || document.getElementById('note13Content');
      if (!container || !balanceData || !balanceData.current) return;
      const currentWC = num(balanceData.current.currentAssets) - num(balanceData.current.currentLiabilities);
      const priorWC = comparisonMode && balanceData.prior ? num(balanceData.prior.currentAssets) - num(balanceData.prior.currentLiabilities) : 0;
      container.innerHTML = `<div class="note-description"><p>رأس المال العامل = الأصول المتداولة - الالتزامات المتداولة.</p></div><table class="financial-table"><thead><tr><th>البند</th><th class="text-end">السنة الحالية</th>${comparisonMode ? '<th class="text-end">السنة السابقة</th>' : ''}</tr></thead><tbody><tr><td>مجموع الأصول المتداولة</td><td class="amount text-end">${formatCurrency(balanceData.current.currentAssets)}</td>${comparisonMode ? `<td class="amount text-end">${formatCurrency(balanceData.prior.currentAssets)}</td>` : ''}</tr><tr><td>يخصم: مجموع الالتزامات المتداولة</td><td class="amount text-end negative">(${formatCurrency(balanceData.current.currentLiabilities)})</td>${comparisonMode ? `<td class="amount text-end negative">(${formatCurrency(balanceData.prior.currentLiabilities)})</td>` : ''}</tr><tr class="total"><td><strong>صافي رأس المال العامل</strong></td><td class="amount text-end ${currentWC < 0 ? 'negative' : ''}"><strong>${formatCurrency(currentWC)}</strong></td>${comparisonMode ? `<td class="amount text-end ${priorWC < 0 ? 'negative' : ''}"><strong>${formatCurrency(priorWC)}</strong></td>` : ''}</tr></tbody></table><div class="alert ${currentWC > 0 ? 'alert-success' : 'alert-danger'} mt-3">${currentWC > 0 ? 'الشركة لديها رأس مال عامل موجب.' : 'تحذير: الشركة لديها عجز في رأس المال العامل.'}</div>`;
    };
  }

  function boot() {
    if ((location.pathname || '').split('/').pop() !== 'consolidation-cockpit.html') return;
    patchCategorizeAccounts();
    patchIncomeStatement();
    patchBalanceSheet();
    patchCashFlow();
    patchCharts();
    patchWorkingCapitalNote();
    window.PolarisConsolidationQA = { patched: true, finalBalance, isContraRevenue, isMainRevenue, cashFlowDiagnostics };
    console.log('Polaris consolidation QA patch loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

;(() => {
  'use strict';

  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const x = String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, '');
    const p = parseFloat(x);
    return Number.isFinite(p) ? p : 0;
  }

  function finalBal(a) {
    if (!a) return 0;
    if (a.book_balance !== undefined && a.book_balance !== null && a.book_balance !== '') return num(a.book_balance);
    return num(a.ob_debit) - num(a.ob_credit) + num(a.move_debit) - num(a.move_credit);
  }

  function openingBal(a) {
    return num(a?.ob_debit) - num(a?.ob_credit);
  }

  function pct(v) { return Number.isFinite(v) ? v.toFixed(1) + '%' : 'غير قابل للقياس'; }
  function times(v) { return Number.isFinite(v) ? v.toFixed(1) + 'x' : 'غير قابل للقياس'; }
  function days(v) { return Number.isFinite(v) ? Math.round(v).toString() : 'غير قابل للقياس'; }
  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function safeDiv(a, b) { return Math.abs(b) > 0.000001 ? a / b : NaN; }

  function getProfitData() {
    if (window.PolarisAccountingQA && typeof PolarisAccountingQA.calculateProfitCore === 'function') {
      return PolarisAccountingQA.calculateProfitCore();
    }
    if (typeof calculateNetProfit === 'function') return calculateNetProfit(true);
    return { profitAfter: 0, netRevenue: 0, costOfSales: 0, grossProfit: 0 };
  }

  function sumRows(filter, balanceFn) {
    const rows = window.auditFile && Array.isArray(auditFile.trialBalance) ? auditFile.trialBalance : [];
    return rows.filter(filter).reduce((s, a) => s + balanceFn(a), 0);
  }

  function avgAbsBalance(filter) {
    const closing = Math.abs(sumRows(filter, finalBal));
    const opening = Math.abs(sumRows(filter, openingBal));
    return (opening + closing) / 2;
  }

  function calculateEquityFixedRatios() {
    const p = getProfitData();
    const isAsset = a => String(a.category || '') === 'assets';
    const isLiability = a => String(a.category || '') === 'liabilities';
    const isEquity = a => String(a.category || '') === 'equity';
    const isCurrentAsset = a => String(a.category || '') === 'assets' && String(a.sub_category || '').startsWith('11');
    const isCurrentLiability = a => String(a.category || '') === 'liabilities' && String(a.sub_category || '').startsWith('21');
    const isInventory = a => String(a.sub_category || '').startsWith('116');
    const isReceivable = a => ['113001', '113002', '113003', '113004', '113099'].includes(String(a.sub_category || ''));

    const currentAssets = Math.abs(sumRows(isCurrentAsset, finalBal));
    const inventory = Math.abs(sumRows(isInventory, finalBal));
    const currentLiabilities = Math.abs(sumRows(isCurrentLiability, finalBal));
    const totalAssets = Math.abs(sumRows(isAsset, finalBal));
    const totalLiabilities = Math.abs(sumRows(isLiability, finalBal));

    // Equity accounts are credit-nature accounts, stored as negative when credit.
    // Correct equity before current result = -(sum equity balances).
    // Closing equity after current result = equity before result + current profit/loss.
    const equityBeforeCurrentResult = -sumRows(isEquity, finalBal);
    const equityAfterCurrentResult = equityBeforeCurrentResult + (num(p.profitAfter) || 0);

    const avgAssets = avgAbsBalance(isAsset) || totalAssets;
    const avgReceivables = avgAbsBalance(isReceivable);
    const avgInventory = avgAbsBalance(isInventory) || inventory;

    const netRevenue = num(p.netRevenue || p.totalRevenue || p.grossRevenue || 0);
    const grossProfit = num(p.grossProfit || 0);
    const costOfSales = num(p.costOfSales || 0);
    const profitAfter = num(p.profitAfter || 0);

    const grossMargin = safeDiv(grossProfit, netRevenue) * 100;
    const netMargin = safeDiv(profitAfter, netRevenue) * 100;
    const roa = safeDiv(profitAfter, avgAssets) * 100;
    const roe = equityAfterCurrentResult > 0 ? safeDiv(profitAfter, equityAfterCurrentResult) * 100 : NaN;
    const currentRatio = safeDiv(currentAssets, currentLiabilities);
    const quickRatio = safeDiv(currentAssets - inventory, currentLiabilities);
    const debtToEquity = equityAfterCurrentResult > 0 ? safeDiv(totalLiabilities, equityAfterCurrentResult) : NaN;
    const assetTurnover = safeDiv(netRevenue, avgAssets);
    const collectionPeriod = safeDiv(avgReceivables, netRevenue / 365);
    const inventoryTurnover = safeDiv(costOfSales, avgInventory);
    const debtRatio = safeDiv(totalLiabilities, totalAssets) * 100;
    const workingCapital = currentAssets - currentLiabilities;

    const result = {
      grossMargin: { value: grossMargin, display: pct(grossMargin), unit: '%', priorValue: null, indicator: grossMargin >= 20 ? 'good' : grossMargin >= 10 ? 'warning' : 'danger', explanation: 'مجمل الربح ÷ صافي الإيرادات' },
      netMargin: { value: netMargin, display: pct(netMargin), unit: '%', priorValue: null, indicator: netMargin >= 10 ? 'good' : netMargin >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ صافي الإيرادات' },
      roa: { value: roa, display: pct(roa), unit: '%', priorValue: null, indicator: roa >= 5 ? 'good' : roa >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ متوسط الأصول' },
      roe: { value: roe, display: Number.isFinite(roe) ? pct(roe) : 'غير قابل للقياس: حقوق الملكية صفر/سالبة', unit: '%', priorValue: null, indicator: Number.isFinite(roe) && roe >= 15 ? 'good' : Number.isFinite(roe) && roe >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ حقوق الملكية بعد نتيجة الفترة. جاري الشركاء الدائن يزيد حقوق الملكية، والجاري المدين والخسائر تخفضها.' },
      currentRatio: { value: currentRatio, display: times(currentRatio), unit: 'x', priorValue: null, indicator: currentRatio >= 1.5 ? 'good' : currentRatio >= 1 ? 'warning' : 'danger', explanation: 'الأصول المتداولة ÷ الالتزامات المتداولة' },
      quickRatio: { value: quickRatio, display: times(quickRatio), unit: 'x', priorValue: null, indicator: quickRatio >= 1 ? 'good' : quickRatio >= 0.5 ? 'warning' : 'danger', explanation: '(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة' },
      debtToEquity: { value: debtToEquity, display: Number.isFinite(debtToEquity) ? times(debtToEquity) : 'غير قابل للقياس: حقوق الملكية صفر/سالبة', unit: 'x', priorValue: null, indicator: Number.isFinite(debtToEquity) && debtToEquity <= 1 ? 'good' : Number.isFinite(debtToEquity) && debtToEquity <= 1.5 ? 'warning' : 'danger', explanation: 'إجمالي الالتزامات ÷ حقوق الملكية بعد نتيجة الفترة' },
      assetTurnover: { value: assetTurnover, display: times(assetTurnover), unit: 'x', priorValue: null, indicator: assetTurnover >= 1 ? 'good' : assetTurnover >= 0.5 ? 'warning' : 'danger', explanation: 'صافي الإيرادات ÷ متوسط الأصول' },
      collectionPeriod: { value: collectionPeriod, display: days(collectionPeriod), unit: 'يوم', priorValue: null, indicator: collectionPeriod <= 45 ? 'good' : collectionPeriod <= 75 ? 'warning' : 'danger', explanation: 'متوسط العملاء ÷ (صافي الإيرادات ÷ 365)' },
      inventoryTurnover: { value: inventoryTurnover, display: times(inventoryTurnover), unit: 'x', priorValue: null, indicator: inventoryTurnover >= 6 ? 'good' : inventoryTurnover >= 3 ? 'warning' : 'danger', explanation: 'تكلفة الإيرادات ÷ متوسط المخزون' },
      debtRatio: { value: debtRatio, display: pct(debtRatio), unit: '%', priorValue: null, indicator: debtRatio <= 50 ? 'good' : debtRatio <= 70 ? 'warning' : 'danger', explanation: 'إجمالي الالتزامات ÷ إجمالي الأصول' },
      workingCapital: { value: workingCapital, display: r2(workingCapital).toLocaleString('ar-SA'), unit: 'ر.س', priorValue: null, indicator: workingCapital > 0 ? 'good' : 'danger', explanation: 'الأصول المتداولة - الالتزامات المتداولة' },
      equityValue: { value: equityAfterCurrentResult, display: r2(equityAfterCurrentResult).toLocaleString('ar-SA'), unit: 'ر.س', priorValue: null, indicator: equityAfterCurrentResult > 0 ? 'good' : 'danger', explanation: 'حقوق الملكية بعد نتيجة الفترة = عكس رصيد حسابات حقوق الملكية + ربح/خسارة الفترة' }
    };

    console.table({
      equityBeforeCurrentResult: r2(equityBeforeCurrentResult),
      profitAfter: r2(profitAfter),
      equityAfterCurrentResult: r2(equityAfterCurrentResult),
      roe: result.roe.display,
      debtToEquity: result.debtToEquity.display
    });

    return result;
  }

  function patch() {
    if (typeof calculateFinancialRatios === 'function') calculateFinancialRatios = calculateEquityFixedRatios;
    if (typeof updateKpiPane === 'function') {
      const original = updateKpiPane;
      updateKpiPane = function() {
        const out = original.apply(this, arguments);
        const ratios = calculateEquityFixedRatios();
        Object.keys(ratios).forEach(key => {
          const card = document.querySelector(`[data-ratio="${key}"]`);
          if (!card) return;
          const valueEl = card.querySelector('.ratio-value');
          const compEl = card.querySelector('.ratio-comparison');
          const indicatorEl = card.querySelector('.ratio-indicator');
          if (valueEl) valueEl.textContent = ratios[key].display;
          if (compEl) {
            compEl.className = 'ratio-comparison neutral';
            compEl.innerHTML = '<i class="fas fa-info-circle"></i> لا توجد سنة سابقة معتمدة';
          }
          if (indicatorEl) indicatorEl.className = `ratio-indicator ${ratios[key].indicator}`;
          card.title = ratios[key].explanation || '';
        });
        return out;
      };
    }

    window.PolarisEquityRatioFix = { calculate: calculateEquityFixedRatios };
    window.PolarisRatiosQA = { calculate: calculateEquityFixedRatios };
    console.log('Polaris equity ratio fix loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(patch, 500));
  else setTimeout(patch, 500);
})();

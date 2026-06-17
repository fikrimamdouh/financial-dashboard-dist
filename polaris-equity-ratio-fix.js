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

  function openingBal(a) { return num(a?.ob_debit) - num(a?.ob_credit); }
  function pct(v) { return Number.isFinite(v) ? v.toFixed(1) + '%' : 'غير قابل للقياس'; }
  function times(v) { return Number.isFinite(v) ? v.toFixed(1) + 'x' : 'غير قابل للقياس'; }
  function days(v) { return Number.isFinite(v) ? Math.round(v).toString() : 'غير قابل للقياس'; }
  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function safeDiv(a, b) { return Math.abs(b) > 0.000001 ? a / b : NaN; }

  function rows() {
    return window.auditFile && Array.isArray(auditFile.trialBalance) ? auditFile.trialBalance : [];
  }

  function adjustmentAmount(id) {
    if (typeof calculateAdjustments === 'function') return num(calculateAdjustments(id));
    return 0;
  }

  function displayBalance(a) { return finalBal(a) + adjustmentAmount(a.account_id); }

  function isContraRevenue(a) {
    const sub = String(a?.sub_category || '');
    const name = String(a?.name || '');
    return String(a?.category || '') === 'revenue' && (
      sub === '410099' ||
      name.includes('خصم مسموح') ||
      name.includes('مردود') ||
      name.includes('مرتجع')
    );
  }

  function isIncomeStatementAccount(a) {
    const cat = String(a?.category || '');
    const code = String(a?.account_id || '');
    return cat === 'revenue' || cat === 'expenses' || cat === 'cost_of_revenue' || code.startsWith('3') || code.startsWith('4') || code.startsWith('5') || code.startsWith('6') || code.startsWith('7');
  }

  function isClearingAccount(a) {
    const cat = String(a?.category || '');
    const name = String(a?.name || '');
    return cat === 'clearing' || name.includes('وسيط') || name.includes('مراقبة') || name.includes('تسوية الفروقات');
  }

  function getProfitData() {
    if (window.PolarisAccountingQA && typeof PolarisAccountingQA.calculateProfitCore === 'function') return PolarisAccountingQA.calculateProfitCore();
    if (typeof calculateNetProfit === 'function') return calculateNetProfit(true);
    return { profitAfter: 0, netRevenue: 0, costOfSales: 0, grossProfit: 0 };
  }

  function sumRows(filter, balanceFn) { return rows().filter(filter).reduce((s, a) => s + balanceFn(a), 0); }
  function avgAbsBalance(filter) { return (Math.abs(sumRows(filter, finalBal)) + Math.abs(sumRows(filter, openingBal))) / 2; }

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

    return {
      grossMargin: { value: grossMargin, display: pct(grossMargin), unit: '%', priorValue: null, indicator: grossMargin >= 20 ? 'good' : grossMargin >= 10 ? 'warning' : 'danger', explanation: 'مجمل الربح ÷ صافي الإيرادات' },
      netMargin: { value: netMargin, display: pct(netMargin), unit: '%', priorValue: null, indicator: netMargin >= 10 ? 'good' : netMargin >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ صافي الإيرادات' },
      roa: { value: roa, display: pct(roa), unit: '%', priorValue: null, indicator: roa >= 5 ? 'good' : roa >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ متوسط الأصول' },
      roe: { value: roe, display: Number.isFinite(roe) ? pct(roe) : 'غير قابل للقياس: حقوق الملكية صفر/سالبة', unit: '%', priorValue: null, indicator: Number.isFinite(roe) && roe >= 15 ? 'good' : Number.isFinite(roe) && roe >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ حقوق الملكية بعد نتيجة الفترة' },
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
  }

  function patchAccountAnalysis() {
    window.preProcessAccountAnalysis = function() {
      rows().forEach(account => {
        const prior = openingBal(account);
        const finalBalance = displayBalance(account);
        let variance = 0;
        if (prior !== 0) variance = ((finalBalance - prior) / Math.abs(prior)) * 100;
        else if (finalBalance !== 0) variance = 100;

        const incomeWithNoPrior = isIncomeStatementAccount(account) && prior === 0 && finalBalance !== 0;
        account.variance = variance;
        account.isHighVariance = !incomeWithNoPrior && Math.abs(variance) > (window.VARIANCE_THRESHOLD || 25);

        const isContraAsset = String(account.sub_category || '') === '121099';
        let abnormal = false;
        if (String(account.account_id || '') === 'SUSP-001') abnormal = true;
        if (isClearingAccount(account) && Math.abs(finalBalance) > 0.10) abnormal = true;
        if (account.category === 'assets' && !isContraAsset && finalBalance < 0) abnormal = true;
        if ((account.category === 'liabilities' || account.category === 'equity' || isContraAsset) && finalBalance > 0) abnormal = true;
        if (account.category === 'revenue' && finalBalance > 0 && !isContraRevenue(account)) abnormal = true;
        if (account.category === 'expenses' && finalBalance < 0) abnormal = true;
        account.isAbnormal = abnormal;
        account.book_balance = finalBal(account);
      });
    };

    window.updateCockpit = function() {
      const highPriorityDiv = document.getElementById('high-priority-content');
      const mediumPriorityDiv = document.getElementById('medium-priority-content');
      const followUpDiv = document.getElementById('follow-up-content');
      if (!highPriorityDiv || !mediumPriorityDiv || !followUpDiv) return;

      highPriorityDiv.innerHTML = '';
      mediumPriorityDiv.innerHTML = '';
      followUpDiv.innerHTML = '';
      let highCount = 0, mediumCount = 0, followCount = 0;

      const item = (account, reason, priorityClass, riskScore) => {
        const finalBalance = displayBalance(account);
        const variance = num(account.variance || 0);
        return `<div class="cockpit-item ${priorityClass}" onclick="focusOnAccount('${account.account_id}')">${riskScore ? `<div class="risk-score">${riskScore}</div>` : ''}<div class="item-reason">${reason}</div><div class="item-account">${account.name} (${account.account_id})</div><div class="item-details"><span class="me-2">الرصيد: ${formatCurrency(finalBalance)}</span><span>التغير: ${variance.toFixed(1)}%</span></div></div>`;
      };

      rows().forEach(acc => {
        const finalBalance = displayBalance(acc);
        const hasMovement = (num(acc.move_debit) + num(acc.move_credit)) !== 0;
        const id = String(acc.account_id || '');

        if (!acc.category || !acc.sub_category) {
          highPriorityDiv.innerHTML += item(acc, 'الحساب غير مصنف', 'high-priority', 95); highCount++; return;
        }

        if (id === 'SUSP-001') {
          highPriorityDiv.innerHTML += item(acc, 'فرق تقريب داخل حساب تسوية: احذف قبل الاعتماد', 'high-priority', 95); highCount++; return;
        }

        if (isClearingAccount(acc) && Math.abs(finalBalance) > 0.10) {
          highPriorityDiv.innerHTML += item(acc, 'حساب وسيط/رقابي غير مقفل', 'high-priority', 88); highCount++;
        }

        if (acc.category === 'revenue' && finalBalance > 0 && !isContraRevenue(acc)) {
          highPriorityDiv.innerHTML += item(acc, 'رصيد إيراد مدين غير مبرر', 'high-priority', 90); highCount++;
        }

        if (isContraRevenue(acc) && finalBalance > 0) {
          followUpDiv.innerHTML += item(acc, 'خصم مبيعات طبيعي - لا يمثل خطرًا', 'follow-up', 20); followCount++;
        }

        if (acc.isHighVariance) {
          mediumPriorityDiv.innerHTML += item(acc, `تغير جوهري (${num(acc.variance).toFixed(0)}%)`, 'medium-priority', 70); mediumCount++;
        }

        if (['assets', 'equity'].includes(acc.category) && finalBalance !== 0 && !hasMovement && !isIncomeStatementAccount(acc)) {
          followUpDiv.innerHTML += item(acc, 'حساب جوهري بدون حركة', 'follow-up', 50); followCount++;
        }
      });

      document.getElementById('high-priority-count').textContent = highCount;
      document.getElementById('medium-priority-count').textContent = mediumCount;
      document.getElementById('follow-up-count').textContent = followCount;
      if (highCount === 0) highPriorityDiv.innerHTML = '<p class="text-muted small p-2">لا توجد مهام ذات أولوية قصوى.</p>';
      if (mediumCount === 0) mediumPriorityDiv.innerHTML = '<p class="text-muted small p-2">لا توجد ملاحظات تحتاج لتحليل فوري.</p>';
      if (followCount === 0) followUpDiv.innerHTML = '<p class="text-muted small p-2">لا توجد مؤشرات متابعة حالية.</p>';
    };

    setTimeout(() => {
      try { window.preProcessAccountAnalysis(); window.updateCockpit(); } catch (e) { console.warn('Cockpit QA patch failed', e); }
    }, 300);
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
          const valueEl = card.querySelector('.ratio-value, .value-placeholder');
          const compEl = card.querySelector('.ratio-comparison');
          const indicatorEl = card.querySelector('.ratio-indicator');
          if (valueEl) valueEl.textContent = ratios[key].display;
          if (compEl) { compEl.className = 'ratio-comparison neutral'; compEl.innerHTML = '<i class="fas fa-info-circle"></i> لا توجد سنة سابقة معتمدة'; }
          if (indicatorEl) indicatorEl.className = `ratio-indicator ${ratios[key].indicator}`;
          card.title = ratios[key].explanation || '';
        });
        return out;
      };
    }

    patchAccountAnalysis();
    window.PolarisEquityRatioFix = { calculate: calculateEquityFixedRatios };
    window.PolarisRatiosQA = { calculate: calculateEquityFixedRatios };
    window.PolarisCockpitQA = { refresh: () => { window.preProcessAccountAnalysis(); window.updateCockpit(); }, isContraRevenue, isIncomeStatementAccount };
    console.log('Polaris equity ratio and cockpit logic fix loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(patch, 500));
  else setTimeout(patch, 500);
})();

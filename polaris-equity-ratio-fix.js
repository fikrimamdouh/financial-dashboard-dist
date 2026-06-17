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
  function sar(v) { return num(v).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function getProfitData() {
    if (window.PolarisAccountingQA && typeof PolarisAccountingQA.calculateProfitCore === 'function') {
      return PolarisAccountingQA.calculateProfitCore();
    }
    if (typeof calculateNetProfit === 'function') return calculateNetProfit(true);
    return { profitAfter: 0, netRevenue: 0, costOfSales: 0, grossProfit: 0 };
  }

  function rows() {
    return window.auditFile && Array.isArray(auditFile.trialBalance) ? auditFile.trialBalance : [];
  }

  function sumRows(filter, balanceFn) {
    return rows().filter(filter).reduce((s, a) => s + balanceFn(a), 0);
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

    console.table({ equityBeforeCurrentResult: r2(equityBeforeCurrentResult), profitAfter: r2(profitAfter), equityAfterCurrentResult: r2(equityAfterCurrentResult), roe: result.roe.display, debtToEquity: result.debtToEquity.display });
    return result;
  }

  function issueFor(a) {
    const id = String(a.account_id || '');
    const name = String(a.name || '');
    const cat = String(a.category || '');
    const sub = String(a.sub_category || '');
    const b = finalBal(a);
    if (id === 'SUSP-001') return ['مانع', 'حساب تسوية فرق تقريب؛ يجب حذفه من ملف الاعتماد.'];
    if (!cat || !sub) return ['مانع', 'الحساب غير مصنف بالكامل.'];
    if (cat === 'clearing' && Math.abs(b) > 0.10) return ['عالي', 'حساب وسيط أو رقابي غير صفري.'];
    if ((name.includes('عهدة') || name.includes('سلفة')) && b < -0.10) return ['عالي', 'عهدة أو سلفة برصيد دائن.'];
    if (cat === 'assets' && sub !== '121099' && b < -0.10) return ['عالي', 'أصل برصيد دائن يحتاج تفسير أو إعادة تصنيف.'];
    if (cat === 'liabilities' && b > 0.10) return ['عالي', 'التزام برصيد مدين؛ قد يمثل دفعة مقدمة أو تصنيفًا معاكسًا.'];
    if (cat === 'equity' && b > 0.10) return ['متوسط', 'حقوق ملكية مدينة تخفض صافي حقوق الملكية.'];
    if (cat === 'revenue' && b > 0.10 && sub !== '410099') return ['عالي', 'إيراد برصيد مدين وليس خصمًا مصنفًا.'];
    if (cat === 'expenses' && b < -0.10) return ['متوسط', 'مصروف برصيد دائن يخفض المصروفات.'];
    if (['10203071', '201040001', '101080004'].includes(id)) return ['مؤكد', 'تصنيف مثبت ضمن قواعد المراجعة لهذا الميزان.'];
    return ['سليم', 'لا توجد ملاحظة آلية جوهرية.'];
  }

  function reviewData() {
    let debit = 0, credit = 0;
    const counts = { مانع: 0, عالي: 0, متوسط: 0, مؤكد: 0, سليم: 0 };
    const issues = [];
    rows().forEach(a => {
      const b = finalBal(a);
      if (b > 0) debit += b;
      if (b < 0) credit += Math.abs(b);
      const [level, reason] = issueFor(a);
      counts[level] = (counts[level] || 0) + 1;
      if (level !== 'سليم') issues.push({ account: a, balance: b, level, reason });
    });
    const diff = r2(debit - credit);
    const suspense = rows().some(a => String(a.account_id || '') === 'SUSP-001');
    const unclassified = rows().filter(a => !a.category || !a.sub_category).length;
    const balanced = Math.abs(diff) <= 0.10;
    return { debit, credit, diff, rows: rows(), counts, issues, suspense, unclassified, balanced, profitAfter: num(getProfitData().profitAfter), ready: balanced && !suspense && unclassified === 0 && (counts['مانع'] || 0) === 0 };
  }

  function renderReviewPanel() {
    if ((location.pathname || '').split('/').pop() !== 'account-mapping.html') return;
    if (!rows().length) return;
    if (!document.getElementById('polarisReviewPanelStyle')) {
      const style = document.createElement('style');
      style.id = 'polarisReviewPanelStyle';
      style.textContent = '.polaris-review-panel{direction:rtl;text-align:right;background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:16px;padding:16px;margin:16px 0;font-family:inherit}.polaris-review-panel h3{margin:0 0 12px;color:#fff}.polaris-review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.polaris-review-card{background:#111827;border:1px solid #374151;border-radius:12px;padding:10px}.polaris-review-card .label{font-size:12px;color:#94a3b8}.polaris-review-card .value{font-size:17px;font-weight:800}.polaris-ok{border-color:#166534}.polaris-warn{border-color:#b45309}.polaris-bad{border-color:#991b1b}.polaris-review-table{width:100%;border-collapse:collapse;margin-top:12px}.polaris-review-table th,.polaris-review-table td{border-bottom:1px solid #1f2937;padding:7px;font-size:12px;vertical-align:top}.polaris-review-table th{background:#111827;color:#cbd5e1}';
      document.head.appendChild(style);
    }
    const s = reviewData();
    let panel = document.getElementById('polarisReviewPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'polarisReviewPanel';
      panel.className = 'polaris-review-panel';
      const anchor = document.getElementById('financial-ratios-container') || document.querySelector('.main-content') || document.body.firstElementChild;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor);
      else document.body.prepend(panel);
    }
    const topIssues = s.issues.filter(x => ['مانع', 'عالي', 'متوسط'].includes(x.level)).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 25);
    panel.innerHTML = `<h3>ملخص فحص واعتماد ميزان المراجعة</h3><div class="polaris-review-grid"><div class="polaris-review-card ${s.balanced ? 'polaris-ok' : 'polaris-bad'}"><div class="label">حالة الميزان</div><div class="value">${s.balanced ? 'متزن' : 'غير متزن'}</div></div><div class="polaris-review-card"><div class="label">فرق الميزان</div><div class="value">${sar(s.diff)}</div></div><div class="polaris-review-card"><div class="label">عدد الحسابات</div><div class="value">${s.rows.length}</div></div><div class="polaris-review-card ${s.unclassified === 0 ? 'polaris-ok' : 'polaris-bad'}"><div class="label">غير مصنف</div><div class="value">${s.unclassified}</div></div><div class="polaris-review-card ${s.suspense ? 'polaris-bad' : 'polaris-ok'}"><div class="label">حساب تسوية آلي</div><div class="value">${s.suspense ? 'موجود' : 'غير موجود'}</div></div><div class="polaris-review-card"><div class="label">صافي الربح/الخسارة</div><div class="value">${sar(s.profitAfter)}</div></div><div class="polaris-review-card ${s.ready ? 'polaris-ok' : 'polaris-warn'}"><div class="label">قرار الصفحة</div><div class="value">${s.ready ? 'جاهزة للاعتماد' : 'تحتاج مراجعة'}</div></div><div class="polaris-review-card ${s.counts['عالي'] ? 'polaris-warn' : 'polaris-ok'}"><div class="label">ملاحظات عالية</div><div class="value">${s.counts['عالي'] || 0}</div></div></div><table class="polaris-review-table"><thead><tr><th>الأهمية</th><th>الحساب</th><th>التصنيف</th><th>الرصيد</th><th>سبب الملاحظة</th></tr></thead><tbody>${topIssues.map(item => `<tr><td>${item.level}</td><td>${item.account.name}<br><small>${item.account.account_id}</small></td><td>${item.account.category || '-'} / ${item.account.sub_category || '-'}</td><td>${sar(item.balance)}</td><td>${item.reason}</td></tr>`).join('') || '<tr><td colspan="5">لا توجد ملاحظات جوهرية ظاهرة.</td></tr>'}</tbody></table>`;
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
          if (compEl) { compEl.className = 'ratio-comparison neutral'; compEl.innerHTML = '<i class="fas fa-info-circle"></i> لا توجد سنة سابقة معتمدة'; }
          if (indicatorEl) indicatorEl.className = `ratio-indicator ${ratios[key].indicator}`;
          card.title = ratios[key].explanation || '';
        });
        setTimeout(renderReviewPanel, 100);
        return out;
      };
    }
    window.PolarisEquityRatioFix = { calculate: calculateEquityFixedRatios };
    window.PolarisRatiosQA = { calculate: calculateEquityFixedRatios };
    window.PolarisReviewSummary = { render: renderReviewPanel, data: reviewData, issueFor };
    setTimeout(renderReviewPanel, 800);
    setTimeout(renderReviewPanel, 2200);
    console.log('Polaris equity ratio fix and review panel loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(patch, 500));
  else setTimeout(patch, 500);
})();

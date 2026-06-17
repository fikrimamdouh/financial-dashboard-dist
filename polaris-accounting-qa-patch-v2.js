;(() => {
  'use strict';

  const TOLERANCE = 0.10;
  const COST_CODES = ['303011'];
  const CONTRA_REVENUE_CODES = ['410099'];
  const ACCOUNT_OVERRIDES = {
    '10203071': {
      category: 'assets',
      sub_category: '121002',
      note: 'مصاريف تأسيس النشاط هنا تخص تجهيزات مباني/أصول ثابتة ولا تدخل بالكامل في قائمة الدخل.'
    },
    '201040001': {
      category: 'liabilities',
      sub_category: '212099',
      note: 'مصروف أجور ورواتب مستحقة التزام مستحق وليس مصروف تشغيل.'
    },
    '101080004': {
      category: 'assets',
      sub_category: '116004',
      note: 'مخزن قطع غيار أصل/مخزون ولا يدخل في قائمة الدخل إلا عند الصرف أو الاستهلاك.'
    }
  };

  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const x = String(v).replace(/[\s,]/g, '').replace(/[()]/g, function(m){ return m === '(' ? '-' : ''; }).replace(/[^0-9.\-]/g, '');
    const p = parseFloat(x);
    return Number.isFinite(p) ? p : 0;
  }

  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }

  function bal(a) {
    if (!a) return 0;
    if (a.book_balance !== undefined && a.book_balance !== null && a.book_balance !== '') return num(a.book_balance);
    return num(a.ob_debit) - num(a.ob_credit) + num(a.move_debit) - num(a.move_credit);
  }

  function adj(a) {
    if (!a || !window.auditFile || !Array.isArray(auditFile.adjustments)) return 0;
    const id = String(a.account_id);
    return auditFile.adjustments.reduce(function(sum, j) {
      const amount = num(j.amount);
      if (String(j.debit_account) === id) return sum + amount;
      if (String(j.credit_account) === id) return sum - amount;
      return sum;
    }, 0);
  }

  function finalBal(a) { return bal(a) + adj(a); }

  function isContraRevenue(a) {
    const sub = String((a && a.sub_category) || '');
    const name = String((a && a.name) || '').toLowerCase();
    return CONTRA_REVENUE_CODES.indexOf(sub) >= 0 || name.indexOf('خصم مسموح') >= 0 || name.indexOf('مرتجع') >= 0 || name.indexOf('مردود') >= 0;
  }

  function isCostOfSales(a) {
    const code = String((a && a.account_id) || '');
    const sub = String((a && a.sub_category) || '');
    const cat = String((a && a.category) || '');
    const name = String((a && a.name) || '').toLowerCase();
    return COST_CODES.indexOf(code) >= 0 || cat === 'cost_of_revenue' || sub.indexOf('5') === 0 || name.indexOf('تكلفة المبيعات') >= 0;
  }

  function isOperatingExpense(a) {
    const sub = String((a && a.sub_category) || '');
    const cat = String((a && a.category) || '');
    const name = String((a && a.name) || '').toLowerCase();
    const code = String((a && a.account_id) || '');
    if (ACCOUNT_OVERRIDES[code] && ACCOUNT_OVERRIDES[code].category !== 'expenses') return false;
    return cat === 'expenses' || sub.indexOf('6') === 0 || sub.indexOf('7') === 0 || name.indexOf('مصاريف') >= 0 || name.indexOf('مصروف') >= 0;
  }

  function applyAccountOverrides() {
    if (!window.auditFile || !Array.isArray(auditFile.trialBalance)) return [];
    const changed = [];
    auditFile.trialBalance.forEach(function(a) {
      const id = String(a.account_id || '');
      const override = ACCOUNT_OVERRIDES[id];
      if (!override) return;
      const before = { category: a.category, sub_category: a.sub_category };
      a.category = override.category;
      a.sub_category = override.sub_category;
      a.review_status = 'reviewed';
      a.qa_note = override.note;
      changed.push({ code: id, name: a.name, before, after: { category: a.category, sub_category: a.sub_category }, note: override.note });
    });
    if (changed.length && typeof saveAuditFile === 'function') saveAuditFile();
    return changed;
  }

  function profitCalc() {
    applyAccountOverrides();
    const tb = window.auditFile && Array.isArray(auditFile.trialBalance) ? auditFile.trialBalance : [];
    let revenue = 0;
    let discounts = 0;
    let cost = 0;
    let opex = 0;

    tb.forEach(function(a) {
      const b = finalBal(a);
      const cat = String((a && a.category) || '');
      const code = String((a && a.account_id) || '');

      if (cat === 'revenue' || code.indexOf('4') === 0) {
        if (isContraRevenue(a)) discounts += b > 0 ? b : Math.abs(b);
        else revenue += b < 0 ? Math.abs(b) : -b;
        return;
      }

      if (isCostOfSales(a)) {
        cost += b > 0 ? b : Math.abs(b);
        return;
      }

      if (isOperatingExpense(a)) {
        opex += b > 0 ? b : Math.abs(b);
      }
    });

    const netRevenue = revenue - discounts;
    const grossProfit = netRevenue - cost;
    const profitAfter = grossProfit - opex;

    return {
      grossRevenue: r2(revenue),
      contraRevenue: r2(discounts),
      netRevenue: r2(netRevenue),
      costOfSales: r2(cost),
      grossProfit: r2(grossProfit),
      operatingExpenses: r2(opex),
      expenses: r2(cost + opex),
      profitBefore: r2(profitAfter),
      adjustmentsEffect: 0,
      profitAfter: r2(profitAfter),
      profitForEquity: r2(-profitAfter),
      isLoss: profitAfter < 0
    };
  }

  function balanceCalc() {
    applyAccountOverrides();
    const tb = window.auditFile && Array.isArray(auditFile.trialBalance) ? auditFile.trialBalance : [];
    let d = 0;
    let c = 0;
    tb.forEach(function(a) {
      const b = finalBal(a);
      if (b > 0) d += b;
      if (b < 0) c += Math.abs(b);
    });
    const diff = r2(d - c);
    return { totalDebits: r2(d), totalCredits: r2(c), difference: diff, isBalanced: Math.abs(diff) <= TOLERANCE, tolerance: TOLERANCE, error: null };
  }

  function attachFormulaTooltips() {
    const explainMap = {
      'صافي الإيرادات': '<strong>صافي الإيرادات</strong><br>إجمالي المبيعات والإيرادات التشغيلية - خصومات ومردودات المبيعات.',
      'يخصم: تكلفة الإيرادات': '<strong>تكلفة الإيرادات</strong><br>تكلفة المبيعات + الأجور المباشرة + الديزل/المواد المباشرة المرتبطة بالإنتاج.',
      'مجمل الربح': '<strong>مجمل الربح</strong><br>صافي الإيرادات - تكلفة الإيرادات.',
      'يضاف: إيرادات أخرى': '<strong>إيرادات أخرى</strong><br>إيرادات غير رئيسية أو غير مباشرة مثل الإيرادات العرضية والخصم المكتسب.',
      'يخصم: مصروفات التشغيل': '<strong>مصروفات التشغيل</strong><br>مصروفات البيع والتشغيل غير المباشرة بعد استبعاد الأصول والمخزون والمستحقات.',
      'يخصم: مصروفات عمومية وإدارية': '<strong>مصروفات عمومية وإدارية</strong><br>رواتب الإدارة والرسوم والإيجارات والمصروفات الإدارية.',
      'يخصم: اهلاك للممتلكات والمعدات': '<strong>الإهلاك</strong><br>نصيب الفترة من استهلاك الأصول الثابتة، وليس مجمع الإهلاك كاملًا.',
      'صافي الدخل قبل خصم الزكاة': '<strong>صافي الدخل قبل الزكاة</strong><br>مجمل الربح + إيرادات أخرى - مصروفات التشغيل - المصروفات الإدارية - الإهلاك.',
      'يخصم: الزكاة الشرعية': '<strong>الزكاة</strong><br>مصروف الزكاة المحتسب أو المسجل للفترة.',
      'صافي الخسارة النهائية': '<strong>صافي الخسارة النهائية</strong><br>صافي الدخل قبل الزكاة - الزكاة.',
      'النقدية في بداية الفترة': '<strong>النقدية في بداية الفترة</strong><br>رصيد افتتاحي لحسابات النقد والبنوك.',
      'النقدية في نهاية الفترة': '<strong>النقدية في نهاية الفترة</strong><br>النقدية بداية الفترة + صافي الزيادة/النقص في النقدية.',
      'صافي النقدية من الأنشطة التشغيلية': '<strong>التدفقات التشغيلية</strong><br>صافي الربح + الإهلاك ± تغيرات رأس المال العامل.',
      'صافي النقدية من الأنشطة الاستثمارية': '<strong>التدفقات الاستثمارية</strong><br>حركة شراء/بيع الأصول الثابتة والاستثمارات.',
      'صافي النقدية من الأنشطة التمويلية': '<strong>التدفقات التمويلية</strong><br>حركة القروض وحقوق الملكية والتوزيعات/المساهمات.'
    };

    let tip = document.getElementById('formulaTooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'formulaTooltip';
      tip.style.cssText = 'position:fixed;display:none;max-width:460px;background:#0d1117;border:1px solid #00aaff;color:#c9d1d9;padding:12px 14px;border-radius:10px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.35);font-size:13px;line-height:1.7;text-align:right;direction:rtl;';
      document.body.appendChild(tip);
    }

    document.querySelectorAll('table.financial-table tbody tr').forEach(function(row) {
      const labelCell = row.querySelector('td');
      if (!labelCell) return;
      const label = labelCell.textContent.trim();
      const key = Object.keys(explainMap).find(function(k) { return label.indexOf(k) >= 0; });
      if (!key) return;
      row.style.cursor = 'help';
      row.querySelectorAll('td').forEach(function(cell) {
        cell.dataset.explain = explainMap[key];
        cell.style.cursor = 'help';
      });
    });

    document.querySelectorAll('[data-explain]').forEach(function(el) {
      if (el.dataset.tooltipAttached === 'true') return;
      el.dataset.tooltipAttached = 'true';
      el.addEventListener('mouseenter', function(e) {
        tip.innerHTML = e.currentTarget.dataset.explain;
        tip.style.display = 'block';
      });
      el.addEventListener('mousemove', function(e) {
        tip.style.top = (e.clientY + 15) + 'px';
        tip.style.left = (e.clientX + 15) + 'px';
      });
      el.addEventListener('mouseleave', function() {
        tip.style.display = 'none';
      });
    });
  }

  function patchAccountMapping() {
    applyAccountOverrides();
    if (typeof calculateNetProfit === 'function') {
      calculateNetProfit = function(final) { return profitCalc(); };
    }
    if (typeof calculateTrialBalanceBalance === 'function') {
      calculateTrialBalanceBalance = function() { return balanceCalc(); };
    }
    if (typeof validateDataForTransfer === 'function') {
      validateDataForTransfer = function() {
        const issues = [];
        const b = balanceCalc();
        const p = profitCalc();
        if (!b.isBalanced) issues.push('ميزان المراجعة غير متوازن: الفرق ' + b.difference.toFixed(2) + ' ريال');
        if (!Number.isFinite(p.profitAfter)) issues.push('صافي الربح غير صالح');
        return { isValid: issues.length === 0, issues: issues, profitData: p, balanceData: b };
      };
    }

    window.PolarisAccountingQA = {
      ROUNDING_TOLERANCE: TOLERANCE,
      ACCOUNT_OVERRIDES,
      applyAccountOverrides,
      calculateProfitCore: profitCalc,
      calculateBalanceCore: balanceCalc,
      finalBalance: finalBal,
      isContraRevenue: isContraRevenue,
      isExpenseLike: function(a) { return isCostOfSales(a) || isOperatingExpense(a); },
      diagnostic: function() {
        const p = profitCalc();
        const b = balanceCalc();
        console.table({
          grossRevenue: p.grossRevenue,
          contraRevenue: p.contraRevenue,
          netRevenue: p.netRevenue,
          costOfSales: p.costOfSales,
          grossProfit: p.grossProfit,
          operatingExpenses: p.operatingExpenses,
          expenses: p.expenses,
          profitAfter: p.profitAfter,
          totalDebits: b.totalDebits,
          totalCredits: b.totalCredits,
          difference: b.difference,
          isBalanced: b.isBalanced
        });
        return { profit: p, balance: b, overrides: applyAccountOverrides() };
      }
    };
  }

  function patchConsolidation() {
    const run = function() { attachFormulaTooltips(); };
    setTimeout(run, 400);
    setTimeout(run, 1200);
    setTimeout(run, 2500);

    ['displayIncomeStatement', 'displayCashFlowStatement'].forEach(function(fnName) {
      if (typeof window[fnName] !== 'function') return;
      const original = window[fnName];
      window[fnName] = function() {
        const out = original.apply(this, arguments);
        setTimeout(attachFormulaTooltips, 0);
        return out;
      };
    });

    window.PolarisFormulaTooltips = { attach: attachFormulaTooltips };
  }

  function boot() {
    const page = location.pathname.split('/').pop();
    if (page === 'account-mapping.html') patchAccountMapping();
    if (page === 'consolidation-cockpit.html') patchConsolidation();
    console.log('Polaris accounting QA patch v3 loaded', page);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();

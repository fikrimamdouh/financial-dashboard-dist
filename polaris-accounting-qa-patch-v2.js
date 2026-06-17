;(() => {
  'use strict';

  const TOLERANCE = 0.10;
  const COST_CODES = ['303011'];
  const CONTRA_REVENUE_CODES = ['410099'];

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
    return cat === 'expenses' || sub.indexOf('6') === 0 || sub.indexOf('7') === 0 || name.indexOf('مصاريف') >= 0 || name.indexOf('مصروف') >= 0;
  }

  function profitCalc() {
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

  function patch() {
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
        return { profit: p, balance: b };
      }
    };
  }

  function boot() {
    const page = location.pathname.split('/').pop();
    if (page === 'account-mapping.html') patch();
    console.log('Polaris accounting QA patch v2 loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();

;(() => {
  'use strict';

  const ROUNDING_TOLERANCE = 0.10;
  const CONTRA_REVENUE_CODES = new Set(['410099', 'sales_discount', 'sales_returns']);

  function n(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value)
      .replace(/[\s,]/g, '')
      .replace(/[()]/g, m => m === '(' ? '-' : '')
      .replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function accountBalance(acc) {
    if (!acc) return 0;
    const book = acc.book_balance;
    if (book !== undefined && book !== null && book !== '') return n(book);
    return n(acc.ob_debit) - n(acc.ob_credit) + n(acc.move_debit) - n(acc.move_credit);
  }

  function adjustmentAmountForAccount(acc) {
    if (!acc || !Array.isArray(auditFile?.adjustments)) return 0;
    const id = String(acc.account_id);
    return auditFile.adjustments.reduce((sum, adj) => {
      const amount = n(adj.amount);
      if (String(adj.debit_account) === id) return sum + amount;
      if (String(adj.credit_account) === id) return sum - amount;
      return sum;
    }, 0);
  }

  function finalBalance(acc) {
    return accountBalance(acc) + adjustmentAmountForAccount(acc);
  }

  function isContraRevenue(acc) {
    const sub = String(acc?.sub_category || '');
    const name = String(acc?.name || '').toLowerCase();
    return CONTRA_REVENUE_CODES.has(sub) ||
      name.includes('خصم مسموح') ||
      name.includes('مردود') ||
      name.includes('مرتجع');
  }

  function isExpenseLike(acc) {
    const cat = String(acc?.category || '');
    const sub = String(acc?.sub_category || '');
    const name = String(acc?.name || '').toLowerCase();
    return cat === 'expenses' ||
      cat === 'cost_of_revenue' ||
      sub.startsWith('5') ||
      sub.startsWith('6') ||
      sub.startsWith('7') ||
      name.includes('تكلفة المبيعات');
  }

  function calculateProfitCore() {
    const tb = Array.isArray(auditFile?.trialBalance) ? auditFile.trialBalance : [];
    let grossRevenue = 0;
    let contraRevenue = 0;
    let expenses = 0;

    tb.forEach(acc => {
      const bal = finalBalance(acc);
      const cat = String(acc.category || '');

      if (cat === 'revenue') {
        if (isContraRevenue(acc)) {
          contraRevenue += bal > 0 ? bal : Math.abs(bal);
        } else {
          grossRevenue += bal < 0 ? Math.abs(bal) : -bal;
        }
        return;
      }

      if (isExpenseLike(acc)) {
        expenses += bal > 0 ? bal : -Math.abs(bal);
      }
    });

    const netRevenue = grossRevenue - contraRevenue;
    const profitAfter = netRevenue - expenses;

    return {
      grossRevenue: round2(grossRevenue),
      contraRevenue: round2(contraRevenue),
      netRevenue: round2(netRevenue),
      expenses: round2(expenses),
      profitBefore: round2(profitAfter),
      adjustmentsEffect: 0,
      profitAfter: round2(profitAfter),
      profitForEquity: round2(-profitAfter),
      isLoss: profitAfter < 0
    };
  }

  function calculateBalanceCore() {
    const tb = Array.isArray(auditFile?.trialBalance) ? auditFile.trialBalance : [];
    let totalDebits = 0;
    let totalCredits = 0;
    tb.forEach(acc => {
      const bal = finalBalance(acc);
      if (bal > 0) totalDebits += bal;
      else if (bal < 0) totalCredits += Math.abs(bal);
    });
    const difference = round2(totalDebits - totalCredits);
    return {
      totalDebits: round2(totalDebits),
      totalCredits: round2(totalCredits),
      difference,
      isBalanced: Math.abs(difference) <= ROUNDING_TOLERANCE,
      tolerance: ROUNDING_TOLERANCE,
      error: null
    };
  }

  function patchDataIngestion() {
    if (typeof validateTrialBalance === 'function') {
      validateTrialBalance = function(accounts) {
        if (!accounts || accounts.length === 0) {
          return {
            isValid: false,
            message: '<b>فشل:</b> لم يتم العثور على أي صفوف بيانات صالحة بعد التعيين.',
            summaryHTML: '<div class="alert alert-danger p-2 small"><i class="fas fa-times-circle"></i> لم يتم العثور على بيانات صالحة.</div>',
            leafAccounts: []
          };
        }

        let totalDebit = 0;
        let totalCredit = 0;
        accounts.forEach(acc => {
          const balance = n(acc.ob_debit) - n(acc.ob_credit) + n(acc.move_debit) - n(acc.move_credit);
          if (balance > 0) totalDebit += balance;
          else if (balance < 0) totalCredit += Math.abs(balance);
        });

        const difference = round2(totalDebit - totalCredit);
        const isBalanced = Math.abs(difference) <= ROUNDING_TOLERANCE;
        const statusText = isBalanced
          ? (Math.abs(difference) > 0 ? 'متزن بفارق تقريب ✓' : 'متزن ✓')
          : 'غير متزن';
        const alertClass = isBalanced ? 'alert-success' : 'alert-warning';
        const icon = isBalanced ? 'fa-check-circle' : 'fa-exclamation-triangle';
        const heading = isBalanced ? 'قبول' : 'قبول مع فارق جوهري';
        const note = isBalanced
          ? `لن يتم إنشاء حساب تسوية لأن الفرق ضمن سماحية التقريب (${ROUNDING_TOLERANCE.toFixed(2)} ريال).`
          : 'الفرق جوهري. لا تعتمد القوائم قبل المراجعة.';

        return {
          isValid: true,
          isBalanced,
          totalDebit,
          totalCredit,
          difference,
          leafAccounts: accounts,
          summaryHTML: `
            <div class="alert ${alertClass} p-2 small">
              <h6 class="alert-heading"><i class="fas ${icon}"></i> ${heading}</h6>
              <ul class="list-unstyled mb-0 mt-2">
                <li><strong>الحالة:</strong> <span class="fw-bold">${statusText}</span></li>
                <li><strong>الفارق:</strong> ${Math.abs(difference).toLocaleString('ar-SA', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</li>
                <li><strong>إجمالي الحسابات:</strong> ${accounts.length}</li>
              </ul>
              <hr class="my-2">
              <p class="mb-0 small"><i class="fas fa-info-circle me-1"></i>${note}</p>
            </div>`
        };
      };
    }

    if (typeof processAndProceed === 'function') {
      processAndProceed = function() {
        const activeClientId = localStorage.getItem('activeClientId');
        const setupRaw = localStorage.getItem(`clientSetup_${activeClientId}`);
        if (!activeClientId || !setupRaw) {
          alert('خطأ: لم يتم العثور على بيانات التأسيس أو العميل النشط.');
          return;
        }

        const setup = JSON.parse(setupRaw);
        const fullClientInfo = setup.details || setup;
        const entities = setup.path === 'single'
          ? [{ cr: String(fullClientInfo.cr).replace(/\s/g, '_') }]
          : (fullClientInfo.subsidiaries || []).map(sub => ({ cr: String(sub.cr).replace(/\s/g, '_') }));

        let allAccounts = [];
        for (const entity of entities) {
          const dataKey = `data_${activeClientId}_${entity.cr}_current`;
          const storedData = localStorage.getItem(dataKey);
          if (!storedData) {
            alert(`خطأ: لم يتم العثور على بيانات الميزان للكيان ${entity.cr}.`);
            return;
          }
          allAccounts.push(...JSON.parse(storedData));
        }

        const finalTrialBalance = allAccounts.map(acc => ({
          account_id: acc.account_id,
          name: acc.account_name || acc.name,
          ob_debit: n(acc.ob_debit),
          ob_credit: n(acc.ob_credit),
          move_debit: n(acc.move_debit),
          move_credit: n(acc.move_credit),
          cb_debit: n(acc.cb_debit),
          cb_credit: n(acc.cb_credit)
        }));

        let totalDifference = 0;
        finalTrialBalance.forEach(acc => {
          totalDifference += n(acc.ob_debit) - n(acc.ob_credit) + n(acc.move_debit) - n(acc.move_credit);
        });
        totalDifference = round2(-totalDifference);

        if (Math.abs(totalDifference) > ROUNDING_TOLERANCE) {
          alert(`ميزان المراجعة غير متوازن بفارق جوهري ${totalDifference.toFixed(2)} ريال. لن يتم إنشاء حساب تسوية تلقائي. راجع الملف قبل المتابعة.`);
          return;
        }

        const auditFilePayload = {
          clientInfo: fullClientInfo,
          settings: {
            currency: 'SAR',
            roundingTolerance: ROUNDING_TOLERANCE,
            ignoredRoundingDifference: totalDifference
          },
          trialBalance: finalTrialBalance,
          adjustments: [],
          auditLog: [{
            timestamp: new Date().toISOString(),
            action: `تم إنشاء ملف المراجعة الأولي. فرق التقريب المهمل: ${totalDifference.toFixed(2)} ريال.`
          }]
        };

        localStorage.setItem(`polarisAuditFile_${activeClientId}`, JSON.stringify(auditFilePayload));
        if (window.PolarisDataFlow) PolarisDataFlow.save('trial-balance', auditFilePayload);
        localStorage.setItem(`projectStatus_${activeClientId}`, JSON.stringify({ step: 2, text: 'جاهز لربط الحسابات', icon: 'fa-link', color: 'text-primary' }));

        alert(`تم اعتماد البيانات بنجاح. الفرق ${Math.abs(totalDifference).toFixed(2)} ريال ضمن سماحية التقريب ولن يتم إنشاء حساب تسوية.`);
        window.location.href = 'account-mapping.html';
      };
    }
  }

  function patchAccountMapping() {
    if (typeof calculateNetProfit === 'function') {
      calculateNetProfit = function(final = false) {
        const result = calculateProfitCore();
        if (final) return result;
        return result;
      };
    }

    if (typeof calculateTrialBalanceBalance === 'function') {
      calculateTrialBalanceBalance = function() {
        return calculateBalanceCore();
      };
    }

    if (typeof validateDataForTransfer === 'function') {
      validateDataForTransfer = function() {
        const issues = [];
        if (!auditFile || !Array.isArray(auditFile.trialBalance)) {
          return { isValid: false, issues: ['بيانات ميزان المراجعة غير مكتملة'], profitData: null };
        }

        const balanceData = calculateBalanceCore();
        if (!balanceData.isBalanced) {
          issues.push(`ميزان المراجعة غير متوازن: الفرق ${balanceData.difference.toFixed(2)} ريال`);
        }

        const profitData = calculateProfitCore();
        if (!Number.isFinite(profitData.profitAfter)) issues.push('صافي الربح غير صالح');

        return {
          isValid: issues.length === 0,
          issues,
          profitData,
          balanceData
        };
      };
    }

    if (typeof performLogicalCheck === 'function') {
      performLogicalCheck = function() {
        const rows = document.querySelectorAll('#trialBalanceTable tbody tr');
        let abnormalCount = 0;
        let unclassifiedCount = 0;

        rows.forEach(row => {
          row.classList.remove('abnormal-balance', 'unclassified-account');
          const accountId = row.dataset.accountId;
          const account = auditFile.trialBalance.find(acc => String(acc.account_id) === String(accountId));
          if (!account) return;

          const bal = finalBalance(account);
          const cat = String(account.category || '');
          const sub = String(account.sub_category || '');
          const contraAsset = sub === '121099';
          const contraRev = isContraRevenue(account);
          let abnormal = false;

          if (!cat) {
            row.classList.add('unclassified-account');
            unclassifiedCount++;
          }
          if (cat === 'assets' && !contraAsset && bal < 0) abnormal = true;
          if (contraAsset && bal > 0) abnormal = true;
          if ((cat === 'liabilities' || cat === 'equity') && bal > 0) abnormal = true;
          if (cat === 'revenue' && !contraRev && bal > 0) abnormal = true;
          if (cat === 'revenue' && contraRev && bal < 0) abnormal = true;
          if (isExpenseLike(account) && bal < 0) abnormal = true;

          if (abnormal) {
            row.classList.add('abnormal-balance');
            abnormalCount++;
          }
        });

        const msg = `تم التدقيق.\n- حسابات ذات أرصدة شاذة: ${abnormalCount}\n- حسابات غير مصنفة: ${unclassifiedCount}`;
        if (typeof showNotification === 'function') showNotification(msg, 'info');
        if (typeof addAuditLogEntry === 'function') addAuditLogEntry('تم إجراء تدقيق منطقية الأرصدة باستخدام منطق QA المحاسبي.');
        if (typeof saveAuditFile === 'function') saveAuditFile();
      };
    }

    window.PolarisAccountingQA = {
      ROUNDING_TOLERANCE,
      calculateProfitCore,
      calculateBalanceCore,
      finalBalance,
      isContraRevenue,
      isExpenseLike,
      diagnostic() {
        const profit = calculateProfitCore();
        const balance = calculateBalanceCore();
        console.table({
          grossRevenue: profit.grossRevenue,
          contraRevenue: profit.contraRevenue,
          netRevenue: profit.netRevenue,
          expenses: profit.expenses,
          profitAfter: profit.profitAfter,
          totalDebits: balance.totalDebits,
          totalCredits: balance.totalCredits,
          difference: balance.difference,
          isBalanced: balance.isBalanced
        });
        return { profit, balance };
      }
    };
  }

  function boot() {
    const page = location.pathname.split('/').pop();
    if (page === 'data-ingestion.html') patchDataIngestion();
    if (page === 'account-mapping.html') patchAccountMapping();
    console.log('✅ Polaris accounting QA patch loaded', { page, ROUNDING_TOLERANCE });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  } else {
    setTimeout(boot, 0);
  }
})();

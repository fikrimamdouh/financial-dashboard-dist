;(() => {
  'use strict';

  const N = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const p = parseFloat(String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(p) ? p : 0;
  };
  const R = v => Math.round((Number(v) || 0) * 100) / 100;
  const pct = v => Number.isFinite(v) ? v.toFixed(1) + '%' : 'غير قابل للقياس';
  const x = v => Number.isFinite(v) ? v.toFixed(1) + 'x' : 'غير قابل للقياس';
  const days = v => Number.isFinite(v) ? Math.round(v) + ' يوم' : 'غير قابل للقياس';

  const overrides = {
    '10203071': ['assets', '121002'],
    '101080004': ['assets', '116004'],
    '201040001': ['liabilities', '212099'],
    '303011': ['expenses', '510002'],
    '401010001': ['revenue', '410001'],
    '401010003': ['revenue', '410099'],
    '401020001': ['revenue', '410001'],
    '401020003': ['revenue', '410099']
  };

  const code = a => String(a?.account_id || '').trim();
  const sub = a => String(a?.sub_category || '').trim();
  const cat = a => String(a?.category || '').trim().toLowerCase();
  const nm = a => String(a?.name || '').trim().toLowerCase();
  const has = (a, words) => words.some(w => nm(a).includes(w));
  const tb = () => Array.isArray(window.auditFile?.trialBalance) ? auditFile.trialBalance : [];
  const openBal = a => N(a?.ob_debit) - N(a?.ob_credit);
  const closeBal = a => {
    if (a?.book_balance !== undefined && a.book_balance !== null && a.book_balance !== '') return N(a.book_balance);
    return openBal(a) + N(a?.move_debit) - N(a?.move_credit);
  };
  const finalBal = a => closeBal(a) + (Array.isArray(window.auditFile?.adjustments) ? auditFile.adjustments.reduce((s, j) => {
    const amount = N(j.amount);
    if (String(j.debit_account) === code(a)) return s + amount;
    if (String(j.credit_account) === code(a)) return s - amount;
    return s;
  }, 0) : 0);

  function isEquity(a) { return cat(a) === 'equity' || cat(a).includes('حقوق') || code(a).startsWith('201080') || code(a).startsWith('201110'); }
  function isLiability(a) { return cat(a) === 'liabilities' || cat(a).includes('التزام') || (code(a).startsWith('2') && !isEquity(a)); }
  function isAsset(a) { return cat(a) === 'assets' || cat(a).includes('أصول') || cat(a).includes('اصول') || (code(a).startsWith('1') && !isLiability(a)); }
  function isRevenue(a) { return cat(a) === 'revenue' || cat(a).includes('إيراد') || cat(a).includes('ايراد') || code(a).startsWith('4'); }
  function isContraRevenue(a) { return sub(a) === '410099' || has(a, ['خصم مسموح', 'مرتجع', 'مردود']); }
  function isCost(a) { return code(a) === '303011' || cat(a) === 'cost_of_revenue' || sub(a).startsWith('51') || has(a, ['تكلفة المبيعات', 'تكلفة البضاعة']); }
  function isExpense(a) { return cat(a) === 'expenses' || cat(a).includes('مصروف') || code(a).startsWith('6') || code(a).startsWith('7') || sub(a).startsWith('6') || sub(a).startsWith('7') || has(a, ['مصروف', 'مصاريف']); }
  function isCurrentAsset(a) { return isAsset(a) && (code(a).startsWith('101') || sub(a).startsWith('11') || has(a, ['الصندوق','البنك','ذمم العملاء','عملاء','عهدة','سلفة','مخزن','مخزون','مصروف مقدم'])); }
  function isInventory(a) { return isAsset(a) && (code(a).startsWith('10108') || sub(a).startsWith('116') || has(a, ['مخزن','مخزون'])); }
  function isReceivable(a) { return isAsset(a) && (code(a).startsWith('101041') || has(a, ['ذمم العملاء','عملاء'])); }
  function isCurrentLiability(a) { return isLiability(a) && !has(a, ['قروض','تمويل']) && (code(a).startsWith('201') || sub(a).startsWith('21') || has(a, ['الموردين','مستحقات','مستحق'])); }

  function applyCFOClassificationRules(force = false) {
    let changed = 0;
    tb().forEach(a => {
      if (!force && a.is_user_locked) return;
      let rule = overrides[code(a)];
      if (!rule) {
        if (isRevenue(a)) rule = ['revenue', isContraRevenue(a) ? '410099' : '410001'];
        else if (isCost(a)) rule = ['expenses', '510002'];
        else if (isExpense(a)) rule = ['expenses', sub(a) || '620099'];
        else if (isEquity(a)) rule = ['equity', sub(a) || '310099'];
        else if (isLiability(a)) rule = ['liabilities', sub(a) || '210099'];
        else if (isAsset(a)) rule = ['assets', sub(a) || (code(a).startsWith('102') ? '121002' : '110099')];
      }
      if (!rule) return;
      if (force || !a.category || !a.sub_category || overrides[code(a)]) {
        if (a.category !== rule[0] || a.sub_category !== rule[1]) {
          a.category = rule[0];
          a.sub_category = rule[1];
          a.qa_note = 'CFO classification rule';
          changed++;
        }
      }
    });
    if (changed && typeof saveAuditFile === 'function') saveAuditFile();
    return changed;
  }

  const sum = (filter, bal) => tb().filter(filter).reduce((s, a) => s + bal(a), 0);
  const absSum = (filter, bal) => tb().filter(filter).reduce((s, a) => s + Math.abs(bal(a)), 0);
  const div = (a, b) => Math.abs(b) > 0.000001 ? a / b : NaN;

  function profit(bal) {
    let rev = 0, disc = 0, cost = 0, opex = 0;
    tb().forEach(a => {
      const b = bal(a);
      if (isRevenue(a)) isContraRevenue(a) ? disc += Math.abs(b) : rev += (b < 0 ? Math.abs(b) : -b);
      else if (isCost(a)) cost += Math.abs(b);
      else if (isExpense(a)) opex += Math.abs(b);
    });
    const netRevenue = rev - disc;
    const grossProfit = netRevenue - cost;
    const netProfit = grossProfit - opex;
    return { netRevenue, cost, grossProfit, netProfit };
  }

  function buildMetrics(bal, priorMode) {
    const p = profit(bal);
    const ca = Math.max(0, sum(isCurrentAsset, bal));
    const inv = absSum(isInventory, bal);
    const cl = absSum(isCurrentLiability, bal);
    const assets = absSum(isAsset, bal);
    const liab = absSum(isLiability, bal);
    const recv = absSum(isReceivable, bal);
    const equity = -sum(isEquity, bal) + (priorMode ? 0 : p.netProfit);
    return {
      grossMargin: div(p.grossProfit, p.netRevenue) * 100,
      netMargin: div(p.netProfit, p.netRevenue) * 100,
      roa: div(p.netProfit, assets) * 100,
      roe: equity > 0 ? div(p.netProfit, equity) * 100 : NaN,
      currentRatio: div(ca, cl),
      quickRatio: div(ca - inv, cl),
      debtToEquity: equity > 0 ? div(liab, equity) : NaN,
      assetTurnover: div(p.netRevenue, assets),
      collectionPeriod: div(recv, p.netRevenue / 365),
      inventoryTurnover: div(p.cost, inv),
      debtRatio: div(liab, assets) * 100,
      workingCapital: ca - cl
    };
  }

  function fmt(id, v) {
    if (['grossMargin','netMargin','roa','roe','debtRatio'].includes(id)) return pct(v);
    if (id === 'collectionPeriod') return days(v);
    if (id === 'workingCapital') return Number.isFinite(v) ? R(v).toLocaleString('ar-SA') : 'غير قابل للقياس';
    return x(v);
  }
  function cmp(id, cur, prev) {
    if (!Number.isFinite(prev)) return '<i class="fas fa-info-circle"></i> لا يوجد رصيد أول مدة صالح للمقارنة';
    if (!Number.isFinite(cur)) return '<i class="fas fa-exclamation-circle"></i> غير قابل للقياس حاليًا';
    const d = cur - prev;
    const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '■';
    return `${arrow} سنة سابقة: ${fmt(id, prev)} | فرق: ${fmt(id, d)}`;
  }
  function status(id, v) {
    if (!Number.isFinite(v)) return 'danger';
    if (id === 'currentRatio') return v >= 1.5 ? 'good' : v >= 1 ? 'warning' : 'danger';
    if (id === 'quickRatio') return v >= 1 ? 'good' : v >= .5 ? 'warning' : 'danger';
    if (id === 'debtRatio' || id === 'debtToEquity' || id === 'collectionPeriod') return v <= 50 ? 'good' : v <= 75 ? 'warning' : 'danger';
    if (id === 'inventoryTurnover') return v >= 6 ? 'good' : v >= 3 ? 'warning' : 'danger';
    return v >= 10 ? 'good' : v >= 0 ? 'warning' : 'danger';
  }

  function calculateRatiosCore() {
    applyCFOClassificationRules(false);
    const cur = buildMetrics(finalBal, false);
    const prev = buildMetrics(openBal, true);
    const labels = {
      grossMargin:'مجمل الربح ÷ صافي الإيرادات', netMargin:'صافي الربح ÷ صافي الإيرادات', roa:'صافي الربح ÷ الأصول', roe:'صافي الربح ÷ حقوق الملكية', currentRatio:'الأصول المتداولة ÷ الالتزامات المتداولة', quickRatio:'(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة', debtToEquity:'إجمالي الالتزامات ÷ حقوق الملكية', assetTurnover:'صافي الإيرادات ÷ الأصول', collectionPeriod:'العملاء ÷ (الإيرادات ÷ 365)', inventoryTurnover:'تكلفة الإيرادات ÷ المخزون', debtRatio:'إجمالي الالتزامات ÷ إجمالي الأصول', workingCapital:'الأصول المتداولة - الالتزامات المتداولة'
    };
    const out = {};
    Object.keys(labels).forEach(id => out[id] = { value: cur[id], priorValue: prev[id], display: fmt(id, cur[id]), comparison: cmp(id, cur[id], prev[id]), indicator: status(id, cur[id]), explanation: `${labels[id]}. المقارنة تستخدم رصيد أول المدة كسنة سابقة.` });
    if (!Number.isFinite(cur.roe)) out.roe.display = 'غير قابل للقياس: حقوق الملكية صفر/سالبة';
    if (!Number.isFinite(cur.debtToEquity)) out.debtToEquity.display = 'غير قابل للقياس: حقوق الملكية صفر/سالبة';
    return out;
  }

  function updateCardsFromRatios() {
    const ratios = calculateRatiosCore();
    Object.keys(ratios).forEach(id => {
      const card = document.querySelector(`[data-ratio="${id}"]`);
      if (!card) return;
      const v = card.querySelector('.ratio-value');
      const c = card.querySelector('.ratio-comparison');
      const i = card.querySelector('.ratio-indicator');
      if (v) v.textContent = ratios[id].display;
      if (c) { c.className = 'ratio-comparison neutral'; c.innerHTML = ratios[id].comparison; }
      if (i) i.className = `ratio-indicator indicator-${ratios[id].indicator}`;
      card.title = ratios[id].explanation;
    });
  }

  function bindHelp() {
    if (!document.getElementById('ratioHelpStyle')) {
      const st = document.createElement('style');
      st.id = 'ratioHelpStyle';
      st.textContent = '.ratio-card{cursor:help}.ratio-help-popover{position:fixed;z-index:99999;max-width:390px;background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:12px;padding:14px 16px;box-shadow:0 18px 45px rgba(0,0,0,.45);font-size:.9rem;line-height:1.7;direction:rtl;text-align:right;display:none}.ratio-help-popover h6{color:#38bdf8}.ratio-help-popover .formula{background:rgba(56,189,248,.08);border-radius:8px;padding:7px 9px;margin:8px 0;color:#bae6fd}.ratio-help-popover .decision{color:#facc15}';
      document.head.appendChild(st);
    }
    let pop = document.getElementById('ratioHelpPopover');
    if (!pop) { pop = document.createElement('div'); pop.id = 'ratioHelpPopover'; pop.className = 'ratio-help-popover'; document.body.appendChild(pop); }
    document.querySelectorAll('.ratio-card[data-ratio]').forEach(card => {
      if (card.dataset.helpBound) return;
      card.dataset.helpBound = '1';
      const show = () => {
        const data = calculateRatiosCore()[card.dataset.ratio];
        if (!data) return;
        pop.innerHTML = `<h6>${card.querySelector('.ratio-label')?.textContent || ''}</h6><div><b>الحالي:</b> ${data.display}</div><div><b>المقارنة:</b> ${data.comparison}</div><div class="formula">${data.explanation}</div><div class="decision"><b>قراءة CFO:</b> أول المدة هو سنة سابقة، وآخر المدة هو السنة الحالية.</div>`;
        const r = card.getBoundingClientRect();
        pop.style.top = Math.min(window.innerHeight - 20, r.bottom + 10) + 'px';
        pop.style.left = Math.max(12, Math.min(window.innerWidth - 405, r.left)) + 'px';
        pop.style.display = 'block';
      };
      card.addEventListener('mouseenter', show);
      card.addEventListener('mousemove', show);
      card.addEventListener('mouseleave', () => pop.style.display = 'none');
      card.addEventListener('click', show);
    });
  }

  function patch() {
    if (typeof calculateFinancialRatios === 'function') calculateFinancialRatios = calculateRatiosCore;
    if (typeof updateKpiPane === 'function' && !updateKpiPane.__cfoPatched) {
      const old = updateKpiPane;
      const wrapped = function() { const res = old.apply(this, arguments); updateCardsFromRatios(); bindHelp(); return res; };
      wrapped.__cfoPatched = true;
      updateKpiPane = wrapped;
    }
    const oldAuto = typeof autoCategorizeAccounts === 'function' ? autoCategorizeAccounts : null;
    if (oldAuto && !oldAuto.__cfoPatched) {
      const wrappedAuto = function() { const res = oldAuto.apply(this, arguments); applyCFOClassificationRules(false); return res; };
      wrappedAuto.__cfoPatched = true;
      autoCategorizeAccounts = wrappedAuto;
    }
    window.applyCFOClassificationRules = applyCFOClassificationRules;
    window.runAutoCategorization = function() {
      const action = () => {
        const changed = applyCFOClassificationRules(true);
        if (oldAuto) oldAuto();
        applyCFOClassificationRules(true);
        if (typeof saveAuditFile === 'function') saveAuditFile();
        if (typeof refreshAllUI === 'function') refreshAllUI();
        if (typeof showNotification === 'function') showNotification(`تمت إعادة التصنيف حسب قواعد CFO. تم تعديل ${changed} حساب.`, 'success');
      };
      if (confirm('هل أنت متأكد من رغبتك في إعادة التصنيف حسب قواعد المدير المالي؟')) action();
    };
    window.PolarisRatiosQA = { calculate: calculateRatiosCore, update: updateCardsFromRatios };
  }

  function boot() {
    if ((location.pathname.split('/').pop() || '').replace('.html','') !== 'account-mapping') return;
    patch(); bindHelp();
    setTimeout(() => { patch(); updateCardsFromRatios(); bindHelp(); }, 1000);
    setTimeout(() => { patch(); updateCardsFromRatios(); bindHelp(); }, 2500);
    console.log('Polaris accounting QA patch v2 loaded: opening balance prior-year comparison');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
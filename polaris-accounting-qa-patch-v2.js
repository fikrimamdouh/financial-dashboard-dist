;(() => {
  'use strict';

  const TOLERANCE = 0.10;
  const ACCOUNT_OVERRIDES = {
    '10203071': { category: 'assets', sub_category: '121002', note: 'مصاريف تأسيس النشاط تخص تجهيزات/مباني ضمن الأصول الثابتة ولا تدخل بالكامل في قائمة الدخل.' },
    '101080004': { category: 'assets', sub_category: '116004', note: 'مخزن قطع غيار أصل/مخزون ولا يدخل في قائمة الدخل إلا عند الصرف أو الاستهلاك.' },
    '201040001': { category: 'liabilities', sub_category: '212099', note: 'أجور ورواتب مستحقة التزام مستحق وليس مصروف تشغيل.' },
    '303011': { category: 'expenses', sub_category: '510002', note: 'تكلفة المبيعات ضمن تكلفة الإيرادات.' },
    '401010001': { category: 'revenue', sub_category: '410001', note: 'مبيعات الخرسانة الجاهزة ضمن الإيرادات.' },
    '401010003': { category: 'revenue', sub_category: '410099', note: 'خصم مسموح به: إيراد عكسي يخصم من المبيعات.' },
    '401020001': { category: 'revenue', sub_category: '410001', note: 'مبيعات البلوك ضمن الإيرادات.' },
    '401020003': { category: 'revenue', sub_category: '410099', note: 'خصم مسموح به: إيراد عكسي يخصم من المبيعات.' }
  };

  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const parsed = parseFloat(String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const pct = v => Number.isFinite(v) ? `${v.toFixed(1)}%` : 'غير قابل للقياس';
  const times = v => Number.isFinite(v) ? `${v.toFixed(1)}x` : 'غير قابل للقياس';
  const days = v => Number.isFinite(v) ? `${Math.round(v)}` : 'غير قابل للقياس';

  function code(a) { return String(a?.account_id || '').trim(); }
  function sub(a) { return String(a?.sub_category || '').trim(); }
  function cat(a) { return String(a?.category || '').trim().toLowerCase(); }
  function name(a) { return String(a?.name || '').trim().toLowerCase(); }
  function hasName(a, re) { return re.test(name(a)); }

  function bal(a) {
    if (!a) return 0;
    if (a.book_balance !== undefined && a.book_balance !== null && a.book_balance !== '') return num(a.book_balance);
    if (a.finalBalance !== undefined && a.finalBalance !== null && a.finalBalance !== '') return num(a.finalBalance);
    return num(a.ob_debit) - num(a.ob_credit) + num(a.move_debit) - num(a.move_credit);
  }
  function openingBal(a) { return num(a?.ob_debit) - num(a?.ob_credit); }
  function adj(a) {
    if (!a || !window.auditFile || !Array.isArray(auditFile.adjustments)) return 0;
    const id = code(a);
    return auditFile.adjustments.reduce((s, j) => {
      const amount = num(j.amount);
      if (String(j.debit_account) === id) return s + amount;
      if (String(j.credit_account) === id) return s - amount;
      return s;
    }, 0);
  }
  function finalBal(a) { return bal(a) + adj(a); }

  function isRevenue(a) { return cat(a) === 'revenue' || cat(a).includes('إيراد') || code(a).startsWith('4'); }
  function isContraRevenue(a) { return sub(a) === '410099' || hasName(a, /خصم مسموح|مرتجع|مردود/); }
  function isCostOfSales(a) { return code(a) === '303011' || cat(a) === 'cost_of_revenue' || sub(a).startsWith('51') || sub(a).startsWith('510') || hasName(a, /تكلفة المبيعات|تكلفة البضاعة/); }
  function isExpense(a) {
    const id = code(a);
    if (ACCOUNT_OVERRIDES[id] && ACCOUNT_OVERRIDES[id].category !== 'expenses') return false;
    return cat(a) === 'expenses' || cat(a).includes('مصروف') || code(a).startsWith('6') || code(a).startsWith('7') || sub(a).startsWith('6') || sub(a).startsWith('7') || hasName(a, /مصروف|مصاريف/);
  }
  function isEquity(a) { return cat(a) === 'equity' || cat(a).includes('حقوق') || code(a).startsWith('201080') || code(a).startsWith('201110'); }
  function isAsset(a) { return cat(a) === 'assets' || cat(a).includes('أصول') || cat(a).includes('اصول') || (code(a).startsWith('1') && !isLiability(a)); }
  function isLiability(a) { return cat(a) === 'liabilities' || cat(a).includes('التزام') || cat(a).includes('التزامات') || (code(a).startsWith('2') && !isEquity(a)); }
  function isCurrentAsset(a) { return isAsset(a) && (code(a).startsWith('101') || sub(a).startsWith('11') || hasName(a, /الصندوق|البنك|ذمم العملاء|عملاء|عهدة|سلفة|مخزن|مخزون|مصروف مقدم/)); }
  function isInventory(a) { return isAsset(a) && (code(a).startsWith('10108') || sub(a).startsWith('116') || hasName(a, /مخزن|مخزون/)); }
  function isReceivable(a) { return isAsset(a) && (code(a).startsWith('101041') || ['113001','113002','113003','113004','113099'].includes(sub(a)) || hasName(a, /ذمم العملاء|عملاء/)); }
  function isCurrentLiability(a) { return isLiability(a) && !hasName(a, /قروض|تمويل/) && (code(a).startsWith('201') || sub(a).startsWith('21') || hasName(a, /الموردين|مستحقات|مستحق/)); }

  function inferRule(a) {
    const id = code(a);
    if (ACCOUNT_OVERRIDES[id]) return ACCOUNT_OVERRIDES[id];
    if (isRevenue(a)) return { category: 'revenue', sub_category: isContraRevenue(a) ? '410099' : '410001' };
    if (isCostOfSales(a)) return { category: 'expenses', sub_category: '510002' };
    if (isExpense(a)) return { category: 'expenses', sub_category: sub(a) || '620099' };
    if (isEquity(a)) return { category: 'equity', sub_category: sub(a) || '310099' };
    if (isLiability(a)) return { category: 'liabilities', sub_category: sub(a) || '210099' };
    if (isAsset(a)) return { category: 'assets', sub_category: sub(a) || (code(a).startsWith('102') ? '121002' : '110099') };
    return null;
  }

  function applyCFOClassificationRules(force = false) {
    if (!window.auditFile || !Array.isArray(auditFile.trialBalance)) return 0;
    let changed = 0;
    auditFile.trialBalance.forEach(a => {
      if (!force && a.is_user_locked) return;
      const rule = inferRule(a);
      if (!rule) return;
      if (force || !a.category || !a.sub_category || ACCOUNT_OVERRIDES[code(a)]) {
        if (a.category !== rule.category || a.sub_category !== rule.sub_category) {
          a.category = rule.category;
          a.sub_category = rule.sub_category;
          a.review_status = ACCOUNT_OVERRIDES[code(a)] ? 'reviewed' : (a.review_status || 'pending');
          a.qa_note = rule.note || a.qa_note || 'تصنيف CFO تلقائي من رقم/اسم الحساب.';
          changed++;
        }
      }
    });
    if (changed && typeof saveAuditFile === 'function') saveAuditFile();
    return changed;
  }

  function profitCalc() {
    applyCFOClassificationRules(false);
    const tb = Array.isArray(window.auditFile?.trialBalance) ? auditFile.trialBalance : [];
    let revenue = 0, discounts = 0, cost = 0, opex = 0;
    tb.forEach(a => {
      const b = finalBal(a);
      if (isRevenue(a)) {
        if (isContraRevenue(a)) discounts += b > 0 ? b : Math.abs(b);
        else revenue += b < 0 ? Math.abs(b) : -b;
      } else if (isCostOfSales(a)) {
        cost += b > 0 ? b : Math.abs(b);
      } else if (isExpense(a)) {
        opex += b > 0 ? b : Math.abs(b);
      }
    });
    const netRevenue = revenue - discounts;
    const grossProfit = netRevenue - cost;
    const profitAfter = grossProfit - opex;
    return { grossRevenue: r2(revenue), contraRevenue: r2(discounts), netRevenue: r2(netRevenue), costOfSales: r2(cost), grossProfit: r2(grossProfit), operatingExpenses: r2(opex), expenses: r2(cost + opex), profitBefore: r2(profitAfter), adjustmentsEffect: 0, profitAfter: r2(profitAfter), profitForEquity: r2(-profitAfter), isLoss: profitAfter < 0 };
  }

  function sumRows(filter, balanceFn = finalBal) {
    const tb = Array.isArray(window.auditFile?.trialBalance) ? auditFile.trialBalance : [];
    return tb.filter(filter).reduce((s, a) => s + balanceFn(a), 0);
  }
  function avgBalance(filter) {
    const tb = Array.isArray(window.auditFile?.trialBalance) ? auditFile.trialBalance : [];
    const filtered = tb.filter(filter);
    const closing = filtered.reduce((s, a) => s + Math.abs(finalBal(a)), 0);
    const opening = filtered.reduce((s, a) => s + Math.abs(openingBal(a)), 0);
    return (opening + closing) / 2;
  }

  function calculateRatiosCore() {
    applyCFOClassificationRules(false);
    const p = profitCalc();
    const currentAssets = Math.max(0, sumRows(isCurrentAsset));
    const inventory = Math.abs(sumRows(isInventory));
    const currentLiabilities = Math.abs(sumRows(isCurrentLiability));
    const totalAssets = Math.abs(sumRows(isAsset));
    const totalLiabilities = Math.abs(sumRows(isLiability));
    const equityRaw = -sumRows(isEquity) + p.profitAfter;
    const avgAssets = avgBalance(isAsset) || totalAssets;
    const avgReceivables = avgBalance(isReceivable);
    const avgInventory = avgBalance(isInventory) || inventory;
    const safeDiv = (a, b) => Math.abs(b) > 0.000001 ? a / b : NaN;

    const grossMargin = safeDiv(p.grossProfit, p.netRevenue) * 100;
    const netMargin = safeDiv(p.profitAfter, p.netRevenue) * 100;
    const roa = safeDiv(p.profitAfter, avgAssets) * 100;
    const roe = equityRaw > 0 ? safeDiv(p.profitAfter, equityRaw) * 100 : NaN;
    const currentRatio = safeDiv(currentAssets, currentLiabilities);
    const quickRatio = safeDiv(currentAssets - inventory, currentLiabilities);
    const debtToEquity = equityRaw > 0 ? safeDiv(totalLiabilities, equityRaw) : NaN;
    const assetTurnover = safeDiv(p.netRevenue, avgAssets);
    const collectionPeriod = safeDiv(avgReceivables, p.netRevenue / 365);
    const inventoryTurnover = safeDiv(p.costOfSales, avgInventory);
    const debtRatio = safeDiv(totalLiabilities, totalAssets) * 100;
    const workingCapital = currentAssets - currentLiabilities;

    return {
      grossMargin: { value: grossMargin, display: pct(grossMargin), indicator: grossMargin >= 20 ? 'good' : grossMargin >= 10 ? 'warning' : 'danger', explanation: 'مجمل الربح ÷ صافي الإيرادات' },
      netMargin: { value: netMargin, display: pct(netMargin), indicator: netMargin >= 10 ? 'good' : netMargin >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ صافي الإيرادات' },
      roa: { value: roa, display: pct(roa), indicator: roa >= 5 ? 'good' : roa >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ متوسط الأصول' },
      roe: { value: roe, display: Number.isFinite(roe) ? pct(roe) : 'غير قابل للقياس: حقوق الملكية صفر/سالبة', indicator: Number.isFinite(roe) && roe >= 15 ? 'good' : Number.isFinite(roe) && roe >= 0 ? 'warning' : 'danger', explanation: 'صافي الربح ÷ حقوق الملكية. لا يعرض كنسبة إذا كانت حقوق الملكية صفر/سالبة.' },
      currentRatio: { value: currentRatio, display: times(currentRatio), indicator: currentRatio >= 1.5 ? 'good' : currentRatio >= 1 ? 'warning' : 'danger', explanation: 'الأصول المتداولة ÷ الالتزامات المتداولة' },
      quickRatio: { value: quickRatio, display: times(quickRatio), indicator: quickRatio >= 1 ? 'good' : quickRatio >= 0.5 ? 'warning' : 'danger', explanation: '(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة' },
      debtToEquity: { value: debtToEquity, display: Number.isFinite(debtToEquity) ? times(debtToEquity) : 'غير قابل للقياس: حقوق الملكية صفر/سالبة', indicator: Number.isFinite(debtToEquity) && debtToEquity <= 1 ? 'good' : Number.isFinite(debtToEquity) && debtToEquity <= 1.5 ? 'warning' : 'danger', explanation: 'إجمالي الالتزامات ÷ حقوق الملكية.' },
      assetTurnover: { value: assetTurnover, display: times(assetTurnover), indicator: assetTurnover >= 1 ? 'good' : assetTurnover >= 0.5 ? 'warning' : 'danger', explanation: 'صافي الإيرادات ÷ متوسط الأصول' },
      collectionPeriod: { value: collectionPeriod, display: days(collectionPeriod), indicator: collectionPeriod <= 45 ? 'good' : collectionPeriod <= 75 ? 'warning' : 'danger', explanation: 'متوسط العملاء ÷ (صافي الإيرادات ÷ 365)' },
      inventoryTurnover: { value: inventoryTurnover, display: times(inventoryTurnover), indicator: inventoryTurnover >= 6 ? 'good' : inventoryTurnover >= 3 ? 'warning' : 'danger', explanation: 'تكلفة الإيرادات ÷ متوسط المخزون' },
      debtRatio: { value: debtRatio, display: pct(debtRatio), indicator: debtRatio <= 50 ? 'good' : debtRatio <= 70 ? 'warning' : 'danger', explanation: 'إجمالي الالتزامات ÷ إجمالي الأصول' },
      workingCapital: { value: workingCapital, display: Number.isFinite(workingCapital) ? r2(workingCapital).toLocaleString('ar-SA') : 'غير قابل للقياس', indicator: workingCapital > 0 ? 'good' : 'danger', explanation: 'الأصول المتداولة - الالتزامات المتداولة' }
    };
  }

  function installRatioHelpPopover() {
    if (document.getElementById('ratioHelpStyle')) return;
    const style = document.createElement('style');
    style.id = 'ratioHelpStyle';
    style.textContent = `.ratio-card{position:relative;cursor:help}.ratio-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,170,255,.12)}.ratio-help-popover{position:fixed;z-index:99999;width:min(390px,calc(100vw - 24px));background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:12px;padding:14px 16px;box-shadow:0 18px 45px rgba(0,0,0,.45);font-size:.9rem;line-height:1.7;direction:rtl;text-align:right;display:none}.ratio-help-popover h6{color:#38bdf8;font-weight:800;margin-bottom:8px}.ratio-help-popover .formula{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.18);border-radius:8px;padding:7px 9px;margin:8px 0;color:#bae6fd;font-family:monospace}.ratio-help-popover .decision{color:#facc15;margin-top:8px}`;
    document.head.appendChild(style);
  }
  function ratioMeaning(id) {
    const map = {
      grossMargin: ['هامش الربح الإجمالي','مجمل الربح ÷ صافي الإيرادات','يقيس ربحية النشاط قبل المصروفات الإدارية والتشغيلية.','راجع التسعير وتكلفة الإنتاج والخصومات.'],
      netMargin: ['هامش صافي الربح','صافي الربح ÷ صافي الإيرادات','يوضح المتبقي من كل ريال مبيعات بعد كل المصروفات.','إذا كان سالبًا فهناك خسارة تحتاج خطة علاج.'],
      roa: ['العائد على الأصول','صافي الربح ÷ متوسط الأصول','يقيس كفاءة استخدام الأصول في توليد الربح.','انخفاضه يعني أصول غير مستغلة أو ربحية ضعيفة.'],
      roe: ['العائد على حقوق الملكية','صافي الربح ÷ حقوق الملكية','يقيس عائد الملاك.','إذا كانت حقوق الملكية سالبة فالمؤشر غير صالح للعرض كرقم عادي.'],
      currentRatio: ['نسبة التداول','الأصول المتداولة ÷ الالتزامات المتداولة','تقيس قدرة السداد القصير.','أقل من 1 ضغط سيولة، وأكثر من 2 قد يعني أموالًا معطلة.'],
      quickRatio: ['نسبة السيولة السريعة','(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة','تقيس السيولة بدون الاعتماد على بيع المخزون.','لو أقل بكثير من التداول فالسيولة محبوسة في المخزون.'],
      debtToEquity: ['الديون إلى حقوق الملكية','إجمالي الالتزامات ÷ حقوق الملكية','تقيس الرافعة المالية.','مع حقوق ملكية سالبة لا تعرض كنسبة.'],
      assetTurnover: ['معدل دوران الأصول','صافي الإيرادات ÷ متوسط الأصول','يقيس قدرة الأصول على إنتاج مبيعات.','انخفاضه يعني طاقة غير مستغلة.'],
      collectionPeriod: ['فترة التحصيل','متوسط العملاء ÷ (الإيرادات ÷ 365)','تقيس عدد أيام التحصيل.','كلما زادت ضغطت السيولة.'],
      inventoryTurnover: ['معدل دوران المخزون','تكلفة الإيرادات ÷ متوسط المخزون','يقيس سرعة تحويل المخزون لمبيعات.','ضعفه يعني مخزون راكد أو شراء زائد.'],
      debtRatio: ['نسبة الديون','إجمالي الالتزامات ÷ إجمالي الأصول','تقيس نسبة تمويل الأصول من الغير.','ارتفاعها يزيد مخاطر التمويل.']
    };
    return map[id];
  }
  function bindRatioHelpPopover() {
    installRatioHelpPopover();
    let pop = document.getElementById('ratioHelpPopover');
    if (!pop) { pop = document.createElement('div'); pop.id = 'ratioHelpPopover'; pop.className = 'ratio-help-popover'; document.body.appendChild(pop); }
    document.querySelectorAll('.ratio-card[data-ratio]').forEach(card => {
      if (card.dataset.helpBound === 'true') return;
      card.dataset.helpBound = 'true';
      const show = () => {
        const info = ratioMeaning(card.dataset.ratio);
        if (!info) return;
        const value = card.querySelector('.ratio-value')?.textContent?.trim() || '';
        const comp = card.querySelector('.ratio-comparison')?.textContent?.trim() || '';
        pop.innerHTML = `<h6>${info[0]}</h6><div><strong>القيمة الحالية:</strong> ${value}</div><div><strong>المقارنة:</strong> ${comp}</div><div class="formula">${info[1]}</div><div>${info[2]}</div><div class="decision"><strong>قراءة المدير المالي:</strong> ${info[3]}</div>`;
        const rect = card.getBoundingClientRect();
        pop.style.top = `${Math.min(window.innerHeight - 20, rect.bottom + 10)}px`;
        pop.style.left = `${Math.max(12, Math.min(window.innerWidth - 405, rect.left))}px`;
        pop.style.display = 'block';
      };
      const hide = () => { pop.style.display = 'none'; };
      card.addEventListener('mouseenter', show);
      card.addEventListener('mousemove', show);
      card.addEventListener('mouseleave', hide);
      card.addEventListener('click', show);
    });
  }

  function updateCardsFromRatios() {
    const ratios = calculateRatiosCore();
    Object.keys(ratios).forEach(ratioId => {
      const card = document.querySelector(`[data-ratio="${ratioId}"]`);
      if (!card) return;
      const data = ratios[ratioId];
      const valueEl = card.querySelector('.ratio-value');
      const compEl = card.querySelector('.ratio-comparison');
      const indicatorEl = card.querySelector('.ratio-indicator');
      if (valueEl) valueEl.textContent = data.display;
      if (compEl) { compEl.className = 'ratio-comparison neutral'; compEl.innerHTML = '<i class="fas fa-info-circle"></i> لا توجد سنة سابقة معتمدة'; }
      if (indicatorEl) indicatorEl.className = `ratio-indicator indicator-${data.indicator || 'warn'}`;
      card.title = data.explanation || '';
    });
    bindRatioHelpPopover();
  }

  function patchKpiCards() {
    if (typeof calculateFinancialRatios === 'function') calculateFinancialRatios = calculateRatiosCore;
    if (typeof updateKpiPane === 'function' && !updateKpiPane.__cfoPatched) {
      const original = updateKpiPane;
      const patched = function() { const res = original.apply(this, arguments); updateCardsFromRatios(); return res; };
      patched.__cfoPatched = true;
      updateKpiPane = patched;
    }
    window.PolarisRatiosQA = { calculate: calculateRatiosCore, update: updateCardsFromRatios };
  }

  function patchAutoCategorization() {
    const originalAuto = typeof autoCategorizeAccounts === 'function' ? autoCategorizeAccounts : null;
    if (originalAuto && !originalAuto.__cfoPatched) {
      const patchedAuto = function() {
        const originalResult = originalAuto.apply(this, arguments);
        const changed = applyCFOClassificationRules(false);
        if (changed && typeof refreshAllUI === 'function') refreshAllUI();
        return originalResult;
      };
      patchedAuto.__cfoPatched = true;
      autoCategorizeAccounts = patchedAuto;
    }

    window.applyCFOClassificationRules = applyCFOClassificationRules;
    window.runAutoCategorization = function() {
      const action = () => {
        const changed = applyCFOClassificationRules(true);
        if (originalAuto) originalAuto();
        applyCFOClassificationRules(true);
        if (typeof saveAuditFile === 'function') saveAuditFile();
        if (typeof refreshAllUI === 'function') refreshAllUI();
        if (typeof showNotification === 'function') showNotification(`تمت إعادة التصنيف حسب قواعد CFO. تم تعديل ${changed} حساب.`, 'success');
      };
      if (typeof showConfirmation === 'function') {
        showConfirmation('إعادة التصنيف التلقائي', 'هل أنت متأكد من رغبتك في إعادة التصنيف حسب قواعد المدير المالي؟', action);
      } else if (confirm('هل أنت متأكد من رغبتك في إعادة التصنيف حسب قواعد المدير المالي؟')) action();
    };
  }

  function boot() {
    if (!['account-mapping', 'account-mapping.html'].includes((location.pathname.split('/').pop() || '').replace('.html',''))) return;
    patchAutoCategorization();
    patchKpiCards();
    bindRatioHelpPopover();
    setTimeout(() => { patchAutoCategorization(); patchKpiCards(); updateCardsFromRatios(); }, 1200);
    setTimeout(() => { patchAutoCategorization(); patchKpiCards(); updateCardsFromRatios(); }, 2500);
    console.log('Polaris accounting QA patch v2 loaded: robust ratios + CFO reclassification');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
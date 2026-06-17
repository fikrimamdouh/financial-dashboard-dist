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
  const times = v => Number.isFinite(v) ? v.toFixed(1) + 'x' : 'غير قابل للقياس';
  const days = v => Number.isFinite(v) ? Math.round(v) + ' يوم' : 'غير قابل للقياس';
  const money = v => typeof formatCurrency === 'function' ? formatCurrency(v) : R(v).toLocaleString('ar-SA');

  const OVERRIDES = {
    '10203071': ['assets', '121002', 'مصاريف تأسيس النشاط أصل ثابت/تحسينات مباني ولا تدخل بالكامل في قائمة الدخل.'],
    '101080004': ['assets', '116005', 'مخزن قطع غيار أصل/مخزون ولا يحمل على المصروف إلا عند الصرف.'],
    '201040001': ['liabilities', '212001', 'أجور ورواتب مستحقة التزام وليس مصروفًا جديدًا.'],
    '303011': ['expenses', '510002', 'تكلفة المبيعات ضمن تكلفة الإيرادات.'],
    '401010001': ['revenue', '410001', 'مبيعات الخرسانة الجاهزة ضمن الإيرادات.'],
    '401010003': ['revenue', '410099', 'خصم مسموح به: إيراد عكسي يخصم من المبيعات.'],
    '401020001': ['revenue', '410001', 'مبيعات البلوك ضمن الإيرادات.'],
    '401020003': ['revenue', '410099', 'خصم مسموح به: إيراد عكسي يخصم من المبيعات.']
  };

  const code = a => String(a?.account_id || a?.account_code || a?.code || a?.accountNo || a?.account_no || '').trim();
  const sub = a => String(a?.sub_category || '').trim();
  const cat = a => String(a?.category || '').trim().toLowerCase();
  const nm = a => String(a?.name || a?.account_name || '').trim().toLowerCase();
  const has = (a, words) => words.some(w => nm(a).includes(w));
  const rows = () => Array.isArray(window.auditFile?.trialBalance) ? auditFile.trialBalance : [];
  const openBal = a => N(a?.ob_debit) - N(a?.ob_credit);
  const closeBal = a => {
    if (a?.book_balance !== undefined && a.book_balance !== null && a.book_balance !== '') return N(a.book_balance);
    return openBal(a) + N(a?.move_debit) - N(a?.move_credit);
  };
  const adjBal = a => closeBal(a) + (Array.isArray(window.auditFile?.adjustments) ? auditFile.adjustments.reduce((s, j) => {
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
  function isExpense(a) { if (OVERRIDES[code(a)] && OVERRIDES[code(a)][0] !== 'expenses') return false; return cat(a) === 'expenses' || cat(a).includes('مصروف') || code(a).startsWith('6') || code(a).startsWith('7') || sub(a).startsWith('6') || sub(a).startsWith('7') || has(a, ['مصروف', 'مصاريف']); }
  function isCurrentAsset(a) { return isAsset(a) && (code(a).startsWith('101') || sub(a).startsWith('11') || has(a, ['الصندوق','البنك','ذمم العملاء','عملاء','عهدة','سلفة','مخزن','مخزون','مصروف مقدم'])); }
  function isInventory(a) { return isAsset(a) && (code(a).startsWith('10108') || sub(a).startsWith('116') || has(a, ['مخزن','مخزون'])); }
  function isReceivable(a) { return isAsset(a) && (code(a).startsWith('101041') || ['113001','113002','113003','113004','113099'].includes(sub(a)) || has(a, ['ذمم العملاء','عملاء'])); }
  function isCurrentLiability(a) { return isLiability(a) && !has(a, ['قروض','تمويل']) && (code(a).startsWith('201') || sub(a).startsWith('21') || has(a, ['الموردين','مستحقات','مستحق'])); }

  function ruleFor(a) {
    if (OVERRIDES[code(a)]) return OVERRIDES[code(a)];
    if (isRevenue(a)) return ['revenue', isContraRevenue(a) ? '410099' : '410001', 'تصنيف إيراد من رقم/اسم الحساب.'];
    if (isCost(a)) return ['expenses', '510002', 'تصنيف تكلفة مبيعات.'];
    if (isExpense(a)) return ['expenses', sub(a) || '620099', 'تصنيف مصروف تشغيلي.'];
    if (isEquity(a)) return ['equity', sub(a) || '310099', 'تصنيف حقوق ملكية.'];
    if (isLiability(a)) return ['liabilities', sub(a) || '210099', 'تصنيف التزام.'];
    if (isAsset(a)) return ['assets', sub(a) || (code(a).startsWith('102') ? '121002' : '110099'), 'تصنيف أصل.'];
    return null;
  }

  function applyCFOClassificationRules(force = false) {
    let changed = 0;
    rows().forEach(a => {
      if (!force && a.is_user_locked) return;
      const r = ruleFor(a);
      if (!r) return;
      if (force || !a.category || !a.sub_category || OVERRIDES[code(a)]) {
        if (a.category !== r[0] || a.sub_category !== r[1]) {
          a.category = r[0];
          a.sub_category = r[1];
          a.review_status = OVERRIDES[code(a)] ? 'reviewed' : (a.review_status || 'pending');
          a.qa_note = r[2];
          changed++;
        }
      }
    });
    return changed;
  }

  function profitCore(balanceFn = adjBal) {
    let revenue = 0, discounts = 0, cost = 0, opex = 0;
    rows().forEach(a => {
      const b = balanceFn(a);
      if (isRevenue(a)) {
        if (isContraRevenue(a)) discounts += b > 0 ? b : Math.abs(b);
        else revenue += b < 0 ? Math.abs(b) : -b;
      } else if (isCost(a)) cost += Math.abs(b);
      else if (isExpense(a)) opex += Math.abs(b);
    });
    const netRevenue = revenue - discounts;
    const grossProfit = netRevenue - cost;
    const netProfit = grossProfit - opex;
    return { grossRevenue:R(revenue), contraRevenue:R(discounts), netRevenue:R(netRevenue), totalRevenue:R(netRevenue), costOfSales:R(cost), grossProfit:R(grossProfit), operatingExpenses:R(opex), expenses:R(cost+opex), profitBefore:R(netProfit), adjustmentsEffect:0, profitAfter:R(netProfit), netProfit:R(netProfit), isLoss:netProfit < 0 };
  }

  const sum = (filter, bal) => rows().filter(filter).reduce((s, a) => s + bal(a), 0);
  const absSum = (filter, bal) => rows().filter(filter).reduce((s, a) => s + Math.abs(bal(a)), 0);
  const div = (a, b) => Math.abs(b) > 0.000001 ? a / b : NaN;

  function metricSet(bal, isPrior) {
    const p = profitCore(bal);
    const ca = Math.max(0, sum(isCurrentAsset, bal));
    const inv = absSum(isInventory, bal);
    const cl = absSum(isCurrentLiability, bal);
    const assets = absSum(isAsset, bal);
    const liab = absSum(isLiability, bal);
    const recv = absSum(isReceivable, bal);
    const equity = -sum(isEquity, bal) + (isPrior ? 0 : p.profitAfter);
    return { p, equity, grossMargin:div(p.grossProfit,p.netRevenue)*100, netMargin:div(p.profitAfter,p.netRevenue)*100, roa:div(p.profitAfter,assets)*100, roe:equity>0?div(p.profitAfter,equity)*100:NaN, currentRatio:div(ca,cl), quickRatio:div(ca-inv,cl), debtToEquity:equity>0?div(liab,equity):NaN, assetTurnover:div(p.netRevenue,assets), collectionPeriod:div(recv,p.netRevenue/365), inventoryTurnover:div(p.costOfSales,inv), debtRatio:div(liab,assets)*100, workingCapital:ca-cl };
  }

  function fmt(id, v) { if (['grossMargin','netMargin','roa','roe','debtRatio'].includes(id)) return pct(v); if (id==='collectionPeriod') return days(v); if (id==='workingCapital') return Number.isFinite(v)?R(v).toLocaleString('ar-SA'):'غير قابل للقياس'; return times(v); }
  function cmp(id, cur, prev) { if (!Number.isFinite(prev)) return '<i class="fas fa-info-circle"></i> لا يوجد رصيد أول مدة صالح للمقارنة'; if (!Number.isFinite(cur)) return '<i class="fas fa-exclamation-circle"></i> غير قابل للقياس حاليًا'; const d=cur-prev; return `${d>0?'▲':d<0?'▼':'■'} سنة سابقة: ${fmt(id,prev)} | فرق: ${fmt(id,d)}`; }
  function stat(id, v) { if (!Number.isFinite(v)) return 'danger'; if (id==='currentRatio') return v>=1.5?'good':v>=1?'warning':'danger'; if (id==='quickRatio') return v>=1?'good':v>=.5?'warning':'danger'; if (id==='debtRatio'||id==='debtToEquity'||id==='collectionPeriod') return v<=50?'good':v<=75?'warning':'danger'; if (id==='inventoryTurnover') return v>=6?'good':v>=3?'warning':'danger'; return v>=10?'good':v>=0?'warning':'danger'; }

  function calculateRatiosCore() {
    const cur = metricSet(adjBal, false);
    const prev = metricSet(openBal, true);
    const labels = { grossMargin:'مجمل الربح ÷ صافي الإيرادات', netMargin:'صافي الربح ÷ صافي الإيرادات', roa:'صافي الربح ÷ الأصول', roe:'صافي الربح ÷ حقوق الملكية', currentRatio:'الأصول المتداولة ÷ الالتزامات المتداولة', quickRatio:'(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة', debtToEquity:'إجمالي الالتزامات ÷ حقوق الملكية', assetTurnover:'صافي الإيرادات ÷ الأصول', collectionPeriod:'العملاء ÷ (الإيرادات ÷ 365)', inventoryTurnover:'تكلفة الإيرادات ÷ المخزون', debtRatio:'إجمالي الالتزامات ÷ إجمالي الأصول', workingCapital:'الأصول المتداولة - الالتزامات المتداولة' };
    const out = {};
    Object.keys(labels).forEach(id => out[id] = { value:cur[id], priorValue:prev[id], display:fmt(id,cur[id]), unit:id==='collectionPeriod'?'يوم':(['grossMargin','netMargin','roa','roe','debtRatio'].includes(id)?'%':'x'), comparison:cmp(id,cur[id],prev[id]), indicator:stat(id,cur[id]), explanation:`${labels[id]}. المقارنة تستخدم رصيد أول المدة كسنة سابقة.` });
    if (!Number.isFinite(cur.roe)) out.roe.display = 'غير قابل للقياس: حقوق الملكية صفر/سالبة بعد نتيجة الفترة';
    if (!Number.isFinite(cur.debtToEquity)) out.debtToEquity.display = 'غير قابل للقياس: حقوق الملكية صفر/سالبة بعد نتيجة الفترة';
    return out;
  }

  function updateKpiCardsCFO() {
    const ratios = calculateRatiosCore();
    Object.keys(ratios).forEach(id => {
      const card = document.querySelector(`[data-ratio="${id}"]`);
      if (!card) return;
      const v = card.querySelector('.ratio-value');
      const c = card.querySelector('.ratio-comparison');
      const i = card.querySelector('.ratio-indicator');
      if (v) v.textContent = ratios[id].display;
      if (c) { c.className = 'ratio-comparison neutral'; c.innerHTML = ratios[id].comparison; }
      if (i) i.className = `ratio-indicator ${ratios[id].indicator} indicator-${ratios[id].indicator}`;
      card.title = ratios[id].explanation;
    });
    bindHelp();
  }

  function bindHelp() {
    if (!document.getElementById('ratioHelpStyle')) { const st=document.createElement('style'); st.id='ratioHelpStyle'; st.textContent='.ratio-card{cursor:help}.ratio-help-popover{position:fixed;z-index:99999;max-width:390px;background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:12px;padding:14px 16px;box-shadow:0 18px 45px rgba(0,0,0,.45);font-size:.9rem;line-height:1.7;direction:rtl;text-align:right;display:none}.ratio-help-popover h6{color:#38bdf8}.ratio-help-popover .formula{background:rgba(56,189,248,.08);border-radius:8px;padding:7px 9px;margin:8px 0;color:#bae6fd}.ratio-help-popover .decision{color:#facc15}'; document.head.appendChild(st); }
    let pop=document.getElementById('ratioHelpPopover'); if(!pop){pop=document.createElement('div');pop.id='ratioHelpPopover';pop.className='ratio-help-popover';document.body.appendChild(pop);}
    document.querySelectorAll('.ratio-card[data-ratio]').forEach(card => { if(card.dataset.helpBound) return; card.dataset.helpBound='1'; const show=()=>{ const d=calculateRatiosCore()[card.dataset.ratio]; if(!d) return; pop.innerHTML=`<h6>${card.querySelector('.ratio-label')?.textContent||''}</h6><div><b>الحالي:</b> ${d.display}</div><div><b>المقارنة:</b> ${d.comparison}</div><div class="formula">${d.explanation}</div><div class="decision"><b>قراءة CFO:</b> زر التحديث يطبق التصنيف، الربح، النسب، والتنبيهات دفعة واحدة.</div>`; const r=card.getBoundingClientRect(); pop.style.top=Math.min(window.innerHeight-20,r.bottom+10)+'px'; pop.style.left=Math.max(12,Math.min(window.innerWidth-405,r.left))+'px'; pop.style.display='block'; }; card.addEventListener('mouseenter',show); card.addEventListener('mousemove',show); card.addEventListener('mouseleave',()=>pop.style.display='none'); card.addEventListener('click',show); });
  }

  function updateProfitDisplay() {
    const p = profitCore(adjBal);
    const before = document.getElementById('profitBeforeDisplay');
    const after = document.getElementById('netProfitDisplay');
    const aje = document.getElementById('adjustmentsEffectDisplay');
    if (before) before.textContent = money(p.profitBefore);
    if (after) after.textContent = money(p.profitAfter);
    if (aje) aje.textContent = money(0);
    return p;
  }

  function repaintTables() {
    if (typeof preProcessAccountAnalysis === 'function') { try { preProcessAccountAnalysis(); } catch(e){} }
    if (typeof processAndRender === 'function') { try { processAndRender(); return; } catch(e){} }
    if (typeof renderAll === 'function') { try { renderAll(); return; } catch(e){} }
    if (typeof updateAccountTable === 'function') { try { updateAccountTable(); } catch(e){} }
  }

  function cfoFullRefresh(silent=false) {
    const changed = applyCFOClassificationRules(true);
    if (typeof saveAuditFile === 'function') saveAuditFile();
    repaintTables();
    if (typeof updateCockpit === 'function') { try { updateCockpit(); } catch(e){} }
    if (typeof cleanupAndRebuildKpiCards === 'function') { try { cleanupAndRebuildKpiCards(); } catch(e){} }
    updateKpiCardsCFO();
    const p = updateProfitDisplay();
    if (!silent) {
      const total = rows().length;
      const missing = rows().filter(a => !a.category || !a.sub_category).length;
      const msg = `تم تحديث وتصحيح الصفحة: ${changed} تعديل، غير المصنف ${missing}/${total}، صافي الربح ${money(p.profitAfter)}`;
      if (typeof showNotification === 'function') showNotification(msg, missing ? 'warning' : 'success'); else console.log(msg);
    }
    return { changed, missing: rows().filter(a => !a.category || !a.sub_category).map(a => ({ id: code(a), name: a.name, category: a.category, sub_category: a.sub_category })), profit: p, ratios: calculateRatiosCore() };
  }

  function patchFunctions() {
    window.applyCFOClassificationRules = applyCFOClassificationRules;
    window.PolarisCFOFullRefresh = cfoFullRefresh;
    window.PolarisRatiosQA = { calculate:calculateRatiosCore, update:updateKpiCardsCFO, fullRefresh:cfoFullRefresh };
    window.calculateFinancialRatios = calculateRatiosCore;
    window.calculateNetProfit = function() { return profitCore(adjBal); };
    window.updateKpiPane = function(){ updateKpiCardsCFO(); console.log('✅ تم تحديث لوحة التحليل المالي بمنطق CFO'); };
    window.runAutoCategorization = function(){ if(confirm('هل أنت متأكد من رغبتك في إعادة التصنيف والتحديث الكامل حسب قواعد CFO؟')) cfoFullRefresh(false); };
  }

  function bindRefreshButtons() {
    document.querySelectorAll('button, .btn, a').forEach(btn => {
      const text = (btn.textContent || '').replace(/\s+/g,' ').trim();
      if (!text) return;
      if (/تحديث|إعادة التصنيف|اعادة التصنيف|إصلاح|تصحيح/.test(text)) {
        if (btn.dataset.cfoRefreshBound) return;
        btn.dataset.cfoRefreshBound = '1';
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); cfoFullRefresh(false); }, true);
      }
    });
  }

  function boot() {
    if ((location.pathname.split('/').pop() || '').replace('.html','') !== 'account-mapping') return;
    patchFunctions(); bindHelp(); bindRefreshButtons();
    setTimeout(() => { patchFunctions(); bindRefreshButtons(); cfoFullRefresh(true); }, 900);
    setTimeout(() => { patchFunctions(); bindRefreshButtons(); cfoFullRefresh(true); }, 2500);
    console.log('Polaris accounting QA patch v2 loaded: CFO refresh rerenders account table');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
;(() => {
  'use strict';

  const N = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const p = parseFloat(String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(p) ? p : 0;
  };
  const R = v => Math.round((Number(v) || 0) * 100) / 100;
  const P = v => Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : 'غير قابل للقياس';
  const M = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : N(v).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }));
  const D = v => Number.isFinite(v) ? v.toFixed(2) : 'غير قابل للقياس';

  function getDataSafe() {
    if (window.PolarisReportingQA && typeof window.PolarisReportingQA.buildUnifiedData === 'function') return window.PolarisReportingQA.buildUnifiedData();
    if (typeof window.getData === 'function') return window.getData();
    return null;
  }

  function rows(data) { return Array.isArray(data?.trialBalance) ? data.trialBalance : []; }
  function mapSub(acc) { return (window.SUB_CATEGORY_MAPPING || {})[String(acc?.sub_category || '')] || ''; }
  function finalBalance(acc) {
    if (window.PolarisReportingQA && typeof window.PolarisReportingQA.finalBalance === 'function') return window.PolarisReportingQA.finalBalance(acc, getDataSafe()?.adjustments || []);
    return acc?.finalBalance !== undefined ? N(acc.finalBalance) : N(acc?.book_balance);
  }
  function openingBalance(acc) { return N(acc?.ob_debit) - N(acc?.ob_credit); }
  function titleBlock(title, status = 'معتمد من ميزان المراجعة') {
    return `<div class="p-4"><h4 class="mb-3">${title}</h4><div class="alert alert-info"><strong>تصنيف التقرير:</strong> ${status}.<br>المدخل الوحيد المتاح هو ميزان المراجعة المعتمد. أي نموذج يحتاج بيانات سوقية/موازنة/تدفقات مستقبلية يتم عرضه كتحليل افتراضي واضح، وليس حكمًا نهائيًا.</div>`;
  }
  function endBlock() { return '</div>'; }
  function table(headers, body) { return `<table class="table table-bordered table-sm"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`; }
  function metric(label, value, note = '') { return `<div class="col-md-3 mb-3"><div class="stats-card"><h3>${value}</h3><p>${label}</p>${note ? `<small>${note}</small>` : ''}</div></div>`; }
  function basicMetrics(data) {
    return `<div class="row mb-3">${metric('صافي الإيرادات', M(data.revenue))}${metric('مجمل الربح', M(data.grossProfit))}${metric('صافي الربح/الخسارة', M(data.netIncome))}${metric('حقوق الملكية', M(data.equity))}</div>`;
  }
  function accountsBy(data, filter) { return rows(data).filter(filter); }
  function accountRows(list) {
    return list.map(a => `<tr><td>${a.name || ''}<br><small>${a.account_id || ''}</small></td><td>${a.category || ''}</td><td>${a.sub_category || ''}</td><td class="text-end">${M(finalBalance(a))}</td></tr>`).join('') || '<tr><td colspan="4">لا توجد حسابات مطابقة.</td></tr>';
  }

  function governanceReport(data, title, status, body) {
    return titleBlock(title, status) + basicMetrics(data) + body + `<div class="alert alert-warning mt-3"><strong>رأي المدير المالي:</strong> استخدم هذا التقرير لاتخاذ قرار إداري أولي. لا تستخدمه كإقرار نظامي أو تقييم مستقل إلا بعد إدخال المدخلات الخارجية المطلوبة إن وجدت.</div>` + endBlock();
  }

  const reports = {};

  reports['sovereign-fs'] = (data) => governanceReport(data, 'القوائم المالية المختصرة', 'معتمد من القوائم المالية',
    table(['البند', 'القيمة'], `
      <tr><td>صافي الإيرادات</td><td class="text-end">${M(data.revenue)}</td></tr>
      <tr><td>تكلفة الإيرادات</td><td class="text-end">${M(data.cogs)}</td></tr>
      <tr><td>مجمل الربح</td><td class="text-end">${M(data.grossProfit)}</td></tr>
      <tr><td>مصروفات التشغيل والإدارة</td><td class="text-end">${M(data.operatingExpenses)}</td></tr>
      <tr class="table-primary"><td><strong>صافي الربح/الخسارة</strong></td><td class="text-end"><strong>${M(data.netIncome)}</strong></td></tr>
      <tr><td>إجمالي الأصول</td><td class="text-end">${M(data.assets)}</td></tr>
      <tr><td>إجمالي الالتزامات</td><td class="text-end">${M(data.liabilities)}</td></tr>
      <tr><td>حقوق الملكية</td><td class="text-end">${M(data.equity)}</td></tr>
      <tr><td>فرق المعادلة المحاسبية</td><td class="text-end">${M(data.equationDiff)}</td></tr>`));

  reports['sovereign-audit'] = (data) => {
    const issues = [];
    if (Math.abs(N(data.equationDiff)) > 1) issues.push('فرق في معادلة المركز المالي.');
    if (Math.abs(N(data.cashFlowReconciliationDiff)) > 1) issues.push('فرق في مطابقة التدفقات النقدية مع النقدية الفعلية.');
    if (data.netIncome < 0) issues.push('الشركة تحقق خسارة في الفترة.');
    const conclusion = issues.length ? 'رأي مراجعة داخلي مع تحفظات تشغيلية' : 'رأي مراجعة داخلي نظيف مبدئيًا';
    return governanceReport(data, 'تقرير المراجعة الداخلي', 'معتمد كمراجعة داخلية لا كرأي مراجع خارجي', `<div class="alert ${issues.length ? 'alert-warning' : 'alert-success'}"><strong>${conclusion}</strong></div>${table(['الملاحظة'], issues.map(i => `<tr><td>${i}</td></tr>`).join('') || '<tr><td>لا توجد ملاحظات جوهرية من الفحص الآلي.</td></tr>')}`);
  };

  reports['trial-balance-audit'] = (data) => {
    const debit = rows(data).reduce((s, a) => s + Math.max(0, finalBalance(a)), 0);
    const credit = rows(data).reduce((s, a) => s + Math.abs(Math.min(0, finalBalance(a))), 0);
    const critical = rows(data).filter(a => !a.category || !a.sub_category || String(a.account_id) === 'SUSP-001' || (a.category === 'assets' && String(a.sub_category) !== '121099' && finalBalance(a) < -0.1) || (a.category === 'liabilities' && finalBalance(a) > 0.1));
    return governanceReport(data, 'ميزان مراجعة معتمد', 'معتمد من الميزان النهائي', `<div class="row">${metric('إجمالي المدين', M(debit))}${metric('إجمالي الدائن', M(credit))}${metric('فرق الميزان', M(debit-credit))}${metric('حسابات حرجة', critical.length)}</div>${table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(critical.slice(0,40)))}`);
  };

  reports['kpi-dashboard'] = (data) => governanceReport(data, 'KPIs Dashboard', 'معتمد من القوائم', table(['المؤشر', 'القيمة', 'تفسير'], `
    <tr><td>هامش مجمل الربح</td><td>${P(data.grossMargin)}</td><td>مجمل الربح ÷ الإيرادات</td></tr>
    <tr><td>هامش صافي الربح</td><td>${P(data.netMargin)}</td><td>صافي الربح ÷ الإيرادات</td></tr>
    <tr><td>ROA</td><td>${P(data.roa)}</td><td>صافي الربح ÷ الأصول</td></tr>
    <tr><td>ROE</td><td>${P(data.roe)}</td><td>صافي الربح ÷ حقوق الملكية</td></tr>
    <tr><td>نسبة التداول</td><td>${D(data.currentRatio)}x</td><td>الأصول المتداولة ÷ الالتزامات المتداولة</td></tr>
    <tr><td>نسبة الدين</td><td>${P(data.debtRatio)}</td><td>الالتزامات ÷ الأصول</td></tr>
    <tr><td>DSCR تقديري</td><td>${D(data.dscr)}x</td><td>يعتمد على افتراض خدمة دين 15% من القروض طويلة الأجل</td></tr>`));

  reports['working-capital'] = (data) => {
    const wc = data.currentAssets - data.currentLiabilities;
    return governanceReport(data, 'رأس المال العامل', 'معتمد من المركز المالي', table(['البند','القيمة'], `<tr><td>الأصول المتداولة</td><td class="text-end">${M(data.currentAssets)}</td></tr><tr><td>الالتزامات المتداولة</td><td class="text-end">${M(data.currentLiabilities)}</td></tr><tr class="table-primary"><td><strong>صافي رأس المال العامل</strong></td><td class="text-end"><strong>${M(wc)}</strong></td></tr><tr><td>نسبة التداول</td><td>${D(data.currentRatio)}x</td></tr><tr><td>السيولة السريعة</td><td>${D(data.quickRatio)}x</td></tr>`));
  };

  reports['receivables-aging'] = (data) => governanceReport(data, 'أعمار الذمم المدينة', 'معتمد جزئيًا - لا توجد تواريخ فواتير', `<div class="alert alert-warning">ميزان المراجعة يعطي أرصدة العملاء فقط، ولا يحتوي تواريخ فواتير. لذلك يعرض التقرير أرصدة العملاء وليس أعمارًا زمنية فعلية.</div>${table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => mapSub(a) === 'trade_receivables' || String(a.name||'').includes('ذمم العملاء'))))}`);
  reports['payables-aging'] = (data) => governanceReport(data, 'أعمار الموردين', 'معتمد جزئيًا - لا توجد تواريخ فواتير', `<div class="alert alert-warning">ميزان المراجعة يعطي أرصدة الموردين فقط، ولا يحتوي تواريخ فواتير. لذلك يعرض التقرير أرصدة الموردين وليس أعمارًا زمنية فعلية.</div>${table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => mapSub(a) === 'trade_payables' || String(a.name||'').includes('المورد'))))}`);
  reports['fixed-assets-register'] = (data) => {
    const fixed = accountsBy(data, a => mapSub(a) === 'fixed_assets' || mapSub(a) === 'fixed_assets_accumulation' || String(a.name||'').includes('اهلاك'));
    return governanceReport(data, 'سجل الأصول والإهلاك', 'معتمد من أرصدة الأصول', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(fixed)));
  };
  reports['vat-reconciliation'] = (data) => governanceReport(data, 'مطابقة ضريبة القيمة المضافة', 'معتمد جزئيًا - يحتاج إقرار ضريبي للمطابقة النهائية', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => String(a.name||'').includes('ضريبة القيمة المضافة') || String(a.name||'').includes('القيمة المضافة')))));
  reports['zakat-base'] = (data) => {
    const base = data.equity + data.longTermLiabilities + Math.max(0, data.currentLiabilities - data.currentAssets);
    return governanceReport(data, 'الوعاء الزكوي التقديري', 'تقديري لا يغني عن الإقرار', table(['البند','القيمة'], `<tr><td>حقوق الملكية بعد نتيجة الفترة</td><td class="text-end">${M(data.equity)}</td></tr><tr><td>الديون طويلة الأجل</td><td class="text-end">${M(data.longTermLiabilities)}</td></tr><tr><td>فائض الالتزامات المتداولة على الأصول المتداولة</td><td class="text-end">${M(Math.max(0, data.currentLiabilities - data.currentAssets))}</td></tr><tr class="table-warning"><td><strong>وعاء أولي تقديري</strong></td><td class="text-end"><strong>${M(base)}</strong></td></tr>`));
  };
  reports['related-parties'] = (data) => governanceReport(data, 'الأطراف ذات العلاقة', 'معتمد من أسماء الحسابات', table(['الحساب','الفئة','التصنيف','الرصيد'], accountRows(accountsBy(data, a => /جارى|جاري|شقيق|مؤسس|مؤسسة|مهدي|شركاء|الشركاء/.test(String(a.name||''))))));

  reports['dupont-analysis'] = (data) => {
    const assetTurnover = data.assets ? data.revenue / data.assets : NaN;
    const leverage = data.equity ? data.assets / data.equity : NaN;
    const roeCalc = data.netMargin * assetTurnover * leverage;
    return governanceReport(data, 'تحليل دوبونت', 'معتمد من القوائم', table(['العنصر','القيمة'], `<tr><td>هامش صافي الربح</td><td>${P(data.netMargin)}</td></tr><tr><td>دوران الأصول</td><td>${D(assetTurnover)}x</td></tr><tr><td>الرافعة المالية</td><td>${D(leverage)}x</td></tr><tr class="table-primary"><td><strong>ROE حسب دوبونت</strong></td><td><strong>${P(roeCalc)}</strong></td></tr>`));
  };

  reports['sloan-accruals'] = (data) => {
    const accruals = data.netIncome - data.cashFlowOps;
    const ratio = data.assets ? accruals / data.assets : NaN;
    return governanceReport(data, "Sloan's Accruals", 'معتمد من صافي الربح والتدفقات', table(['البند','القيمة'], `<tr><td>صافي الربح/الخسارة</td><td>${M(data.netIncome)}</td></tr><tr><td>التدفق التشغيلي</td><td>${M(data.cashFlowOps)}</td></tr><tr><td>الاستحقاقات</td><td>${M(accruals)}</td></tr><tr><td>نسبة الاستحقاقات للأصول</td><td>${P(ratio)}</td></tr>`));
  };
  reports['beneish-mscore'] = (data) => {
    const accrualRatio = data.assets ? (data.netIncome - data.cashFlowOps) / data.assets : 0;
    const score = -2.22 + (accrualRatio * 10) + (data.netMargin < 0 ? 0.5 : 0);
    return governanceReport(data, 'Beneish M-Score مبسط', 'مؤشر جودة أرباح تقديري من الميزان فقط', table(['البند','القيمة'], `<tr><td>نسبة الاستحقاقات</td><td>${P(accrualRatio)}</td></tr><tr><td>M-Score تقديري</td><td>${D(score)}</td></tr><tr><td>قراءة أولية</td><td>${score > -1.78 ? 'مؤشر خطر أعلى' : 'لا يظهر خطر قوي من المعطيات المتاحة'}</td></tr>`));
  };
  reports['altman-zscore'] = (data) => {
    const wc = data.currentAssets - data.currentLiabilities;
    const ebit = data.netIncome + data.depreciationExpense;
    const sales = data.revenue;
    const z = 1.2*(wc/data.assets) + 1.4*((data.openingEquity || data.equity)/data.assets) + 3.3*(ebit/data.assets) + 0.6*(data.equity/data.liabilities) + 1.0*(sales/data.assets);
    return governanceReport(data, 'Altman Z-Score', 'تقديري بسبب عدم توفر القيمة السوقية', table(['العنصر','القيمة'], `<tr><td>Z-Score تقديري</td><td>${D(z)}</td></tr><tr><td>التفسير</td><td>${z < 1.8 ? 'منطقة خطر' : z < 3 ? 'منطقة رمادية' : 'منطقة آمنة'}</td></tr>`));
  };

  function forecastReport(data, title, growth = 0.05) {
    const months = Array.from({length:12}, (_,i)=> i+1);
    const monthlyRevenue = data.revenue / 12;
    const monthlyCostRatio = data.revenue ? (data.cogs + data.operatingExpenses + data.depreciationExpense) / data.revenue : 0;
    const body = months.map(m => { const rev = monthlyRevenue * Math.pow(1 + growth, m/12); const profit = rev * (1 - monthlyCostRatio); return `<tr><td>${m}</td><td class="text-end">${M(rev)}</td><td class="text-end">${M(profit)}</td></tr>`; }).join('');
    return governanceReport(data, title, 'تقديري بافتراض نمو ثابت 5%', table(['الشهر','إيراد متوقع','ربح/خسارة متوقعة'], body));
  }
  ['profit-forecast','revenue-forecast','cash-forecast','cashflow-forecast','ai-forecast'].forEach(id => reports[id] = data => forecastReport(data, id.includes('cash') ? 'تنبؤ التدفقات النقدية' : 'تنبؤ الإيرادات/الربح'));

  reports['budget-variance'] = reports['budget-comparison'] = reports['budget-analysis'] = (data) => governanceReport(data, 'Budget vs Actual', 'غير نهائي بدون موازنة معتمدة', `<div class="alert alert-warning">لا توجد موازنة معتمدة ضمن البيانات المرفوعة. يعرض التقرير الفعلي فقط ويمنع إنشاء انحرافات وهمية.</div>${table(['البند','الفعلي'], `<tr><td>الإيرادات</td><td>${M(data.revenue)}</td></tr><tr><td>تكلفة الإيرادات</td><td>${M(data.cogs)}</td></tr><tr><td>المصروفات</td><td>${M(data.operatingExpenses)}</td></tr><tr><td>صافي الربح/الخسارة</td><td>${M(data.netIncome)}</td></tr>`)}`);
  reports['budget-preparation'] = reports['budget-update'] = (data) => governanceReport(data, 'إعداد/تحديث الموازنة', 'قالب عمل مبني على الفعلي', table(['البند','أساس الموازنة المقترح'], `<tr><td>الإيرادات</td><td>${M(data.revenue)}</td></tr><tr><td>تكلفة الإيرادات</td><td>${M(data.cogs)}</td></tr><tr><td>المصروفات التشغيلية</td><td>${M(data.operatingExpenses)}</td></tr><tr><td>الإهلاك</td><td>${M(data.depreciationExpense)}</td></tr>`));

  reports['loan-capacity'] = (data) => {
    const ebitda = data.netIncome + data.depreciationExpense;
    const assumedDebtService = data.longTermLiabilities * 0.15;
    const dscr = assumedDebtService ? ebitda / assumedDebtService : NaN;
    const maxDebtAt12 = Math.max(0, ebitda / 0.12);
    return governanceReport(data, 'سعة القروض DSCR', 'تقديري بدون جدول سداد فعلي', table(['البند','القيمة'], `<tr><td>EBITDA تقريبي</td><td>${M(ebitda)}</td></tr><tr><td>خدمة الدين المفترضة</td><td>${M(assumedDebtService)}</td></tr><tr><td>DSCR</td><td>${D(dscr)}x</td></tr><tr><td>قدرة دين تقديرية عند 12%</td><td>${M(maxDebtAt12)}</td></tr>`));
  };

  reports['money-flow'] = reports['sources-uses'] = (data) => governanceReport(data, 'مصادر واستخدامات الأموال', 'معتمد من التدفقات الموحدة', table(['البند','القيمة'], `<tr><td>التدفق التشغيلي</td><td>${M(data.cashFlowOps)}</td></tr><tr><td>التدفق الاستثماري</td><td>${M(data.cashFlowInv)}</td></tr><tr><td>التدفق التمويلي</td><td>${M(data.cashFlowFin)}</td></tr><tr><td>صافي تغير النقدية</td><td>${M(data.netCashChange)}</td></tr><tr><td>فرق مطابقة النقدية</td><td>${M(data.cashFlowReconciliationDiff)}</td></tr>`));

  reports['breakeven-analysis'] = (data) => { const cm = data.revenue ? (data.revenue - data.cogs) / data.revenue : NaN; const fixed = data.operatingExpenses + data.depreciationExpense; const bep = cm ? fixed / cm : NaN; return governanceReport(data, 'نقطة التعادل', 'تقديري من القوائم بدون وحدات إنتاج', table(['البند','القيمة'], `<tr><td>هامش المساهمة التقريبي</td><td>${P(cm)}</td></tr><tr><td>التكاليف الثابتة التقريبية</td><td>${M(fixed)}</td></tr><tr><td>نقطة التعادل بالريال</td><td>${M(bep)}</td></tr>`)); };
  reports['whatif-scenarios'] = reports['multiple-scenarios'] = (data) => governanceReport(data, 'تحليل ماذا لو / السيناريوهات', 'تقديري', table(['السيناريو','صافي الربح/الخسارة'], `<tr><td>الحالي</td><td>${M(data.netIncome)}</td></tr><tr><td>زيادة الإيرادات 10%</td><td>${M(data.netIncome + data.revenue*0.1)}</td></tr><tr><td>زيادة التكاليف 10%</td><td>${M(data.netIncome - (data.cogs + data.operatingExpenses)*0.1)}</td></tr><tr><td>تحسن هامش 5%</td><td>${M(data.netIncome + data.revenue*0.05)}</td></tr>`));

  reports['dcf-valuation'] = (data) => { const fcf = data.cashFlowOps + data.cashFlowInv; const wacc = 0.12, g = 0.03; const tv = fcf * (1+g) / (wacc-g); const ev = fcf + tv / Math.pow(1+wacc, 1); return governanceReport(data, 'DCF Valuation', 'تقديري جدًا - يحتاج WACC وخطة خمسية', table(['البند','القيمة'], `<tr><td>FCF حالي</td><td>${M(fcf)}</td></tr><tr><td>WACC افتراضي</td><td>${P(wacc)}</td></tr><tr><td>نمو نهائي افتراضي</td><td>${P(g)}</td></tr><tr><td>قيمة منشأة تقديرية</td><td>${M(ev)}</td></tr>`)); };
  reports['rim-valuation'] = (data) => { const ke = 0.12; const residual = data.netIncome - data.equity * ke; return governanceReport(data, 'Residual Income', 'تقديري', table(['البند','القيمة'], `<tr><td>القيمة الدفترية لحقوق الملكية</td><td>${M(data.equity)}</td></tr><tr><td>تكلفة حقوق الملكية الافتراضية</td><td>${P(ke)}</td></tr><tr><td>الدخل المتبقي</td><td>${M(residual)}</td></tr>`)); };
  reports['ddm-valuation'] = (data) => governanceReport(data, 'Dividend Discount Model', 'غير قابل للاعتماد بدون سياسة توزيعات', `<div class="alert alert-warning">لا توجد توزيعات أرباح تاريخية أو سياسة توزيع ضمن ميزان المراجعة. لا يتم إنتاج قيمة وهمية.</div>`);
  reports['eva-analysis'] = (data) => { const wacc = 0.12; const capital = data.assets - data.currentLiabilities; const eva = data.netIncome - capital*wacc; return governanceReport(data, 'EVA', 'تقديري', table(['البند','القيمة'], `<tr><td>NOPAT تقريبي</td><td>${M(data.netIncome)}</td></tr><tr><td>رأس المال المستثمر</td><td>${M(capital)}</td></tr><tr><td>WACC افتراضي</td><td>${P(wacc)}</td></tr><tr><td>EVA</td><td>${M(eva)}</td></tr>`)); };

  reports['capm-model'] = (data) => { const rf=0.045,beta=1.1,mp=0.065,ke=rf+beta*mp; return governanceReport(data, 'CAPM', 'تقديري بدون بيانات سوقية', table(['البند','القيمة'], `<tr><td>Risk-free افتراضي</td><td>${P(rf)}</td></tr><tr><td>Beta افتراضي</td><td>${D(beta)}</td></tr><tr><td>Market Premium افتراضي</td><td>${P(mp)}</td></tr><tr><td>Cost of Equity</td><td>${P(ke)}</td></tr>`)); };
  ['famafrench-model','mpt-portfolio','sharpe-ratio','var-risk','ca-score-ai'].forEach(id => reports[id] = data => governanceReport(data, id, 'غير نهائي بدون بيانات سوق/محفظة', `<div class="alert alert-warning">ميزان المراجعة لا يحتوي أسعار تاريخية أو عوائد سوقية أو أوزان محفظة. التقرير يعرض تحذيرًا بدل أرقام زائفة.</div>`));
  ['ohlson-oscore','zmijewski-xscore','sherrod-model','fulmer-hscore','springate-sscore'].forEach(id => reports[id] = data => governanceReport(data, id, 'تقديري من نسب القوائم', table(['مؤشر','قيمة'], `<tr><td>نسبة التداول</td><td>${D(data.currentRatio)}x</td></tr><tr><td>نسبة الدين</td><td>${P(data.debtRatio)}</td></tr><tr><td>هامش صافي الربح</td><td>${P(data.netMargin)}</td></tr><tr><td>التدفق التشغيلي</td><td>${M(data.cashFlowOps)}</td></tr>`)));

  ['balanced-scorecard','swot-analysis','integrated-report','profitability-dim','abc-costing','yearend-checklist'].forEach(id => reports[id] = data => governanceReport(data, id, 'تقرير إداري مبني على القوائم', basicMetrics(data)));

  function override() {
    const original = window.generateReportContent;
    window.generateReportContent = function(reportId, title, isForExport = false) {
      const data = getDataSafe();
      if (!data) return `<div class="alert alert-danger p-5 text-center"><h4>لا توجد بيانات معتمدة</h4><p>اعتمد ميزان المراجعة أولًا.</p></div>`;
      if (reports[reportId]) return reports[reportId](data, title, isForExport);
      try {
        const html = original ? original.call(this, reportId, title, isForExport) : '';
        const text = document.createElement('div'); text.innerHTML = html || '';
        const t = text.textContent || '';
        if (!html || t.includes('قيد التطوير') || t.includes('NaN') || t.includes('undefined')) {
          return governanceReport(data, title || reportId, 'تقرير عام آمن', basicMetrics(data));
        }
        return html;
      } catch (e) {
        return governanceReport(data, title || reportId, 'تم منع كسر التقرير', `<div class="alert alert-warning">الدالة الأصلية فشلت: ${String(e.message || e)}</div>${basicMetrics(data)}`);
      }
    };
    window.PolarisReportingCFO = { patched: true, reports: Object.keys(reports), getDataSafe };
    console.log('Polaris CFO reporting override loaded');
  }

  function boot() {
    if ((location.pathname || '').split('/').pop() !== 'reporting-pantheon.html') return;
    setTimeout(override, 2200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

;(() => {
  'use strict';

  const N = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const p = parseFloat(String(v).replace(/[\s,]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(p) ? p : 0;
  };
  const M = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : N(v).toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }));
  const P = v => Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : 'غير قابل للقياس';
  const D = v => Number.isFinite(v) ? v.toFixed(2) : 'غير قابل للقياس';
  const table = (heads, rows) => `<table class="table table-bordered table-sm"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  const block = (title, status, body) => `<div class="p-4"><h4 class="mb-3">${title}</h4><div class="alert alert-info"><strong>تصنيف CFO:</strong> ${status}. التقرير مبني على ميزان المراجعة المعتمد والقوائم الموحدة، ولا يدعي بيانات غير موجودة.</div>${body}<div class="alert alert-warning mt-3"><strong>قرار المدير المالي:</strong> يصلح كتحليل إداري لاتخاذ قرار، وليس بديلًا عن مستندات تشغيل تفصيلية أو بيانات سوق عند الحاجة.</div></div>`;
  const metrics = d => `<div class="row mb-3"><div class="col-md-3"><div class="stats-card"><h3>${M(d.revenue)}</h3><p>الإيرادات</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${M(d.grossProfit)}</h3><p>مجمل الربح</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${M(d.netIncome)}</h3><p>صافي الربح/الخسارة</p></div></div><div class="col-md-3"><div class="stats-card"><h3>${M(d.cashFlowOps)}</h3><p>التدفق التشغيلي</p></div></div></div>`;
  function data() {
    if (window.PolarisReportingQA?.buildUnifiedData) return window.PolarisReportingQA.buildUnifiedData();
    if (window.PolarisReportingCFO?.getDataSafe) return window.PolarisReportingCFO.getDataSafe();
    if (typeof window.getData === 'function') return window.getData();
    return null;
  }
  function rows(d) { return Array.isArray(d?.trialBalance) ? d.trialBalance : []; }
  function mapSub(a) { return (window.SUB_CATEGORY_MAPPING || {})[String(a?.sub_category || '')] || ''; }
  function bal(a) { if (window.PolarisReportingQA?.finalBalance) return window.PolarisReportingQA.finalBalance(a, data()?.adjustments || []); return N(a.finalBalance ?? a.book_balance); }
  const accRows = list => list.map(a => `<tr><td>${a.name || ''}<br><small>${a.account_id || ''}</small></td><td>${a.category || ''}</td><td>${a.sub_category || ''}</td><td class="text-end">${M(bal(a))}</td></tr>`).join('') || '<tr><td colspan="4">لا توجد حسابات كافية لهذا التحليل.</td></tr>';

  const reports = {};

  reports['profitability-dim'] = d => {
    const rev = rows(d).filter(a => a.category === 'revenue');
    const concreteRev = rev.filter(a => /خرسانة|الخرسانة/.test(a.name || '')).reduce((s,a)=>s+Math.abs(bal(a)),0);
    const blockRev = rev.filter(a => /بلوك|البلوك/.test(a.name || '')).reduce((s,a)=>s+Math.abs(bal(a)),0);
    const otherRev = Math.max(0, d.revenue - concreteRev - blockRev);
    const total = concreteRev + blockRev + otherRev || 1;
    const fixed = Math.abs(d.operatingExpenses || 0) + Math.abs(d.depreciationExpense || 0);
    const build = (name, revenue) => { const share = revenue / total; const cogs = Math.abs(d.cogs) * share; const fixedShare = fixed * share; const profit = revenue - cogs - fixedShare; return `<tr><td>${name}</td><td class="text-end">${M(revenue)}</td><td class="text-end">${M(cogs)}</td><td class="text-end">${M(fixedShare)}</td><td class="text-end">${M(profit)}</td><td>${P(revenue ? profit/revenue : NaN)}</td></tr>`; };
    return block('ربحية حسب البعد', 'تحليل ربحية CFO حسب المنتج من أسماء الحسابات', metrics(d) + table(['البعد','الإيراد','تكلفة منسوبة','مصروفات منسوبة','ربح/خسارة','هامش'], build('الخرسانة', concreteRev) + build('البلوك', blockRev) + build('أخرى', otherRev)));
  };

  reports['abc-costing'] = d => {
    const diesel = rows(d).filter(a => /ديزل|بنزين|وقود/.test(a.name || '')).reduce((s,a)=>s+Math.abs(bal(a)),0);
    const repairs = rows(d).filter(a => /صيانة|اصلاح|قطع غيار|كفرات|فلاتر|زيوت/.test(a.name || '')).reduce((s,a)=>s+Math.abs(bal(a)),0);
    const labor = rows(d).filter(a => /اجور|رواتب|عمال|سعودة/.test(a.name || '')).reduce((s,a)=>s+Math.abs(bal(a)),0);
    const dep = Math.abs(d.depreciationExpense || 0);
    const other = Math.max(0, Math.abs(d.cogs||0)+Math.abs(d.operatingExpenses||0)+dep-diesel-repairs-labor-dep);
    const total = diesel+repairs+labor+dep+other || 1;
    const r = (name, amount, driver) => `<tr><td>${name}</td><td class="text-end">${M(amount)}</td><td>${P(amount/total)}</td><td>${driver}</td></tr>`;
    return block('تحليل التكاليف ABC', 'تحليل تكلفة حسب النشاط من أسماء الحسابات', metrics(d) + table(['النشاط','التكلفة','الوزن','محرك التكلفة'], r('وقود وطاقة', diesel, 'ساعات تشغيل/نقل') + r('صيانة وقطع غيار', repairs, 'معدات وشاحنات') + r('عمالة ورواتب', labor, 'أفراد/وردية') + r('إهلاك', dep, 'أصول منتجة') + r('أخرى', other, 'مصروفات تشغيلية عامة')));
  };

  reports['balanced-scorecard'] = d => block('بطاقة الأداء المتوازن BSC', 'خريطة تنفيذية من نتائج القوائم', metrics(d) + table(['البعد','المؤشر','الحالة','قرار CFO'], `
    <tr><td>مالي</td><td>هامش صافي الربح ${P(d.netMargin)}</td><td>${d.netIncome >= 0 ? 'جيد' : 'خسارة'}</td><td>خفض تكلفة/رفع سعر/مراجعة منتجات خاسرة</td></tr>
    <tr><td>عملاء</td><td>رأس المال العامل ${M(d.currentAssets-d.currentLiabilities)}</td><td>${d.currentAssets >= d.currentLiabilities ? 'مقبول' : 'ضغط سيولة'}</td><td>تحسين التحصيل وشروط البيع</td></tr>
    <tr><td>عمليات</td><td>مجمل الربح ${P(d.grossMargin)}</td><td>${d.grossMargin > 0.25 ? 'جيد' : 'ضعيف'}</td><td>مراجعة تكلفة الإنتاج والوقود والصيانة</td></tr>
    <tr><td>تعلم ونمو</td><td>جودة البيانات</td><td>مرتبطة بدقة التصنيف</td><td>إقفال شهري وتحليل انحرافات</td></tr>`));

  reports['swot-analysis'] = d => block('SWOT مالي', 'تحليل CFO من الميزان والقوائم', metrics(d) + table(['الجانب','النقاط'], `
    <tr><td>القوة</td><td>إيرادات تشغيلية ${M(d.revenue)} ومجمل ربح ${M(d.grossProfit)}</td></tr>
    <tr><td>الضعف</td><td>${d.netIncome < 0 ? 'خسارة صافية وضغط على حقوق الملكية' : 'يلزم الحفاظ على الهوامش'}</td></tr>
    <tr><td>الفرص</td><td>رفع الأسعار، تحسين التحصيل، تقليل مخزون بطيء، ترشيد الصيانة والوقود</td></tr>
    <tr><td>التهديدات</td><td>ارتفاع تكلفة التشغيل، تباطؤ التحصيل، تمويل قصير الأجل، انخفاض السيولة</td></tr>`));

  reports['integrated-report'] = d => block('التقرير المتكامل', 'عرض قيمة الشركة من الميزان فقط', metrics(d) + table(['رأس المال','المؤشر المالي المتاح','قراءة CFO'], `
    <tr><td>مالي</td><td>حقوق الملكية ${M(d.equity)}</td><td>${d.equity > 0 ? 'قاعدة رأسمالية موجبة' : 'حقوق ملكية مضغوطة'}</td></tr>
    <tr><td>صناعي</td><td>أصول ثابتة ${M(d.fixedAssets)}</td><td>الاستفادة تقاس بدوران الأصول ${D(d.assets ? d.revenue/d.assets : NaN)}x</td></tr>
    <tr><td>بشري</td><td>رواتب/أجور ضمن المصروفات</td><td>تحتاج ربط بالإنتاجية</td></tr>
    <tr><td>اجتماعي</td><td>غير متاح من الميزان</td><td>يتطلب بيانات ESG/موظفين/سلامة</td></tr>
    <tr><td>طبيعي</td><td>وقود وطاقة من المصروفات</td><td>مراقبة استهلاك الديزل والكهرباء</td></tr>`));

  reports['yearend-checklist'] = d => block('إغلاق نهاية العام', 'قائمة إقفال CFO من الميزان', metrics(d) + table(['المهمة','الحالة المطلوبة'], `
    <tr><td>مطابقة ميزان المراجعة</td><td>فرق الميزان صفر أو ضمن السماحية</td></tr>
    <tr><td>تسويات العملاء والموردين</td><td>مطابقة كشوف تفصيلية</td></tr>
    <tr><td>جرد المخزون</td><td>مطابقة رصيد المخازن مع الجرد</td></tr>
    <tr><td>الأصول والإهلاك</td><td>مطابقة سجل الأصول مع المجمع</td></tr>
    <tr><td>الزكاة والضريبة</td><td>مطابقة إقرارات ZATCA</td></tr>
    <tr><td>الحسابات الوسيطة</td><td>يجب تصفيرها أو تفسيرها</td></tr>`));

  reports['ohlson-oscore'] = d => { const score = -1.32 - 0.4*Math.log(Math.max(d.assets,1)) + 6.03*(d.liabilities/Math.max(d.assets,1)) - 1.43*((d.currentAssets-d.currentLiabilities)/Math.max(d.assets,1)) + 0.075*(d.currentLiabilities/Math.max(d.currentAssets,1)) - 2.37*(d.netIncome/Math.max(d.assets,1)) - 1.83*(d.cashFlowOps/Math.max(d.liabilities,1)); const prob = 1/(1+Math.exp(-score)); return block('Ohlson O-Score', 'تقديري من القوائم فقط', metrics(d) + table(['البند','القيمة'], `<tr><td>O-Score</td><td>${D(score)}</td></tr><tr><td>احتمال خطر تقديري</td><td>${P(prob)}</td></tr>`)); };
  reports['zmijewski-xscore'] = d => { const x = -4.3 - 4.5*(d.netIncome/Math.max(d.assets,1)) + 5.7*(d.liabilities/Math.max(d.assets,1)) - 0.004*(d.currentAssets/Math.max(d.currentLiabilities,1)); return block('Zmijewski X-Score', 'تقديري من ROA والرافعة والسيولة', metrics(d) + table(['البند','القيمة'], `<tr><td>X-Score</td><td>${D(x)}</td></tr><tr><td>قراءة</td><td>${x > 0 ? 'خطر أعلى' : 'خطر أقل'}</td></tr>`)); };
  reports['sherrod-model'] = d => { const z = 17*((d.currentAssets-d.currentLiabilities)/Math.max(d.assets,1)) + 9*(d.equity/Math.max(d.assets,1)) + 3.5*(d.netIncome/Math.max(d.assets,1)) + 20*(d.cashFlowOps/Math.max(d.liabilities,1)); return block('Sherrod Cash Flow Model', 'تقديري مع تركيز على التدفق', metrics(d) + table(['البند','القيمة'], `<tr><td>Score</td><td>${D(z)}</td></tr><tr><td>قراءة</td><td>${z < 5 ? 'خطر مرتفع' : z < 20 ? 'متوسط' : 'أفضل'}</td></tr>`)); };
  reports['fulmer-hscore'] = d => { const h = 5.5*(d.netIncome/Math.max(d.assets,1)) + 0.2*(d.revenue/Math.max(d.assets,1)) + 0.1*(d.equity/Math.max(d.liabilities,1)) + 2*(d.cashFlowOps/Math.max(d.liabilities,1)) - 1; return block('Fulmer H-Score', 'تقديري مبسط من نسب القوائم', metrics(d) + table(['البند','القيمة'], `<tr><td>H-Score</td><td>${D(h)}</td></tr><tr><td>قراءة</td><td>${h < 0 ? 'خطر' : 'مقبول'}</td></tr>`)); };
  reports['springate-sscore'] = d => { const s = 1.03*((d.currentAssets-d.currentLiabilities)/Math.max(d.assets,1)) + 3.07*((d.netIncome+d.depreciationExpense)/Math.max(d.assets,1)) + 0.66*(d.netIncome/Math.max(d.currentLiabilities,1)) + 0.4*(d.revenue/Math.max(d.assets,1)); return block('Springate S-Score', 'تقديري من 4 نسب', metrics(d) + table(['البند','القيمة'], `<tr><td>S-Score</td><td>${D(s)}</td></tr><tr><td>قراءة</td><td>${s < 0.862 ? 'خطر' : 'آمن نسبيًا'}</td></tr>`)); };

  function override() {
    const previous = window.generateReportContent;
    window.generateReportContent = function(reportId, title, isForExport = false) {
      const d = data();
      if (!d) return previous ? previous.call(this, reportId, title, isForExport) : '<div class="alert alert-danger">لا توجد بيانات معتمدة.</div>';
      if (reports[reportId]) return reports[reportId](d, title, isForExport);
      return previous ? previous.call(this, reportId, title, isForExport) : '';
    };
    window.PolarisCFORemaining = { patched: true, reports: Object.keys(reports) };
    console.log('Polaris CFO remaining reports override loaded');
  }
  function boot() { if ((location.pathname || '').split('/').pop() !== 'reporting-pantheon.html') return; setTimeout(override, 3600); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

;(() => {
  'use strict';

  function parseReportsFromDom() {
    const cards = Array.from(document.querySelectorAll('.report-card[onclick*="openReport"]'));
    return cards.map(card => {
      const on = card.getAttribute('onclick') || '';
      const m = on.match(/openReport\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)/);
      return m ? { id: m[1], title: m[2], card } : null;
    }).filter(Boolean);
  }

  function cleanText(html) {
    const div = document.createElement('div');
    div.innerHTML = String(html || '');
    return (div.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function classify(html, error) {
    if (error) return { status: 'FAILED', severity: 'high', reason: error.message || String(error) };
    const text = cleanText(html);
    if (!html || text.length < 30) return { status: 'EMPTY', severity: 'high', reason: 'التقرير فتح لكن المحتوى فارغ أو قصير جدًا.' };
    if (text.includes('خطأ في تحميل البيانات المالية') || text.includes('لا توجد بيانات معتمدة')) return { status: 'NO_DATA', severity: 'high', reason: 'لا توجد بيانات finalAudit للعميل الحالي.' };
    if (text.includes('قيد التطوير')) return { status: 'DEV', severity: 'medium', reason: 'التقرير مربوط بكارت لكنه يرجع قيد التطوير.' };
    if (text.includes('يحتاج مدخلات إضافية') || text.includes('تم منع كسر الصفحة')) return { status: 'SAFE_FALLBACK', severity: 'medium', reason: 'التقرير لا يكسر الصفحة لكنه يحتاج دالة أو مدخلات إضافية.' };
    if (text.includes('NaN') || text.includes('Infinity') || text.includes('undefined')) return { status: 'BAD_VALUES', severity: 'high', reason: 'المحتوى يحتوي NaN/Infinity/undefined.' };
    return { status: 'PASS', severity: 'ok', reason: 'فتح وولد محتوى قابل للعرض.' };
  }

  function runAllReports() {
    const dataOk = !!(window.PolarisReportingQA && typeof window.PolarisReportingQA.buildUnifiedData === 'function' && window.PolarisReportingQA.buildUnifiedData());
    const reports = parseReportsFromDom();
    const seen = new Set();
    const results = [];

    reports.forEach(r => {
      if (seen.has(r.id)) return;
      seen.add(r.id);
      let html = '';
      let error = null;
      try {
        if (typeof window.generateReportContent !== 'function') throw new Error('generateReportContent غير موجودة');
        html = window.generateReportContent(r.id, r.title, false);
      } catch (e) {
        error = e;
      }
      const c = classify(html, error);
      results.push({ id: r.id, title: r.title, status: c.status, severity: c.severity, reason: c.reason, htmlLength: String(html || '').length });
    });

    const summary = {
      dataOk,
      total: results.length,
      pass: results.filter(x => x.status === 'PASS').length,
      safeFallback: results.filter(x => x.status === 'SAFE_FALLBACK').length,
      dev: results.filter(x => x.status === 'DEV').length,
      failed: results.filter(x => ['FAILED', 'EMPTY', 'BAD_VALUES', 'NO_DATA'].includes(x.status)).length,
      bad: results.filter(x => x.severity === 'high'),
      needsWork: results.filter(x => x.severity !== 'ok'),
      results
    };

    console.table(results.map(x => ({ report: x.title, id: x.id, status: x.status, reason: x.reason })));
    console.log('Polaris reporting full self-test summary:', summary);
    return summary;
  }

  function renderSelfTestBadge(summary) {
    if (!summary) return;
    let box = document.getElementById('reportingSelfTestBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'reportingSelfTestBox';
      box.style.cssText = 'direction:rtl;text-align:right;margin:12px 0;padding:12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e5e7eb;font-size:13px';
      const anchor = document.querySelector('.row.mb-4') || document.querySelector('.filter-buttons') || document.body.firstElementChild;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
      else document.body.prepend(box);
    }
    const ok = summary.failed === 0 && summary.dev === 0;
    box.innerHTML = `<strong>فحص التقارير:</strong> ${ok ? 'سليم مبدئيًا' : 'يحتاج مراجعة'} — إجمالي ${summary.total}، ناجح ${summary.pass}، آمن مع تنبيه ${summary.safeFallback}، قيد التطوير ${summary.dev}، أخطاء ${summary.failed}. <button id="rerunReportingSelfTest" style="margin-right:8px;border:0;border-radius:6px;padding:4px 8px;background:#0ea5e9;color:white">إعادة الفحص</button>`;
    const btn = document.getElementById('rerunReportingSelfTest');
    if (btn) btn.onclick = () => renderSelfTestBadge(runAllReports());
  }

  function boot() {
    if ((location.pathname || '').split('/').pop() !== 'reporting-pantheon.html') return;
    window.PolarisReportingTester = { runAllReports, parseReportsFromDom };
    setTimeout(() => {
      try {
        const summary = runAllReports();
        renderSelfTestBadge(summary);
      } catch (e) {
        console.warn('Reporting self-test failed to run', e);
      }
    }, 1800);
    console.log('Polaris reporting self-test loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

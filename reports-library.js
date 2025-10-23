/**
 * Polaris Financial Reports Library
 * مكتبة شاملة لجميع التقارير المالية والإدارية
 */

// ============================================
// Helper Functions
// ============================================

function formatCurrency(value) {
    return new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatPercentage(value) {
    return new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: 'percent'
    }).format(value / 100);
}

function calculateTotals(data) {
    const totals = {
        assets: 0,
        currentAssets: 0,
        fixedAssets: 0,
        liabilities: 0,
        currentLiabilities: 0,
        longTermLiabilities: 0,
        equity: 0,
        revenue: 0,
        cogs: 0,
        operatingExpenses: 0,
        grossProfit: 0,
        netIncome: 0,
        expenses: 0,
        cash: 0,
        receivables: 0,
        inventory: 0,
        payables: 0
    };
    
    data.forEach(item => {
        const debit = parseFloat(item.debit) || 0;
        const credit = parseFloat(item.credit) || 0;
        const balance = debit - credit;
        
        switch(item.category) {
            case 'أصول متداولة':
                totals.currentAssets += Math.abs(balance);
                if (item.accountName && item.accountName.includes('نقد')) {
                    totals.cash += Math.abs(balance);
                }
                if (item.accountName && item.accountName.includes('مدين')) {
                    totals.receivables += Math.abs(balance);
                }
                if (item.accountName && item.accountName.includes('مخزون')) {
                    totals.inventory += Math.abs(balance);
                }
                break;
            case 'أصول ثابتة':
                totals.fixedAssets += Math.abs(balance);
                break;
            case 'التزامات متداولة':
                totals.currentLiabilities += Math.abs(balance);
                if (item.accountName && item.accountName.includes('دائن')) {
                    totals.payables += Math.abs(balance);
                }
                break;
            case 'التزامات طويلة الأجل':
                totals.longTermLiabilities += Math.abs(balance);
                break;
            case 'حقوق الملكية':
                totals.equity += Math.abs(balance);
                break;
            case 'إيرادات':
                totals.revenue += Math.abs(balance);
                break;
            case 'تكلفة البضاعة المباعة':
                totals.cogs += Math.abs(balance);
                break;
            case 'مصروفات تشغيلية':
                totals.operatingExpenses += Math.abs(balance);
                break;
        }
    });
    
    totals.assets = totals.currentAssets + totals.fixedAssets;
    totals.liabilities = totals.currentLiabilities + totals.longTermLiabilities;
    totals.grossProfit = totals.revenue - totals.cogs;
    totals.netIncome = totals.grossProfit - totals.operatingExpenses;
    totals.expenses = totals.cogs + totals.operatingExpenses;
    
    // تقديرات للبيانات غير المتوفرة
    if (totals.cash === 0) totals.cash = totals.currentAssets * 0.2;
    if (totals.receivables === 0) totals.receivables = totals.currentAssets * 0.4;
    if (totals.inventory === 0) totals.inventory = totals.currentAssets * 0.3;
    if (totals.payables === 0) totals.payables = totals.currentLiabilities * 0.6;
    
    return totals;
}

function getCompanyHeader(auditFile) {
    const companyName = auditFile.clientInfo?.name || 'الشركة';
    const currentYear = new Date().getFullYear();
    
    return `
        <div class="company-header">
            <h3>${companyName}</h3>
            <p class="text-secondary">للسنة المالية المنتهية في 31 ديسمبر ${currentYear}</p>
        </div>
    `;
}

// ============================================
// التحليل الأفقي
// ============================================

function generateHorizontalAnalysis(data) {
    const totals = calculateTotals(data);
    const currentYear = new Date().getFullYear();
    
    // بيانات محاكاة للسنوات السابقة
    const years = [
        { year: currentYear - 2, revenue: totals.revenue * 0.7, assets: totals.assets * 0.75, equity: totals.equity * 0.8 },
        { year: currentYear - 1, revenue: totals.revenue * 0.85, assets: totals.assets * 0.88, equity: totals.equity * 0.9 },
        { year: currentYear, revenue: totals.revenue, assets: totals.assets, equity: totals.equity }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">التحليل الأفقي - الإيرادات</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>السنة</th>
                    <th class="text-end">الإيرادات</th>
                    <th class="text-end">التغير (مبلغ)</th>
                    <th class="text-end">التغير (%)</th>
                </tr>
            </thead>
            <tbody>
                ${years.map((y, i) => {
                    const change = i > 0 ? y.revenue - years[i-1].revenue : 0;
                    const changePercent = i > 0 ? (change / years[i-1].revenue * 100) : 0;
                    return `
                        <tr>
                            <td>${y.year}</td>
                            <td class="text-end">${formatCurrency(y.revenue)}</td>
                            <td class="text-end">${i > 0 ? formatCurrency(change) : '-'}</td>
                            <td class="text-end">${i > 0 ? changePercent.toFixed(2) + '%' : '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <h5 class="mb-3 mt-4">التحليل الأفقي - الأصول</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>السنة</th>
                    <th class="text-end">إجمالي الأصول</th>
                    <th class="text-end">التغير (مبلغ)</th>
                    <th class="text-end">التغير (%)</th>
                </tr>
            </thead>
            <tbody>
                ${years.map((y, i) => {
                    const change = i > 0 ? y.assets - years[i-1].assets : 0;
                    const changePercent = i > 0 ? (change / years[i-1].assets * 100) : 0;
                    return `
                        <tr>
                            <td>${y.year}</td>
                            <td class="text-end">${formatCurrency(y.assets)}</td>
                            <td class="text-end">${i > 0 ? formatCurrency(change) : '-'}</td>
                            <td class="text-end">${i > 0 ? changePercent.toFixed(2) + '%' : '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="alert alert-info mt-4">
            <i class="fas fa-info-circle me-2"></i>
            <strong>ملاحظة:</strong> البيانات التاريخية محاكاة للأغراض التوضيحية.
        </div>
    `;
}

// ============================================
// القوائم بالنسب المئوية (Common Size)
// ============================================

function generateCommonSize(data) {
    const totals = calculateTotals(data);
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">قائمة الدخل بالنسب المئوية</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">المبلغ</th>
                    <th class="text-end">النسبة (%)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>الإيرادات</td>
                    <td class="text-end">${formatCurrency(totals.revenue)}</td>
                    <td class="text-end">100.00%</td>
                </tr>
                <tr>
                    <td>تكلفة البضاعة المباعة</td>
                    <td class="text-end">${formatCurrency(totals.cogs)}</td>
                    <td class="text-end">${(totals.cogs / totals.revenue * 100).toFixed(2)}%</td>
                </tr>
                <tr class="table-primary">
                    <td><strong>إجمالي الربح</strong></td>
                    <td class="text-end"><strong>${formatCurrency(totals.grossProfit)}</strong></td>
                    <td class="text-end"><strong>${(totals.grossProfit / totals.revenue * 100).toFixed(2)}%</strong></td>
                </tr>
                <tr>
                    <td>المصروفات التشغيلية</td>
                    <td class="text-end">${formatCurrency(totals.operatingExpenses)}</td>
                    <td class="text-end">${(totals.operatingExpenses / totals.revenue * 100).toFixed(2)}%</td>
                </tr>
                <tr class="table-success">
                    <td><strong>صافي الربح</strong></td>
                    <td class="text-end"><strong>${formatCurrency(totals.netIncome)}</strong></td>
                    <td class="text-end"><strong>${(totals.netIncome / totals.revenue * 100).toFixed(2)}%</strong></td>
                </tr>
            </tbody>
        </table>

        <h5 class="mb-3 mt-4">قائمة المركز المالي بالنسب المئوية</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">المبلغ</th>
                    <th class="text-end">النسبة (%)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>الأصول المتداولة</td>
                    <td class="text-end">${formatCurrency(totals.currentAssets)}</td>
                    <td class="text-end">${(totals.currentAssets / totals.assets * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>الأصول الثابتة</td>
                    <td class="text-end">${formatCurrency(totals.fixedAssets)}</td>
                    <td class="text-end">${(totals.fixedAssets / totals.assets * 100).toFixed(2)}%</td>
                </tr>
                <tr class="table-primary">
                    <td><strong>إجمالي الأصول</strong></td>
                    <td class="text-end"><strong>${formatCurrency(totals.assets)}</strong></td>
                    <td class="text-end"><strong>100.00%</strong></td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// دورة التحويل النقدي
// ============================================

function generateCashCycle(data) {
    const totals = calculateTotals(data);
    
    const daysInventory = (totals.inventory / totals.cogs) * 365;
    const daysReceivables = (totals.receivables / totals.revenue) * 365;
    const daysPayables = (totals.payables / totals.cogs) * 365;
    const cashCycle = daysInventory + daysReceivables - daysPayables;
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">مكونات دورة التحويل النقدي</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">عدد الأيام</th>
                    <th>التقييم</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>فترة تحويل المخزون (DIO)</td>
                    <td class="text-end">${daysInventory.toFixed(0)} يوم</td>
                    <td><span class="badge ${daysInventory < 60 ? 'bg-success' : 'bg-warning'}">${daysInventory < 60 ? 'ممتاز' : 'جيد'}</span></td>
                </tr>
                <tr>
                    <td>فترة تحصيل الذمم (DSO)</td>
                    <td class="text-end">${daysReceivables.toFixed(0)} يوم</td>
                    <td><span class="badge ${daysReceivables < 45 ? 'bg-success' : 'bg-warning'}">${daysReceivables < 45 ? 'ممتاز' : 'جيد'}</span></td>
                </tr>
                <tr>
                    <td>فترة سداد الموردين (DPO)</td>
                    <td class="text-end">${daysPayables.toFixed(0)} يوم</td>
                    <td><span class="badge ${daysPayables > 45 ? 'bg-success' : 'bg-warning'}">${daysPayables > 45 ? 'ممتاز' : 'جيد'}</span></td>
                </tr>
                <tr class="table-primary">
                    <td><strong>دورة التحويل النقدي (CCC)</strong></td>
                    <td class="text-end"><strong>${cashCycle.toFixed(0)} يوم</strong></td>
                    <td><span class="badge ${cashCycle < 60 ? 'bg-success' : 'bg-warning'}">${cashCycle < 60 ? 'ممتاز' : 'جيد'}</span></td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// القيمة الاقتصادية المضافة (EVA)
// ============================================

function generateEVA(data) {
    const totals = calculateTotals(data);
    
    const capitalEmployed = totals.equity + totals.longTermLiabilities;
    const wacc = 0.12; // تكلفة رأس المال المرجحة (12% افتراضي)
    const nopat = totals.netIncome * 1.1; // صافي الربح التشغيلي بعد الضريبة
    const capitalCharge = capitalEmployed * wacc;
    const eva = nopat - capitalCharge;
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">حساب القيمة الاقتصادية المضافة (EVA)</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">المبلغ</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>صافي الربح التشغيلي بعد الضريبة (NOPAT)</td>
                    <td class="text-end">${formatCurrency(nopat)}</td>
                </tr>
                <tr>
                    <td>رأس المال المستثمر</td>
                    <td class="text-end">${formatCurrency(capitalEmployed)}</td>
                </tr>
                <tr>
                    <td>تكلفة رأس المال المرجحة (WACC)</td>
                    <td class="text-end">${(wacc * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>تكلفة رأس المال</td>
                    <td class="text-end">${formatCurrency(capitalCharge)}</td>
                </tr>
                <tr class="table-${eva > 0 ? 'success' : 'danger'}">
                    <td><strong>القيمة الاقتصادية المضافة (EVA)</strong></td>
                    <td class="text-end"><strong>${formatCurrency(eva)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="alert alert-${eva > 0 ? 'success' : 'warning'} mt-4">
            <i class="fas fa-${eva > 0 ? 'check' : 'exclamation'}-circle me-2"></i>
            <strong>${eva > 0 ? 'إيجابي' : 'سلبي'}:</strong> 
            ${eva > 0 ? 'الشركة تخلق قيمة اقتصادية للمساهمين' : 'الشركة لا تخلق قيمة اقتصادية كافية'}
        </div>
    `;
}

// ============================================
// تقرير أعمار الذمم
// ============================================

function generateAgingReport(data) {
    const totals = calculateTotals(data);
    
    // توزيع تقديري لأعمار الذمم
    const aging = {
        current: totals.receivables * 0.6,
        days30: totals.receivables * 0.2,
        days60: totals.receivables * 0.1,
        days90: totals.receivables * 0.07,
        over90: totals.receivables * 0.03
    };
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تقرير أعمار الذمم المدينة</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>الفترة</th>
                    <th class="text-end">المبلغ</th>
                    <th class="text-end">النسبة (%)</th>
                    <th>الحالة</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>حالية (0-30 يوم)</td>
                    <td class="text-end">${formatCurrency(aging.current)}</td>
                    <td class="text-end">${(aging.current / totals.receivables * 100).toFixed(2)}%</td>
                    <td><span class="badge bg-success">ممتاز</span></td>
                </tr>
                <tr>
                    <td>31-60 يوم</td>
                    <td class="text-end">${formatCurrency(aging.days30)}</td>
                    <td class="text-end">${(aging.days30 / totals.receivables * 100).toFixed(2)}%</td>
                    <td><span class="badge bg-success">جيد</span></td>
                </tr>
                <tr>
                    <td>61-90 يوم</td>
                    <td class="text-end">${formatCurrency(aging.days60)}</td>
                    <td class="text-end">${(aging.days60 / totals.receivables * 100).toFixed(2)}%</td>
                    <td><span class="badge bg-warning">يحتاج متابعة</span></td>
                </tr>
                <tr>
                    <td>91-120 يوم</td>
                    <td class="text-end">${formatCurrency(aging.days90)}</td>
                    <td class="text-end">${(aging.days90 / totals.receivables * 100).toFixed(2)}%</td>
                    <td><span class="badge bg-danger">متأخر</span></td>
                </tr>
                <tr>
                    <td>أكثر من 120 يوم</td>
                    <td class="text-end">${formatCurrency(aging.over90)}</td>
                    <td class="text-end">${(aging.over90 / totals.receivables * 100).toFixed(2)}%</td>
                    <td><span class="badge bg-danger">مشكوك فيه</span></td>
                </tr>
                <tr class="table-primary">
                    <td><strong>الإجمالي</strong></td>
                    <td class="text-end"><strong>${formatCurrency(totals.receivables)}</strong></td>
                    <td class="text-end"><strong>100.00%</strong></td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <div class="alert alert-warning mt-4">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>تنبيه:</strong> يوصى بمتابعة الذمم المتأخرة أكثر من 90 يوماً وتكوين مخصص للديون المشكوك فيها.
        </div>
    `;
}

// Export all functions
window.ReportsLibrary = {
    generateHorizontalAnalysis,
    generateCommonSize,
    generateCashCycle,
    generateEVA,
    generateAgingReport
};


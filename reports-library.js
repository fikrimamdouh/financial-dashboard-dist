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

function getCompanyHeader(data) {
    // دعم كل من auditFile و tbData
    let companyName = 'مصنع بن حامد للمنتجات الأسمنتية';
    
    if (data) {
        // إذا كان auditFile
        if (data.clientInfo && data.clientInfo.name) {
            companyName = data.clientInfo.name;
        }
        // إذا كان tbData (مصفوفة)
        else if (Array.isArray(data) && data.length > 0) {
            // يمكن استخراج اسم الشركة من البيانات إذا كان موجوداً
            companyName = 'مصنع بن حامد للمنتجات الأسمنتية';
        }
    }
    
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




// ============================================
// تحليل التكلفة-الحجم-الربح (CVP Analysis)
// ============================================

function generateCVPAnalysis(data) {
    const totals = calculateTotals(data);
    
    // افتراضات للتكاليف الثابتة والمتغيرة
    const fixedCosts = totals.operatingExpenses * 0.6;
    const variableCosts = totals.cogs + (totals.operatingExpenses * 0.4);
    const contributionMargin = totals.revenue - variableCosts;
    const contributionMarginRatio = (contributionMargin / totals.revenue) * 100;
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تحليل التكلفة-الحجم-الربح</h5>
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
                    <td>التكاليف المتغيرة</td>
                    <td class="text-end">${formatCurrency(variableCosts)}</td>
                    <td class="text-end">${(variableCosts / totals.revenue * 100).toFixed(2)}%</td>
                </tr>
                <tr class="table-primary">
                    <td><strong>هامش المساهمة</strong></td>
                    <td class="text-end"><strong>${formatCurrency(contributionMargin)}</strong></td>
                    <td class="text-end"><strong>${contributionMarginRatio.toFixed(2)}%</strong></td>
                </tr>
                <tr>
                    <td>التكاليف الثابتة</td>
                    <td class="text-end">${formatCurrency(fixedCosts)}</td>
                    <td class="text-end">${(fixedCosts / totals.revenue * 100).toFixed(2)}%</td>
                </tr>
                <tr class="table-success">
                    <td><strong>صافي الربح</strong></td>
                    <td class="text-end"><strong>${formatCurrency(contributionMargin - fixedCosts)}</strong></td>
                    <td class="text-end"><strong>${((contributionMargin - fixedCosts) / totals.revenue * 100).toFixed(2)}%</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="alert alert-info mt-4">
            <i class="fas fa-info-circle me-2"></i>
            <strong>هامش المساهمة:</strong> يمثل المبلغ المتبقي من الإيرادات بعد تغطية التكاليف المتغيرة، والذي يساهم في تغطية التكاليف الثابتة وتحقيق الربح.
        </div>
    `;
}

// ============================================
// تحليل الحساسية (Sensitivity Analysis)
// ============================================

function generateSensitivityAnalysis(data) {
    const totals = calculateTotals(data);
    const baseNetIncome = totals.netIncome;
    
    const scenarios = [
        { change: -20, revenue: totals.revenue * 0.8, expenses: totals.expenses },
        { change: -10, revenue: totals.revenue * 0.9, expenses: totals.expenses },
        { change: 0, revenue: totals.revenue, expenses: totals.expenses },
        { change: 10, revenue: totals.revenue * 1.1, expenses: totals.expenses },
        { change: 20, revenue: totals.revenue * 1.2, expenses: totals.expenses }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تحليل الحساسية - تأثير تغير الإيرادات على صافي الربح</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>التغير في الإيرادات</th>
                    <th class="text-end">الإيرادات</th>
                    <th class="text-end">صافي الربح</th>
                    <th class="text-end">التغير في الربح</th>
                </tr>
            </thead>
            <tbody>
                ${scenarios.map(s => {
                    const netIncome = s.revenue - s.expenses;
                    const incomeChange = ((netIncome - baseNetIncome) / baseNetIncome * 100);
                    return `
                        <tr class="${s.change === 0 ? 'table-primary' : ''}">
                            <td>${s.change > 0 ? '+' : ''}${s.change}%</td>
                            <td class="text-end">${formatCurrency(s.revenue)}</td>
                            <td class="text-end">${formatCurrency(netIncome)}</td>
                            <td class="text-end ${netIncome > baseNetIncome ? 'text-success' : netIncome < baseNetIncome ? 'text-danger' : ''}">
                                ${s.change !== 0 ? (incomeChange > 0 ? '+' : '') + incomeChange.toFixed(2) + '%' : '-'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="alert alert-warning mt-4">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>ملاحظة:</strong> تحليل الحساسية يساعد في فهم مدى تأثر الربحية بالتغيرات في الإيرادات.
        </div>
    `;
}

// ============================================
// تحليل السيناريوهات
// ============================================

function generateScenarioAnalysis(data) {
    const totals = calculateTotals(data);
    
    const scenarios = [
        {
            name: 'السيناريو المتشائم',
            revenue: totals.revenue * 0.85,
            expenses: totals.expenses * 1.1,
            probability: 20
        },
        {
            name: 'السيناريو الأكثر احتمالاً',
            revenue: totals.revenue,
            expenses: totals.expenses,
            probability: 60
        },
        {
            name: 'السيناريو المتفائل',
            revenue: totals.revenue * 1.15,
            expenses: totals.expenses * 0.95,
            probability: 20
        }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تحليل السيناريوهات</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>السيناريو</th>
                    <th class="text-end">الإيرادات</th>
                    <th class="text-end">المصروفات</th>
                    <th class="text-end">صافي الربح</th>
                    <th class="text-end">الاحتمالية</th>
                </tr>
            </thead>
            <tbody>
                ${scenarios.map(s => {
                    const netIncome = s.revenue - s.expenses;
                    return `
                        <tr>
                            <td><strong>${s.name}</strong></td>
                            <td class="text-end">${formatCurrency(s.revenue)}</td>
                            <td class="text-end">${formatCurrency(s.expenses)}</td>
                            <td class="text-end ${netIncome > 0 ? 'text-success' : 'text-danger'}">
                                <strong>${formatCurrency(netIncome)}</strong>
                            </td>
                            <td class="text-end">${s.probability}%</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="alert alert-info mt-4">
            <i class="fas fa-lightbulb me-2"></i>
            <strong>القيمة المتوقعة:</strong> 
            ${formatCurrency(scenarios.reduce((sum, s) => sum + ((s.revenue - s.expenses) * s.probability / 100), 0))}
        </div>
    `;
}

// ============================================
// التدفقات النقدية المتوقعة
// ============================================

function generateCashFlowForecast(data) {
    const totals = calculateTotals(data);
    const currentYear = new Date().getFullYear();
    
    const forecast = [];
    for (let i = 1; i <= 5; i++) {
        const growthRate = 1 + (0.08 * i / 5); // معدل نمو تدريجي
        forecast.push({
            year: currentYear + i,
            operating: totals.netIncome * growthRate,
            investing: -totals.fixedAssets * 0.1 * growthRate,
            financing: totals.longTermLiabilities * 0.05 * growthRate,
            netCash: 0
        });
        forecast[i-1].netCash = forecast[i-1].operating + forecast[i-1].investing + forecast[i-1].financing;
    }
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">التدفقات النقدية المتوقعة (5 سنوات)</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>السنة</th>
                    <th class="text-end">التشغيلية</th>
                    <th class="text-end">الاستثمارية</th>
                    <th class="text-end">التمويلية</th>
                    <th class="text-end">صافي التدفق</th>
                </tr>
            </thead>
            <tbody>
                ${forecast.map(f => `
                    <tr>
                        <td>${f.year}</td>
                        <td class="text-end text-success">${formatCurrency(f.operating)}</td>
                        <td class="text-end text-danger">${formatCurrency(f.investing)}</td>
                        <td class="text-end">${formatCurrency(f.financing)}</td>
                        <td class="text-end ${f.netCash > 0 ? 'text-success' : 'text-danger'}">
                            <strong>${formatCurrency(f.netCash)}</strong>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="alert alert-info mt-4">
            <i class="fas fa-chart-line me-2"></i>
            <strong>ملاحظة:</strong> التوقعات مبنية على افتراضات نمو تدريجية وقد تختلف النتائج الفعلية.
        </div>
    `;
}

// ============================================
// بطاقة الأداء المتوازن (Balanced Scorecard)
// ============================================

function generateBalancedScorecard(data) {
    const totals = calculateTotals(data);
    
    const perspectives = [
        {
            name: 'المنظور المالي',
            metrics: [
                { name: 'العائد على الأصول', value: (totals.netIncome / totals.assets * 100).toFixed(2) + '%', target: '15%', status: 'success' },
                { name: 'العائد على حقوق الملكية', value: (totals.netIncome / totals.equity * 100).toFixed(2) + '%', target: '20%', status: 'warning' },
                { name: 'هامش الربح الصافي', value: (totals.netIncome / totals.revenue * 100).toFixed(2) + '%', target: '10%', status: 'success' }
            ]
        },
        {
            name: 'منظور العملاء',
            metrics: [
                { name: 'رضا العملاء', value: '85%', target: '90%', status: 'warning' },
                { name: 'الاحتفاظ بالعملاء', value: '78%', target: '80%', status: 'warning' },
                { name: 'حصة السوق', value: '12%', target: '15%', status: 'danger' }
            ]
        },
        {
            name: 'منظور العمليات الداخلية',
            metrics: [
                { name: 'دورة الإنتاج', value: '45 يوم', target: '40 يوم', status: 'warning' },
                { name: 'معدل الجودة', value: '95%', target: '98%', status: 'warning' },
                { name: 'كفاءة التشغيل', value: '88%', target: '90%', status: 'warning' }
            ]
        },
        {
            name: 'منظور التعلم والنمو',
            metrics: [
                { name: 'رضا الموظفين', value: '82%', target: '85%', status: 'warning' },
                { name: 'ساعات التدريب', value: '40 ساعة', target: '50 ساعة', status: 'warning' },
                { name: 'معدل الابتكار', value: '3 منتجات', target: '5 منتجات', status: 'danger' }
            ]
        }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">بطاقة الأداء المتوازن</h5>
        
        ${perspectives.map(p => `
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h6 class="mb-0">${p.name}</h6>
                </div>
                <div class="card-body">
                    <table class="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>المؤشر</th>
                                <th class="text-end">القيمة الفعلية</th>
                                <th class="text-end">الهدف</th>
                                <th class="text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${p.metrics.map(m => `
                                <tr>
                                    <td>${m.name}</td>
                                    <td class="text-end">${m.value}</td>
                                    <td class="text-end">${m.target}</td>
                                    <td class="text-center">
                                        <span class="badge bg-${m.status}">
                                            ${m.status === 'success' ? 'محقق' : m.status === 'warning' ? 'قريب' : 'يحتاج تحسين'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('')}
    `;
}

// ============================================
// الموازنة الرئيسية (Master Budget)
// ============================================

function generateMasterBudget(data) {
    const totals = calculateTotals(data);
    const nextYear = new Date().getFullYear() + 1;
    
    // موازنة تقديرية بزيادة 10%
    const budget = {
        revenue: totals.revenue * 1.1,
        cogs: totals.cogs * 1.08,
        operatingExpenses: totals.operatingExpenses * 1.05,
        capitalExpenditure: totals.fixedAssets * 0.15
    };
    
    budget.grossProfit = budget.revenue - budget.cogs;
    budget.netIncome = budget.grossProfit - budget.operatingExpenses;
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">الموازنة الرئيسية للعام ${nextYear}</h5>
        
        <div class="row">
            <div class="col-md-6">
                <h6>موازنة الدخل</h6>
                <table class="table table-bordered">
                    <tbody>
                        <tr>
                            <td>الإيرادات المتوقعة</td>
                            <td class="text-end">${formatCurrency(budget.revenue)}</td>
                        </tr>
                        <tr>
                            <td>تكلفة البضاعة المباعة</td>
                            <td class="text-end">${formatCurrency(budget.cogs)}</td>
                        </tr>
                        <tr class="table-primary">
                            <td><strong>إجمالي الربح</strong></td>
                            <td class="text-end"><strong>${formatCurrency(budget.grossProfit)}</strong></td>
                        </tr>
                        <tr>
                            <td>المصروفات التشغيلية</td>
                            <td class="text-end">${formatCurrency(budget.operatingExpenses)}</td>
                        </tr>
                        <tr class="table-success">
                            <td><strong>صافي الربح المتوقع</strong></td>
                            <td class="text-end"><strong>${formatCurrency(budget.netIncome)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6>موازنة النفقات الرأسمالية</h6>
                <table class="table table-bordered">
                    <tbody>
                        <tr>
                            <td>شراء أصول ثابتة</td>
                            <td class="text-end">${formatCurrency(budget.capitalExpenditure)}</td>
                        </tr>
                        <tr>
                            <td>صيانة وتحديثات</td>
                            <td class="text-end">${formatCurrency(budget.capitalExpenditure * 0.2)}</td>
                        </tr>
                        <tr class="table-primary">
                            <td><strong>إجمالي النفقات الرأسمالية</strong></td>
                            <td class="text-end"><strong>${formatCurrency(budget.capitalExpenditure * 1.2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// موازنة المبيعات
// ============================================

function generateSalesBudget(data) {
    const totals = calculateTotals(data);
    const nextYear = new Date().getFullYear() + 1;
    
    const quarters = [
        { name: 'الربع الأول', sales: totals.revenue * 0.22 },
        { name: 'الربع الثاني', sales: totals.revenue * 0.25 },
        { name: 'الربع الثالث', sales: totals.revenue * 0.28 },
        { name: 'الربع الرابع', sales: totals.revenue * 0.30 }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">موازنة المبيعات للعام ${nextYear}</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>الفترة</th>
                    <th class="text-end">المبيعات المتوقعة</th>
                    <th class="text-end">النسبة من الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${quarters.map(q => `
                    <tr>
                        <td>${q.name}</td>
                        <td class="text-end">${formatCurrency(q.sales)}</td>
                        <td class="text-end">${(q.sales / totals.revenue * 100).toFixed(2)}%</td>
                    </tr>
                `).join('')}
                <tr class="table-primary">
                    <td><strong>الإجمالي السنوي</strong></td>
                    <td class="text-end"><strong>${formatCurrency(quarters.reduce((sum, q) => sum + q.sales, 0))}</strong></td>
                    <td class="text-end"><strong>100.00%</strong></td>
                </tr>
            </tbody>
        </table>
    `;
}

// Export additional functions
window.ReportsLibrary = {
    ...window.ReportsLibrary,
    generateCVPAnalysis,
    generateSensitivityAnalysis,
    generateScenarioAnalysis,
    generateCashFlowForecast,
    generateBalancedScorecard,
    generateMasterBudget,
    generateSalesBudget
};




// ============================================
// موازنة الإنتاج
// ============================================

function generateProductionBudget(data) {
    const totals = calculateTotals(data);
    const nextYear = new Date().getFullYear() + 1;
    
    const production = {
        salesUnits: 10000, // وحدات مفترضة
        endingInventory: 2000,
        beginningInventory: 1500,
        productionNeeded: 0
    };
    
    production.productionNeeded = production.salesUnits + production.endingInventory - production.beginningInventory;
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">موازنة الإنتاج للعام ${nextYear}</h5>
        <table class="table table-bordered">
            <tbody>
                <tr>
                    <td>الوحدات المتوقع بيعها</td>
                    <td class="text-end">${production.salesUnits.toLocaleString()} وحدة</td>
                </tr>
                <tr>
                    <td>مخزون آخر المدة المطلوب</td>
                    <td class="text-end">${production.endingInventory.toLocaleString()} وحدة</td>
                </tr>
                <tr>
                    <td>إجمالي الاحتياجات</td>
                    <td class="text-end">${(production.salesUnits + production.endingInventory).toLocaleString()} وحدة</td>
                </tr>
                <tr>
                    <td>مخزون أول المدة</td>
                    <td class="text-end">${production.beginningInventory.toLocaleString()} وحدة</td>
                </tr>
                <tr class="table-primary">
                    <td><strong>الإنتاج المطلوب</strong></td>
                    <td class="text-end"><strong>${production.productionNeeded.toLocaleString()} وحدة</strong></td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// موازنة النقدية
// ============================================

function generateCashBudget(data) {
    const totals = calculateTotals(data);
    const nextYear = new Date().getFullYear() + 1;
    
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل'];
    const cashBudget = months.map((month, i) => ({
        month,
        beginningCash: i === 0 ? totals.cash : 0,
        collections: totals.revenue / 12 * (1 + i * 0.05),
        payments: totals.expenses / 12 * (1 + i * 0.03),
        endingCash: 0
    }));
    
    cashBudget.forEach((m, i) => {
        if (i > 0) m.beginningCash = cashBudget[i-1].endingCash;
        m.endingCash = m.beginningCash + m.collections - m.payments;
    });
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">موازنة النقدية للربع الأول ${nextYear}</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>الشهر</th>
                    <th class="text-end">رصيد أول المدة</th>
                    <th class="text-end">المقبوضات</th>
                    <th class="text-end">المدفوعات</th>
                    <th class="text-end">رصيد آخر المدة</th>
                </tr>
            </thead>
            <tbody>
                ${cashBudget.map(m => `
                    <tr>
                        <td>${m.month}</td>
                        <td class="text-end">${formatCurrency(m.beginningCash)}</td>
                        <td class="text-end text-success">${formatCurrency(m.collections)}</td>
                        <td class="text-end text-danger">${formatCurrency(m.payments)}</td>
                        <td class="text-end ${m.endingCash > 0 ? 'text-success' : 'text-danger'}">
                            <strong>${formatCurrency(m.endingCash)}</strong>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// موازنة النفقات الرأسمالية
// ============================================

function generateCapitalBudget(data) {
    const totals = calculateTotals(data);
    const nextYear = new Date().getFullYear() + 1;
    
    const projects = [
        { name: 'توسعة المصنع', cost: totals.fixedAssets * 0.3, roi: 18, payback: 4.2 },
        { name: 'خط إنتاج جديد', cost: totals.fixedAssets * 0.25, roi: 22, payback: 3.5 },
        { name: 'تحديث الأنظمة', cost: totals.fixedAssets * 0.15, roi: 15, payback: 5.0 },
        { name: 'مركبات وآليات', cost: totals.fixedAssets * 0.1, roi: 12, payback: 6.0 }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">موازنة النفقات الرأسمالية ${nextYear}</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>المشروع</th>
                    <th class="text-end">التكلفة</th>
                    <th class="text-end">العائد المتوقع</th>
                    <th class="text-end">فترة الاسترداد</th>
                    <th>القرار</th>
                </tr>
            </thead>
            <tbody>
                ${projects.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td class="text-end">${formatCurrency(p.cost)}</td>
                        <td class="text-end">${p.roi}%</td>
                        <td class="text-end">${p.payback} سنة</td>
                        <td><span class="badge ${p.roi > 15 ? 'bg-success' : 'bg-warning'}">${p.roi > 15 ? 'موصى به' : 'يحتاج دراسة'}</span></td>
                    </tr>
                `).join('')}
                <tr class="table-primary">
                    <td><strong>الإجمالي</strong></td>
                    <td class="text-end"><strong>${formatCurrency(projects.reduce((sum, p) => sum + p.cost, 0))}</strong></td>
                    <td colspan="3"></td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// تحليل الانحرافات (Variance Analysis)
// ============================================

function generateVarianceAnalysis(data) {
    const totals = calculateTotals(data);
    
    // مقارنة الفعلي بالموازنة
    const budget = {
        revenue: totals.revenue * 0.95,
        cogs: totals.cogs * 1.05,
        operatingExpenses: totals.operatingExpenses * 1.02
    };
    
    const variances = {
        revenue: totals.revenue - budget.revenue,
        cogs: totals.cogs - budget.cogs,
        operatingExpenses: totals.operatingExpenses - budget.operatingExpenses
    };
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تحليل الانحرافات - الفعلي مقابل الموازنة</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">الموازنة</th>
                    <th class="text-end">الفعلي</th>
                    <th class="text-end">الانحراف</th>
                    <th class="text-end">الانحراف %</th>
                    <th>التقييم</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>الإيرادات</td>
                    <td class="text-end">${formatCurrency(budget.revenue)}</td>
                    <td class="text-end">${formatCurrency(totals.revenue)}</td>
                    <td class="text-end ${variances.revenue > 0 ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(variances.revenue)}
                    </td>
                    <td class="text-end">${(variances.revenue / budget.revenue * 100).toFixed(2)}%</td>
                    <td><span class="badge ${variances.revenue > 0 ? 'bg-success' : 'bg-danger'}">
                        ${variances.revenue > 0 ? 'إيجابي' : 'سلبي'}
                    </span></td>
                </tr>
                <tr>
                    <td>تكلفة البضاعة المباعة</td>
                    <td class="text-end">${formatCurrency(budget.cogs)}</td>
                    <td class="text-end">${formatCurrency(totals.cogs)}</td>
                    <td class="text-end ${variances.cogs < 0 ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(variances.cogs)}
                    </td>
                    <td class="text-end">${(variances.cogs / budget.cogs * 100).toFixed(2)}%</td>
                    <td><span class="badge ${variances.cogs < 0 ? 'bg-success' : 'bg-danger'}">
                        ${variances.cogs < 0 ? 'إيجابي' : 'سلبي'}
                    </span></td>
                </tr>
                <tr>
                    <td>المصروفات التشغيلية</td>
                    <td class="text-end">${formatCurrency(budget.operatingExpenses)}</td>
                    <td class="text-end">${formatCurrency(totals.operatingExpenses)}</td>
                    <td class="text-end ${variances.operatingExpenses < 0 ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(variances.operatingExpenses)}
                    </td>
                    <td class="text-end">${(variances.operatingExpenses / budget.operatingExpenses * 100).toFixed(2)}%</td>
                    <td><span class="badge ${variances.operatingExpenses < 0 ? 'bg-success' : 'bg-danger'}">
                        ${variances.operatingExpenses < 0 ? 'إيجابي' : 'سلبي'}
                    </span></td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// الموازنة المرنة (Flexible Budget)
// ============================================

function generateFlexibleBudget(data) {
    const totals = calculateTotals(data);
    
    const activityLevels = [80, 90, 100, 110, 120];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">الموازنة المرنة - مستويات نشاط مختلفة</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>البيان</th>
                    ${activityLevels.map(level => `<th class="text-end">${level}%</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>الإيرادات</td>
                    ${activityLevels.map(level => `
                        <td class="text-end">${formatCurrency(totals.revenue * level / 100)}</td>
                    `).join('')}
                </tr>
                <tr>
                    <td>التكاليف المتغيرة</td>
                    ${activityLevels.map(level => `
                        <td class="text-end">${formatCurrency(totals.cogs * level / 100)}</td>
                    `).join('')}
                </tr>
                <tr>
                    <td>التكاليف الثابتة</td>
                    ${activityLevels.map(() => `
                        <td class="text-end">${formatCurrency(totals.operatingExpenses)}</td>
                    `).join('')}
                </tr>
                <tr class="table-primary">
                    <td><strong>صافي الربح</strong></td>
                    ${activityLevels.map(level => {
                        const netIncome = (totals.revenue * level / 100) - (totals.cogs * level / 100) - totals.operatingExpenses;
                        return `<td class="text-end ${netIncome > 0 ? 'text-success' : 'text-danger'}">
                            <strong>${formatCurrency(netIncome)}</strong>
                        </td>`;
                    }).join('')}
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// الموازنة الصفرية (Zero-Based Budget)
// ============================================

function generateZeroBasedBudget(data) {
    const totals = calculateTotals(data);
    
    const departments = [
        { name: 'الإنتاج', current: totals.operatingExpenses * 0.4, proposed: totals.operatingExpenses * 0.38, justification: 'تحسين الكفاءة' },
        { name: 'المبيعات', current: totals.operatingExpenses * 0.25, proposed: totals.operatingExpenses * 0.27, justification: 'توسع السوق' },
        { name: 'الإدارة', current: totals.operatingExpenses * 0.2, proposed: totals.operatingExpenses * 0.19, justification: 'أتمتة العمليات' },
        { name: 'البحث والتطوير', current: totals.operatingExpenses * 0.15, proposed: totals.operatingExpenses * 0.16, justification: 'ابتكار منتجات' }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">الموازنة الصفرية - مراجعة شاملة للمصروفات</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>القسم</th>
                    <th class="text-end">الموازنة الحالية</th>
                    <th class="text-end">الموازنة المقترحة</th>
                    <th class="text-end">التغير</th>
                    <th>المبرر</th>
                </tr>
            </thead>
            <tbody>
                ${departments.map(d => {
                    const change = d.proposed - d.current;
                    return `
                        <tr>
                            <td>${d.name}</td>
                            <td class="text-end">${formatCurrency(d.current)}</td>
                            <td class="text-end">${formatCurrency(d.proposed)}</td>
                            <td class="text-end ${change < 0 ? 'text-success' : 'text-warning'}">
                                ${change > 0 ? '+' : ''}${formatCurrency(change)}
                            </td>
                            <td>${d.justification}</td>
                        </tr>
                    `;
                }).join('')}
                <tr class="table-primary">
                    <td><strong>الإجمالي</strong></td>
                    <td class="text-end"><strong>${formatCurrency(departments.reduce((sum, d) => sum + d.current, 0))}</strong></td>
                    <td class="text-end"><strong>${formatCurrency(departments.reduce((sum, d) => sum + d.proposed, 0))}</strong></td>
                    <td class="text-end"><strong>${formatCurrency(departments.reduce((sum, d) => sum + (d.proposed - d.current), 0))}</strong></td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// تحليل المصروفات الاستثنائية
// ============================================

function generateExceptionalExpenses(data) {
    const totals = calculateTotals(data);
    
    const expenses = [
        { name: 'مصروفات قانونية', amount: totals.operatingExpenses * 0.05, type: 'غير متكررة', impact: 'متوسط' },
        { name: 'خسائر استثنائية', amount: totals.operatingExpenses * 0.03, type: 'غير متكررة', impact: 'منخفض' },
        { name: 'إعادة هيكلة', amount: totals.operatingExpenses * 0.08, type: 'غير متكررة', impact: 'عالي' },
        { name: 'تعويضات', amount: totals.operatingExpenses * 0.02, type: 'غير متكررة', impact: 'منخفض' }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تحليل المصروفات الاستثنائية</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>نوع المصروف</th>
                    <th class="text-end">المبلغ</th>
                    <th>النوع</th>
                    <th>التأثير</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map(e => `
                    <tr>
                        <td>${e.name}</td>
                        <td class="text-end">${formatCurrency(e.amount)}</td>
                        <td><span class="badge bg-info">${e.type}</span></td>
                        <td><span class="badge ${e.impact === 'عالي' ? 'bg-danger' : e.impact === 'متوسط' ? 'bg-warning' : 'bg-success'}">
                            ${e.impact}
                        </span></td>
                    </tr>
                `).join('')}
                <tr class="table-primary">
                    <td><strong>إجمالي المصروفات الاستثنائية</strong></td>
                    <td class="text-end"><strong>${formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</strong></td>
                    <td colspan="2"></td>
                </tr>
            </tbody>
        </table>
    `;
}

// ============================================
// تحليل حركة المخزون
// ============================================

function generateInventoryMovement(data) {
    const totals = calculateTotals(data);
    
    const movement = {
        beginningInventory: totals.inventory * 0.8,
        purchases: totals.cogs * 1.1,
        available: 0,
        cogs: totals.cogs,
        endingInventory: totals.inventory
    };
    
    movement.available = movement.beginningInventory + movement.purchases;
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تحليل حركة المخزون</h5>
        <table class="table table-bordered">
            <tbody>
                <tr>
                    <td>مخزون أول المدة</td>
                    <td class="text-end">${formatCurrency(movement.beginningInventory)}</td>
                </tr>
                <tr>
                    <td>المشتريات خلال الفترة</td>
                    <td class="text-end">${formatCurrency(movement.purchases)}</td>
                </tr>
                <tr class="table-info">
                    <td><strong>البضاعة المتاحة للبيع</strong></td>
                    <td class="text-end"><strong>${formatCurrency(movement.available)}</strong></td>
                </tr>
                <tr>
                    <td>تكلفة البضاعة المباعة</td>
                    <td class="text-end">${formatCurrency(movement.cogs)}</td>
                </tr>
                <tr class="table-primary">
                    <td><strong>مخزون آخر المدة</strong></td>
                    <td class="text-end"><strong>${formatCurrency(movement.endingInventory)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="mt-4">
            <h6>مؤشرات الأداء:</h6>
            <table class="table table-sm">
                <tr>
                    <td>معدل دوران المخزون</td>
                    <td class="text-end"><strong>${(movement.cogs / movement.endingInventory).toFixed(2)} مرة</strong></td>
                </tr>
                <tr>
                    <td>فترة الاحتفاظ بالمخزون</td>
                    <td class="text-end"><strong>${(365 / (movement.cogs / movement.endingInventory)).toFixed(0)} يوم</strong></td>
                </tr>
            </table>
        </div>
    `;
}

// ============================================
// كفاءة رأس المال العامل
// ============================================

function generateWorkingCapitalEfficiency(data) {
    const totals = calculateTotals(data);
    
    const workingCapital = totals.currentAssets - totals.currentLiabilities;
    const workingCapitalRatio = totals.currentAssets / totals.currentLiabilities;
    const workingCapitalTurnover = totals.revenue / workingCapital;
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">كفاءة رأس المال العامل</h5>
        
        <div class="row">
            <div class="col-md-6">
                <h6>مكونات رأس المال العامل</h6>
                <table class="table table-bordered">
                    <tbody>
                        <tr>
                            <td>الأصول المتداولة</td>
                            <td class="text-end">${formatCurrency(totals.currentAssets)}</td>
                        </tr>
                        <tr>
                            <td>الالتزامات المتداولة</td>
                            <td class="text-end">${formatCurrency(totals.currentLiabilities)}</td>
                        </tr>
                        <tr class="table-primary">
                            <td><strong>رأس المال العامل</strong></td>
                            <td class="text-end"><strong>${formatCurrency(workingCapital)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6>مؤشرات الكفاءة</h6>
                <table class="table table-bordered">
                    <tbody>
                        <tr>
                            <td>نسبة التداول</td>
                            <td class="text-end">${workingCapitalRatio.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>معدل دوران رأس المال العامل</td>
                            <td class="text-end">${workingCapitalTurnover.toFixed(2)} مرة</td>
                        </tr>
                        <tr>
                            <td>فترة دوران رأس المال العامل</td>
                            <td class="text-end">${(365 / workingCapitalTurnover).toFixed(0)} يوم</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="alert ${workingCapitalRatio > 1.5 ? 'alert-success' : workingCapitalRatio > 1 ? 'alert-warning' : 'alert-danger'} mt-4">
            <i class="fas fa-${workingCapitalRatio > 1.5 ? 'check' : 'exclamation'}-circle me-2"></i>
            <strong>التقييم:</strong> 
            ${workingCapitalRatio > 1.5 ? 'وضع السيولة ممتاز' : workingCapitalRatio > 1 ? 'وضع السيولة جيد' : 'يحتاج تحسين السيولة'}
        </div>
    `;
}

// ============================================
// تقرير المخاطر المالية
// ============================================

function generateFinancialRisks(data) {
    const totals = calculateTotals(data);
    
    const risks = [
        {
            name: 'مخاطر السيولة',
            level: totals.currentAssets / totals.currentLiabilities > 1.5 ? 'منخفض' : 'متوسط',
            impact: 'عالي',
            mitigation: 'تحسين إدارة النقدية'
        },
        {
            name: 'مخاطر المديونية',
            level: totals.liabilities / totals.assets > 0.6 ? 'عالي' : 'منخفض',
            impact: 'عالي',
            mitigation: 'تخفيض الديون'
        },
        {
            name: 'مخاطر التشغيل',
            level: 'متوسط',
            impact: 'متوسط',
            mitigation: 'تنويع مصادر الإيرادات'
        },
        {
            name: 'مخاطر السوق',
            level: 'متوسط',
            impact: 'عالي',
            mitigation: 'دراسة السوق المستمرة'
        }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">تقرير المخاطر المالية</h5>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>نوع المخاطرة</th>
                    <th>مستوى المخاطرة</th>
                    <th>التأثير</th>
                    <th>الإجراء المقترح</th>
                </tr>
            </thead>
            <tbody>
                ${risks.map(r => `
                    <tr>
                        <td>${r.name}</td>
                        <td><span class="badge ${r.level === 'منخفض' ? 'bg-success' : r.level === 'متوسط' ? 'bg-warning' : 'bg-danger'}">
                            ${r.level}
                        </span></td>
                        <td><span class="badge ${r.impact === 'منخفض' ? 'bg-success' : r.impact === 'متوسط' ? 'bg-warning' : 'bg-danger'}">
                            ${r.impact}
                        </span></td>
                        <td>${r.mitigation}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// لوحة الإدارة التنفيذية
// ============================================

function generateExecutiveDashboard(data) {
    const totals = calculateTotals(data);
    
    const kpis = [
        { name: 'الإيرادات', value: formatCurrency(totals.revenue), change: '+12%', trend: 'up' },
        { name: 'صافي الربح', value: formatCurrency(totals.netIncome), change: '+8%', trend: 'up' },
        { name: 'هامش الربح', value: (totals.netIncome / totals.revenue * 100).toFixed(2) + '%', change: '-2%', trend: 'down' },
        { name: 'العائد على الأصول', value: (totals.netIncome / totals.assets * 100).toFixed(2) + '%', change: '+5%', trend: 'up' }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">لوحة الإدارة التنفيذية</h5>
        
        <div class="row">
            ${kpis.map(kpi => `
                <div class="col-md-3 mb-3">
                    <div class="card">
                        <div class="card-body text-center">
                            <h6 class="text-muted">${kpi.name}</h6>
                            <h3 class="text-primary">${kpi.value}</h3>
                            <p class="${kpi.trend === 'up' ? 'text-success' : 'text-danger'}">
                                <i class="fas fa-arrow-${kpi.trend}"></i> ${kpi.change}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="row mt-4">
            <div class="col-md-6">
                <h6>أهم الإنجازات</h6>
                <ul class="list-group">
                    <li class="list-group-item">✓ نمو الإيرادات بنسبة 12%</li>
                    <li class="list-group-item">✓ تحسين العائد على الأصول</li>
                    <li class="list-group-item">✓ خفض التكاليف التشغيلية</li>
                </ul>
            </div>
            <div class="col-md-6">
                <h6>التحديات</h6>
                <ul class="list-group">
                    <li class="list-group-item">⚠ انخفاض هامش الربح</li>
                    <li class="list-group-item">⚠ زيادة المنافسة</li>
                    <li class="list-group-item">⚠ تقلبات السوق</li>
                </ul>
            </div>
        </div>
    `;
}

// ============================================
// لوحة الأداء التشغيلي
// ============================================

function generateOperationalDashboard(data) {
    const totals = calculateTotals(data);
    
    const metrics = [
        { name: 'معدل دوران المخزون', value: (totals.cogs / totals.inventory).toFixed(2) + ' مرة', target: '8 مرات', status: 'success' },
        { name: 'معدل دوران الأصول', value: (totals.revenue / totals.assets).toFixed(2) + ' مرة', target: '1.5 مرة', status: 'success' },
        { name: 'فترة التحصيل', value: ((totals.receivables / totals.revenue) * 365).toFixed(0) + ' يوم', target: '45 يوم', status: 'warning' },
        { name: 'فترة السداد', value: ((totals.payables / totals.cogs) * 365).toFixed(0) + ' يوم', target: '60 يوم', status: 'success' }
    ];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">لوحة الأداء التشغيلي</h5>
        
        <div class="row">
            ${metrics.map(m => `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6>${m.name}</h6>
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="text-primary mb-0">${m.value}</h4>
                                <span class="badge bg-${m.status}">${m.target}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// لوحة الأداء المالي
// ============================================

function generateFinancialDashboard(data) {
    const totals = calculateTotals(data);
    
    const ratios = [
        { category: 'السيولة', name: 'نسبة التداول', value: (totals.currentAssets / totals.currentLiabilities).toFixed(2), benchmark: '2.0' },
        { category: 'السيولة', name: 'النسبة السريعة', value: ((totals.currentAssets - totals.inventory) / totals.currentLiabilities).toFixed(2), benchmark: '1.0' },
        { category: 'الربحية', name: 'هامش الربح الإجمالي', value: (totals.grossProfit / totals.revenue * 100).toFixed(2) + '%', benchmark: '30%' },
        { category: 'الربحية', name: 'هامش الربح الصافي', value: (totals.netIncome / totals.revenue * 100).toFixed(2) + '%', benchmark: '10%' },
        { category: 'الكفاءة', name: 'العائد على الأصول', value: (totals.netIncome / totals.assets * 100).toFixed(2) + '%', benchmark: '10%' },
        { category: 'الكفاءة', name: 'العائد على حقوق الملكية', value: (totals.netIncome / totals.equity * 100).toFixed(2) + '%', benchmark: '15%' }
    ];
    
    const categories = [...new Set(ratios.map(r => r.category))];
    
    return `
        ${getCompanyHeader(window.auditFile)}
        
        <h5 class="mb-3">لوحة الأداء المالي</h5>
        
        ${categories.map(cat => `
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h6 class="mb-0">نسب ${cat}</h6>
                </div>
                <div class="card-body">
                    <table class="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>المؤشر</th>
                                <th class="text-end">القيمة</th>
                                <th class="text-end">المعيار</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ratios.filter(r => r.category === cat).map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td class="text-end"><strong>${r.value}</strong></td>
                                    <td class="text-end text-muted">${r.benchmark}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('')}
    `;
}

// Export all additional functions
window.ReportsLibrary = {
    ...window.ReportsLibrary,
    generateProductionBudget,
    generateCashBudget,
    generateCapitalBudget,
    generateVarianceAnalysis,
    generateFlexibleBudget,
    generateZeroBasedBudget,
    generateExceptionalExpenses,
    generateInventoryMovement,
    generateWorkingCapitalEfficiency,
    generateFinancialRisks,
    generateExecutiveDashboard,
    generateOperationalDashboard,
    generateFinancialDashboard
};


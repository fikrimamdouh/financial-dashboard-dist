// ============================================
// نظام ذكاء القرارات المالية - Polaris
// ============================================

// Global variables
let auditFile = null;
let financialData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initializeAllModules();
});

// Load data from localStorage
function loadData() {
    const activeClientId = localStorage.getItem('activeClientId');
    
    if (!activeClientId) {
        showError('لم يتم العثور على بيانات. يرجى البدء من صفحة إنشاء العميل.');
        return;
    }
    
    const auditFileKey = `polarisAuditFile_${activeClientId}`;
    const storedData = localStorage.getItem(auditFileKey);
    
    if (!storedData) {
        showError('لم يتم العثور على بيانات مالية. يرجى رفع ميزان المراجعة أولاً.');
        return;
    }
    
    try {
        auditFile = JSON.parse(storedData);
        financialData = calculateFinancialData(auditFile.trialBalance || []);
        displayCompanyInfo();
    } catch (error) {
        showError('خطأ في قراءة البيانات: ' + error.message);
    }
}

// Display company info
function displayCompanyInfo() {
    const companyInfo = document.getElementById('companyInfo');
    if (auditFile && auditFile.companyName) {
        companyInfo.innerHTML = `
            <div class="alert alert-info">
                <strong>${auditFile.companyName}</strong> | 
                الفترة المالية: ${auditFile.fiscalPeriod || 'غير محدد'}
            </div>
        `;
    }
}

// Calculate financial data
function calculateFinancialData(trialBalance) {
    const data = {
        // Assets
        cash: 0,
        receivables: 0,
        inventory: 0,
        currentAssets: 0,
        fixedAssets: 0,
        totalAssets: 0,
        
        // Liabilities
        payables: 0,
        currentLiabilities: 0,
        longTermLiabilities: 0,
        totalLiabilities: 0,
        
        // Equity
        equity: 0,
        
        // Income Statement
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        netIncome: 0,
        
        // Ratios
        currentRatio: 0,
        quickRatio: 0,
        debtRatio: 0,
        profitMargin: 0,
        roa: 0,
        roe: 0
    };
    
    // Calculate from trial balance
    trialBalance.forEach(account => {
        const debit = parseFloat(account.debit) || 0;
        const credit = parseFloat(account.credit) || 0;
        const balance = debit - credit;
        const category = (account.category || '').toLowerCase();
        
        // Assets
        if (category.includes('نقدية') || category.includes('cash')) {
            data.cash += Math.abs(balance);
        }
        if (category.includes('مدين') || category.includes('receivable')) {
            data.receivables += Math.abs(balance);
        }
        if (category.includes('مخزون') || category.includes('inventory')) {
            data.inventory += Math.abs(balance);
        }
        if (category.includes('أصول متداولة') || category.includes('current asset')) {
            data.currentAssets += Math.abs(balance);
        }
        if (category.includes('أصول ثابتة') || category.includes('fixed asset')) {
            data.fixedAssets += Math.abs(balance);
        }
        
        // Liabilities
        if (category.includes('دائن') || category.includes('payable')) {
            data.payables += Math.abs(balance);
        }
        if (category.includes('التزامات متداولة') || category.includes('current liabilit')) {
            data.currentLiabilities += Math.abs(balance);
        }
        if (category.includes('التزامات طويلة') || category.includes('long term')) {
            data.longTermLiabilities += Math.abs(balance);
        }
        
        // Equity
        if (category.includes('حقوق ملكية') || category.includes('equity')) {
            data.equity += Math.abs(balance);
        }
        
        // Income
        if (category.includes('إيراد') || category.includes('revenue') || category.includes('sales')) {
            data.revenue += Math.abs(credit);
        }
        if (category.includes('تكلفة') || category.includes('cogs') || category.includes('cost of')) {
            data.cogs += Math.abs(debit);
        }
        if (category.includes('مصروف') || category.includes('expense')) {
            data.operatingExpenses += Math.abs(debit);
        }
    });
    
    // Calculate totals
    data.totalAssets = data.currentAssets + data.fixedAssets;
    data.totalLiabilities = data.currentLiabilities + data.longTermLiabilities;
    data.grossProfit = data.revenue - data.cogs;
    data.netIncome = data.grossProfit - data.operatingExpenses;
    
    // Calculate ratios
    data.currentRatio = data.currentLiabilities > 0 ? data.currentAssets / data.currentLiabilities : 0;
    data.quickRatio = data.currentLiabilities > 0 ? (data.currentAssets - data.inventory) / data.currentLiabilities : 0;
    data.debtRatio = data.totalAssets > 0 ? data.totalLiabilities / data.totalAssets : 0;
    data.profitMargin = data.revenue > 0 ? (data.netIncome / data.revenue) * 100 : 0;
    data.roa = data.totalAssets > 0 ? (data.netIncome / data.totalAssets) * 100 : 0;
    data.roe = data.equity > 0 ? (data.netIncome / data.equity) * 100 : 0;
    
    return data;
}

// Initialize all modules
function initializeAllModules() {
    if (!financialData) return;
    
    generateSmartRecommendations();
    generateForecasting();
    generateScenarios();
    generateAlerts();
    generateDecisions();
    generateAdvancedFeatures();
}

// ============================================
// MODULE 1: SMART RECOMMENDATIONS
// ============================================

function generateSmartRecommendations() {
    const recommendations = [];
    
    // 1. Profit Margin Analysis
    if (financialData.profitMargin < 5) {
        recommendations.push({
            type: 'critical',
            icon: 'fa-exclamation-triangle',
            title: 'انخفاض هامش الربح الصافي',
            problem: `هامش الربح الحالي ${financialData.profitMargin.toFixed(2)}% أقل من المعدل الصحي (10%)`,
            recommendations: [
                `رفع الأسعار بنسبة ${(10 - financialData.profitMargin).toFixed(1)}% تدريجياً`,
                `خفض التكاليف التشغيلية بنسبة ${(financialData.operatingExpenses * 0.15 / financialData.revenue * 100).toFixed(1)}%`,
                `إيقاف المنتجات/الخدمات ذات الهامش السلبي`,
                `مراجعة عقود الموردين للحصول على خصومات`
            ],
            impact: 'عالي',
            priority: 1
        });
    }
    
    // 2. Liquidity Analysis
    if (financialData.currentRatio < 1) {
        recommendations.push({
            type: 'critical',
            icon: 'fa-tint',
            title: 'أزمة سيولة حادة',
            problem: `نسبة التداول ${financialData.currentRatio.toFixed(2)} أقل من 1 - الشركة لا تستطيع تغطية التزاماتها`,
            recommendations: [
                `تحصيل الذمم المدينة فوراً (${formatCurrency(financialData.receivables)})`,
                `تأجيل المدفوعات غير الضرورية`,
                `الحصول على تمويل قصير الأجل بقيمة ${formatCurrency(financialData.currentLiabilities - financialData.currentAssets)}`,
                `بيع الأصول غير المنتجة`
            ],
            impact: 'حرج',
            priority: 1
        });
    } else if (financialData.currentRatio < 1.5) {
        recommendations.push({
            type: 'warning',
            icon: 'fa-exclamation-circle',
            title: 'سيولة ضعيفة',
            problem: `نسبة التداول ${financialData.currentRatio.toFixed(2)} أقل من المعدل الصحي (1.5-2)`,
            recommendations: [
                `تسريع تحصيل الذمم المدينة`,
                `تقليل المخزون الراكد`,
                `إعادة جدولة الديون قصيرة الأجل`
            ],
            impact: 'متوسط',
            priority: 2
        });
    }
    
    // 3. Debt Analysis
    if (financialData.debtRatio > 0.7) {
        recommendations.push({
            type: 'critical',
            icon: 'fa-chart-line',
            title: 'مديونية مرتفعة جداً',
            problem: `نسبة المديونية ${(financialData.debtRatio * 100).toFixed(1)}% تتجاوز الحد الآمن (60%)`,
            recommendations: [
                `سداد الديون ذات الفائدة المرتفعة أولاً`,
                `زيادة رأس المال عن طريق شركاء جدد`,
                `تحويل جزء من الأرباح لسداد الديون`,
                `إعادة هيكلة الديون مع الدائنين`
            ],
            impact: 'عالي',
            priority: 1
        });
    }
    
    // 4. Receivables Analysis
    const receivablesDays = (financialData.receivables / financialData.revenue) * 365;
    if (receivablesDays > 60) {
        recommendations.push({
            type: 'warning',
            icon: 'fa-clock',
            title: 'تأخر في تحصيل الذمم',
            problem: `متوسط فترة التحصيل ${receivablesDays.toFixed(0)} يوم (المعدل الصحي 30-45 يوم)`,
            recommendations: [
                `تطبيق سياسة خصم نقدي للدفع المبكر (2% خصم خلال 10 أيام)`,
                `تشديد شروط الائتمان للعملاء الجدد`,
                `متابعة يومية للحسابات المتأخرة`,
                `تحويل الحسابات المتعثرة لشركات التحصيل`
            ],
            impact: 'متوسط',
            priority: 2
        });
    }
    
    // 5. Inventory Analysis
    const inventoryTurnover = financialData.inventory > 0 ? financialData.cogs / financialData.inventory : 0;
    if (inventoryTurnover < 4) {
        recommendations.push({
            type: 'warning',
            icon: 'fa-boxes',
            title: 'بطء دوران المخزون',
            problem: `معدل دوران المخزون ${inventoryTurnover.toFixed(1)} مرة/سنة (المعدل الصحي 6-8 مرات)`,
            recommendations: [
                `تخفيضات على المخزون الراكد`,
                `تحسين التنبؤ بالطلب`,
                `تطبيق نظام Just-In-Time`,
                `مراجعة سياسات الشراء`
            ],
            impact: 'متوسط',
            priority: 3
        });
    }
    
    // 6. ROE Analysis
    if (financialData.roe < 10) {
        recommendations.push({
            type: 'info',
            icon: 'fa-percentage',
            title: 'عائد منخفض على حقوق الملكية',
            problem: `العائد على حقوق الملكية ${financialData.roe.toFixed(2)}% أقل من المستهدف (15%)`,
            recommendations: [
                `زيادة الربحية من خلال رفع الأسعار أو خفض التكاليف`,
                `استخدام الرافعة المالية بحذر لزيادة العائد`,
                `الاستثمار في مشاريع ذات عائد مرتفع`,
                `تحسين كفاءة استخدام الأصول`
            ],
            impact: 'متوسط',
            priority: 3
        });
    }
    
    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);
    
    // Display recommendations
    const container = document.getElementById('recommendationsContent');
    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card ${rec.type}">
            <div class="d-flex align-items-start">
                <i class="fas ${rec.icon} fa-2x me-3" style="color: ${getColorForType(rec.type)}"></i>
                <div class="flex-grow-1">
                    <h5 class="mb-2">${rec.title}</h5>
                    <p class="text-muted mb-3"><strong>المشكلة:</strong> ${rec.problem}</p>
                    <h6>التوصيات:</h6>
                    <ul class="mb-3">
                        ${rec.recommendations.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-${rec.type === 'critical' ? 'danger' : rec.type === 'warning' ? 'warning' : 'info'}">
                            التأثير: ${rec.impact}
                        </span>
                        <span class="badge bg-secondary">أولوية: ${rec.priority}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// MODULE 2: FORECASTING & BUDGETING
// ============================================

function generateForecasting() {
    const nextYear = new Date().getFullYear() + 1;
    const growthRate = 0.10; // 10% growth assumption
    
    const forecast = {
        revenue: financialData.revenue * (1 + growthRate),
        cogs: financialData.cogs * (1 + growthRate * 0.8),
        operatingExpenses: financialData.operatingExpenses * (1 + 0.05),
        netIncome: 0
    };
    
    forecast.grossProfit = forecast.revenue - forecast.cogs;
    forecast.netIncome = forecast.grossProfit - forecast.operatingExpenses;
    
    const container = document.getElementById('forecastingContent');
    container.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value">${formatCurrency(forecast.revenue)}</div>
                    <div class="metric-label">الإيرادات المتوقعة ${nextYear}</div>
                    <small class="text-success">+${(growthRate * 100).toFixed(0)}%</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value">${formatCurrency(forecast.grossProfit)}</div>
                    <div class="metric-label">إجمالي الربح المتوقع</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value">${formatCurrency(forecast.netIncome)}</div>
                    <div class="metric-label">صافي الربح المتوقع</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value">${(forecast.netIncome / forecast.revenue * 100).toFixed(1)}%</div>
                    <div class="metric-label">هامش الربح المتوقع</div>
                </div>
            </div>
        </div>
        
        <h5 class="mb-3">الموازنة التفصيلية للعام ${nextYear}</h5>
        <table class="table table-bordered">
            <thead class="table-light">
                <tr>
                    <th>البيان</th>
                    <th class="text-end">الفعلي ${new Date().getFullYear()}</th>
                    <th class="text-end">الموازنة ${nextYear}</th>
                    <th class="text-end">التغير</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>الإيرادات</strong></td>
                    <td class="text-end">${formatCurrency(financialData.revenue)}</td>
                    <td class="text-end">${formatCurrency(forecast.revenue)}</td>
                    <td class="text-end text-success">+${((forecast.revenue - financialData.revenue) / financialData.revenue * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>تكلفة البضاعة المباعة</td>
                    <td class="text-end">${formatCurrency(financialData.cogs)}</td>
                    <td class="text-end">${formatCurrency(forecast.cogs)}</td>
                    <td class="text-end">+${((forecast.cogs - financialData.cogs) / financialData.cogs * 100).toFixed(1)}%</td>
                </tr>
                <tr class="table-light">
                    <td><strong>إجمالي الربح</strong></td>
                    <td class="text-end"><strong>${formatCurrency(financialData.grossProfit)}</strong></td>
                    <td class="text-end"><strong>${formatCurrency(forecast.grossProfit)}</strong></td>
                    <td class="text-end text-success"><strong>+${((forecast.grossProfit - financialData.grossProfit) / financialData.grossProfit * 100).toFixed(1)}%</strong></td>
                </tr>
                <tr>
                    <td>المصروفات التشغيلية</td>
                    <td class="text-end">${formatCurrency(financialData.operatingExpenses)}</td>
                    <td class="text-end">${formatCurrency(forecast.operatingExpenses)}</td>
                    <td class="text-end">+5.0%</td>
                </tr>
                <tr class="table-success">
                    <td><strong>صافي الربح</strong></td>
                    <td class="text-end"><strong>${formatCurrency(financialData.netIncome)}</strong></td>
                    <td class="text-end"><strong>${formatCurrency(forecast.netIncome)}</strong></td>
                    <td class="text-end text-success"><strong>+${((forecast.netIncome - financialData.netIncome) / financialData.netIncome * 100).toFixed(1)}%</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div class="alert alert-info mt-4">
            <i class="fas fa-info-circle me-2"></i>
            <strong>الافتراضات:</strong> نمو الإيرادات 10%، نمو التكاليف 8%، نمو المصروفات 5%
        </div>
    `;
}

// ============================================
// MODULE 3: WHAT-IF SCENARIOS
// ============================================

function generateScenarios() {
    const container = document.getElementById('scenariosContent');
    container.innerHTML = `
        <div class="scenario-input">
            <h5 class="mb-3">اختبر السيناريوهات المختلفة</h5>
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">تغير الإيرادات (%)</label>
                    <input type="number" class="form-control" id="revenueChange" value="0" step="5">
                </div>
                <div class="col-md-4">
                    <label class="form-label">تغير التكاليف (%)</label>
                    <input type="number" class="form-control" id="costChange" value="0" step="5">
                </div>
                <div class="col-md-4">
                    <label class="form-label">تغير المصروفات (%)</label>
                    <input type="number" class="form-control" id="expenseChange" value="0" step="5">
                </div>
            </div>
            <button class="btn btn-primary mt-3" onclick="calculateScenario()">
                <i class="fas fa-calculator"></i> احسب التأثير
            </button>
        </div>
        
        <div id="scenarioResults"></div>
        
        <h5 class="mt-4 mb-3">سيناريوهات جاهزة</h5>
        <div class="row">
            ${generatePredefinedScenarios()}
        </div>
    `;
}

function generatePredefinedScenarios() {
    const scenarios = [
        {
            name: 'ارتفاع أسعار الوقود 20%',
            revenueChange: 0,
            costChange: 20,
            expenseChange: 15
        },
        {
            name: 'انخفاض المبيعات 10%',
            revenueChange: -10,
            costChange: -8,
            expenseChange: 0
        },
        {
            name: 'زيادة الأسعار 15%',
            revenueChange: 15,
            costChange: 0,
            expenseChange: 0
        },
        {
            name: 'خفض التكاليف 10%',
            revenueChange: 0,
            costChange: -10,
            expenseChange: -5
        }
    ];
    
    return scenarios.map(s => {
        const newRevenue = financialData.revenue * (1 + s.revenueChange / 100);
        const newCogs = financialData.cogs * (1 + s.costChange / 100);
        const newExpenses = financialData.operatingExpenses * (1 + s.expenseChange / 100);
        const newNetIncome = newRevenue - newCogs - newExpenses;
        const impact = newNetIncome - financialData.netIncome;
        
        return `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">${s.name}</h6>
                        <p class="mb-2">
                            <small>الإيرادات: ${s.revenueChange > 0 ? '+' : ''}${s.revenueChange}%</small><br>
                            <small>التكاليف: ${s.costChange > 0 ? '+' : ''}${s.costChange}%</small><br>
                            <small>المصروفات: ${s.expenseChange > 0 ? '+' : ''}${s.expenseChange}%</small>
                        </p>
                        <hr>
                        <div class="d-flex justify-content-between align-items-center">
                            <span>صافي الربح الجديد:</span>
                            <strong class="${newNetIncome > 0 ? 'text-success' : 'text-danger'}">
                                ${formatCurrency(newNetIncome)}
                            </strong>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <span>التأثير:</span>
                            <strong class="${impact > 0 ? 'text-success' : 'text-danger'}">
                                ${impact > 0 ? '+' : ''}${formatCurrency(impact)}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateScenario() {
    const revenueChange = parseFloat(document.getElementById('revenueChange').value) || 0;
    const costChange = parseFloat(document.getElementById('costChange').value) || 0;
    const expenseChange = parseFloat(document.getElementById('expenseChange').value) || 0;
    
    const newRevenue = financialData.revenue * (1 + revenueChange / 100);
    const newCogs = financialData.cogs * (1 + costChange / 100);
    const newExpenses = financialData.operatingExpenses * (1 + expenseChange / 100);
    const newNetIncome = newRevenue - newCogs - newExpenses;
    const impact = newNetIncome - financialData.netIncome;
    
    document.getElementById('scenarioResults').innerHTML = `
        <div class="alert alert-${impact > 0 ? 'success' : 'danger'} mt-4">
            <h5 class="alert-heading">نتيجة السيناريو</h5>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>الإيرادات الجديدة:</strong> ${formatCurrency(newRevenue)}</p>
                    <p><strong>التكاليف الجديدة:</strong> ${formatCurrency(newCogs)}</p>
                    <p><strong>المصروفات الجديدة:</strong> ${formatCurrency(newExpenses)}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>صافي الربح الجديد:</strong> ${formatCurrency(newNetIncome)}</p>
                    <p><strong>التأثير على الربح:</strong> 
                        <span class="${impact > 0 ? 'text-success' : 'text-danger'}">
                            ${impact > 0 ? '+' : ''}${formatCurrency(impact)}
                        </span>
                    </p>
                    <p><strong>نسبة التغير:</strong> ${((impact / financialData.netIncome) * 100).toFixed(1)}%</p>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MODULE 4: ALERTS & MONITORING
// ============================================

function generateAlerts() {
    const alerts = [];
    
    // Cash Alert
    const monthlyExpenses = financialData.operatingExpenses / 12;
    const cashMonths = financialData.cash / monthlyExpenses;
    if (cashMonths < 1) {
        alerts.push({
            type: 'danger',
            icon: 'fa-exclamation-triangle',
            title: 'تحذير: النقدية لا تغطي شهر واحد من المصروفات',
            message: `النقدية الحالية ${formatCurrency(financialData.cash)} تغطي فقط ${cashMonths.toFixed(1)} شهر من المصروفات`,
            action: 'تدبير سيولة فورية'
        });
    }
    
    // Receivables Aging Alert
    const receivablesDays = (financialData.receivables / financialData.revenue) * 365;
    if (receivablesDays > 90) {
        alerts.push({
            type: 'danger',
            icon: 'fa-clock',
            title: 'تحذير: ذمم متأخرة أكثر من 90 يوم',
            message: `متوسط فترة التحصيل ${receivablesDays.toFixed(0)} يوم - يوجد ذمم متعثرة`,
            action: 'اتخاذ إجراءات تحصيل فورية'
        });
    }
    
    // Negative Net Income Alert
    if (financialData.netIncome < 0) {
        alerts.push({
            type: 'danger',
            icon: 'fa-chart-line',
            title: 'تحذير حرج: خسائر تشغيلية',
            message: `الشركة تحقق خسائر بقيمة ${formatCurrency(Math.abs(financialData.netIncome))}`,
            action: 'خطة طوارئ لوقف الخسائر'
        });
    }
    
    // High Debt Alert
    if (financialData.debtRatio > 0.7) {
        alerts.push({
            type: 'warning',
            icon: 'fa-exclamation-circle',
            title: 'تحذير: مديونية مرتفعة',
            message: `نسبة المديونية ${(financialData.debtRatio * 100).toFixed(1)}% تتجاوز الحد الآمن`,
            action: 'خطة لتخفيض المديونية'
        });
    }
    
    // Low Profit Margin Alert
    if (financialData.profitMargin < 5) {
        alerts.push({
            type: 'warning',
            icon: 'fa-percentage',
            title: 'تحذير: هامش ربح منخفض',
            message: `هامش الربح ${financialData.profitMargin.toFixed(2)}% أقل من المستهدف`,
            action: 'مراجعة استراتيجية التسعير والتكاليف'
        });
    }
    
    const container = document.getElementById('alertsContent');
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle me-2"></i>
                <strong>ممتاز!</strong> لا توجد تنبيهات حرجة. الوضع المالي مستقر.
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="mb-4">
                <h5>التنبيهات النشطة (${alerts.length})</h5>
            </div>
            ${alerts.map(alert => `
                <div class="alert-item">
                    <span class="traffic-light ${alert.type === 'danger' ? 'red' : 'yellow'}"></span>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">
                            <i class="fas ${alert.icon} me-2"></i>
                            ${alert.title}
                        </h6>
                        <p class="mb-1 text-muted">${alert.message}</p>
                        <small class="text-primary"><strong>الإجراء المطلوب:</strong> ${alert.action}</small>
                    </div>
                </div>
            `).join('')}
        `;
    }
}

// ============================================
// MODULE 5: DECISIONS LAYER
// ============================================

function generateDecisions() {
    const decisions = [];
    
    // Decision 1: Financing Decision
    if (financialData.currentRatio < 1) {
        const deficit = financialData.currentLiabilities - financialData.currentAssets;
        decisions.push({
            category: 'تمويل',
            icon: 'fa-money-bill-wave',
            decision: 'الحصول على تمويل قصير الأجل',
            amount: deficit,
            reason: 'لتغطية عجز السيولة',
            light: 'red',
            action: 'تنفيذ فوري'
        });
    }
    
    // Decision 2: Cost Reduction
    if (financialData.profitMargin < 5) {
        const targetReduction = financialData.operatingExpenses * 0.15;
        decisions.push({
            category: 'تشغيل',
            icon: 'fa-cut',
            decision: 'خفض المصروفات التشغيلية',
            amount: targetReduction,
            reason: 'لتحسين هامش الربح',
            light: 'yellow',
            action: 'خلال 30 يوم'
        });
    }
    
    // Decision 3: Stop Losing Projects
    if (financialData.netIncome < 0) {
        decisions.push({
            category: 'استراتيجي',
            icon: 'fa-stop-circle',
            decision: 'إيقاف المشاريع/المنتجات الخاسرة',
            amount: Math.abs(financialData.netIncome),
            reason: 'لوقف نزيف الخسائر',
            light: 'red',
            action: 'تنفيذ فوري'
        });
    }
    
    // Decision 4: Debt Restructuring
    if (financialData.debtRatio > 0.7) {
        decisions.push({
            category: 'تمويل',
            icon: 'fa-exchange-alt',
            decision: 'إعادة هيكلة الديون',
            amount: financialData.totalLiabilities,
            reason: 'لتخفيض المديونية',
            light: 'yellow',
            action: 'خلال 60 يوم'
        });
    }
    
    // Decision 5: Increase Capital
    if (financialData.roe < 10 && financialData.equity > 0) {
        decisions.push({
            category: 'استثمار',
            icon: 'fa-chart-line',
            decision: 'زيادة رأس المال أو تحسين العائد',
            amount: financialData.equity * 0.2,
            reason: 'لتحسين العائد على حقوق الملكية',
            light: 'yellow',
            action: 'خلال 90 يوم'
        });
    }
    
    const container = document.getElementById('decisionsContent');
    container.innerHTML = `
        <div class="mb-4">
            <h5>القرارات الموصى بها (${decisions.length})</h5>
            <p class="text-muted">قرارات جاهزة للتنفيذ بناءً على التحليل المالي</p>
        </div>
        
        ${decisions.map(decision => `
            <div class="recommendation-card ${decision.light === 'red' ? 'critical' : 'warning'}">
                <div class="d-flex align-items-start">
                    <span class="traffic-light ${decision.light}"></span>
                    <i class="fas ${decision.icon} fa-2x me-3 ms-3" style="color: ${decision.light === 'red' ? '#dc3545' : '#ffc107'}"></i>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="mb-0">${decision.decision}</h5>
                            <span class="badge bg-secondary">${decision.category}</span>
                        </div>
                        <p class="mb-2"><strong>المبلغ:</strong> ${formatCurrency(decision.amount)}</p>
                        <p class="mb-2"><strong>السبب:</strong> ${decision.reason}</p>
                        <div class="alert alert-light mb-0">
                            <i class="fas fa-clock me-2"></i>
                            <strong>الإجراء:</strong> ${decision.action}
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

// ============================================
// MODULE 6: ADVANCED FEATURES
// ============================================

function generateAdvancedFeatures() {
    const container = document.getElementById('advancedContent');
    
    // Calculate Company Valuation
    const ebitda = financialData.netIncome + (financialData.operatingExpenses * 0.2); // Estimate
    const valuationMultiple = 5; // Industry average
    const companyValue = ebitda * valuationMultiple;
    
    // Calculate WACC (simplified)
    const costOfDebt = 0.08; // 8%
    const costOfEquity = 0.15; // 15%
    const debtWeight = financialData.totalLiabilities / (financialData.totalLiabilities + financialData.equity);
    const equityWeight = 1 - debtWeight;
    const wacc = (costOfDebt * debtWeight) + (costOfEquity * equityWeight);
    
    // Calculate Company Score
    const score = calculateCompanyScore();
    
    container.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <h6 class="text-muted mb-3">تقييم الشركة</h6>
                        <div class="metric-value">${formatCurrency(companyValue)}</div>
                        <small class="text-muted">بناءً على EBITDA × ${valuationMultiple}</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <h6 class="text-muted mb-3">تكلفة رأس المال (WACC)</h6>
                        <div class="metric-value">${(wacc * 100).toFixed(2)}%</div>
                        <small class="text-muted">المعدل المرجح</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <h6 class="text-muted mb-3">تصنيف الشركة</h6>
                        <div class="score-circle score-${score.grade}">
                            ${score.grade}
                        </div>
                        <small class="text-muted mt-2 d-block">${score.description}</small>
                    </div>
                </div>
            </div>
        </div>
        
        <h5 class="mb-3">تقرير للبنوك والمستثمرين</h5>
        <div class="card">
            <div class="card-body">
                <h6>ملخص تنفيذي</h6>
                <p>الشركة تحقق إيرادات سنوية بقيمة ${formatCurrency(financialData.revenue)} 
                وصافي ربح ${formatCurrency(financialData.netIncome)} بهامش ربح ${financialData.profitMargin.toFixed(2)}%.</p>
                
                <h6 class="mt-3">المؤشرات الرئيسية</h6>
                <ul>
                    <li>نسبة التداول: ${financialData.currentRatio.toFixed(2)}</li>
                    <li>نسبة المديونية: ${(financialData.debtRatio * 100).toFixed(1)}%</li>
                    <li>العائد على الأصول: ${financialData.roa.toFixed(2)}%</li>
                    <li>العائد على حقوق الملكية: ${financialData.roe.toFixed(2)}%</li>
                </ul>
                
                <h6 class="mt-3">التوصية</h6>
                <p>${getInvestmentRecommendation(score.grade)}</p>
                
                <button class="btn btn-primary mt-3" onclick="generateBankReport()">
                    <i class="fas fa-file-pdf"></i> تصدير تقرير البنك (PDF)
                </button>
            </div>
        </div>
    `;
}

function calculateCompanyScore() {
    let score = 100;
    
    // Deduct points based on issues
    if (financialData.currentRatio < 1) score -= 30;
    else if (financialData.currentRatio < 1.5) score -= 15;
    
    if (financialData.debtRatio > 0.7) score -= 25;
    else if (financialData.debtRatio > 0.5) score -= 10;
    
    if (financialData.profitMargin < 0) score -= 30;
    else if (financialData.profitMargin < 5) score -= 15;
    
    if (financialData.roa < 5) score -= 10;
    if (financialData.roe < 10) score -= 10;
    
    // Determine grade
    let grade, description;
    if (score >= 85) {
        grade = 'A';
        description = 'ممتاز - شركة قوية ماليا';
    } else if (score >= 70) {
        grade = 'B';
        description = 'جيد - وضع مالي مستقر';
    } else if (score >= 50) {
        grade = 'C';
        description = 'مقبول - يحتاج تحسين';
    } else {
        grade = 'D';
        description = 'ضعيف - يحتاج إجراءات عاجلة';
    }
    
    return { score, grade, description };
}

function getInvestmentRecommendation(grade) {
    switch (grade) {
        case 'A':
            return 'الشركة مؤهلة للحصول على تمويل بشروط تفضيلية. يوصى بالاستثمار.';
        case 'B':
            return 'الشركة مؤهلة للحصول على تمويل بشروط عادية. استثمار آمن نسبياً.';
        case 'C':
            return 'الشركة تحتاج تحسينات قبل الحصول على تمويل كبير. استثمار متوسط المخاطر.';
        case 'D':
            return 'الشركة تواجه تحديات مالية. لا يوصى بالاستثمار حالياً.';
        default:
            return 'يحتاج تقييم إضافي.';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function getColorForType(type) {
    switch (type) {
        case 'critical': return '#dc3545';
        case 'warning': return '#ffc107';
        case 'success': return '#28a745';
        case 'info': return '#17a2b8';
        default: return '#6c757d';
    }
}

function showError(message) {
    document.querySelector('.main-container').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        </div>
        <a href="index.html" class="btn btn-primary">العودة للصفحة الرئيسية</a>
    `;
}

function generateFullReport() {
    const element = document.querySelector('.main-container');
    const opt = {
        margin: 10,
        filename: `Financial-Decisions-Pack-${new Date().getFullYear()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
}

function generateBankReport() {
    alert('سيتم تصدير تقرير البنك قريباً');
}


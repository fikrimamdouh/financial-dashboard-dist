// ============================================
// محرك الذكاء التنفيذي - Polaris
// Executive Intelligence Engine
// ============================================

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadExecutiveIntelligence();
});

function loadExecutiveIntelligence() {
    const activeClientId = localStorage.getItem('activeClientId');
    if (!activeClientId) {
        alert('لم يتم العثور على بيانات. يرجى رفع ميزان المراجعة أولاً.');
        window.location.href = 'data-ingestion.html';
        return;
    }

    const auditFileKey = `polarisAuditFile_${activeClientId}`;
    const storedData = localStorage.getItem(auditFileKey);
    
    if (!storedData) {
        alert('لم يتم العثور على بيانات. يرجى رفع ميزان المراجعة أولاً.');
        window.location.href = 'data-ingestion.html';
        return;
    }

    try {
        const auditFile = JSON.parse(storedData);
        displayExecutiveIntelligence(auditFile);
    } catch (e) {
        console.error('خطأ في قراءة البيانات:', e);
        alert('حدث خطأ في قراءة البيانات');
    }
}

function displayExecutiveIntelligence(auditFile) {
    // عرض معلومات الشركة
    document.getElementById('companyInfo').textContent = 
        `${auditFile.companyName || 'شركة'} - ${auditFile.fiscalPeriod || '2024'}`;

    // حساب المجاميع
    const tbData = auditFile.trialBalance || [];
    const totals = calculateTotals(tbData);

    // عرض جميع الوحدات
    displayPerformanceManagement(totals);
    displayStrategySimulation(totals);
    displayValuation(totals);
    displayComplianceRisk(totals);
    displayPrescriptiveActions(totals);
    displayOperationalDecisions(totals);
}

// ============================================
// الوحدة 1: إدارة الأداء
// ============================================
function displayPerformanceManagement(totals) {
    // حساب KPIs الفعلية
    const actualProfitMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue * 100) : 0;
    const actualCurrentRatio = totals.currentLiabilities > 0 ? 
        (totals.currentAssets / totals.currentLiabilities) : 0;
    const actualROE = totals.equity > 0 ? (totals.netProfit / totals.equity * 100) : 0;

    // الأهداف
    const targetProfitMargin = 15;
    const targetCurrentRatio = 2.0;
    const targetROE = 20;

    // عرض القيم
    document.getElementById('actualProfitMargin').textContent = actualProfitMargin.toFixed(1) + '%';
    document.getElementById('actualCurrentRatio').textContent = actualCurrentRatio.toFixed(2);
    document.getElementById('actualROE').textContent = actualROE.toFixed(1) + '%';

    // عرض التقدم
    const profitMarginProgress = Math.min((actualProfitMargin / targetProfitMargin) * 100, 100);
    const currentRatioProgress = Math.min((actualCurrentRatio / targetCurrentRatio) * 100, 100);
    const roeProgress = Math.min((actualROE / targetROE) * 100, 100);

    document.getElementById('profitMarginProgress').style.width = profitMarginProgress + '%';
    document.getElementById('currentRatioProgress').style.width = currentRatioProgress + '%';
    document.getElementById('roeProgress').style.width = roeProgress + '%';

    // تحليل الانحرافات
    const variances = [
        {
            kpi: 'هامش الربح',
            actual: actualProfitMargin.toFixed(1) + '%',
            target: targetProfitMargin + '%',
            variance: (actualProfitMargin - targetProfitMargin).toFixed(1) + '%',
            status: actualProfitMargin >= targetProfitMargin ? 'success' : 'danger'
        },
        {
            kpi: 'نسبة السيولة',
            actual: actualCurrentRatio.toFixed(2),
            target: targetCurrentRatio.toFixed(1),
            variance: (actualCurrentRatio - targetCurrentRatio).toFixed(2),
            status: actualCurrentRatio >= targetCurrentRatio ? 'success' : 'danger'
        },
        {
            kpi: 'العائد على حقوق الملكية',
            actual: actualROE.toFixed(1) + '%',
            target: targetROE + '%',
            variance: (actualROE - targetROE).toFixed(1) + '%',
            status: actualROE >= targetROE ? 'success' : 'danger'
        }
    ];

    const varianceHTML = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>المؤشر</th>
                    <th>الفعلي</th>
                    <th>الهدف</th>
                    <th>الانحراف</th>
                    <th>الحالة</th>
                </tr>
            </thead>
            <tbody>
                ${variances.map(v => `
                    <tr>
                        <td>${v.kpi}</td>
                        <td>${v.actual}</td>
                        <td>${v.target}</td>
                        <td>${v.variance}</td>
                        <td><span class="badge bg-${v.status}">${v.status === 'success' ? 'ممتاز' : 'يحتاج تحسين'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('varianceAnalysis').innerHTML = varianceHTML;
}

// ============================================
// الوحدة 2: محاكاة استراتيجية
// ============================================
function displayStrategySimulation(totals) {
    const scenarios = [
        {
            title: 'التوسع (Expansion)',
            description: 'فتح فرع جديد أو دخول سوق جديد',
            investment: 500000,
            expectedRevenue: totals.revenue * 1.3,
            expectedCosts: totals.cogs * 1.25 + totals.expenses * 1.2,
            risk: 'high',
            timeline: '12-18 شهر'
        },
        {
            title: 'الانكماش (Shrinkage)',
            description: 'إغلاق فرع أو خط إنتاج غير مربح',
            investment: -200000,
            expectedRevenue: totals.revenue * 0.85,
            expectedCosts: totals.cogs * 0.75 + totals.expenses * 0.7,
            risk: 'medium',
            timeline: '6-9 أشهر'
        },
        {
            title: 'الإغلاق الجزئي (Partial Shutdown)',
            description: 'تقليص العمليات مؤقتاً',
            investment: 0,
            expectedRevenue: totals.revenue * 0.6,
            expectedCosts: totals.cogs * 0.5 + totals.expenses * 0.4,
            risk: 'low',
            timeline: '3-6 أشهر'
        },
        {
            title: 'دخول سوق جديد (New Market)',
            description: 'استهداف قطاع عملاء جديد',
            investment: 300000,
            expectedRevenue: totals.revenue * 1.2,
            expectedCosts: totals.cogs * 1.15 + totals.expenses * 1.1,
            risk: 'medium',
            timeline: '9-12 شهر'
        }
    ];

    const scenariosHTML = scenarios.map(s => {
        const expectedProfit = s.expectedRevenue - s.expectedCosts;
        const currentProfit = totals.netProfit;
        const profitChange = expectedProfit - currentProfit;
        const roi = s.investment !== 0 ? (profitChange / Math.abs(s.investment) * 100) : 0;

        return `
            <div class="strategy-card">
                <div class="row">
                    <div class="col-md-8">
                        <h5>${s.title}</h5>
                        <p class="text-muted">${s.description}</p>
                        <p><strong>الاستثمار المطلوب:</strong> ${formatCurrency(s.investment)}</p>
                        <p><strong>الإيرادات المتوقعة:</strong> ${formatCurrency(s.expectedRevenue)}</p>
                        <p><strong>التكاليف المتوقعة:</strong> ${formatCurrency(s.expectedCosts)}</p>
                        <p><strong>الربح المتوقع:</strong> ${formatCurrency(expectedProfit)}</p>
                        <p><strong>التغير في الربح:</strong> ${formatCurrency(profitChange)} (${profitChange >= 0 ? '+' : ''}${((profitChange / currentProfit) * 100).toFixed(1)}%)</p>
                        ${s.investment !== 0 ? `<p><strong>العائد على الاستثمار:</strong> ${roi.toFixed(1)}%</p>` : ''}
                        <p><strong>الإطار الزمني:</strong> ${s.timeline}</p>
                    </div>
                    <div class="col-md-4 text-center">
                        <div class="mt-3">
                            <span class="risk-badge risk-${s.risk}">
                                المخاطر: ${s.risk === 'high' ? 'مرتفعة' : s.risk === 'medium' ? 'متوسطة' : 'منخفضة'}
                            </span>
                        </div>
                        <div class="mt-3">
                            ${profitChange > 0 ? 
                                '<i class="fas fa-arrow-up fa-3x text-success"></i>' : 
                                '<i class="fas fa-arrow-down fa-3x text-danger"></i>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('strategyScenarios').innerHTML = scenariosHTML;
}

// ============================================
// الوحدة 3: تقييم المنشأة
// ============================================
function displayValuation(totals) {
    // 1. طريقة DCF (مبسطة)
    const freeCashFlow = totals.netProfit * 0.8; // تقريبي
    const growthRate = 0.05; // 5% نمو سنوي
    const discountRate = 0.12; // 12% معدل الخصم
    const dcfValuation = freeCashFlow / (discountRate - growthRate);

    // 2. طريقة المضاعفات
    const ebitda = totals.revenue - totals.cogs - totals.expenses;
    const industryMultiple = 8; // معامل الصناعة (يختلف حسب القطاع)
    const multiplesValuation = ebitda * industryMultiple;

    // 3. صافي قيمة الأصول
    const navValuation = totals.assets - totals.liabilities;

    // عرض القيم
    document.getElementById('dcfValuation').textContent = formatCurrency(dcfValuation);
    document.getElementById('multiplesValuation').textContent = formatCurrency(multiplesValuation);
    document.getElementById('navValuation').textContent = formatCurrency(navValuation);

    // التقييم الموصى به (المتوسط المرجح)
    const recommendedValuation = (dcfValuation * 0.4 + multiplesValuation * 0.4 + navValuation * 0.2);
    document.getElementById('recommendedValuation').innerHTML = `
        <h4>القيمة المقدرة للمنشأة: ${formatCurrency(recommendedValuation)}</h4>
        <p>تم حساب القيمة بناءً على متوسط مرجح لثلاث طرق تقييم معترف بها دولياً.</p>
        <p><strong>ملاحظة:</strong> هذا التقييم تقريبي ويحتاج لمراجعة من مقيم معتمد للحصول على قيمة دقيقة.</p>
    `;
}

// ============================================
// الوحدة 4: الامتثال والمخاطر
// ============================================
function displayComplianceRisk(totals) {
    const risks = [
        {
            category: 'مخاطر السيولة',
            level: totals.currentAssets / totals.currentLiabilities < 1 ? 'high' : 
                   totals.currentAssets / totals.currentLiabilities < 1.5 ? 'medium' : 'low',
            description: 'قدرة الشركة على الوفاء بالالتزامات قصيرة الأجل',
            mitigation: 'تحسين التحصيل، تأجيل بعض المدفوعات، الحصول على تمويل قصير الأجل'
        },
        {
            category: 'مخاطر المديونية',
            level: totals.liabilities / totals.assets > 0.7 ? 'high' : 
                   totals.liabilities / totals.assets > 0.5 ? 'medium' : 'low',
            description: 'نسبة الديون إلى إجمالي الأصول',
            mitigation: 'سداد الديون، زيادة رأس المال، إعادة هيكلة الديون'
        },
        {
            category: 'مخاطر الربحية',
            level: (totals.netProfit / totals.revenue) < 0.05 ? 'high' : 
                   (totals.netProfit / totals.revenue) < 0.1 ? 'medium' : 'low',
            description: 'قدرة الشركة على تحقيق أرباح مستدامة',
            mitigation: 'زيادة الأسعار، خفض التكاليف، تحسين الكفاءة التشغيلية'
        },
        {
            category: 'مخاطر التشغيل',
            level: 'medium',
            description: 'المخاطر المتعلقة بالعمليات اليومية',
            mitigation: 'تحسين الضوابط الداخلية، تدريب الموظفين، أتمتة العمليات'
        }
    ];

    const riskHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>فئة المخاطر</th>
                    <th>المستوى</th>
                    <th>الوصف</th>
                    <th>خطة التخفيف</th>
                </tr>
            </thead>
            <tbody>
                ${risks.map(r => `
                    <tr>
                        <td><strong>${r.category}</strong></td>
                        <td><span class="risk-badge risk-${r.level}">
                            ${r.level === 'high' ? 'مرتفع' : r.level === 'medium' ? 'متوسط' : 'منخفض'}
                        </span></td>
                        <td>${r.description}</td>
                        <td>${r.mitigation}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('riskAssessment').innerHTML = riskHTML;
}

// ============================================
// الوحدة 5: ذكاء تنفيذي
// ============================================
function displayPrescriptiveActions(totals) {
    const profitMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue * 100) : 0;
    const currentRatio = totals.currentLiabilities > 0 ? (totals.currentAssets / totals.currentLiabilities) : 0;

    const actions = [];

    // إجراءات بناءً على هامش الربح
    if (profitMargin < 10) {
        actions.push({
            priority: 'عالية',
            action: 'خفض المصروفات التشغيلية بنسبة 12%',
            timeline: '4 أسابيع',
            weeks: [
                'الأسبوع 1: تحليل المصروفات وتحديد البنود القابلة للتخفيض',
                'الأسبوع 2: التفاوض مع الموردين للحصول على خصومات',
                'الأسبوع 3: تنفيذ إجراءات التوفير (تقليل الهدر، ترشيد الاستهلاك)',
                'الأسبوع 4: مراقبة النتائج وتعديل الخطة'
            ]
        });
    }

    // إجراءات بناءً على السيولة
    if (currentRatio < 1.5) {
        actions.push({
            priority: 'عالية',
            action: 'تحسين التحصيل وزيادة السيولة',
            timeline: '6 أسابيع',
            weeks: [
                'الأسبوع 1-2: مراجعة جميع الذمم المدينة وتصنيفها حسب العمر',
                'الأسبوع 3-4: الاتصال بالعملاء وتحصيل المتأخرات',
                'الأسبوع 5: تقديم خصومات نقدية للدفع الفوري',
                'الأسبوع 6: تقييم النتائج وتحديث سياسة الائتمان'
            ]
        });
    }

    // إجراءات عامة
    actions.push({
        priority: 'متوسطة',
        action: 'تحسين الكفاءة التشغيلية',
        timeline: '8 أسابيع',
        weeks: [
            'الأسبوع 1-2: تحليل العمليات الحالية وتحديد نقاط الضعف',
            'الأسبوع 3-4: تطوير خطة تحسين مع جدول زمني',
            'الأسبوع 5-6: تنفيذ التحسينات التجريبية',
            'الأسبوع 7-8: تقييم النتائج وتعميم الممارسات الناجحة'
        ]
    });

    const actionsHTML = actions.map(a => `
        <div class="action-plan-item">
            <div class="row">
                <div class="col-md-9">
                    <h5><span class="badge bg-${a.priority === 'عالية' ? 'danger' : 'warning'}">${a.priority}</span> ${a.action}</h5>
                    <p><strong>الإطار الزمني:</strong> ${a.timeline}</p>
                    <h6>الخطة الأسبوعية:</h6>
                    <ul>
                        ${a.weeks.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
                <div class="col-md-3 text-center">
                    <button class="btn btn-primary mt-3" onclick="printActionPlan('${a.action}')">
                        <i class="fas fa-print"></i> طباعة
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('actionPlan').innerHTML = actionsHTML;
}

// ============================================
// الوحدة 6: القرارات التشغيلية
// ============================================
function displayOperationalDecisions(totals) {
    // 1. محرك الحدود الائتمانية
    const creditLimitsHTML = `
        <table class="table credit-limit-table">
            <thead>
                <tr>
                    <th>فئة العميل</th>
                    <th>الحد الائتماني المقترح</th>
                    <th>فترة السداد</th>
                    <th>الضمانات</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>عملاء من الدرجة A (ممتاز)</td>
                    <td>${formatCurrency(totals.revenue * 0.05)}</td>
                    <td>60 يوم</td>
                    <td>غير مطلوبة</td>
                </tr>
                <tr>
                    <td>عملاء من الدرجة B (جيد)</td>
                    <td>${formatCurrency(totals.revenue * 0.03)}</td>
                    <td>45 يوم</td>
                    <td>شيك مؤجل</td>
                </tr>
                <tr>
                    <td>عملاء من الدرجة C (مقبول)</td>
                    <td>${formatCurrency(totals.revenue * 0.02)}</td>
                    <td>30 يوم</td>
                    <td>كفالة بنكية</td>
                </tr>
                <tr>
                    <td>عملاء جدد</td>
                    <td>${formatCurrency(totals.revenue * 0.01)}</td>
                    <td>نقداً أو 15 يوم</td>
                    <td>دفعة مقدمة 50%</td>
                </tr>
            </tbody>
        </table>
    `;
    document.getElementById('creditLimits').innerHTML = creditLimitsHTML;

    // 2. سياسات التسعير
    const currentMargin = totals.revenue > 0 ? ((totals.revenue - totals.cogs) / totals.revenue * 100) : 0;
    const targetMargin = 35; // هامش مستهدف 35%

    const pricingHTML = `
        <div class="alert alert-info">
            <h6>التحليل الحالي:</h6>
            <p>هامش الربح الإجمالي الحالي: <strong>${currentMargin.toFixed(1)}%</strong></p>
            <p>الهامش المستهدف: <strong>${targetMargin}%</strong></p>
        </div>
        <div class="alert alert-success">
            <h6>التوصيات:</h6>
            <ul>
                <li>زيادة الأسعار تدريجياً بنسبة ${(targetMargin - currentMargin).toFixed(1)}% على مدى 3 أشهر</li>
                <li>تقديم خصومات حجم للطلبات الكبيرة (5% للطلبات فوق ${formatCurrency(totals.revenue * 0.1)})</li>
                <li>تطبيق تسعير ديناميكي حسب الطلب والموسم</li>
                <li>مراجعة الأسعار شهرياً بناءً على تكاليف المدخلات</li>
            </ul>
        </div>
    `;
    document.getElementById('pricingPolicies').innerHTML = pricingHTML;

    // 3. أولوية السداد
    const paymentHTML = `
        <div class="alert alert-warning">
            <h6>ترتيب الأولويات المقترح (بناءً على التدفقات المتوقعة):</h6>
            <ol>
                <li><strong>الأولوية القصوى:</strong> الرواتب والأجور (${formatCurrency(totals.expenses * 0.4)})</li>
                <li><strong>أولوية عالية:</strong> الموردين الأساسيين (${formatCurrency(totals.cogs * 0.6)})</li>
                <li><strong>أولوية متوسطة:</strong> المصروفات التشغيلية (${formatCurrency(totals.expenses * 0.3)})</li>
                <li><strong>أولوية منخفضة:</strong> الاستثمارات الرأسمالية (تأجيل حسب السيولة)</li>
                <li><strong>آخر أولوية:</strong> التوزيعات والمكافآت (تعليق حتى تحسن الوضع)</li>
            </ol>
        </div>
    `;
    document.getElementById('paymentPriority').innerHTML = paymentHTML;
}

// ============================================
// دوال مساعدة
// ============================================
function calculateTotals(tbData) {
    let assets = 0, liabilities = 0, equity = 0;
    let revenue = 0, cogs = 0, expenses = 0;
    let currentAssets = 0, currentLiabilities = 0;

    tbData.forEach(row => {
        const balance = parseFloat(row.Balance) || 0;
        const category = row.Category || '';

        if (category.includes('أصول متداولة')) currentAssets += Math.abs(balance);
        if (category.includes('أصول')) assets += Math.abs(balance);
        if (category.includes('التزامات متداولة')) currentLiabilities += Math.abs(balance);
        if (category.includes('التزامات')) liabilities += Math.abs(balance);
        if (category.includes('حقوق الملكية')) equity += Math.abs(balance);
        if (category.includes('إيرادات')) revenue += Math.abs(balance);
        if (category.includes('تكلفة')) cogs += Math.abs(balance);
        if (category.includes('مصروفات')) expenses += Math.abs(balance);
    });

    const netProfit = revenue - cogs - expenses;

    return {
        assets, liabilities, equity,
        revenue, cogs, expenses, netProfit,
        currentAssets, currentLiabilities
    };
}

function formatCurrency(value) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0
    }).format(value);
}

// ============================================
// دوال التصدير
// ============================================
function exportExecutivePack() {
    const element = document.querySelector('.main-container');
    const opt = {
        margin: 10,
        filename: 'Executive-Intelligence-Pack.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function generateBankPack() {
    alert('جاري إنشاء حزمة البنك...');
    exportExecutivePack();
}

function generateInvestorDeck() {
    alert('جاري إنشاء حزمة المستثمر...');
    exportExecutivePack();
}

function generateTaxDefence() {
    alert('جاري إنشاء ملف الدفاع الضريبي...');
    exportExecutivePack();
}

function printActionPlan(actionName) {
    window.print();
}


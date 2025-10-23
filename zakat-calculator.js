/**
 * محرك حساب الزكاة الصحيح
 * وفقاً لمعايير الهيئة العامة للزكاة والدخل السعودية
 */

function calculateZakatCorrectly(trialBalanceData) {
    // استخراج الأصول الزكوية من ميزان المراجعة
    const zakatableAssets = extractZakatableAssets(trialBalanceData);
    
    // استخراج الخصوم المسموح خصمها
    const deductibleLiabilities = extractDeductibleLiabilities(trialBalanceData);
    
    // حساب الوعاء الزكوي
    const zakatBase = zakatableAssets.total - deductibleLiabilities.total;
    
    // حساب الزكاة الفعلية (2.5%)
    const actualZakat = Math.max(0, zakatBase * 0.025);
    
    // حساب الزكاة التقديرية (حسب الدخل)
    const estimatedZakat = calculateEstimatedZakat(trialBalanceData);
    
    // الفرق بين الفعلي والتقديري
    const difference = actualZakat - estimatedZakat.amount;
    
    return {
        actual: {
            zakatableAssets,
            deductibleLiabilities,
            zakatBase,
            zakatAmount: actualZakat,
            zakatRate: 0.025,
            method: 'طريقة الوعاء الزكوي (الفعلية)'
        },
        estimated: {
            revenue: estimatedZakat.revenue,
            netIncome: estimatedZakat.netIncome,
            zakatBase: estimatedZakat.base,
            zakatAmount: estimatedZakat.amount,
            zakatRate: 0.025,
            method: 'طريقة الدخل (التقديرية)'
        },
        difference: {
            amount: difference,
            percentage: estimatedZakat.amount > 0 ? (difference / estimatedZakat.amount * 100) : 0
        }
    };
}

function calculateEstimatedZakat(trialBalanceData) {
    let revenue = 0;
    let expenses = 0;
    
    trialBalanceData.forEach(row => {
        const accountName = (row['Account Name'] || row['اسم الحساب'] || '').toLowerCase();
        const balance = Math.abs(parseFloat(row.Balance || row['الرصيد'] || 0));
        const category = (row.Category || row['التصنيف'] || '').toLowerCase();
        
        // الإيرادات
        if (category.includes('إيراد') || category.includes('revenue') || 
            category.includes('income') || category.includes('sales')) {
            revenue += balance;
        }
        // المصروفات
        else if (category.includes('مصروف') || category.includes('expense') ||
                 category.includes('cost') || category.includes('تكلفة')) {
            expenses += balance;
        }
    });
    
    const netIncome = revenue - expenses;
    
    // الوعاء التقديري = صافي الدخل (مبسط)
    const estimatedBase = Math.max(0, netIncome);
    const estimatedAmount = estimatedBase * 0.025;
    
    return {
        revenue,
        expenses,
        netIncome,
        base: estimatedBase,
        amount: estimatedAmount
    };
}

function extractZakatableAssets(tbData) {
    let cash = 0;
    let bankAccounts = 0;
    let receivables = 0;
    let inventory = 0;
    let shortTermInvestments = 0;
    let prepaidExpenses = 0;
    
    tbData.forEach(row => {
        const accountName = (row['Account Name'] || row['اسم الحساب'] || '').toLowerCase();
        const balance = Math.abs(parseFloat(row.Balance || row['الرصيد'] || 0));
        const category = (row.Category || row['التصنيف'] || '').toLowerCase();
        
        // النقدية
        if (accountName.includes('نقد') || accountName.includes('cash') || 
            accountName.includes('صندوق') || accountName.includes('petty cash')) {
            cash += balance;
        }
        // البنوك
        else if (accountName.includes('بنك') || accountName.includes('bank') ||
                 accountName.includes('حساب جاري') || accountName.includes('current account')) {
            bankAccounts += balance;
        }
        // الذمم المدينة (العملاء)
        else if (accountName.includes('عملاء') || accountName.includes('مدين') ||
                 accountName.includes('receivable') || accountName.includes('customer') ||
                 accountName.includes('debtor')) {
            receivables += balance;
        }
        // المخزون
        else if (accountName.includes('مخزون') || accountName.includes('بضاعة') ||
                 accountName.includes('inventory') || accountName.includes('stock') ||
                 accountName.includes('goods')) {
            inventory += balance;
        }
        // الاستثمارات قصيرة الأجل
        else if (accountName.includes('استثمار') && (accountName.includes('قصير') || accountName.includes('short')) ||
                 accountName.includes('short-term investment') || accountName.includes('marketable securities')) {
            shortTermInvestments += balance;
        }
        // المصروفات المدفوعة مقدماً (قابلة للخصم)
        else if (accountName.includes('مصروف مدفوع مقدم') || accountName.includes('مقدم') ||
                 accountName.includes('prepaid') || accountName.includes('advance')) {
            prepaidExpenses += balance;
        }
    });
    
    const total = cash + bankAccounts + receivables + inventory + shortTermInvestments;
    
    return {
        cash,
        bankAccounts,
        receivables,
        inventory,
        shortTermInvestments,
        prepaidExpenses,
        total,
        details: {
            'النقدية في الصندوق': cash,
            'الأرصدة البنكية': bankAccounts,
            'الذمم المدينة (العملاء)': receivables,
            'المخزون': inventory,
            'الاستثمارات قصيرة الأجل': shortTermInvestments
        }
    };
}

function extractDeductibleLiabilities(tbData) {
    let accountsPayable = 0;
    let accruedExpenses = 0;
    let shortTermLoans = 0;
    let provisions = 0;
    let otherCurrentLiabilities = 0;
    
    tbData.forEach(row => {
        const accountName = (row['Account Name'] || row['اسم الحساب'] || '').toLowerCase();
        const balance = Math.abs(parseFloat(row.Balance || row['الرصيد'] || 0));
        const category = (row.Category || row['التصنيف'] || '').toLowerCase();
        
        // الموردون (الدائنون)
        if (accountName.includes('مورد') || accountName.includes('دائن') ||
            accountName.includes('payable') || accountName.includes('creditor') ||
            accountName.includes('supplier')) {
            accountsPayable += balance;
        }
        // المصروفات المستحقة
        else if (accountName.includes('مصروف مستحق') || accountName.includes('مستحق') ||
                 accountName.includes('accrued') || accountName.includes('expense payable')) {
            accruedExpenses += balance;
        }
        // القروض قصيرة الأجل
        else if (accountName.includes('قرض') && (accountName.includes('قصير') || accountName.includes('جاري')) ||
                 accountName.includes('short-term loan') || accountName.includes('current portion')) {
            shortTermLoans += balance;
        }
        // المخصصات
        else if (accountName.includes('مخصص') || accountName.includes('provision') ||
                 accountName.includes('allowance')) {
            provisions += balance;
        }
        // التزامات متداولة أخرى
        else if (category.includes('التزام') && category.includes('متداول') ||
                 category.includes('current liab')) {
            otherCurrentLiabilities += balance;
        }
    });
    
    const total = accountsPayable + accruedExpenses + shortTermLoans + provisions + otherCurrentLiabilities;
    
    return {
        accountsPayable,
        accruedExpenses,
        shortTermLoans,
        provisions,
        otherCurrentLiabilities,
        total,
        details: {
            'الموردون (الدائنون)': accountsPayable,
            'المصروفات المستحقة': accruedExpenses,
            'القروض قصيرة الأجل': shortTermLoans,
            'المخصصات': provisions,
            'التزامات متداولة أخرى': otherCurrentLiabilities
        }
    };
}

function generateDetailedZakatReport(zakatData, companyName, year) {
    const { actual, estimated, difference } = zakatData;
    const { zakatableAssets, deductibleLiabilities, zakatBase, zakatAmount } = actual;
    
    return `
        <div class="company-header text-center mb-4">
            <h3>${companyName}</h3>
            <p class="text-secondary">الإقرار الزكوي المفصّل</p>
            <p class="text-secondary">للسنة المنتهية في 31 ديسمبر ${year}</p>
        </div>

        <div class="alert alert-info mb-4">
            <i class="fas fa-info-circle me-2"></i>
            <strong>ملاحظة:</strong> تم حساب الزكاة وفقاً لطريقة الوعاء الزكوي المعتمدة من الهيئة العامة للزكاة والدخل
        </div>

        <h5 class="mb-3">أولاً: الأصول الزكوية</h5>
        <table class="table report-table">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">المبلغ (ريال سعودي)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>النقدية في الصندوق</td>
                    <td class="text-end">${formatCurrency(zakatableAssets.cash)}</td>
                </tr>
                <tr>
                    <td>الأرصدة البنكية</td>
                    <td class="text-end">${formatCurrency(zakatableAssets.bankAccounts)}</td>
                </tr>
                <tr>
                    <td>الذمم المدينة (العملاء)</td>
                    <td class="text-end">${formatCurrency(zakatableAssets.receivables)}</td>
                </tr>
                <tr>
                    <td>المخزون</td>
                    <td class="text-end">${formatCurrency(zakatableAssets.inventory)}</td>
                </tr>
                <tr>
                    <td>الاستثمارات قصيرة الأجل</td>
                    <td class="text-end">${formatCurrency(zakatableAssets.shortTermInvestments)}</td>
                </tr>
                <tr class="table-primary">
                    <td><strong>إجمالي الأصول الزكوية</strong></td>
                    <td class="text-end"><strong>${formatCurrency(zakatableAssets.total)}</strong></td>
                </tr>
            </tbody>
        </table>

        <h5 class="mb-3 mt-4">ثانياً: الخصوم المسموح خصمها</h5>
        <table class="table report-table">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">المبلغ (ريال سعودي)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>الموردون (الدائنون)</td>
                    <td class="text-end">${formatCurrency(deductibleLiabilities.accountsPayable)}</td>
                </tr>
                <tr>
                    <td>المصروفات المستحقة</td>
                    <td class="text-end">${formatCurrency(deductibleLiabilities.accruedExpenses)}</td>
                </tr>
                <tr>
                    <td>القروض قصيرة الأجل</td>
                    <td class="text-end">${formatCurrency(deductibleLiabilities.shortTermLoans)}</td>
                </tr>
                <tr>
                    <td>المخصصات</td>
                    <td class="text-end">${formatCurrency(deductibleLiabilities.provisions)}</td>
                </tr>
                <tr>
                    <td>التزامات متداولة أخرى</td>
                    <td class="text-end">${formatCurrency(deductibleLiabilities.otherCurrentLiabilities)}</td>
                </tr>
                <tr class="table-primary">
                    <td><strong>إجمالي الخصوم المسموح خصمها</strong></td>
                    <td class="text-end"><strong>${formatCurrency(deductibleLiabilities.total)}</strong></td>
                </tr>
            </tbody>
        </table>

        <h5 class="mb-3 mt-4">ثالثاً: حساب الوعاء الزكوي والزكاة المستحقة</h5>
        <table class="table report-table">
            <tbody>
                <tr>
                    <td>إجمالي الأصول الزكوية</td>
                    <td class="text-end">${formatCurrency(zakatableAssets.total)}</td>
                </tr>
                <tr>
                    <td>(-) إجمالي الخصوم المسموح خصمها</td>
                    <td class="text-end">(${formatCurrency(deductibleLiabilities.total)})</td>
                </tr>
                <tr class="table-warning">
                    <td><strong>الوعاء الزكوي</strong></td>
                    <td class="text-end"><strong>${formatCurrency(zakatBase)}</strong></td>
                </tr>
                <tr>
                    <td>نسبة الزكاة</td>
                    <td class="text-end">2.5%</td>
                </tr>
                <tr class="table-success">
                    <td><strong>الزكاة المستحقة</strong></td>
                    <td class="text-end"><strong>${formatCurrency(zakatAmount)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="alert alert-success mt-4">
            <i class="fas fa-check-circle me-2"></i>
            <strong>الزكاة الفعلية المستحقة السنوية:</strong> ${formatCurrency(zakatAmount)}
            <br>
            <small class="text-muted">يُنصح بدفع الزكاة على أقساط ربع سنوية بمبلغ ${formatCurrency(zakatAmount / 4)} لكل ربع سنة</small>
        </div>

        <h5 class="mb-3 mt-5"><i class="fas fa-calculator"></i> السيناريو التقديري (حسب الدخل)</h5>
        <div class="alert alert-warning">
            <i class="fas fa-info-circle me-2"></i>
            <strong>ملاحظة:</strong> هذا السيناريو مبسط ويعتمد على صافي الدخل فقط. الطريقة الصحيحة هي السيناريو الفعلي أعلاه.
        </div>

        <table class="table report-table">
            <tbody>
                <tr>
                    <td>إجمالي الإيرادات</td>
                    <td class="text-end">${formatCurrency(estimated.revenue)}</td>
                </tr>
                <tr>
                    <td>(-) إجمالي المصروفات</td>
                    <td class="text-end">(${formatCurrency(estimated.revenue - estimated.netIncome)})</td>
                </tr>
                <tr class="table-warning">
                    <td><strong>صافي الدخل</strong></td>
                    <td class="text-end"><strong>${formatCurrency(estimated.netIncome)}</strong></td>
                </tr>
                <tr>
                    <td>نسبة الزكاة</td>
                    <td class="text-end">2.5%</td>
                </tr>
                <tr class="table-info">
                    <td><strong>الزكاة التقديرية</strong></td>
                    <td class="text-end"><strong>${formatCurrency(estimated.zakatAmount)}</strong></td>
                </tr>
            </tbody>
        </table>

        <h5 class="mb-3 mt-5"><i class="fas fa-balance-scale"></i> المقارنة بين السيناريوهين</h5>
        <table class="table report-table">
            <tbody>
                <tr>
                    <td>الزكاة الفعلية (طريقة الوعاء الزكوي)</td>
                    <td class="text-end"><strong>${formatCurrency(actual.zakatAmount)}</strong></td>
                </tr>
                <tr>
                    <td>الزكاة التقديرية (طريقة الدخل)</td>
                    <td class="text-end"><strong>${formatCurrency(estimated.zakatAmount)}</strong></td>
                </tr>
                <tr class="${difference.amount >= 0 ? 'table-danger' : 'table-success'}">
                    <td><strong>الفرق</strong></td>
                    <td class="text-end"><strong>${formatCurrency(Math.abs(difference.amount))}</strong></td>
                </tr>
                <tr>
                    <td colspan="2" class="text-muted">
                        <small>
                            ${difference.amount >= 0 ? 
                                `الزكاة الفعلية أعلى بمبلغ ${formatCurrency(difference.amount)} (${Math.abs(difference.percentage).toFixed(1)}%)` :
                                `الزكاة التقديرية أعلى بمبلغ ${formatCurrency(Math.abs(difference.amount))} (${Math.abs(difference.percentage).toFixed(1)}%)`
                            }
                        </small>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="alert alert-primary mt-4">
            <i class="fas fa-lightbulb me-2"></i>
            <strong>التوصية:</strong> يُنصح باستخدام <strong>الزكاة الفعلية</strong> (${formatCurrency(actual.zakatAmount)}) 
            لأنها الطريقة الأدق والمعتمدة من الهيئة العامة للزكاة والدخل.
        </div>

        <div class="mt-4">
            <p class="text-muted"><strong>ملاحظات هامة:</strong></p>
            <ul class="text-muted">
                <li>تم حساب الزكاة بناءً على البيانات الفعلية من ميزان المراجعة</li>
                <li>يجب مراجعة الأصول الزكوية والخصوم المسموح خصمها مع المحاسب القانوني</li>
                <li>قد تختلف طريقة الحساب حسب نوع النشاط (تجاري/صناعي/خدمي)</li>
                <li>يُنصح بالتواصل مع الهيئة العامة للزكاة والدخل للتأكد من صحة الحساب</li>
            </ul>
        </div>
    `;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}


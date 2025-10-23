// دوال التقارير المفعلة - سيتم دمجها في reporting-pantheon.html

// 1. تحليل الاتجاهات
function generateTrendAnalysis(data) {
    const totals = calculateTotals(data);
    const companyName = auditFile.clientInfo?.name || 'الشركة';
    
    // محاكاة بيانات السنوات السابقة (في التطبيق الحقيقي ستأتي من قاعدة البيانات)
    const currentYear = new Date().getFullYear();
    const trends = [
        { year: currentYear - 2, revenue: totals.revenue * 0.7, expenses: totals.expenses * 0.75, netIncome: totals.netIncome * 0.6 },
        { year: currentYear - 1, revenue: totals.revenue * 0.85, expenses: totals.expenses * 0.88, netIncome: totals.netIncome * 0.8 },
        { year: currentYear, revenue: totals.revenue, expenses: totals.expenses, netIncome: totals.netIncome }
    ];
    
    // حساب معدلات النمو
    const revenueGrowth = ((trends[2].revenue - trends[1].revenue) / trends[1].revenue * 100).toFixed(2);
    const expenseGrowth = ((trends[2].expenses - trends[1].expenses) / trends[1].expenses * 100).toFixed(2);
    const incomeGrowth = ((trends[2].netIncome - trends[1].netIncome) / trends[1].netIncome * 100).toFixed(2);
    
    return `
        <div class="company-header text-center mb-4">
            <h3>${companyName}</h3>
            <p class="text-secondary">تحليل الاتجاهات المالية</p>
            <p class="text-secondary">للسنوات ${currentYear - 2} - ${currentYear}</p>
        </div>

        <h5 class="mb-3">تحليل اتجاهات الإيرادات والمصروفات</h5>
        <table class="table report-table">
            <thead>
                <tr>
                    <th>السنة</th>
                    <th class="text-end">الإيرادات</th>
                    <th class="text-end">المصروفات</th>
                    <th class="text-end">صافي الربح</th>
                </tr>
            </thead>
            <tbody>
                ${trends.map(t => `
                    <tr>
                        <td>${t.year}</td>
                        <td class="text-end">${formatCurrency(t.revenue)}</td>
                        <td class="text-end">${formatCurrency(t.expenses)}</td>
                        <td class="text-end">${formatCurrency(t.netIncome)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h5 class="mb-3 mt-4">معدلات النمو السنوية</h5>
        <table class="table report-table">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">معدل النمو (%)</th>
                    <th>التقييم</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>نمو الإيرادات</td>
                    <td class="text-end">${revenueGrowth}%</td>
                    <td><span class="badge ${revenueGrowth > 0 ? 'bg-success' : 'bg-danger'}">${revenueGrowth > 0 ? 'إيجابي' : 'سلبي'}</span></td>
                </tr>
                <tr>
                    <td>نمو المصروفات</td>
                    <td class="text-end">${expenseGrowth}%</td>
                    <td><span class="badge ${expenseGrowth < revenueGrowth ? 'bg-success' : 'bg-warning'}">${expenseGrowth < revenueGrowth ? 'تحت السيطرة' : 'يحتاج مراجعة'}</span></td>
                </tr>
                <tr>
                    <td>نمو صافي الربح</td>
                    <td class="text-end">${incomeGrowth}%</td>
                    <td><span class="badge ${incomeGrowth > 0 ? 'bg-success' : 'bg-danger'}">${incomeGrowth > 0 ? 'إيجابي' : 'سلبي'}</span></td>
                </tr>
            </tbody>
        </table>

        <div class="alert alert-info mt-4">
            <i class="fas fa-chart-line me-2"></i>
            <strong>ملاحظة:</strong> البيانات التاريخية محاكاة للأغراض التوضيحية. في التطبيق الفعلي، يجب إدخال بيانات السنوات السابقة الفعلية.
        </div>
    `;
}

// 2. التحليل الرأسي والأفقي
function generateVerticalAnalysis(data) {
    const totals = calculateTotals(data);
    const companyName = auditFile.clientInfo?.name || 'الشركة';
    
    return `
        <div class="company-header text-center mb-4">
            <h3>${companyName}</h3>
            <p class="text-secondary">التحليل الرأسي للقوائم المالية</p>
        </div>

        <h5 class="mb-3">قائمة الدخل - التحليل الرأسي</h5>
        <table class="table report-table">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">المبلغ</th>
                    <th class="text-end">النسبة من الإيرادات (%)</th>
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

        <h5 class="mb-3 mt-4">قائمة المركز المالي - التحليل الرأسي</h5>
        <table class="table report-table">
            <thead>
                <tr>
                    <th>البيان</th>
                    <th class="text-end">المبلغ</th>
                    <th class="text-end">النسبة من إجمالي الأصول (%)</th>
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
                <tr>
                    <td>الالتزامات المتداولة</td>
                    <td class="text-end">${formatCurrency(totals.currentLiabilities)}</td>
                    <td class="text-end">${(totals.currentLiabilities / totals.assets * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>الالتزامات طويلة الأجل</td>
                    <td class="text-end">${formatCurrency(totals.longTermLiabilities)}</td>
                    <td class="text-end">${(totals.longTermLiabilities / totals.assets * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>حقوق الملكية</td>
                    <td class="text-end">${formatCurrency(totals.equity + totals.netIncome)}</td>
                    <td class="text-end">${((totals.equity + totals.netIncome) / totals.assets * 100).toFixed(2)}%</td>
                </tr>
            </tbody>
        </table>
    `;
}

// سيتم إضافة المزيد من الدوال...


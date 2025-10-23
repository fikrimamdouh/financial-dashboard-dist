// ============================================
// نظام التنقل الموحد - Polaris
// ============================================

// إضافة شريط التنقل لجميع الصفحات
document.addEventListener('DOMContentLoaded', function() {
    addNavigationBar();
});

function addNavigationBar() {
    const navHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
            <div class="container-fluid">
                <a class="navbar-brand" href="index.html">
                    <i class="fas fa-chart-line"></i> Polaris
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="dashboard.html">
                                <i class="fas fa-tachometer-alt"></i> لوحة التحكم
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="company-setup.html">
                                <i class="fas fa-building"></i> إعداد الشركة
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="data-ingestion.html">
                                <i class="fas fa-upload"></i> رفع البيانات
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="account-mapping.html">
                                <i class="fas fa-map"></i> مراجعة الميزان
                            </a>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" id="reportsDropdown" role="button" data-bs-toggle="dropdown">
                                <i class="fas fa-file-alt"></i> التقارير
                            </a>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="consolidation-cockpit.html">القوائم المالية</a></li>
                                <li><a class="dropdown-item" href="reporting-pantheon.html">التقارير التحليلية</a></li>
                                <li><a class="dropdown-item" href="financial-analysis.html">التحليل المالي</a></li>
                            </ul>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" id="intelligenceDropdown" role="button" data-bs-toggle="dropdown">
                                <i class="fas fa-brain"></i> الذكاء
                            </a>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="decision-intelligence.html">ذكاء القرارات</a></li>
                                <li><a class="dropdown-item" href="executive-intelligence.html">الذكاء التنفيذي</a></li>
                            </ul>
                        </li>
                    </ul>
                    <span class="navbar-text" id="navbarCompanyInfo"></span>
                </div>
            </div>
        </nav>
    `;
    
    // إضافة شريط التنقل في بداية body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
    
    // عرض معلومات الشركة
    displayNavbarCompanyInfo();
}

function displayNavbarCompanyInfo() {
    const activeClientId = localStorage.getItem('activeClientId');
    if (activeClientId) {
        const auditFileKey = `polarisAuditFile_${activeClientId}`;
        const storedData = localStorage.getItem(auditFileKey);
        if (storedData) {
            try {
                const auditFile = JSON.parse(storedData);
                document.getElementById('navbarCompanyInfo').innerHTML = `
                    <i class="fas fa-building me-2"></i>
                    <strong>${auditFile.companyName || 'شركة'}</strong>
                `;
            } catch (e) {}
        }
    }
}

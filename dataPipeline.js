;(() => {
    'use strict';

    if (typeof CryptoJS === 'undefined') {
        console.error('CryptoJS مطلوب!');
        return;
    }

    const STORAGE_KEY = 'Polaris2025!@#SecurePipeline';

    const STEPS = ['client-info', 'trial-balance', 'reports'];

    const STEP_ALIASES = {
        home: 'home',
        'company-setup': 'client-info',
        'data-ingestion': 'trial-balance',
        'account-mapping': 'trial-balance',
        'consolidation-cockpit': 'reports',
        'reporting-pantheon': 'reports'
    };

    const normalizeStep = (step) => STEP_ALIASES[step] || step;

    const toNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const normalized = String(value).replace(/[\s,]/g, '').replace(/[()]/g, match => match === '(' ? '-' : '').replace(/[^0-9.\-]/g, '');
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getAccountFinalBalance = (account = {}) => {
        const hasClosingColumns = ['cb_debit', 'cb_credit'].some(key => account[key] !== undefined && account[key] !== '');
        if (hasClosingColumns) return toNumber(account.cb_debit) - toNumber(account.cb_credit);

        const hasMovementColumns = ['ob_debit', 'ob_credit', 'move_debit', 'move_credit'].some(key => account[key] !== undefined && account[key] !== '');
        if (hasMovementColumns) return (toNumber(account.ob_debit) - toNumber(account.ob_credit)) + (toNumber(account.move_debit) - toNumber(account.move_credit));

        if (account.calculated_balance !== undefined && account.calculated_balance !== '') return toNumber(account.calculated_balance);
        if (account.book_balance !== undefined && account.book_balance !== '') return toNumber(account.book_balance);
        if (account.debit !== undefined || account.credit !== undefined) return toNumber(account.debit) - toNumber(account.credit);
        return 0;
    };

    const injectScript = (src, attr) => {
        if (document.querySelector(`[${attr}]`)) return;
        const s = document.createElement('script');
        s.src = src;
        s.defer = true;
        s.setAttribute(attr, 'true');
        document.head.appendChild(s);
    };

    const loadQaPatch = () => {
        const page = (location.pathname || '').split('/').pop();
        if (!['data-ingestion.html', 'account-mapping.html', 'consolidation-cockpit.html'].includes(page)) return;
        injectScript('polaris-accounting-qa-patch-v2.js?v=20260617d', 'data-polaris-accounting-qa-patch');
        if (page === 'account-mapping.html') {
            setTimeout(() => injectScript('polaris-equity-ratio-fix.js?v=20260617a', 'data-polaris-equity-ratio-fix'), 800);
        }
    };

    window.PolarisDataFlow = {
        VERSION: '1.0.7-qa-equity-ratio-fix',
        STEPS,
        STEP_ALIASES,
        SECURITY_NOTICE: 'localStorage AES هنا إخفاء داخل المتصفح فقط وليس حماية فعلية لبيانات مالية حساسة.',

        save(step, data) {
            const normalizedStep = normalizeStep(step);
            if (!STEPS.includes(normalizedStep)) return false;
            const payload = { step: normalizedStep, data, timestamp: new Date().toISOString(), version: this.VERSION, checksum: this._hash(data) };
            this._saveEncrypted(`polaris_step_${normalizedStep}`, payload);
            this._updateProgress(normalizedStep);
            return true;
        },

        load(step) {
            const normalizedStep = normalizeStep(step);
            if (!STEPS.includes(normalizedStep)) return null;
            const payload = this._loadDecrypted(`polaris_step_${normalizedStep}`);
            if (!payload || payload.checksum !== this._hash(payload.data)) return null;
            return payload.data;
        },

        canProceed(currentStep) {
            const normalizedStep = normalizeStep(currentStep);
            if (normalizedStep === 'home') return true;
            const idx = STEPS.indexOf(normalizedStep);
            if (idx === -1) return false;
            for (let i = 0; i < idx; i++) if (!this.load(STEPS[i])) return false;
            return true;
        },

        _hash(data) { return CryptoJS.SHA256(JSON.stringify(data)).toString(CryptoJS.enc.Hex).slice(0, 32); },
        _saveEncrypted(key, data) {
            try { localStorage.setItem(key, CryptoJS.AES.encrypt(JSON.stringify(data), STORAGE_KEY).toString()); } catch (e) { console.error(e); }
        },
        _loadDecrypted(key) {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            try {
                const decrypted = CryptoJS.AES.decrypt(encrypted, STORAGE_KEY).toString(CryptoJS.enc.Utf8);
                return decrypted ? JSON.parse(decrypted) : null;
            } catch (e) { return null; }
        },
        _updateProgress(step) {
            const normalizedStep = normalizeStep(step);
            const idx = STEPS.indexOf(normalizedStep);
            if (idx === -1) return;
            const bar = document.getElementById('polarisProgressBar');
            if (bar) bar.style.width = `${((idx + 1) / STEPS.length) * 100}%`;
        },
        exportBackup() {
            const backup = { exportedAt: new Date().toISOString(), data: {} };
            STEPS.forEach(s => { const d = this.load(s); if (d) backup.data[s] = d; });
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Polaris_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        }
    };

    window.PolarisBalanceChecker = {
        calculateBalance(trialBalance) {
            if (!Array.isArray(trialBalance) || trialBalance.length === 0) return { totalDebits: 0, totalCredits: 0, difference: 0, signedDifference: 0, isBalanced: false, message: 'لا توجد حسابات صالحة للتحقق' };
            let totalDebits = 0, totalCredits = 0;
            trialBalance.forEach(account => {
                const finalBalance = getAccountFinalBalance(account);
                if (finalBalance > 0) totalDebits += finalBalance;
                else if (finalBalance < 0) totalCredits += Math.abs(finalBalance);
            });
            const signedDifference = totalDebits - totalCredits;
            const difference = Math.abs(signedDifference);
            const isBalanced = difference <= 0.10;
            return { totalDebits, totalCredits, difference, signedDifference, isBalanced, message: isBalanced ? 'ميزان المراجعة متوازن ضمن سماحية التقريب' : `ميزان المراجعة غير متوازن - الفرق: ${difference.toFixed(2)}` };
        },
        findAbnormalBalances(trialBalance) {
            if (!Array.isArray(trialBalance)) return [];
            return trialBalance.filter(account => {
                const balance = getAccountFinalBalance(account);
                const category = account.category;
                if (category === 'assets' && balance < 0 && account.sub_category !== '121099') return true;
                if (category === 'expenses' && balance < 0) return true;
                if (category === 'cost_of_revenue' && balance < 0) return true;
                if (category === 'liabilities' && balance > 0) return true;
                if (category === 'equity' && balance > 0) return true;
                if (category === 'revenue' && balance > 0 && account.sub_category !== '410099') return true;
                return false;
            });
        },
        findClearingAccounts(trialBalance) {
            if (!Array.isArray(trialBalance)) return [];
            return trialBalance.filter(account => account.category === 'clearing' || (account.name && account.name.includes('مقاصة')) || (account.name && account.name.includes('وسيط')));
        },
        calculateAdjustedNetProfit(trialBalance) {
            if (!Array.isArray(trialBalance)) return { before: 0, adjustments: 0, after: 0 };
            let revenues = 0, contraRevenue = 0, expenses = 0;
            trialBalance.forEach(account => {
                const balance = getAccountFinalBalance(account);
                const category = account.category;
                const sub = String(account.sub_category || '');
                const name = String(account.name || '').toLowerCase();
                const code = String(account.account_id || '');
                const isContraRevenue = sub === '410099' || name.includes('خصم مسموح') || name.includes('مردود') || name.includes('مرتجع');
                const isOverriddenAssetOrLiability = ['10203071', '101080004', '201040001'].includes(code);
                const isExpenseLike = !isOverriddenAssetOrLiability && (category === 'expenses' || category === 'cost_of_revenue' || sub.startsWith('5') || sub.startsWith('6') || sub.startsWith('7') || code === '303011' || name.includes('تكلفة المبيعات'));
                if (category === 'revenue' || code.startsWith('4')) {
                    if (isContraRevenue) contraRevenue += balance > 0 ? balance : Math.abs(balance);
                    else revenues += balance < 0 ? Math.abs(balance) : -balance;
                } else if (isExpenseLike) expenses += balance > 0 ? balance : Math.abs(balance);
            });
            const before = revenues - contraRevenue - expenses;
            return { before, adjustments: 0, after: before, revenues, contraRevenue, expenses };
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadQaPatch();
        const step = document.body.getAttribute('data-step');
        if (step && step !== 'home' && !PolarisDataFlow.canProceed(step)) {
            alert('أكمل الخطوة السابقة أولاً!');
            history.back();
        }
        PolarisDataFlow._updateProgress(step || 'home');
    });
})();
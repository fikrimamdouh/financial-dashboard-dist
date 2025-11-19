;(() => {
    'use strict';
    if (typeof CryptoJS === 'undefined') {
        console.error('CryptoJS مطلوب!');
        return;
    }

    const SECRET_KEY = 'Polaris2025!@#SecurePipeline';
    const STEPS = [
        'client-info',      // company-setup.html
        'trial-balance',    // account-mapping.html
        'adjustments',      // adjustments.html (سيُنشأ)
        'reports',          // consolidation-cockpit.html
        'submission'        // submission.html (سيُنشأ)
    ];

    window.PolarisDataFlow = {
        VERSION: '1.0.2',
        STEPS,

        save(step, data) {
            if (!STEPS.includes(step)) return false;
            const payload = { step, data, timestamp: new Date().toISOString(), version: this.VERSION, checksum: this._hash(data) };
            this._saveEncrypted(`polaris_step_${step}`, payload);
            this._updateProgress(step);
            return true;
        },

        load(step) {
            if (!STEPS.includes(step)) return null;
            const payload = this._loadDecrypted(`polaris_step_${step}`);
            if (!payload || payload.checksum !== this._hash(payload.data)) return null;
            return payload.data;
        },

        canProceed(currentStep) {
            const idx = STEPS.indexOf(currentStep);
            if (idx === -1) return false;
            for (let i = 0; i < idx; i++) {
                if (!this.load(STEPS[i])) return false;
            }
            return true;
        },

        _hash(data) {
            return CryptoJS.SHA256(JSON.stringify(data)).toString(CryptoJS.enc.Hex).slice(0, 32);
        },

        _saveEncrypted(key, data) {
            try {
                const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
                localStorage.setItem(key, encrypted);
            } catch (e) { console.error(e); }
        },

        _loadDecrypted(key) {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            try {
                return JSON.parse(CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(CryptoJS.enc.Utf8));
            } catch (e) { return null; }
        },

        _updateProgress(step) {
            const idx = STEPS.indexOf(step);
            if (idx === -1) return;
            const progress = ((idx + 1) / STEPS.length) * 100;
            const bar = document.getElementById('polarisProgressBar');
            if (bar) bar.style.width = `${progress}%`;
        },

        exportBackup() {
            const backup = { exportedAt: new Date().toISOString(), data: {} };
            STEPS.forEach(s => { const d = this.load(s); if (d) backup.data[s] = d; });
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Polaris_Backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
        }
    };

    // ================================================================
    // --- الميزات الجديدة: حساب الفرق والربط الديناميكي ---
    // ================================================================

    window.PolarisBalanceChecker = {
        /**
         * حساب الفرق في ميزان المراجعة
         * @param {Array} trialBalance - مصفوفة الحسابات
         * @returns {Object} - كائن يحتوي على الفرق والتفاصيل
         */
        calculateBalance(trialBalance) {
            if (!Array.isArray(trialBalance) || trialBalance.length === 0) {
                return {
                    totalDebits: 0,
                    totalCredits: 0,
                    difference: 0,
                    isBalanced: true,
                    message: 'لا توجد حسابات'
                };
            }

            let totalDebits = 0;
            let totalCredits = 0;

            trialBalance.forEach(account => {
                const finalBalance = (parseFloat(account.calculated_balance) || parseFloat(account.book_balance) || 0);
                if (finalBalance > 0) {
                    totalDebits += finalBalance;
                } else if (finalBalance < 0) {
                    totalCredits += Math.abs(finalBalance);
                }
            });

            const difference = Math.abs(totalDebits - totalCredits);
            const isBalanced = difference < 0.01;

            return {
                totalDebits,
                totalCredits,
                difference,
                isBalanced,
                message: isBalanced ? 'ميزان المراجعة متوازن' : `ميزان المراجعة غير متوازن - الفرق: ${difference.toFixed(2)}`
            };
        },

        /**
         * تحديد الحسابات غير الطبيعية
         * @param {Array} trialBalance - مصفوفة الحسابات
         * @returns {Array} - مصفوفة الحسابات غير الطبيعية
         */
        findAbnormalBalances(trialBalance) {
            if (!Array.isArray(trialBalance)) return [];

            return trialBalance.filter(account => {
                const balance = parseFloat(account.calculated_balance) || parseFloat(account.book_balance) || 0;
                const category = account.category;

                // أصول برصيد دائن (سالب) = غير طبيعي
                if (category === 'assets' && balance < 0) return true;

                // التزامات برصيد مدين (موجب) = غير طبيعي
                if (category === 'liabilities' && balance > 0) return true;

                return false;
            });
        },

        /**
         * تحديد حسابات المقاصة
         * @param {Array} trialBalance - مصفوفة الحسابات
         * @returns {Array} - مصفوفة حسابات المقاصة
         */
        findClearingAccounts(trialBalance) {
            if (!Array.isArray(trialBalance)) return [];

            return trialBalance.filter(account => {
                return account.category === 'clearing' || 
                       (account.name && account.name.includes('مقاصة')) ||
                       (account.name && account.name.includes('وسيط'));
            });
        },

        /**
         * حساب صافي الربح المعدل
         */
        calculateAdjustedNetProfit(trialBalance) {
            if (!Array.isArray(trialBalance)) return { before: 0, adjustments: 0, after: 0 };

            let revenues = 0;
            let expenses = 0;
            let adjustmentEffect = 0;

            trialBalance.forEach(account => {
                const balance = parseFloat(account.calculated_balance) || parseFloat(account.book_balance) || 0;
                const category = account.category;

                if (category === 'revenue') {
                    revenues += balance;
                } else if (category === 'expenses' || category === 'cost_of_revenue') {
                    expenses += balance;
                } else if (account.is_adjustment || account.is_aje) {
                    adjustmentEffect += balance;
                }
            });

            const netProfitBefore = revenues - expenses;
            const netProfitAfter = netProfitBefore + adjustmentEffect;

            return {
                before: netProfitBefore,
                adjustments: adjustmentEffect,
                after: netProfitAfter,
                revenues,
                expenses
            };
        }
    };

    // ================================================================
    // --- بدء التحقق الذكي ---
    // ================================================================
    document.addEventListener('DOMContentLoaded', () => {
        const step = document.body.getAttribute('data-step');

        if (step && step !== 'home' && !PolarisDataFlow.canProceed(step)) {
            alert('أكمل الخطوة السابقة أولاً!');
            history.back();
        }
        
        PolarisDataFlow._updateProgress(step || 'home');
    });
    // ================================================================
})();

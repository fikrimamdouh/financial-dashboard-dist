;(() => {
    'use strict';

    if (typeof CryptoJS === 'undefined') {
        console.error('CryptoJS مطلوب!');
        return;
    }

    /**
     * QA NOTE:
     * This key only obfuscates localStorage content inside the browser.
     * It is not a security boundary because the key is shipped to every client.
     */
    const SECRET_KEY = 'Polaris2025!@#SecurePipeline';

    /**
     * Production workflow must reference existing operational stages only.
     * Removed placeholder stages that did not have live pages in the current dist.
     */
    const STEPS = [
        'client-info',      // company-setup.html
        'trial-balance',    // data-ingestion.html / account-mapping.html
        'reports'           // consolidation-cockpit.html / reporting-pantheon.html
    ];

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
        const normalized = String(value)
            .replace(/[\s,]/g, '')
            .replace(/[()]/g, match => match === '(' ? '-' : '')
            .replace(/[^0-9.\-]/g, '');
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getAccountFinalBalance = (account = {}) => {
        const hasClosingColumns = ['cb_debit', 'cb_credit'].some(key => account[key] !== undefined && account[key] !== '');
        if (hasClosingColumns) {
            return toNumber(account.cb_debit) - toNumber(account.cb_credit);
        }

        const hasMovementColumns = ['ob_debit', 'ob_credit', 'move_debit', 'move_credit'].some(key => account[key] !== undefined && account[key] !== '');
        if (hasMovementColumns) {
            const openingBalance = toNumber(account.ob_debit) - toNumber(account.ob_credit);
            const movement = toNumber(account.move_debit) - toNumber(account.move_credit);
            return openingBalance + movement;
        }

        if (account.calculated_balance !== undefined && account.calculated_balance !== '') {
            return toNumber(account.calculated_balance);
        }

        if (account.book_balance !== undefined && account.book_balance !== '') {
            return toNumber(account.book_balance);
        }

        if (account.debit !== undefined || account.credit !== undefined) {
            return toNumber(account.debit) - toNumber(account.credit);
        }

        return 0;
    };

    window.PolarisDataFlow = {
        VERSION: '1.0.3-qa',
        STEPS,
        STEP_ALIASES,
        SECURITY_NOTICE: 'localStorage AES here is browser-side obfuscation only; do not treat it as protection for sensitive financial records.',

        save(step, data) {
            const normalizedStep = normalizeStep(step);
            if (!STEPS.includes(normalizedStep)) return false;
            const payload = {
                step: normalizedStep,
                data,
                timestamp: new Date().toISOString(),
                version: this.VERSION,
                checksum: this._hash(data)
            };
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
            } catch (e) {
                console.error(e);
            }
        },

        _loadDecrypted(key) {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            try {
                const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(CryptoJS.enc.Utf8);
                return decrypted ? JSON.parse(decrypted) : null;
            } catch (e) {
                return null;
            }
        },

        _updateProgress(step) {
            const normalizedStep = normalizeStep(step);
            const idx = STEPS.indexOf(normalizedStep);
            if (idx === -1) return;
            const progress = ((idx + 1) / STEPS.length) * 100;
            const bar = document.getElementById('polarisProgressBar');
            if (bar) bar.style.width = `${progress}%`;
        },

        exportBackup() {
            const backup = { exportedAt: new Date().toISOString(), data: {} };
            STEPS.forEach(s => {
                const d = this.load(s);
                if (d) backup.data[s] = d;
            });
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Polaris_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        }
    };

    window.PolarisBalanceChecker = {
        calculateBalance(trialBalance) {
            if (!Array.isArray(trialBalance) || trialBalance.length === 0) {
                return {
                    totalDebits: 0,
                    totalCredits: 0,
                    difference: 0,
                    signedDifference: 0,
                    isBalanced: false,
                    message: 'لا توجد حسابات صالحة للتحقق'
                };
            }

            let totalDebits = 0;
            let totalCredits = 0;

            trialBalance.forEach(account => {
                const finalBalance = getAccountFinalBalance(account);
                if (finalBalance > 0) {
                    totalDebits += finalBalance;
                } else if (finalBalance < 0) {
                    totalCredits += Math.abs(finalBalance);
                }
            });

            const signedDifference = totalDebits - totalCredits;
            const difference = Math.abs(signedDifference);
            const isBalanced = difference < 0.01;

            return {
                totalDebits,
                totalCredits,
                difference,
                signedDifference,
                isBalanced,
                message: isBalanced ? 'ميزان المراجعة متوازن' : `ميزان المراجعة غير متوازن - الفرق: ${difference.toFixed(2)}`
            };
        },

        findAbnormalBalances(trialBalance) {
            if (!Array.isArray(trialBalance)) return [];

            return trialBalance.filter(account => {
                const balance = getAccountFinalBalance(account);
                const category = account.category;

                if (category === 'assets' && balance < 0) return true;
                if (category === 'expenses' && balance < 0) return true;
                if (category === 'cost_of_revenue' && balance < 0) return true;
                if (category === 'liabilities' && balance > 0) return true;
                if (category === 'equity' && balance > 0) return true;
                if (category === 'revenue' && balance > 0) return true;

                return false;
            });
        },

        findClearingAccounts(trialBalance) {
            if (!Array.isArray(trialBalance)) return [];

            return trialBalance.filter(account => {
                return account.category === 'clearing' ||
                       (account.name && account.name.includes('مقاصة')) ||
                       (account.name && account.name.includes('وسيط'));
            });
        },

        calculateAdjustedNetProfit(trialBalance) {
            if (!Array.isArray(trialBalance)) return { before: 0, adjustments: 0, after: 0 };

            let revenues = 0;
            let expenses = 0;
            let adjustmentEffect = 0;

            trialBalance.forEach(account => {
                const balance = getAccountFinalBalance(account);
                const category = account.category;

                if (category === 'revenue') {
                    revenues += Math.abs(balance);
                } else if (category === 'expenses' || category === 'cost_of_revenue') {
                    expenses += Math.abs(balance);
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

    document.addEventListener('DOMContentLoaded', () => {
        const step = document.body.getAttribute('data-step');

        if (step && step !== 'home' && !PolarisDataFlow.canProceed(step)) {
            alert('أكمل الخطوة السابقة أولاً!');
            history.back();
        }

        PolarisDataFlow._updateProgress(step || 'home');
    });
})();
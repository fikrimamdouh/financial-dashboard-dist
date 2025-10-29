// dataPipeline.js - النسخة النهائية المصححة
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
        VERSION: '1.0.1',
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
// --- START: آلية التحقق الذكية (V2) - تتجاهل الصفحة الرئيسية ---
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    const step = document.body.getAttribute('data-step');

    // **الإصلاح: أضفنا شرطاً للتحقق من أن الخطوة ليست "home"**
    if (step && step !== 'home' && !PolarisDataFlow.canProceed(step)) {
        alert('أكمل الخطوة السابقة أولاً!');
        history.back();
    }
    
    // شريط التقدم سيعمل كالمعتاد
    PolarisDataFlow._updateProgress(step || 'home');
});
// ================================================================
// --- END: آلية التحقق الذكية ---
// ================================================================
})();
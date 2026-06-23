// ═══════════════════════════════════════════════
//     خاص   نظام بيانات المزادات
// ═══════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/auctions_data.json');

function loadAuctions() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            const content = fs.readFileSync(DATA_PATH, 'utf8').trim();
            if (content) return JSON.parse(content);
        }
    } catch (e) {
        console.error('[Auctions] خطأ في تحميل البيانات:', e);
    }
    return [];
}

function saveAuction(entry) {
    try {
        const data = loadAuctions();
        data.push({ timestamp: new Date().toISOString(), ...entry });
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        console.log('[Auctions] تم حفظ بيانات المزاد.');
    } catch (e) {
        console.error('[Auctions] خطأ في حفظ البيانات:', e);
    }
}

module.exports = { loadAuctions, saveAuction };

// ═══════════════════════════════════════════════
//         نظام بيانات المتاجر
// ═══════════════════════════════════════════════


const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/stores_data.json');

function loadStoresData() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            const content = fs.readFileSync(DATA_PATH, 'utf8').trim();
            if (content) {
                const parsed = JSON.parse(content);
                for (const [key, value] of Object.entries(parsed)) {
                    global.storesData.set(key, value);
                }
                console.log('[Stores] تم تحميل بيانات المتاجر بنجاح.');
            }
        }
    } catch (e) {
        console.error('[Stores] خطأ في تحميل البيانات:', e);
    }
}

function saveStoresData() {
    try {
        const obj = Object.fromEntries(global.storesData);
        fs.writeFileSync(DATA_PATH, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.error('[Stores] خطأ في حفظ البيانات:', e);
    }
}

function createDefaultStoreData(storeId, ownerId, storeType, everyone, here) {
    return {
        storeId,
        ownerId,
        storeType,
        warnings: 0,
        mentions: { everyoneLeft: everyone, hereLeft: here },
        cooldowns: { lastMentionTime: 0, lastMentionType: null, lastMenuOpenTime: 0 },
        settings: { autoLine: false, lineImageUrl: 'https://example.com', embedColor: '#2b2d31' },
        autoPost: {
            isActive: false, planType: null, text: null, allowChange: false,
            mentionType: null, lastPostTime: 0, activatedAt: 0, expiresAt: 0,
            dailyFeePaidToday: false, unpaidDaysCount: 0, speedHours: 1
        },
        discountBox: { usedCount: 0, lastUsedTime: 0 },
        pendingTransactions: null
    };
}

module.exports = { loadStoresData, saveStoresData, createDefaultStoreData };

// ═══════════════════════════════════════════════
//         نظام مراقبة بوكس الخصم
// ═══════════════════════════════════════════════


module.exports = {
    init(client) {
        console.log('[discountBox] تهيئة مراقب بوكس الخصم (كل ساعة).');
        setInterval(() => {
            const now = Date.now();
            if (!global.storesData) return;
            let hasChanges = false;
            for (const [, store] of global.storesData.entries()) {
                if (store.discountBox?.usedCount > 0) {
                    if (now - store.discountBox.lastUsedTime > 172800000) {
                        hasChanges = true;
                    }
                }
            }
            if (hasChanges && global.saveStoresData) global.saveStoresData();
        }, 3600000);
    },

    checkStoreDiscountActive(storeData) {
        if (!storeData.discountBox || storeData.discountBox.usedCount === 0) return false;
        return (Date.now() - storeData.discountBox.lastUsedTime < 172800000);
    }
};

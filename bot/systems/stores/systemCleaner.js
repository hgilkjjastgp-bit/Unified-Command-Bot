// ═══════════════════════════════════════════════
//         نظام تنظيف البيانات الميتة
// ═══════════════════════════════════════════════

module.exports = {
    init(client) {
        console.log('[systemCleaner] تهيئة نظام التنظيف الدوري (كل 10 دقائق).');
        setInterval(async () => {
            if (!global.storesData) return;
            let databaseChanged = false;

            for (const [storeId] of global.storesData.entries()) {
                let channelExists = client.channels.cache.has(storeId);
                if (!channelExists) {
                    const fetchedChannel = await client.channels.fetch(storeId).catch(() => null);
                    if (fetchedChannel) channelExists = true;
                }

                if (!channelExists) {
                    console.log(`[systemCleaner] حذف بيانات متجر محذوف: ${storeId}`);
                    global.storesData.delete(storeId);
                    databaseChanged = true;
                }
            }

            if (databaseChanged && global.saveStoresData) global.saveStoresData();
        }, 600000);
    },

    handleMessage() {}
};

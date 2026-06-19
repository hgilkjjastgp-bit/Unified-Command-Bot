const { Client } = require('discord.js');

module.exports = {
    // دالة الفحص والتطهير الدوري في الخلفية لحماية استقرار السيستم
    init(client) {
        console.log("🛡️ [systemAuditCleaner] Security audit and absolute data cleaner cycles activated.");

        // دورة فحص المتاجر الميتة أو المحذوفة يدويًا (تعمل كل 10 دقائق)
        setInterval(async () => {
            if (!global.storesData) return;
            
            let databaseChanged = false;

            for (const [storeId, store] of global.storesData.entries()) {
                // 🎯 تصليح برمجي حتمي: محاولة جلب القناة بذكاء لضمان وجودها الفعلي وعدم الاعتماد على الكاش المهتز
                let channelExists = client.channels.cache.has(storeId);
                
                if (!channelExists) {
                    // إذا لم تكن في الكاش، نحاول عمل جلب حقيقي (Fetch) من ديسكورد للتأكد القطعي
                    const fetchedChannel = await client.channels.fetch(storeId).catch(() => null);
                    if (fetchedChannel) {
                        channelExists = true; // الروم موجود فعلياً وتم إنقاذ البيانات من الحذف الخاطئ
                    }
                }
                
                // إذا لم يعثر البوت على القناة نهائياً بعد الفحص الثنائي، يتم حذف البيانات
                if (!channelExists) {
                    console.log(`🧹 [systemAuditCleaner] Cleaning ghost store data from JSON: ${storeId}`);
                    global.storesData.delete(storeId); // تدمير وتطهير البيانات الميتة فورًا
                    databaseChanged = true;
                }
            }

            // حفظ التحديثات فورًا في ملف الـ JSON إذا حدث أي تنظيف حقيقي
            if (databaseChanged && global.saveStoresData) {
                global.saveStoresData();
            }
        }, 10 * 60 * 1000); // تكرار الفحص كل 10 دقائق تلقائيًا
    },

    // معالج إضافي فارغ للحفاظ على توافق الـ Loader الموحد في عقل البوت
    handleMessage(message) {
        return;
    }
};

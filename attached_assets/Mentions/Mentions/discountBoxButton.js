const { Client } = require('discord.js');

module.exports = {
    // دالة فحص وتلقيم المزامنة الزمنية لانتهاء الخصومات (تعمل في الخلفية)
    init(client) {
        console.log("🎁 [discountBoxButton] Discount monitoring cycles activated.");
        
        // فحص مستمر يعمل كل ساعة لتنظيف صلاحيات الخصم التي تجاوزت 48 ساعة
        setInterval(() => {
            const now = Date.now();
            if (!global.storesData) return;

            let hasChanges = false;
            for (const [storeId, store] of global.storesData.entries()) {
                if (store.discountBox && store.discountBox.usedCount > 0) {
                    const fortyEightHours = 48 * 60 * 60 * 1000;
                    
                    // إذا انتهت الـ 48 ساعة من وقت آخر شراء للبوكس، تنتهي صلاحية الخصم المستقبلي
                    if (now - store.discountBox.lastUsedTime > fortyEightHours) {
                        // يتم ترك الـ usedCount لمعرفة عدد مرات الاستخدام التاريخية، ولكن تنتهي الفعالية الحالية للخصم
                        console.log(`📉 [discountBoxButton] 48-hour discount window closed for store: ${storeId}`);
                        hasChanges = true;
                    }
                }
            }
            // مزامنة التحديث تلقائياً مع ملف الحفظ الرئيسي للمشروع
            if (hasChanges && global.saveStoresData) global.saveStoresData();
        }, 1000 * 60 * 60); // يفحص بدقة رأس كل ساعة
    },

    // دالة مساعدة عامة ومحمية للتحقق من حالة الخصم النشط من أي ملف آخر بالمنظومة
    checkStoreDiscountActive(storeData) {
        if (!storeData.discountBox || storeData.discountBox.usedCount === 0) return false;
        
        const now = Date.now();
        const fortyEightHours = 48 * 60 * 60 * 1000;
        
        // الخصم فعال ومقبول فقط إذا كان الوقت الحالي ضمن الـ 48 ساعة من لحظة الشراء
        return (now - storeData.discountBox.lastUsedTime < fortyEightHours);
    }
};

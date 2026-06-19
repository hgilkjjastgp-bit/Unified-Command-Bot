const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// أيدي رتبة مسؤول المزاد لمصلحة رؤية الرومات المقفلة
const AUCTION_ADMIN_ROLE_ID = "1509576925478256663"; 

module.exports = {
    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;

        // التحقق هل القناة مسجلة كمتجر نشط في النظام
        const storeData = global.storesData.get(message.channel.id);
        if (!storeData) return;

        const hasEveryone = message.content.includes('@everyone');
        const hasHere = message.content.includes('@here');
        if (!hasEveryone && !hasHere) return;

        // الرقابة الحديدية: مالك المتجر المسجل هو الوحيد الذي يحق له عمل منشن بالروم
        if (message.author.id !== storeData.ownerId) {
            try { await message.delete(); } catch(e){}
            return;
        }

        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        // 1. فحص الكلمات الحساسة وغير المشفرة شاملة عبارات المبيعات الموسعة
        const forbiddenWords = [
            'مطلوب', 'للبيع', 'متوفر', 'شراء', 'سيرفر', 'حساب', 'حسابات', 
            'خصم', 'عرض', 'كاش', 'كريدت', 'متوفرة', 'فيزا', 'بنك', 'متجر', 'مبيعات'
        ];
        let matchedWord = null;
        
        // فحص ذكي للكلمات المنفصلة لتفادي البلاغات الظالمة
        const wordsInMessage = message.content.toLowerCase().split(/\s+/);
        for (const word of forbiddenWords) {
            if (wordsInMessage.includes(word)) {
                matchedWord = word;
                break;
            }
        }

        // إذا تم رصد كلمة مكشوفة: ياخذ تحذير فوري مع السبب ولا تُحذف الرسالة بناءً على طلبك
        if (matchedWord) {
            await module.exports.applyWarning(
                message.guild, 
                message.channel, 
                storeData, 
                `❌ **رصد مخالفة نظام التشفير الحركي:** تم استخدام كلمة غير مشفرة وهي (\`${matchedWord}\`) داخل إعلان المنشن الخاص بك! يرجى الاستعانة بلوحة الأوامر دائماً لتأطير نصوصك وحماية الروم.`
            );
            return;
        }

        // 2. حماية ومنع المنشن المتتالي الفوري السريع جداً (وراء بعض)
        if (storeData.cooldowns?.lastMentionType && storeData.cooldowns?.lastMentionTime && (now - storeData.cooldowns.lastMentionTime < 5000)) {
            await module.exports.applyWarning(
                message.guild, 
                message.channel, 
                storeData, 
                "⚠️ **رصد محاولة تخريبية:** تم رصد محاولة عمل منشن متتالي وسريع جداً وراء بعض دون فواصل زمنية!"
            );
            return;
        }

        // 3. حماية ساعة الانتظار الإجبارية الإلزامية بين المنشن والآخر
        if (storeData.cooldowns?.lastMentionTime && (now - storeData.cooldowns.lastMentionTime < oneHour)) {
            const timeLeft = Math.ceil((oneHour - (now - storeData.cooldowns.lastMentionTime)) / 60000);
            
            await module.exports.applyWarning(
                message.guild, 
                message.channel, 
                storeData, 
                `⏰ **مخالفة مؤقت المنشن الزمني:** لقد قمت بعمل منشن مرتين خلال نفس الساعة! العقوبة مفروضة وباقي لك \`${timeLeft}\` دقيقة لتتمكن من المنشن سليم بدون مخالفات.`
            );
            return;
        }

        // 4. التحقق الفوري والرقابة التامة على رصيد البيانات الفعلي للمتجر
        if (!storeData.mentions) storeData.mentions = { everyoneLeft: 0, hereLeft: 0 };
        
        if (hasEveryone) {
            if (storeData.mentions.everyoneLeft <= 0) {
                // تفعيل عقوبة القفل الفوري الشامل للروم وحذف الرسالة
                await module.exports.lockStoreChannelDueToNoBalance(message, storeData, '@everyone');
                return;
            }
            storeData.mentions.everyoneLeft--;
            if (!storeData.cooldowns) storeData.cooldowns = {};
            storeData.cooldowns.lastMentionType = 'everyone';
        } else if (hasHere) {
            if (storeData.mentions.hereLeft <= 0) {
                // تفعيل عقوبة القفل الفوري الشامل للروم وحذف الرسالة
                await module.exports.lockStoreChannelDueToNoBalance(message, storeData, '@here');
                return;
            }
            storeData.mentions.hereLeft--;
            if (!storeData.cooldowns) storeData.cooldowns = {};
            storeData.cooldowns.lastMentionType = 'here';
        }

        // تحديث أوقات المنشن الناجح في الـ JSON وحفظ البيانات
        storeData.cooldowns.lastMentionTime = now;
        if (global.saveStoresData) global.saveStoresData();

        // تفعيل ميزة الخط التلقائي المخصصة إذا كانت مشتراة ومفعلة
        if (storeData.settings?.autoLine && storeData.settings?.lineImageUrl) {
            await message.channel.send({ content: storeData.settings.lineImageUrl }).catch(() => {});
        }
    },

    // دالة تفعيل عقوبة نفاد الرصيد: حذف فوري للرسالة، قفل الروم بالكامل، وإرسال تنبيه حاد في الخاص
    async lockStoreChannelDueToNoBalance(message, storeData, mentionType) {
        // حذف رسالة المنشن فوراً لمنع انتشار الإعلان بدون رصيد
        try { await message.delete(); } catch(e){}

        // فرض تحذير إضافي في السجل
        storeData.warnings = (storeData.warnings || 0) + 1;
        if (global.saveStoresData) global.saveStoresData();

        // قفل الروم برمجياً بأعلى مستويات الصلاحيات وسحب الكتابة من المالك
        await message.channel.permissionOverwrites.set([
            {
                id: message.guild.id,
                deny: [PermissionFlagsBits.ViewChannel] // إخفاء عن العامة
            },
            {
                id: storeData.ownerId,
                allow: [PermissionFlagsBits.ViewChannel],
                deny: [PermissionFlagsBits.SendMessages] // سحب وإلغاء صلاحية الكتابة لمالك المتجر تماماً
            },
            {
                id: AUCTION_ADMIN_ROLE_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] // رتبة مسؤول مزاد ترى وتتفاعل بالكامل
            },
            {
                id: message.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            }
        ], "قفل الروم تلقائياً بسبب نفاد رصيد منشنات المتجر المعتمدة").catch(() => {});

        // إرسال إشعار رسمي ثابت داخل الروم المقفل ليكون واضحاً للإدارة ومسؤولي المزاد
        const lockedEmbed = new EmbedBuilder()
            .setTitle('🔒 تجميد وقفل المتجر تلقائياً')
            .setDescription(`⚠️ تم قفل وإغلاق هذا المتجر وسحب صلاحيات الكتابة فوراً بسبب محاولة المالك عمل منشن \`${mentionType}\` بدون توفر رصيد كافٍ في سجل البيانات التاريخي الخاص به!`)
            .addFields(
                { name: '📊 عدد تحذيرات المتجر حالياً:', value: `\`${storeData.warnings} / 5\``, inline: true },
                { name: '👤 مالك المتجر المجمد:', value: `<@${storeData.ownerId}>`, inline: true }
            )
            .setColor('#ff3333')
            .setFooter({ text: 'لن يتم فتح الروم مجدداً إلا بعد قيام المالك بشحن رصيده عبر اللوحة بنجاح.' });

        await message.channel.send({ content: `<@${storeData.ownerId}>`, embeds: [lockedEmbed] }).catch(() => null);

        // إرسال رسالة توبيخية وإجبارية حادة للمالك مباشرة على الخاص تطلب منه التوجه للشراء فوراً
        const owner = await message.guild.members.fetch(storeData.ownerId).catch(() => null);
        if (owner) {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🏪 تنبيه عاجل: تم قفل وتجميد متجرك بالكامل!')
                .setDescription(`يا غالي، لقد قمت بمحاولة عمل منشن \`${mentionType}\` في روم متجرك <#${message.channel.id}> بينما رصيدك الفعلي الحالي هو \`0\`!\n\n❌ **السيستم قام بحذف إعلانك وقفل الروم عليك تلقائياً لمنع المخالفات.**\n\n📥 **الحل التلقائي:** قم بكتابة كلمة **\`منشن\`** داخل شات متجرك فوراً (الصلاحية مفتوحة لك للأوامر فقط) واضغط على زر **[🛒 شراء منشن]** لتسديد الفاتورة وشحن رصيدك، وسيقوم البوت بفتح الروم لك تلقائياً بمجرد إتمام معاملتك الممالية الناجحة بنجاح!`)
                .setColor('#f1c40f')
                .setTimestamp();
            await owner.send({ embeds: [dmEmbed] }).catch(() => {});
        }
    },

    // دالة إرسال المخالفات والتحذيرات الثابتة بالشات (لا تُحذف لتظل مرجعاً ثابتاً)
    async applyWarning(guild, channel, storeData, warningReason) {
        storeData.warnings = (storeData.warnings || 0) + 1;
        if (global.saveStoresData) global.saveStoresData();

        const warningEmbed = new EmbedBuilder()
            .setTitle('⚠️ نظام الرقابة والتحذيرات الصارم للمتاجر')
            .setDescription(`${warningReason}\n\n📊 عدد تحذيرات متجرك الحالية بالملف: \`${storeData.warnings} / 5\``)
            .setColor('#ff3333')
            .setFooter({ text: 'عند وصولك لـ 5 تحذيرات سيتم تصفير وحذف متجرك تلقائياً من النظام!' });

        await channel.send({ content: `<@${storeData.ownerId}>`, embeds: [warningEmbed] }).catch(() => null);

        // التصفير والتطهير الشامل للروم والبيانات عند وصول المخالفة الخامسة
        if (storeData.warnings >= 5) {
            await channel.send({ content: "🚨 **[تلقائي]** وصل المتجر للحد الأقصى من التحذيرات (5/5)، جاري تصفير قاعدة البيانات وحذف الروم نهائياً بعد قليل..." }).catch(() => {});
            setTimeout(async () => {
                global.storesData.delete(channel.id);
                if (global.saveStoresData) global.saveStoresData();
                await channel.delete('تجاوز الحد الأقصى للتحذيرات المسموحة لمتجرك').catch(() => {});
            }, 5000);
        }
    }
};

// ═══════════════════════════════════════════════
//         نظام النشر التلقائي للمتاجر
// ═══════════════════════════════════════════════

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const targetWords = [
    'مطلوب', 'كريدت', 'كاش', 'بيع', 'للبيع', 'متوفر', 'شراء',
    'سيرفر', 'حساب', 'حسابات', 'خصم', 'عرض', 'متوفرة', 'فيزا', 'بنك', 'متجر', 'مبيعات'
];

function encryptText(rawText) {
    let wordsArray = rawText.split(/\s+/);
    for (let i = 0; i < wordsArray.length; i++) {
        if (wordsArray[i].startsWith('http') || wordsArray[i].startsWith('<:') || wordsArray[i].startsWith('<a:')) continue;
        let cleanWord = wordsArray[i].toLowerCase().replace(/[^а-яёА-ЯЁa-zA-Z0-9\u0600-\u06FF]/g, '');
        if (targetWords.includes(cleanWord)) {
            let mid = Math.floor(wordsArray[i].length / 2);
            if (mid === 0) mid = 1;
            wordsArray[i] = wordsArray[i].substring(0, mid) + '¹' + wordsArray[i].substring(mid);
        }
    }
    return wordsArray.join(' ');
}

module.exports = {
    init(client) {
        console.log('[autoPostManager] تهيئة نظام النشر التلقائي.');

        setInterval(async () => {
            const now = Date.now();
            if (!global.storesData) return;

            for (const [storeId, store] of global.storesData.entries()) {
                if (!store.autoPost?.isActive) continue;

                if (now >= store.autoPost.expiresAt) {
                    store.autoPost.isActive = false;
                    if (global.saveStoresData) global.saveStoresData();
                    const channel = client.channels.cache.get(storeId);
                    const guild   = channel?.guild || client.guilds.cache.first();
                    const owner   = await guild?.members.fetch(store.ownerId).catch(() => null);
                    await owner?.send({ content: `⏰ انتهت مدة باقة النشر التلقائي لمتجرك.` }).catch(() => {});
                    continue;
                }

                // دورة العمولات اليومية
                const twentyFourHours = 86400000;
                const guild = client.channels.cache.get(storeId)?.guild || client.guilds.cache.first();
                if (!store.autoPost.lastFeeCheckTime) store.autoPost.lastFeeCheckTime = store.autoPost.activatedAt || now;

                if (now - store.autoPost.lastFeeCheckTime >= twentyFourHours) {
                    if (!store.autoPost.dailyFeePaidToday) {
                        store.autoPost.unpaidDaysCount = (store.autoPost.unpaidDaysCount || 0) + 1;
                    } else {
                        store.autoPost.dailyFeePaidToday = false;
                    }
                    store.autoPost.lastFeeCheckTime = now;
                    if (global.saveStoresData) global.saveStoresData();
                }

                // حساب سرعة النشر
                let currentIntervalHours = 1;
                if (store.autoPost.planType === 'day2' && !store.autoPost.dailyFeePaidToday) currentIntervalHours = 3;
                if (store.autoPost.planType === 'week') {
                    if ((store.autoPost.unpaidDaysCount || 0) >= 2) {
                        const fiveHours = 5 * 3600000;
                        if (store.autoPost.lastPostTime && (now - store.autoPost.lastPostTime < fiveHours)) continue;
                    } else if (!store.autoPost.dailyFeePaidToday) {
                        currentIntervalHours = 2;
                    }
                }

                const requiredCooldown = currentIntervalHours * 3600000;
                if (store.autoPost.lastPostTime && (now - store.autoPost.lastPostTime < requiredCooldown)) continue;

                // فحص رصيد المنشنات
                if (!store.mentions) store.mentions = { everyoneLeft: 0, hereLeft: 0 };
                const type = store.autoPost.mentionType;
                let chosenMention = '@everyone';
                if (type === 'here') chosenMention = '@here';
                else if (type === 'random') chosenMention = Math.random() > 0.5 ? '@everyone' : '@here';

                if (chosenMention === '@everyone' && store.mentions.everyoneLeft <= 0) continue;
                if (chosenMention === '@here' && store.mentions.hereLeft <= 0) continue;

                const channel = client.channels.cache.get(storeId);
                if (!channel) continue;

                const encryptedText = encryptText(store.autoPost.text || 'متوفر مبيعات المتاجر الموثقة');
                const mentionLabel  = chosenMention === '@everyone' ? 'everyone' : 'here';

                await channel.send({
                    content: `${chosenMention}\n\n${encryptedText}\nصاحب متجر: <@${store.ownerId}>\nمنشن: @${mentionLabel}`
                }).catch(() => {});

                if (store.settings?.autoLine && store.settings?.lineImageUrl) {
                    await channel.send({ content: store.settings.lineImageUrl }).catch(() => {});
                }

                if (chosenMention === '@everyone') store.mentions.everyoneLeft = Math.max(0, store.mentions.everyoneLeft - 1);
                else                               store.mentions.hereLeft     = Math.max(0, store.mentions.hereLeft - 1);

                store.autoPost.lastPostTime = now;
                if (global.saveStoresData) global.saveStoresData();
            }
        }, 60000);
    },

    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;
        const storeData = global.storesData?.get(message.channel.id);
        if (!storeData || message.author.id !== storeData.ownerId) return;

        if (message.content === 'إيقاف نشر') {
            if (!storeData.autoPost?.isActive) {
                return message.reply({ content: '❌ خدمة النشر التلقائي غير مفعلة حالياً.' }).catch(() => {});
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('stop_autopost_yes').setLabel('نعم، أوقف النشر').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('stop_autopost_no').setLabel('لا، إلغاء').setStyle(ButtonStyle.Secondary)
            );
            return message.reply({ content: '⚠️ هل أنت متأكد أنك تريد إيقاف خدمة النشر التلقائي؟', components: [row] }).catch(() => {});
        }

        if (message.content.startsWith('تغيير')) {
            if (!storeData.autoPost?.isActive) {
                return message.reply({ content: '❌ لست مشتركاً في النشر التلقائي. فعّل الخدمة أولاً.' }).catch(() => {});
            }
            const newText = message.content.replace('تغيير', '').trim();
            if (!newText) return message.reply({ content: '✍️ اكتب النص الجديد بعد كلمة تغيير. مثال: `تغيير متوفر حسابات جاهزة`' }).catch(() => {});
            storeData.autoPost.text = newText;
            if (global.saveStoresData) global.saveStoresData();
            return message.reply({ content: '✅ تم تحديث نص الإعلان بنجاح!' }).catch(() => {});
        }
    },

    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('stop_autopost_')) return;

        const channelId = interaction.channelId ?? interaction.channel?.id;
        if (!channelId) return;

        const storeData = global.storesData?.get(channelId);
        if (!storeData || interaction.user.id !== storeData.ownerId) return;

        if (interaction.customId === 'stop_autopost_yes') {
            storeData.autoPost.isActive  = false;
            storeData.autoPost.planType  = null;
            storeData.autoPost.text      = null;
            if (global.saveStoresData) global.saveStoresData();
            return interaction.update({ content: '🔴 تم إيقاف خدمة النشر التلقائي بنجاح.', components: [] });
        }
        if (interaction.customId === 'stop_autopost_no') {
            return interaction.update({ content: '✅ تم الإلغاء — النشر التلقائي لا يزال نشطاً.', components: [] });
        }
    },

    encryptText
};

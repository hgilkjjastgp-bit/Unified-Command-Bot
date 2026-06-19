const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    init(client) {
        console.log("🚀 [autoPostManager] Background wheels activated successfully with smart text encryption.");

        setInterval(async () => {
            const now = Date.now();
            if (!global.storesData) return;

            for (const [storeId, store] of global.storesData.entries()) {
                const channel = client.channels.cache.get(storeId);
                if (!store.autoPost || !store.autoPost.isActive) continue;

                // 1. التحقق من انتهاء مدة الباقة
                if (now >= store.autoPost.expiresAt) {
                    store.autoPost.isActive = false;
                    if (global.saveStoresData) global.saveStoresData();
                    const guild = channel?.guild || client.guilds.cache.first();
                    const owner = await guild?.members.fetch(store.ownerId).catch(() => null);
                    await owner?.send({ content: `⏰ انتهت مدة باقة النشر التلقائي لمتجرك ${channel ?? ''}. يمكنك التجديد من لوحة إعدادات المتجر.` }).catch(() => {});
                    continue;
                }

                // 2. دورة العمولات اليومية (كل 24 ساعة)
                if (!store.autoPost.lastFeeCheckTime) store.autoPost.lastFeeCheckTime = store.autoPost.activatedAt || now;
                const twentyFourHours = 24 * 60 * 60 * 1000;
                const guild = channel?.guild || client.guilds.cache.first();

                if (now - store.autoPost.lastFeeCheckTime >= twentyFourHours) {
                    if (!store.autoPost.dailyFeePaidToday) {
                        store.autoPost.unpaidDaysCount = (store.autoPost.unpaidDaysCount || 0) + 1;
                        // تذكير العمولة المتأخرة بالخاص
                        if (store.autoPost.planType !== 'day') {
                            const owner = await guild?.members.fetch(store.ownerId).catch(() => null);
                            await owner?.send({
                                content: `⚠️ **تذكير عمولة:** لم تدفع عمولة اليوم لخدمة النشر التلقائي في متجرك ${channel ?? ''}.\n• الأيام المتراكمة غير المدفوعة: \`${store.autoPost.unpaidDaysCount}\`\n• ادفع العمولة اليومية عبر لوحة إعدادات متجرك لتجنب تباطؤ أو إيقاف النشر.`
                            }).catch(() => {});
                        }
                    } else {
                        store.autoPost.dailyFeePaidToday = false;
                        // تذكير بداية يوم جديد للعمولة
                        if (store.autoPost.planType !== 'day') {
                            const owner = await guild?.members.fetch(store.ownerId).catch(() => null);
                            await owner?.send({
                                content: `💰 **تذكير يومي:** حان موعد دفع عمولة اليوم لاستمرار خدمة النشر التلقائي في متجرك ${channel ?? ''}.\nادفع من لوحة إعدادات متجرك للحفاظ على سرعة النشر الكاملة.`
                            }).catch(() => {});
                        }
                    }
                    store.autoPost.lastFeeCheckTime = now;
                    if (global.saveStoresData) global.saveStoresData();
                }

                // 3. حساب سرعة النشر بناءً على حالة العمولة
                let currentIntervalHours = 1;

                if (store.autoPost.planType === 'day2') {
                    if (!store.autoPost.dailyFeePaidToday) currentIntervalHours = 3;
                } else if (store.autoPost.planType === 'week') {
                    if ((store.autoPost.unpaidDaysCount || 0) >= 2) {
                        const fiveHours = 5 * 60 * 60 * 1000;
                        if (store.autoPost.lastPostTime && (now - store.autoPost.lastPostTime < fiveHours)) {
                            const owner = await guild?.members.fetch(store.ownerId).catch(() => null);
                            if (owner && (!store.autoPost.lastDmWarnTime || now - store.autoPost.lastDmWarnTime > 60 * 60 * 1000)) {
                                await owner.send({ content: `⛔ **إيقاف مؤقت:** تم تجميد النشر التلقائي لمتجرك ${channel ?? ''} بسبب تراكم عمولتين غير مدفوعتين. ادفع العمولة لاستعادة النشر.` }).catch(() => {});
                                store.autoPost.lastDmWarnTime = now;
                                if (global.saveStoresData) global.saveStoresData();
                            }
                            continue;
                        }
                    } else if (!store.autoPost.dailyFeePaidToday) {
                        currentIntervalHours = 2;
                    }
                }

                const requiredCooldown = currentIntervalHours * 60 * 60 * 1000;
                if (store.autoPost.lastPostTime && (now - store.autoPost.lastPostTime < requiredCooldown)) continue;

                // 4. التحقق من رصيد المنشنات
                if (!store.mentions) store.mentions = { everyoneLeft: 0, hereLeft: 0 };
                const type = store.autoPost.mentionType;
                let chosenMention = '@everyone';
                if (type === 'here') chosenMention = '@here';
                else if (type === 'random') chosenMention = Math.random() > 0.5 ? '@everyone' : '@here';

                if (chosenMention === '@everyone' && store.mentions.everyoneLeft <= 0) {
                    const owner = await guild?.members.fetch(store.ownerId).catch(() => null);
                    await owner?.send({ content: `🪫 **رصيد المنشنات نفد!** متجرك ${channel ?? ''} لا يملك رصيداً كافياً من \`@everyone\` لمواصلة النشر التلقائي. اشحن منشنات من لوحة إعدادات متجرك.` }).catch(() => {});
                    continue;
                }
                if (chosenMention === '@here' && store.mentions.hereLeft <= 0) {
                    const owner = await guild?.members.fetch(store.ownerId).catch(() => null);
                    await owner?.send({ content: `🪫 **رصيد المنشنات نفد!** متجرك ${channel ?? ''} لا يملك رصيداً كافياً من \`@here\` لمواصلة النشر التلقائي. اشحن منشنات من لوحة إعدادات متجرك.` }).catch(() => {});
                    continue;
                }

                // 5. تنفيذ النشر مع التشفير الاحترافي
                if (channel) {
                    const rawText = store.autoPost.text || "متوفر مبيعات المتاجر الموثقة";
                    const targetWords = ['مطلوب', 'كريدت', 'كاش', 'بيع', 'للبيع', 'متوفر', 'شراء', 'سيرفر', 'حساب', 'حسابات', 'خصم', 'عرض', 'متوفرة', 'فيزا', 'بنك', 'متجر', 'مبيعات'];

                    let wordsArray = rawText.split(/\s+/);
                    for (let i = 0; i < wordsArray.length; i++) {
                        if (wordsArray[i].startsWith('http') || wordsArray[i].startsWith('<:') || wordsArray[i].startsWith('<a:')) continue;
                        let cleanWord = wordsArray[i].toLowerCase().replace(/[^а-яёА-ЯЁa-zA-Z0-9\u0600-\u06FF]/g, "");
                        if (targetWords.includes(cleanWord)) {
                            let mid = Math.floor(wordsArray[i].length / 2);
                            if (mid === 0) mid = 1;
                            wordsArray[i] = wordsArray[i].substring(0, mid) + '¹' + wordsArray[i].substring(mid);
                        }
                    }
                    const encryptedPostText = wordsArray.join(' ');

                    const mentionLabel = chosenMention === '@everyone' ? 'everyone' : 'here';
                    await channel.send({
                        content: `${chosenMention}\n\n${encryptedPostText}\nصاحب متجر: <@${store.ownerId}>\nمنشن: @${mentionLabel}`
                    }).catch(() => {});

                    if (store.settings?.autoLine && store.settings?.lineImageUrl) {
                        await channel.send({ content: store.settings.lineImageUrl }).catch(() => {});
                    }

                    if (chosenMention === '@everyone') store.mentions.everyoneLeft = Math.max(0, store.mentions.everyoneLeft - 1);
                    else store.mentions.hereLeft = Math.max(0, store.mentions.hereLeft - 1);

                    store.autoPost.lastPostTime = now;

                    if (!store.autoPost.runHoursCount) store.autoPost.runHoursCount = 0;
                    store.autoPost.runHoursCount += 1;
                    if (store.autoPost.runHoursCount >= 5) {
                        if (chosenMention === '@everyone') store.mentions.everyoneLeft = Math.max(0, store.mentions.everyoneLeft - 5);
                        else store.mentions.hereLeft = Math.max(0, store.mentions.hereLeft - 5);
                        store.autoPost.runHoursCount = 0;
                    }

                    if (global.saveStoresData) global.saveStoresData();
                }
            }
        }, 60000);
    },

    // ─── معالج الرسائل المكتوبة: أمر إيقاف نشر وأمر تغيير ───
    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;

        const storeData = global.storesData?.get(message.channel.id);
        if (!storeData) return;
        if (message.author.id !== storeData.ownerId) return;

        // ── أمر إيقاف النشر: يطلب تأكيد أولاً ──
        if (message.content === 'إيقاف نشر') {
            if (!storeData.autoPost || !storeData.autoPost.isActive) {
                const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                await member?.send({ content: '❌ خدمة النشر التلقائي غير مفعلة في متجرك حالياً.' }).catch(() => {});
                return message.delete().catch(() => {});
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('stop_autopost_yes').setLabel('نعم، أوقف النشر').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('stop_autopost_no').setLabel('لا، إلغاء').setStyle(ButtonStyle.Secondary)
            );

            return message.reply({
                content: '⚠️ هل أنت متأكد أنك تريد إيقاف خدمة النشر التلقائي لمتجرك؟',
                components: [row]
            }).catch(() => {});
        }

        // ── أمر تغيير نص الإعلان ──
        if (message.content.startsWith('تغيير')) {
            if (!storeData.autoPost || !storeData.autoPost.isActive) {
                const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                await member?.send({ content: '❌ لست مشتركاً في خدمة النشر التلقائي حالياً. فعّل الخدمة أولاً من لوحة إعدادات متجرك.' }).catch(() => {});
                return message.delete().catch(() => {});
            }

            const newText = message.content.replace('تغيير', '').trim();
            if (!newText) {
                return message.reply({ content: '✍️ اكتب النص الجديد بعد كلمة تغيير مباشرة. مثال: `تغيير متوفر حسابات جاهزة`' }).catch(() => {});
            }

            storeData.autoPost.text = newText;
            if (global.saveStoresData) global.saveStoresData();

            return message.reply({ content: '✅ تم تحديث نص إعلان النشر التلقائي لمتجرك بنجاح!' }).catch(() => {});
        }
    },

    // ─── معالج أزرار تأكيد إيقاف النشر ───
    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('stop_autopost_')) return;

        const channelId = interaction.channelId ?? interaction.channel?.id;
        if (!channelId) return;

        const storeData = global.storesData?.get(channelId);
        if (!storeData) return;
        if (interaction.user.id !== storeData.ownerId) return;

        if (interaction.customId === 'stop_autopost_yes') {
            storeData.autoPost.isActive = false;
            storeData.autoPost.planType = null;
            storeData.autoPost.text = null;
            if (global.saveStoresData) global.saveStoresData();
            return interaction.update({ content: '🔴 تم إيقاف خدمة النشر التلقائي لمتجرك بنجاح.', components: [] });
        }

        if (interaction.customId === 'stop_autopost_no') {
            return interaction.update({ content: '✅ تم الإلغاء — النشر التلقائي لا يزال نشطاً.', components: [] });
        }
    }
};

// ═══════════════════════════════════════════════
//         نظام معاملات المتاجر المالية
// ═══════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

const BANK_CHANNEL_ID = config.stores.bankChannelId;
const LOG_CHANNEL_ID  = config.stores.logChannelId;
const BANK_ACCOUNT_ID = config.ownerId;
const PROBOT_ID       = config.probotId;

const ACTION_LABELS = {
    change_name:       { icon: '✏️',  title: 'تغيير اسم المتجر',          color: '#3498db' },
    change_owner:      { icon: '👑',  title: 'نقل ملكية المتجر',          color: '#e67e22' },
    buy_mentions:      { icon: '🛒',  title: 'شراء منشنات إضافية',        color: '#2ecc71' },
    remove_warnings:   { icon: '🛡️',  title: 'إزالة تحذيرات المخالفات',   color: '#9b59b6' },
    buy_autopost:      { icon: '🚀',  title: 'تفعيل خدمة النشر التلقائي', color: '#1abc9c' },
    buy_autoline:      { icon: '🎨',  title: 'تفعيل الخط التلقائي',       color: '#f1c40f' },
    change_store_type: { icon: '⚡',  title: 'تغيير فئة المتجر',          color: '#34495e' },
    buy_discount_box:  { icon: '🎁',  title: 'شراء بوكس الخصم (20٪)',    color: '#e91e8c' }
};

module.exports = {
    init(client) {
        console.log('[dbManager] تهيئة نظام المعاملات — تنظيف تلقائي كل 30 ثانية.');
        setInterval(() => {
            if (!global.storesData) return;
            const now = Date.now();
            let changed = false;
            for (const [, store] of global.storesData.entries()) {
                if (store.pendingTransactions && (now - store.pendingTransactions.createdAt > 5 * 60 * 1000)) {
                    store.pendingTransactions = null;
                    changed = true;
                }
            }
            if (changed && global.saveStoresData) global.saveStoresData();
        }, 30_000);
    },

    async handleMessage(message) {
        if (message.channel.id !== BANK_CHANNEL_ID || message.author.id !== PROBOT_ID) return;

        const content = message.content || message.embeds?.[0]?.description || message.embeds?.[0]?.title || '';
        if (!content) return;

        const lower = content.toLowerCase();
        const isTransfer = lower.includes('has transferred') || lower.includes('قام بتحويل') || lower.includes('حوّل');
        if (!isTransfer) return;

        const mentionMatches = [...content.matchAll(/<@!?(\d+)>/g)];
        const mentionedIds = mentionMatches.map(m => m[1]);

        if (mentionedIds.length >= 2 && mentionedIds[1] !== BANK_ACCOUNT_ID) return;
        if (mentionedIds.length === 1 && mentionedIds[0] !== BANK_ACCOUNT_ID) return;

        const cleanContent = content.replace(/[$,،]/g, '');
        const allNumbers = (cleanContent.match(/\d+/g) || []).map(Number);
        const shortNumbers = allNumbers.filter(n => String(n).length <= 14 && n > 100);
        if (!shortNumbers.length) return;

        const transferredAmount = Math.max(...shortNumbers);
        if (!transferredAmount || transferredAmount <= 0) return;

        let matchedStoreId = null;
        let matchedStoreData = null;
        const senderId = mentionedIds.length >= 2 ? mentionedIds[0] : null;

        for (const [storeId, store] of global.storesData.entries()) {
            const tx = store.pendingTransactions;
            if (!tx) continue;
            if (senderId && tx.userId !== senderId) continue;

            const base = tx.amount;
            const code = tx.verificationCode;
            const expectedWithTax    = Math.floor((base + code) / 0.95);
            const expectedWithTaxAlt = Math.ceil((base + code) / 0.95);
            const expectedNoTax      = base + code;

            const diff       = Math.abs(transferredAmount - expectedWithTax);
            const diffAlt    = Math.abs(transferredAmount - expectedWithTaxAlt);
            const diffNoTax  = Math.abs(transferredAmount - expectedNoTax);

            if (diff <= 2 || diffAlt <= 2 || diffNoTax <= 2) {
                matchedStoreId   = storeId;
                matchedStoreData = store;
                break;
            }
        }

        if (!matchedStoreData) return;

        const tx      = matchedStoreData.pendingTransactions;
        const channel = message.guild.channels.cache.get(matchedStoreId);
        await this.executeTransactionAction(message.guild, channel, matchedStoreData, tx, transferredAmount);
    },

    createPendingTransaction(storeId, userId, amount, actionType, metaData = {}) {
        const store = global.storesData.get(storeId);
        if (!store) return null;
        const verificationCode = Math.floor(100 + Math.random() * 900);
        store.pendingTransactions = { userId, amount, verificationCode, actionType, metaData, createdAt: Date.now() };
        if (global.saveStoresData) global.saveStoresData();
        return verificationCode;
    },

    async executeTransactionAction(guild, channel, store, transaction, totalPaid) {
        const { actionType, metaData, userId } = transaction;
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        const meta       = ACTION_LABELS[actionType] || { icon: '⚙️', title: 'عملية غير معروفة', color: '#5865f2' };
        const owner      = await guild.members.fetch(userId).catch(() => null);
        let actionSummary = '—';
        let notifyMsg = null;

        try {
            switch (actionType) {
                case 'change_name': {
                    if (channel) {
                        const emoji = channel.name.replace(/[a-zA-Z0-9\s\u0600-\u06FF]/g, '');
                        await channel.setName(`${metaData.newName}${emoji}`).catch(() => {});
                        actionSummary = `الاسم الجديد: **${metaData.newName}**`;
                    }
                    notifyMsg = `✅ <@${userId}> تم تغيير اسم متجرك بنجاح إلى **${metaData.newName}**`;
                    break;
                }
                case 'change_owner': {
                    if (channel) {
                        await channel.permissionOverwrites.edit(userId,              { ViewChannel: false, SendMessages: false }).catch(() => {});
                        await channel.permissionOverwrites.edit(metaData.newOwnerId, { ViewChannel: true,  SendMessages: true, MentionEveryone: true }).catch(() => {});
                        store.ownerId = metaData.newOwnerId;
                        if (global.saveStoresData) global.saveStoresData();
                    }
                    actionSummary = `المالك الجديد: <@${metaData.newOwnerId}>`;
                    notifyMsg = `👑 <@${userId}> تم نقل ملكية متجرك إلى <@${metaData.newOwnerId}> بنجاح`;
                    break;
                }
                case 'buy_mentions': {
                    if (!store.mentions) store.mentions = { everyoneLeft: 0, hereLeft: 0 };
                    const key = metaData.mentionType === 'everyone' ? 'everyoneLeft' : 'hereLeft';
                    store.mentions[key] += metaData.count;
                    actionSummary = `\`@${metaData.mentionType}\` — مضاف: \`${metaData.count}\` | الرصيد: \`${store.mentions[key]}\``;
                    notifyMsg = `🛒 <@${userId}> تم إضافة منشن بنجاح! عدد منشنات \`@${metaData.mentionType}\`: \`${store.mentions[key]}\``;
                    break;
                }
                case 'remove_warnings': {
                    const before = store.warnings || 0;
                    store.warnings = Math.max(0, before - metaData.count);
                    actionSummary = `قبل: \`${before}\` ← بعد: \`${store.warnings}\``;
                    notifyMsg = `🛡️ <@${userId}> تم إزالة تحذير بنجاح! المتبقي: \`${store.warnings}\` تحذير`;
                    break;
                }
                case 'buy_autopost': {
                    const daysMap = { day: 1, day2: 2, week: 7 };
                    const days = daysMap[metaData.planType] ?? 1;
                    store.autoPost = {
                        isActive: true, planType: metaData.planType, text: metaData.text,
                        allowChange: metaData.allowChange, mentionType: metaData.mentionType,
                        lastPostTime: 0, activatedAt: Date.now(), expiresAt: Date.now() + days * 86400000,
                        dailyFeePaidToday: true, unpaidDaysCount: 0, speedHours: 1
                    };
                    actionSummary = `الباقة: \`${metaData.planType}\` | المنشن: \`@${metaData.mentionType}\` | المدة: ${days} يوم`;
                    notifyMsg = `🚀 <@${userId}> تم تفعيل النشر التلقائي لمتجرك بنجاح!`;
                    await owner?.send({
                        content: `✅ **تم تفعيل النشر التلقائي لمتجرك** ${channel ?? ''}!\n\n📌 **أوامر مهمة:**\n• \`تغيير (النص الجديد)\` — لتعديل نص إعلانك\n• \`إيقاف نشر\` — لإيقاف الخدمة`
                    }).catch(() => {});
                    break;
                }
                case 'buy_autoline': {
                    if (!store.settings) store.settings = {};
                    store.settings.autoLine = true;
                    actionSummary = 'تم تفعيل ميزة الخط التلقائي';
                    notifyMsg = `🎨 <@${userId}> تم تفعيل الخط التلقائي لمتجرك بنجاح`;
                    break;
                }
                case 'change_store_type': {
                    const oldType = store.storeType;
                    store.storeType = metaData.newType;
                    actionSummary = `\`${oldType}\` ← \`${metaData.newType}\``;
                    notifyMsg = `⚡ <@${userId}> تم تغيير فئة متجرك إلى \`${metaData.newType}\` بنجاح`;
                    break;
                }
                case 'buy_discount_box': {
                    if (!store.discountBox) store.discountBox = { usedCount: 0, lastUsedTime: 0 };
                    store.discountBox.usedCount   += 1;
                    store.discountBox.lastUsedTime = Date.now();
                    actionSummary = `فعال لمدة 48 ساعة | إجمالي مرات الاستخدام: \`${store.discountBox.usedCount}\``;
                    notifyMsg = `🎁 <@${userId}> تم تفعيل بوكس الخصم 20٪ لمتجرك لمدة 48 ساعة!`;
                    await owner?.send({
                        content: `🎁 **تم تفعيل بوكس الخصم لمتجرك!**\n• خصم **20٪** على شحن المنشنات، إزالة التحذيرات، تغيير الفئة، والنشر التلقائي.\n⏰ ينتهي بعد 48 ساعة.`
                    }).catch(() => {});
                    break;
                }
            }

            if (channel && notifyMsg) {
                channel.send({ content: notifyMsg }).then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 10_000);
                }).catch(() => {});
            }

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(meta.color)
                    .setAuthor({ name: `${meta.icon} ${meta.title}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
                    .setDescription(
                        `> 👤 **المتجر:** ${channel ? `${channel}` : '`روم محذوف`'}\n` +
                        `> 📋 **التفاصيل:** ${actionSummary}`
                    )
                    .addFields(
                        { name: '💳 العميل', value: `<@${userId}>\n\`${userId}\``, inline: true },
                        { name: '💰 المبلغ', value: `\`${totalPaid.toLocaleString('ar-SA')}\` كريدت`, inline: true },
                        { name: '🕐 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: `كود التحقق: ${transaction.verificationCode}` })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }

        } catch (error) {
            console.error(`[dbManager] خطأ في تنفيذ "${actionType}":`, error);
        }

        store.pendingTransactions = null;
        if (global.saveStoresData) global.saveStoresData();
    }
};

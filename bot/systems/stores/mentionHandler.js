// ═══════════════════════════════════════════════
//         نظام رقابة المنشنات في رومات المتاجر
// ═══════════════════════════════════════════════

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

const STAFF_ROLE_ID = config.stores.staffRoleId;

module.exports = {
    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;

        const storeData = global.storesData?.get(message.channel.id);
        if (!storeData) return;

        const hasEveryone = message.content.includes('@everyone');
        const hasHere     = message.content.includes('@here');
        if (!hasEveryone && !hasHere) return;

        if (message.author.id !== storeData.ownerId) {
            try { await message.delete(); } catch (e) {}
            return;
        }

        const now     = Date.now();
        const oneHour = 60 * 60 * 1000;

        // فحص الكلمات الحساسة
        const forbiddenWords = [
            'مطلوب', 'للبيع', 'متوفر', 'شراء', 'سيرفر', 'حساب', 'حسابات',
            'خصم', 'عرض', 'كاش', 'كريدت', 'متوفرة', 'فيزا', 'بنك', 'متجر', 'مبيعات'
        ];
        const wordsInMessage = message.content.toLowerCase().split(/\s+/);
        let matchedWord = null;
        for (const word of forbiddenWords) {
            if (wordsInMessage.includes(word)) { matchedWord = word; break; }
        }

        if (matchedWord) {
            await this.applyWarning(
                message.guild, message.channel, storeData,
                `❌ **رصد مخالفة نظام التشفير:** تم استخدام كلمة غير مشفرة (\`${matchedWord}\`) في إعلانك!`
            );
            return;
        }

        // فحص المنشن المتتالي السريع
        if (storeData.cooldowns?.lastMentionTime && (now - storeData.cooldowns.lastMentionTime < 5000)) {
            await this.applyWarning(
                message.guild, message.channel, storeData,
                '⚠️ **رصد محاولة تخريبية:** منشن متتالي وسريع جداً!'
            );
            return;
        }

        // فحص ساعة الانتظار
        if (storeData.cooldowns?.lastMentionTime && (now - storeData.cooldowns.lastMentionTime < oneHour)) {
            const timeLeft = Math.ceil((oneHour - (now - storeData.cooldowns.lastMentionTime)) / 60000);
            await this.applyWarning(
                message.guild, message.channel, storeData,
                `⏰ **مخالفة مؤقت المنشن:** باقي لك \`${timeLeft}\` دقيقة قبل المنشن التالي.`
            );
            return;
        }

        if (!storeData.mentions) storeData.mentions = { everyoneLeft: 0, hereLeft: 0 };

        if (hasEveryone) {
            if (storeData.mentions.everyoneLeft <= 0) {
                await this.lockStoreChannelDueToNoBalance(message, storeData, '@everyone');
                return;
            }
            storeData.mentions.everyoneLeft--;
            if (!storeData.cooldowns) storeData.cooldowns = {};
            storeData.cooldowns.lastMentionType = 'everyone';
        } else if (hasHere) {
            if (storeData.mentions.hereLeft <= 0) {
                await this.lockStoreChannelDueToNoBalance(message, storeData, '@here');
                return;
            }
            storeData.mentions.hereLeft--;
            if (!storeData.cooldowns) storeData.cooldowns = {};
            storeData.cooldowns.lastMentionType = 'here';
        }

        storeData.cooldowns.lastMentionTime = now;
        if (global.saveStoresData) global.saveStoresData();

        if (storeData.settings?.autoLine && storeData.settings?.lineImageUrl) {
            await message.channel.send({ content: storeData.settings.lineImageUrl }).catch(() => {});
        }
    },

    async lockStoreChannelDueToNoBalance(message, storeData, mentionType) {
        try { await message.delete(); } catch (e) {}
        storeData.warnings = (storeData.warnings || 0) + 1;
        if (global.saveStoresData) global.saveStoresData();

        await message.channel.permissionOverwrites.set([
            { id: message.guild.id,          deny: [PermissionFlagsBits.ViewChannel] },
            { id: storeData.ownerId,          allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
            { id: STAFF_ROLE_ID,              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: message.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
        ], 'قفل تلقائي بسبب نفاد رصيد المنشنات').catch(() => {});

        const lockedEmbed = new EmbedBuilder()
            .setTitle('🔒 تجميد وقفل المتجر تلقائياً')
            .setDescription(`⚠️ تم قفل المتجر بسبب محاولة المنشن \`${mentionType}\` بدون رصيد كافٍ!`)
            .addFields(
                { name: '📊 عدد التحذيرات:', value: `\`${storeData.warnings} / 5\``, inline: true },
                { name: '👤 مالك المتجر:',   value: `<@${storeData.ownerId}>`,       inline: true }
            )
            .setColor('#ff3333')
            .setFooter({ text: 'لن يتم فتح الروم إلا بعد شحن الرصيد من لوحة إعدادات المتجر.' });

        await message.channel.send({ content: `<@${storeData.ownerId}>`, embeds: [lockedEmbed] }).catch(() => {});

        const owner = await message.guild.members.fetch(storeData.ownerId).catch(() => null);
        if (owner) {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🏪 تنبيه عاجل: تم قفل متجرك!')
                .setDescription(`قمت بمحاولة منشن \`${mentionType}\` في روم متجرك <#${message.channel.id}> بينما رصيدك \`0\`!\n\n📥 اكتب كلمة \`منشن\` في شات متجرك للشراء.`)
                .setColor('#f1c40f')
                .setTimestamp();
            await owner.send({ embeds: [dmEmbed] }).catch(() => {});
        }
    },

    async applyWarning(guild, channel, storeData, warningReason) {
        storeData.warnings = (storeData.warnings || 0) + 1;
        if (global.saveStoresData) global.saveStoresData();

        const warningEmbed = new EmbedBuilder()
            .setTitle('⚠️ نظام الرقابة والتحذيرات الصارم')
            .setDescription(`${warningReason}\n\n📊 عدد تحذيرات متجرك: \`${storeData.warnings} / 5\``)
            .setColor('#ff3333')
            .setFooter({ text: 'عند 5 تحذيرات سيتم حذف متجرك تلقائياً!' });

        await channel.send({ content: `<@${storeData.ownerId}>`, embeds: [warningEmbed] }).catch(() => {});

        if (storeData.warnings >= 5) {
            await channel.send({ content: '🚨 **[تلقائي]** وصل المتجر للحد الأقصى (5/5)، جاري الحذف...' }).catch(() => {});
            setTimeout(async () => {
                global.storesData.delete(channel.id);
                if (global.saveStoresData) global.saveStoresData();
                await channel.delete('تجاوز الحد الأقصى للتحذيرات').catch(() => {});
            }, 5000);
        }
    }
};

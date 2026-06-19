// ═══════════════════════════════════════════════
//         نظام أزرار لوحة إدارة المتجر
// ═══════════════════════════════════════════════

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const dbManager = require('./dbManager.js');
const { encryptText } = require('./autoPostManager.js');

function getDiscountedPrice(storeData, basePrice, actionType) {
    if (!storeData.discountBox || storeData.discountBox.usedCount === 0) return basePrice;
    const now = Date.now();
    if (now - storeData.discountBox.lastUsedTime > 172800000) return basePrice;
    const eligible = ['buy_mentions', 'remove_warnings', 'change_store_type', 'buy_autopost'];
    if (eligible.includes(actionType)) return Math.floor(basePrice * 0.80);
    return basePrice;
}

const _processedMsgIds = new Set();

module.exports = {
    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;
        if (message.content !== 'منشن') return;

        if (_processedMsgIds.has(message.id)) return;
        _processedMsgIds.add(message.id);
        setTimeout(() => _processedMsgIds.delete(message.id), 10000);

        const storeData = global.storesData?.get(message.channel.id);
        if (!storeData) return;

        const allowedTypes = ['VIP', 'دايموند', 'ذهبي', 'برونزي'];
        if (!allowedTypes.includes(storeData.storeType)) return;
        if (message.author.id !== storeData.ownerId) {
            return message.reply({ content: '❌ هذا الأمر مخصص لصاحب المتجر فقط!', flags: 64 }).catch(() => {});
        }

        const nowTime = Date.now();
        if (!storeData.cooldowns) storeData.cooldowns = { lastMentionTime: 0, lastMentionType: null, lastMenuOpenTime: 0 };

        if (storeData.cooldowns.lastMenuOpenTime > 0 && (nowTime - storeData.cooldowns.lastMenuOpenTime < 300000)) {
            const minutesLeft = Math.ceil((300000 - (nowTime - storeData.cooldowns.lastMenuOpenTime)) / 60000);
            const msgCooldown = await message.channel.send({ content: `⚠️ الرجاء الانتظار \`${minutesLeft}\` دقائق قبل فتح اللوحة مجدداً.` }).catch(() => null);
            if (msgCooldown) setTimeout(() => msgCooldown.delete().catch(() => {}), 5000);
            return;
        }

        storeData.cooldowns.lastMenuOpenTime = nowTime;
        if (global.saveStoresData) global.saveStoresData();
        message.delete().catch(() => {});

        const storeColor = storeData.settings?.embedColor || '#2b2d31';
        const mainEmbed = new EmbedBuilder()
            .setTitle('⚙️ لوحة إدارة متجرك والمنشنات المركزية')
            .setDescription('اضغط على الأزرار أدناه لفتح الإعدادات والعمليات بشكل مخفي وسري:')
            .setColor(storeColor)
            .addFields(
                { name: '📢 رصيد @everyone:', value: `\`${storeData.mentions?.everyoneLeft || 0}\` منشن`, inline: true },
                { name: '🔔 رصيد @here:',    value: `\`${storeData.mentions?.hereLeft || 0}\` منشن`,    inline: true },
                { name: '⚠️ التحذيرات:',     value: `\`${storeData.warnings || 0} / 5\``,               inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('store_btn_buy_mentions').setLabel('🛒 شراء منشن').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('store_btn_encrypt').setLabel('🔐 تشفير نص').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('store_btn_settings').setLabel('⚙️ إعدادات المتجر').setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({ embeds: [mainEmbed], components: [row] });
    },

    async handleInteraction(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const channelId = interaction.channelId ?? interaction.channel?.id;
        if (!channelId) return;

        const storeData = global.storesData?.get(channelId);
        if (!storeData) return;

        if (interaction.user.id !== storeData.ownerId) {
            return interaction.reply({ content: '❌ هذه اللوحة محمية لصاحب المتجر فقط!', flags: 64 });
        }

        const storeColor = storeData.settings?.embedColor || '#5865f2';

        // ─── تشفير النص ───
        if (interaction.customId === 'store_btn_encrypt') {
            const modal = new ModalBuilder().setCustomId('store_modal_encrypt').setTitle('🔐 تشفير الكلمات');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('text_to_encrypt').setLabel('اكتب النص المراد تشفيره:')
                    .setStyle(TextInputStyle.Paragraph).setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'store_modal_encrypt') {
            await interaction.deferReply({ flags: 64 });
            const rawText = interaction.fields.getTextInputValue('text_to_encrypt');
            return interaction.editReply({ content: encryptText(rawText), flags: 64 });
        }

        // ─── إعدادات المتجر ───
        if (interaction.customId === 'store_btn_settings') {
            const hasDiscount = storeData.discountBox?.usedCount > 0 && (Date.now() - storeData.discountBox.lastUsedTime < 172800000);
            const settingsEmbed = new EmbedBuilder()
                .setTitle('⚙️ قائمة التحكم وإعدادات المتجر')
                .setColor(storeColor)
                .addFields(
                    { name: '⚠️ التحذيرات:',       value: `\`${storeData.warnings || 0} / 5\``,                                                    inline: true },
                    { name: '🚀 النشر التلقائي:',   value: storeData.autoPost?.isActive ? `🟢 شغال (${storeData.autoPost.planType})` : '🔴 معطل', inline: true },
                    { name: '🎁 بوكس الخصم (20%):', value: hasDiscount ? '🟢 فعال' : '🔴 غير فعال',                                               inline: true }
                );

            const r1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('store_opt_change_name').setLabel('📝 تغيير الاسم').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('store_opt_change_owner').setLabel('👑 تغيير المالك').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('store_opt_change_type').setLabel('⚡ تغيير النوع').setStyle(ButtonStyle.Secondary)
            );
            const r2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('store_opt_remove_warnings').setLabel('🛡️ إزالة تحذير').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('store_opt_buy_autopost').setLabel('🚀 النشر التلقائي').setStyle(ButtonStyle.Secondary)
            );
            const r3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('store_opt_buy_line').setLabel('🎨 الخط التلقائي').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('store_opt_buy_discount').setLabel('🎁 بوكس الخصم 20٪').setStyle(ButtonStyle.Success)
            );
            const r4 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('store_btn_delete').setLabel('🔴 حذف المتجر نهائياً').setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [settingsEmbed], components: [r1, r2, r3, r4], flags: 64 });
        }

        // ─── شراء منشن ───
        if (interaction.customId === 'store_btn_buy_mentions') {
            const pE = getDiscountedPrice(storeData, 600000, 'buy_mentions');
            const pH = getDiscountedPrice(storeData, 500000, 'buy_mentions');
            const mentEmbed = new EmbedBuilder()
                .setTitle('🛒 شحن رصيد منشنات المتجر')
                .setDescription(`📢 **سعر @everyone:** \`${pE.toLocaleString()}\` كريدت\n🔔 **سعر @here:** \`${pH.toLocaleString()}\` كريدت`)
                .setColor(storeColor);
            const mentRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('store_ment_buy_everyone').setLabel('📢 شحن @everyone').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('store_ment_buy_here').setLabel('🔔 شحن @here').setStyle(ButtonStyle.Success)
            );
            return interaction.reply({ embeds: [mentEmbed], components: [mentRow], flags: 64 });
        }

        if (interaction.customId === 'store_ment_buy_everyone' || interaction.customId === 'store_ment_buy_here') {
            const mType = interaction.customId === 'store_ment_buy_everyone' ? 'everyone' : 'here';
            const countRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`store_order_ment_${mType}_1`).setLabel('1 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`store_order_ment_${mType}_2`).setLabel('2 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`store_order_ment_${mType}_3`).setLabel('3 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`store_order_ment_${mType}_4`).setLabel('4 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`store_order_ment_${mType}_5`).setLabel('5 🔢').setStyle(ButtonStyle.Primary)
            );
            return interaction.update({ content: `🔢 اختر كمية منشنات \`@${mType}\` للشحن:`, embeds: [], components: [countRow], flags: 64 });
        }

        if (interaction.customId.startsWith('store_order_ment_')) {
            await interaction.deferReply({ flags: 64 });
            const parts       = interaction.customId.split('_');
            const mentionType = parts[3];
            const count       = parseInt(parts[4]);
            const singlePrice = mentionType === 'everyone' ? 600000 : 500000;
            const basePrice   = getDiscountedPrice(storeData, singlePrice * count, 'buy_mentions');
            const code        = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'buy_mentions', { mentionType, count });
            const finalAmount = Math.ceil((basePrice + code) / 0.95);
            return interaction.editReply({
                content: `🛒 **فاتورة شراء ${count} منشن @${mentionType}:**\n• السعر: \`${basePrice.toLocaleString()}\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── تغيير الاسم ───
        if (interaction.customId === 'store_opt_change_name') {
            const modal = new ModalBuilder().setCustomId('store_modal_change_name').setTitle('📝 تغيير اسم المتجر');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('new_name').setLabel('اكتب الاسم الجديد:')
                    .setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(32).setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'store_modal_change_name') {
            await interaction.deferReply({ flags: 64 });
            const newName   = interaction.fields.getTextInputValue('new_name');
            const basePrice = 300000;
            const code      = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'change_name', { newName });
            const finalAmount = Math.ceil((basePrice + code) / 0.95);
            return interaction.editReply({
                content: `📝 **فاتورة تغيير اسم المتجر:**\n• الاسم الجديد: \`${newName}\`\n• السعر: \`${basePrice.toLocaleString()}\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── تغيير المالك ───
        if (interaction.customId === 'store_opt_change_owner') {
            const modal = new ModalBuilder().setCustomId('store_modal_change_owner').setTitle('👑 تغيير مالك المتجر');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('new_owner_id').setLabel('اكتب آيدي المالك الجديد:')
                    .setStyle(TextInputStyle.Short).setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'store_modal_change_owner') {
            await interaction.deferReply({ flags: 64 });
            const newOwnerId  = interaction.fields.getTextInputValue('new_owner_id').trim();
            const basePrice   = 500000;
            const code        = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'change_owner', { newOwnerId });
            const finalAmount = Math.ceil((basePrice + code) / 0.95);
            return interaction.editReply({
                content: `👑 **فاتورة نقل ملكية المتجر:**\n• المالك الجديد: \`${newOwnerId}\`\n• السعر: \`${basePrice.toLocaleString()}\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── إزالة تحذير ───
        if (interaction.customId === 'store_opt_remove_warnings') {
            await interaction.deferReply({ flags: 64 });
            const basePrice   = getDiscountedPrice(storeData, 400000, 'remove_warnings');
            const code        = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'remove_warnings', { count: 1 });
            const finalAmount = Math.ceil((basePrice + code) / 0.95);
            return interaction.editReply({
                content: `🛡️ **فاتورة إزالة تحذير واحد:**\n• السعر: \`${basePrice.toLocaleString()}\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── النشر التلقائي ───
        if (interaction.customId === 'store_opt_buy_autopost') {
            const planRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('store_autopost_day').setLabel('⏱️ يوم واحد').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('store_autopost_day2').setLabel('⚡ يومين').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('store_autopost_week').setLabel('🔥 أسبوع').setStyle(ButtonStyle.Primary)
            );
            return interaction.reply({ content: '🚀 **اختر مدة باقة النشر التلقائي:**', components: [planRow], flags: 64 });
        }

        if (interaction.customId.startsWith('store_autopost_')) {
            const plan = interaction.customId.replace('store_autopost_', '');
            const modal = new ModalBuilder().setCustomId(`store_modal_autopost_${plan}`).setTitle('🚀 بيانات النشر التلقائي');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('post_text').setLabel('نص الإعلان:')
                        .setStyle(TextInputStyle.Paragraph).setMinLength(3).setMaxLength(500).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('post_mention').setLabel('نوع المنشن (everyone / here / random):')
                        .setStyle(TextInputStyle.Short).setMinLength(4).setMaxLength(10).setRequired(true)
                )
            );
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('store_modal_autopost_')) {
            await interaction.deferReply({ flags: 64 });
            const plan        = interaction.customId.replace('store_modal_autopost_', '');
            const postText    = interaction.fields.getTextInputValue('post_text').trim();
            const mentionRaw  = interaction.fields.getTextInputValue('post_mention').trim().toLowerCase();
            const mentionType = ['everyone', 'here', 'random'].includes(mentionRaw) ? mentionRaw : 'everyone';
            const priceMap    = { day: 700000, day2: 1500000, week: 3000000 };
            const labelMap    = { day: 'يوم واحد', day2: 'يومين', week: 'أسبوع كامل' };
            const basePrice   = getDiscountedPrice(storeData, priceMap[plan] ?? 700000, 'buy_autopost');
            const code        = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'buy_autopost', { planType: plan, text: postText, mentionType, allowChange: true });
            const finalAmount = Math.ceil((basePrice + code) / 0.95);
            return interaction.editReply({
                content: `🚀 **فاتورة النشر التلقائي:**\n• الباقة: \`${labelMap[plan]}\`\n• المنشن: \`@${mentionType}\`\n• السعر: \`${basePrice.toLocaleString()}\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── الخط التلقائي ───
        if (interaction.customId === 'store_opt_buy_line') {
            if (storeData.settings?.autoLine) return interaction.reply({ content: '❌ الخط التلقائي مفعل مسبقاً!', flags: 64 });
            const basePrice   = 100000;
            const code        = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'buy_autoline');
            const finalAmount = Math.ceil((basePrice + code) / 0.95);
            return interaction.reply({
                content: `🎨 **فاتورة تفعيل الخط التلقائي:**\n• السعر: \`100,000\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── بوكس الخصم ───
        if (interaction.customId === 'store_opt_buy_discount') {
            const hasDiscount = storeData.discountBox?.usedCount > 0 && (Date.now() - storeData.discountBox.lastUsedTime < 172800000);
            if (hasDiscount) return interaction.reply({ content: '❌ لديك بوكس خصم فعال حالياً!', flags: 64 });
            const basePrice   = 500000;
            const code        = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'buy_discount_box');
            const finalAmount = Math.ceil((basePrice + code) / 0.95);
            return interaction.reply({
                content: `🎁 **فاتورة بوكس الخصم (20٪):**\n• السعر: \`500,000\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── تغيير نوع المتجر ───
        if (interaction.customId === 'store_opt_change_type') {
            const prices = {
                VIP:      getDiscountedPrice(storeData, 2000000, 'change_store_type'),
                دايموند:  getDiscountedPrice(storeData, 1800000, 'change_store_type'),
                ذهبي:     getDiscountedPrice(storeData, 1500000, 'change_store_type'),
                برونزي:   getDiscountedPrice(storeData, 1000000, 'change_store_type')
            };
            const typeRow  = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`store_type_VIP_${prices['VIP']}`).setLabel('👑 VIP').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`store_type_دايموند_${prices['دايموند']}`).setLabel('💎 دايموند').setStyle(ButtonStyle.Success)
            );
            const typeRow2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`store_type_ذهبي_${prices['ذهبي']}`).setLabel('🎖 ذهبي').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`store_type_برونزي_${prices['برونزي']}`).setLabel('🥉 برونزي').setStyle(ButtonStyle.Danger)
            );
            return interaction.update({ content: `فئة متجرك الحالية: \`${storeData.storeType}\`. اختر الفئة الجديدة:`, embeds: [], components: [typeRow, typeRow2], flags: 64 });
        }

        if (interaction.customId.startsWith('store_type_')) {
            await interaction.deferReply({ flags: 64 });
            const parts       = interaction.customId.split('_');
            const newType     = parts[2];
            const rawPrice    = parseInt(parts[3]);
            if (storeData.storeType === newType) return interaction.editReply({ content: '❌ متجرك مسجل بالفعل على نفس الفئة!', flags: 64 });
            const finalPrice  = getDiscountedPrice(storeData, rawPrice, 'change_store_type');
            const code        = dbManager.createPendingTransaction(channelId, interaction.user.id, finalPrice, 'change_store_type', { newType });
            const finalAmount = Math.ceil((finalPrice + code) / 0.95);
            return interaction.editReply({
                content: `⚡ **فاتورة تغيير فئة المتجر إلى \`${newType}\`:**\n• السعر: \`${finalPrice.toLocaleString()}\` كريدت\n• كود التحقق: \`${code}\`\n\n📥 **انسخ الكود في روم الأوامر:**\n\`\`\`\nC ${require('../../config.js').ownerId} ${finalAmount}\n\`\`\``,
                flags: 64
            });
        }

        // ─── حذف المتجر ───
        if (interaction.customId === 'store_btn_delete') {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('store_confirm_delete').setLabel('⚠️ نعم، احذف المتجر!').setStyle(ButtonStyle.Danger)
            );
            return interaction.update({ content: '🚨 **تحذير:** هل أنت متأكد من حذف متجرك نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!', embeds: [], components: [confirmRow], flags: 64 });
        }

        if (interaction.customId === 'store_confirm_delete') {
            await interaction.reply({ content: '🚨 جاري حذف المتجر...', flags: 64 });
            setTimeout(async () => {
                const targetChannel = interaction.channel;
                global.storesData.delete(targetChannel.id);
                if (global.saveStoresData) global.saveStoresData();
                await targetChannel.delete('المالك طلب حذف المتجر يدوياً').catch(() => {});
            }, 3000);
        }
    }
};

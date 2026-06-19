// ═══════════════════════════════════════════════
//         نظام المزادات - المعالج الرئيسي
// ═══════════════════════════════════════════════

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, ChannelType, PermissionFlagsBits, Collection
} = require('discord.js');
const config = require('../../config.js');
const { saveAuction } = require('./auctionData.js');

const cfg = config.auctions;
const activeTickets = new Collection();

// ── إرسال لوحة المزاد الرئيسية ──
async function sendAuctionPanel(channel) {
    const embed = new EmbedBuilder()
        .setTitle('📦 لوحة شراء المزادات الرسمية')
        .setDescription(
            `**مرحباً بك في نظام المزادات الاحترافي!**\n\n` +
            `يمكنك الآن حجز غرف المزاد والبدء في بيع منتجاتك بكل سهولة.\n` +
            `**للبدء، اضغط على زر "شراء مزاد ✨" أدناه.**\n\n` +
            `**💡 لمعرفة كيفية عمل المزادات، يرجى زيارة:** <#${cfg.explanationChannelId}>`
        )
        .setColor('#2b2d31');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('auction_buy_start').setLabel('شراء مزاد ✨').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('auction_show_prices').setLabel('أسعار المنشنات 💰').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// ── بدء عملية الشراء ──
async function handleAuctionStart(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('auction_mention_here').setLabel('here').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('auction_mention_everyone').setLabel('everyone').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        content: '✅ **تم بدء الطلب!** اختر نوع المنشن المطلوبة لمزادك:',
        components: [row],
        flags: 64
    });
}

// ── عرض أسعار المنشنات ──
async function handleShowPrices(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('💰 أسعار المنشنات المتاحة')
        .setDescription(
            `**@everyone:** ${cfg.mentionPrices.everyone.displayPrice} كريدت\n` +
            `**@here:** ${cfg.mentionPrices.here.displayPrice} كريدت\n\n` +
            `*الأسعار قابلة للتغيير، يرجى مراجعتها قبل الشراء.*`
        )
        .setColor('#0099ff');

    await interaction.reply({ embeds: [embed], flags: 64 });
}

// ── اختيار المنشن وفتح تكت المزاد ──
async function handleMentionSelection(interaction, type) {
    const mentionConfig = cfg.mentionPrices[type];
    const user = interaction.user;

    await interaction.deferReply({ flags: 64 });

    try {
        const ticketChannel = await interaction.guild.channels.create({
            name: `auction-${user.username}`,
            type: ChannelType.GuildText,
            parent: cfg.categoryId,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                { id: cfg.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        const verificationCode = Math.floor(100 + Math.random() * 899);

        activeTickets.set(ticketChannel.id, {
            userId: user.id,
            selectedMention: type,
            mentionPrice: mentionConfig.price,
            mentionLabel: mentionConfig.label,
            verificationCode,
            step: 'SELECT_DURATION'
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('👋 مرحباً بك في تكت المزاد')
            .setDescription(
                `مرحباً بك يا <@${user.id}>.\n\n` +
                `اكتب **رقم المدة** اللي تبيها تحت وبس! 👇\n\n` +
                `**⏱️ اختر مدة المزاد:**\n` +
                `**[ 1 ]** 5 دقائق > 1 انعاش\n` +
                `**[ 2 ]** 10 دقائق > 2 انعاش\n` +
                `**[ 3 ]** 15 دقائق > 3 انعاش`
            )
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('auction_close_ticket').setLabel('إغلاق التكت 🔒').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
            content: `<@${user.id}> | <@&${cfg.staffRoleId}>`,
            embeds: [welcomeEmbed],
            components: [row]
        });

        await interaction.editReply({ content: `✅ تم إنشاء تذكرتك: <#${ticketChannel.id}>` });

    } catch (error) {
        console.error('[Auctions] خطأ في إنشاء التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ في إنشاء التكت.' });
    }
}

// ── معالجة رسائل التكت ──
async function handleTicketMessages(message) {
    if (message.author.bot) return;
    const ticketData = activeTickets.get(message.channel.id);
    if (!ticketData || message.author.id !== ticketData.userId) return;

    if (ticketData.step === 'SELECT_DURATION') {
        const choice = message.content.trim();
        if (!['1', '2', '3'].includes(choice)) return;

        const durationConfig = cfg.durations[choice];
        const basePrice = ticketData.mentionPrice + durationConfig.price;
        const finalPrice = Number(basePrice) + Number(ticketData.verificationCode);
        const taxPrice = Math.floor(finalPrice * 20 / 19) + 1;

        ticketData.duration = choice;
        ticketData.totalPrice = finalPrice;
        ticketData.step = 'WAITING_PAYMENT';
        activeTickets.set(message.channel.id, ticketData);

        saveAuction({ ...ticketData, savedAt: new Date().toISOString() });

        const paymentEmbed = new EmbedBuilder()
            .setTitle('💳 تفاصيل الدفع للمزاد')
            .setDescription(
                `**تفاصيل الحجز:**\n` +
                `> **سعر المنشن (${ticketData.mentionLabel}):** \`${ticketData.mentionPrice.toLocaleString()}\` كريدت\n` +
                `> **سعر المدة (${durationConfig.description}):** \`${durationConfig.price.toLocaleString()}\` كريدت\n` +
                `> **المجموع الكلي (الصافي):** \`${finalPrice.toLocaleString()}\` كريدت\n\n` +
                `**رمز التحقق الخاص بك:** \`\`\`\n${ticketData.verificationCode}\`\`\`` +
                `\n\n**لإتمام عملية الشراء، يرجى تحويل المبلغ في روم الأوامر <#${cfg.commandsChannelId}>.**\n` +
                `**💡 سيتم النشر في روم <#${cfg.channels[choice]}>.`
            )
            .setFooter({ text: 'تأكد من تحويل المبلغ الموضح بالضبط لضمان التأكيد التلقائي.' })
            .setColor('#2b2d31');

        await message.channel.send({ embeds: [paymentEmbed] });
        await message.channel.send({ content: `c <@${config.ownerId}> ${taxPrice}` });
    }

    if (ticketData.step === 'FILL_FORM') {
        if (!message.content.includes('المنتج:')) return;

        const lines = message.content.split('\n');
        let item = 'غير محدد';
        let price = 'غير محدد';

        lines.forEach(line => {
            if (line.includes('المنتج:')) item = line.split('المنتج:')[1]?.trim() || 'غير محدد';
            if (line.includes('السعر:'))  price = line.split('السعر:')[1]?.trim() || 'غير محدد';
        });

        const imageUrl = message.attachments.size > 0 ? message.attachments.first().url : null;

        ticketData.step = 'PUBLISHING';
        const auctionChannelId = cfg.channels[ticketData.duration];
        const auctionChannel = message.guild.channels.cache.get(auctionChannelId);

        if (!auctionChannel) return message.channel.send('❌ حدث خطأ: لا يمكن العثور على روم المزاد.');

        const lastMessages = await auctionChannel.messages.fetch({ limit: 1 });
        const isBusy = lastMessages.size > 0 &&
            (Date.now() - lastMessages.first().createdTimestamp < cfg.durations[ticketData.duration].minutes * 60 * 1000);

        if (isBusy) {
            ticketData.step = 'FILL_FORM';
            return message.channel.send('⚠️ **عذراً، روم المزاد مشغول حالياً.** يرجى الانتظار حتى ينتهي المزاد الحالي ثم أرسل النموذج مرة أخرى.');
        }

        activeTickets.set(message.channel.id, ticketData);
        await publishAuction(message.channel, ticketData, item, price, imageUrl);
    }
}

// ── التأكيد اليدوي من الإدارة ──
async function handleAdminConfirmPayment(interaction) {
    if (!interaction.member.roles.cache.has(cfg.staffRoleId)) {
        return interaction.reply({ content: '❌ للمسؤولين فقط!', flags: 64 });
    }

    const ticketData = activeTickets.get(interaction.channel.id);
    if (!ticketData || ticketData.step !== 'WAITING_PAYMENT') {
        return interaction.reply({ content: '❌ لا يمكن تأكيد الدفع الآن.', flags: 64 });
    }

    ticketData.step = 'FILL_FORM';
    activeTickets.set(interaction.channel.id, ticketData);

    const formText =
        `✅ **تم تأكيد الدفع بنجاح!**\n\n` +
        `الآن يا <@${ticketData.userId}> انسخ هذا النموذج وعبه:\n\n` +
        `\`\`\`\nالمنتج:\nالسعر:\nالمنشن: ${ticketData.mentionLabel}\nصورة: (أرفق صورة مع الرسالة)\n\`\`\``;

    await interaction.reply({ content: formText });
}

// ── نشر المزاد وإغلاق التكت ──
async function publishAuction(channel, data, item, price, imageUrl) {
    const auctionChannel = channel.guild.channels.cache.get(cfg.channels[data.duration]);
    const durationConfig = cfg.durations[data.duration];

    if (!auctionChannel || !durationConfig) return channel.send('❌ فشل النشر.');

    const endTime = Math.floor((Date.now() + durationConfig.minutes * 60 * 1000) / 1000);

    const auctionContent =
        `>>> **__المنتج:__** ${item}\n` +
        `**__السعر:__** ${price}\n` +
        `**__المنشن:__** ${data.mentionLabel}\n\n` +
        `**__قوانين المزاد:__**\n` +
        `* ⛔ ممنوع تزيد ما معك فلوس\n` +
        `* ⛔ ممنوع تزيد اقل من 50k\n` +
        `* ⛔ ممنوع تزيد في سعر بدايه\n` +
        `* ⛔ ممنوع تكلم مواضيع غير مزاد\n\n` +
        `⏳ **ينتهي المزاد:** <t:${endTime}:R>`;

    const sentMsg = await auctionChannel.send({
        content: `${data.mentionLabel}\n${auctionContent}`,
        files: imageUrl ? [imageUrl] : []
    });

    await channel.send('🚀 **تم نشر المزاد بنجاح! سيتم مسح الرسائل وإغلاق التكت عند انتهاء الوقت.**');

    setTimeout(async () => {
        try {
            const messages = await auctionChannel.messages.fetch({ limit: 50 });
            const toDelete = messages.filter(m => m.id !== sentMsg.id && !m.author.bot);
            if (toDelete.size > 0) await auctionChannel.bulkDelete(toDelete, true).catch(() => {});
            setTimeout(() => sentMsg.delete().catch(() => {}), 5000);
            await closeTicket(channel);
        } catch (e) {
            console.error('[Auctions] خطأ في نظام المسح:', e);
        }
    }, durationConfig.minutes * 60 * 1000);
}

// ── نشر يدوي احتياطي للمسؤولين ──
async function handleManualPublish(interaction) {
    if (!interaction.member.roles.cache.has(cfg.staffRoleId)) {
        return interaction.reply({ content: '❌ للمسؤولين فقط!', flags: 64 });
    }

    const user = interaction.options.getUser('user');
    const item = interaction.options.getString('item');
    const price = interaction.options.getString('price');
    const mentionType = interaction.options.getString('mention');
    const durationKey = interaction.options.getString('duration');
    const image = interaction.options.getAttachment('image');

    const mentionLabel = cfg.mentionPrices[mentionType].label;

    await interaction.reply({ content: '⏳ جاري النشر اليدوي...', flags: 64 });

    const fakeData = { duration: durationKey, mentionLabel };
    await publishAuction(interaction.channel, fakeData, item, price, image?.url ?? null);
}

// ── إغلاق التكت ──
async function closeTicket(channel) {
    activeTickets.delete(channel.id);
    await channel.delete().catch(() => {});
}

module.exports = {
    sendAuctionPanel,
    handleAuctionStart,
    handleShowPrices,
    handleMentionSelection,
    handleTicketMessages,
    handleAdminConfirmPayment,
    handleManualPublish,
    closeTicket,
    activeTickets
};

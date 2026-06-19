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

// ─────────────────────────────────────
//   فحص توافر رومات المزادات
// ─────────────────────────────────────

async function getRoomStatus(guild) {
    const now = Date.now();
    const statuses = {};

    for (const [key, channelId] of Object.entries(cfg.channels)) {
        const ch = guild.channels.cache.get(channelId);
        if (!ch) { statuses[key] = { busy: false, channelId, timeLeft: 0 }; continue; }

        try {
            const msgs = await ch.messages.fetch({ limit: 5 });
            // أي رسالة من البوت في آخر 15 دقيقة تعني الروم مشغول
            const botMsg = msgs.find(m => m.author.bot && (now - m.createdTimestamp < 15 * 60 * 1000));
            if (botMsg) {
                const elapsed   = now - botMsg.createdTimestamp;
                const maxDurMs  = 15 * 60 * 1000; // أطول مدة ممكنة 15 دقيقة
                const remaining = Math.max(0, maxDurMs - elapsed);
                statuses[key]   = { busy: true, channelId, timeLeft: remaining };
            } else {
                statuses[key]   = { busy: false, channelId, timeLeft: 0 };
            }
        } catch {
            statuses[key] = { busy: false, channelId, timeLeft: 0 };
        }
    }
    return statuses;
}

// إيجاد أول روم متاح بديل عن الروم المشغول
async function findAvailableRoom(guild, preferredKey) {
    const statuses = await getRoomStatus(guild);

    // جرّب الروم المفضل أولاً
    if (!statuses[preferredKey]?.busy) return { key: preferredKey, ...statuses[preferredKey] };

    // جرّب باقي الرومات
    for (const [key, info] of Object.entries(statuses)) {
        if (key !== preferredKey && !info.busy) return { key, ...info };
    }

    return null; // كل الرومات مشغولة
}

// بناء رسالة الحالة الاحترافية
function buildRoomStatusText(statuses) {
    const icons = { '1': '1️⃣', '2': '2️⃣', '3': '3️⃣' };
    let text = '📊 **حالة رومات المزادات الآن:**\n\n';

    for (const [key, info] of Object.entries(statuses)) {
        const icon     = icons[key] || `#${key}`;
        const chMention = `<#${info.channelId}>`;
        if (info.busy) {
            const mins = Math.ceil(info.timeLeft / 60000);
            text += `${icon} ${chMention} — 🔴 **مشغول** (ينتهي تقريباً خلال \`${mins}\` دق)\n`;
        } else {
            text += `${icon} ${chMention} — 🟢 **متاح**\n`;
        }
    }
    return text;
}

// ─────────────────────────────────────
//   إرسال لوحة المزاد الرئيسية
// ─────────────────────────────────────

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
        new ButtonBuilder().setCustomId('auction_show_prices').setLabel('أسعار المنشنات 💰').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('auction_room_status').setLabel('حالة الرومات 📊').setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// ─────────────────────────────────────
//   بدء عملية الشراء
// ─────────────────────────────────────

async function handleAuctionStart(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('auction_mention_everyone').setLabel('@everyone 📢').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('auction_mention_here').setLabel('@here 🔔').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        content: '✅ **تم بدء الطلب!** اختر نوع المنشن المطلوبة لمزادك:',
        components: [row],
        flags: 64
    });
}

// ─────────────────────────────────────
//   عرض أسعار المنشنات
// ─────────────────────────────────────

async function handleShowPrices(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('💰 أسعار المنشنات والمدد')
        .setDescription(
            `**__نوع المنشن:__**\n` +
            `📢 @everyone — \`${cfg.mentionPrices.everyone.displayPrice}\` كريدت\n` +
            `🔔 @here — \`${cfg.mentionPrices.here.displayPrice}\` كريدت\n\n` +
            `**__مدة المزاد:__**\n` +
            `1️⃣ 5 دقائق > 1 انعاش — \`1m\` كريدت\n` +
            `2️⃣ 10 دقائق > 2 انعاش — \`3m\` كريدت\n` +
            `3️⃣ 15 دقيقة > 3 انعاش — \`4m\` كريدت\n\n` +
            `*الأسعار لا تشمل ضريبة 5٪*`
        )
        .setColor('#0099ff');

    await interaction.reply({ embeds: [embed], flags: 64 });
}

// ─────────────────────────────────────
//   عرض حالة الرومات
// ─────────────────────────────────────

async function handleRoomStatus(interaction) {
    await interaction.deferReply({ flags: 64 });
    const statuses = await getRoomStatus(interaction.guild);
    await interaction.editReply({ content: buildRoomStatusText(statuses) });
}

// ─────────────────────────────────────
//   فتح تكت المزاد
// ─────────────────────────────────────

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
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: cfg.staffRoleId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }
            ]
        });

        const verificationCode = Math.floor(100 + Math.random() * 899);

        activeTickets.set(ticketChannel.id, {
            userId:         user.id,
            selectedMention: type,
            mentionPrice:   mentionConfig.price,
            mentionLabel:   mentionConfig.label,
            verificationCode,
            step:           'SELECT_DURATION'
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('👋 مرحباً بك في تكت المزاد')
            .setDescription(
                `مرحباً <@${user.id}>!\n\n` +
                `اكتب **رقم المدة** اللي تبيها هنا:\n\n` +
                `**1️⃣** — 5 دقائق > 1 انعاش\n` +
                `**2️⃣** — 10 دقائق > 2 انعاش\n` +
                `**3️⃣** — 15 دقيقة > 3 انعاش`
            )
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('auction_admin_confirm').setLabel('✅ تأكيد الدفع يدوياً').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('auction_close_ticket').setLabel('🔒 إغلاق التكت').setStyle(ButtonStyle.Danger)
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

// ─────────────────────────────────────
//   معالجة رسائل التكت
// ─────────────────────────────────────

async function handleTicketMessages(message) {
    if (message.author.bot) return;
    const ticketData = activeTickets.get(message.channel.id);
    if (!ticketData || message.author.id !== ticketData.userId) return;

    // ── اختيار المدة ──
    if (ticketData.step === 'SELECT_DURATION') {
        const choice = message.content.trim();
        if (!['1', '2', '3'].includes(choice)) return;

        const durationConfig = cfg.durations[choice];
        const basePrice      = ticketData.mentionPrice + durationConfig.price;
        const finalPrice     = Number(basePrice) + Number(ticketData.verificationCode);
        const taxPrice       = Math.ceil(finalPrice / 0.95);

        ticketData.duration   = choice;
        ticketData.totalPrice = finalPrice;
        ticketData.step       = 'WAITING_PAYMENT';
        activeTickets.set(message.channel.id, ticketData);

        saveAuction({ ...ticketData, savedAt: new Date().toISOString() });

        const paymentEmbed = new EmbedBuilder()
            .setTitle('💳 فاتورة المزاد')
            .setDescription(
                `> 📢 **المنشن:** \`${ticketData.mentionLabel}\`\n` +
                `> ⏱️ **المدة:** \`${durationConfig.description}\`\n` +
                `> 💰 **المجموع:** \`${finalPrice.toLocaleString()}\` كريدت\n` +
                `> 🔐 **رمز التحقق:** \`${ticketData.verificationCode}\`\n\n` +
                `انسخ الكود أدناه وأرسله في <#${cfg.commandsChannelId}>:`
            )
            .setColor('#2b2d31')
            .setFooter({ text: 'أرسل المبلغ بالضبط لتأكيد الدفع تلقائياً' });

        await message.channel.send({ embeds: [paymentEmbed] });
        await message.channel.send({ content: `\`\`\`\nc ${config.ownerId} ${taxPrice}\`\`\`` });
        return;
    }

    // ── إرسال النموذج ──
    if (ticketData.step === 'FILL_FORM') {
        // إذا أرسل المستخدم النموذج مكتملاً
        if (!message.content.includes('المنتج:')) return;

        const lines = message.content.split('\n');
        let item  = 'غير محدد';
        let price = 'غير محدد';

        for (const line of lines) {
            if (line.includes('المنتج:')) item  = line.split('المنتج:')[1]?.trim() || 'غير محدد';
            if (line.includes('السعر:'))  price = line.split('السعر:')[1]?.trim()  || 'غير محدد';
        }

        const imageUrl = message.attachments.size > 0 ? message.attachments.first().url : null;

        // ── فحص توافر الرومات ──
        const availableRoom = await findAvailableRoom(message.guild, ticketData.duration);

        if (!availableRoom) {
            // كل الرومات مشغولة — أظهر الحالة واطلب الانتظار
            const statuses = await getRoomStatus(message.guild);
            const statusText = buildRoomStatusText(statuses);
            await message.channel.send(
                `⏳ **جميع رومات المزادات مشغولة حالياً!**\n\n` +
                `${statusText}\n` +
                `أعد إرسال النموذج عندما يتحرر روم. ✋`
            );
            return; // لا تغيّر الـstep، ليبقى FILL_FORM
        }

        // إذا تغيّر الروم عن المختار في البداية — أخبر المستخدم
        if (availableRoom.key !== ticketData.duration) {
            await message.channel.send(
                `⚠️ **الروم المختار مشغول!**\n` +
                `✅ تم التحويل تلقائياً إلى <#${availableRoom.channelId}> 🟢`
            );
            ticketData.duration = availableRoom.key;
        }

        ticketData.step = 'PUBLISHING';
        activeTickets.set(message.channel.id, ticketData);

        await publishAuction(message.channel, ticketData, item, price, imageUrl);
    }
}

// ─────────────────────────────────────
//   تأكيد الدفع يدوياً من الإدارة
// ─────────────────────────────────────

async function handleAdminConfirmPayment(interaction) {
    if (!interaction.member.roles.cache.has(cfg.staffRoleId)) {
        return interaction.reply({ content: '❌ للمسؤولين فقط!', flags: 64 });
    }

    const ticketData = activeTickets.get(interaction.channel.id);
    if (!ticketData || ticketData.step !== 'WAITING_PAYMENT') {
        return interaction.reply({ content: '❌ لا يوجد دفع معلّق لتأكيده في هذا التكت.', flags: 64 });
    }

    ticketData.step = 'FILL_FORM';
    activeTickets.set(interaction.channel.id, ticketData);

    // ── فحص حالة الرومات الآن ──
    const statuses = await getRoomStatus(interaction.guild);
    const statusText = buildRoomStatusText(statuses);

    const formMsg =
        `✅ **تم تأكيد الدفع بنجاح!**\n\n` +
        `${statusText}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `يا <@${ticketData.userId}> انسخ النموذج التالي وأرسله **مع صورة المنتج**:\n\n` +
        `\`\`\`\nالمنتج:\nالسعر:\nالمنشن: ${ticketData.mentionLabel}\n\`\`\``;

    await interaction.reply({ content: formMsg });
}

// ─────────────────────────────────────
//   نشر المزاد
// ─────────────────────────────────────

async function publishAuction(channel, data, item, price, imageUrl) {
    const auctionChannelId = cfg.channels[data.duration];
    const auctionChannel   = channel.guild.channels.cache.get(auctionChannelId);
    const durationConfig   = cfg.durations[data.duration];

    if (!auctionChannel || !durationConfig) {
        return channel.send('❌ فشل النشر — لا يمكن العثور على روم المزاد.');
    }

    const endTime = Math.floor((Date.now() + durationConfig.minutes * 60 * 1000) / 1000);

    const auctionContent =
        `>>> **__المنتج:__** ${item}\n` +
        `**__السعر:__** ${price}\n` +
        `**__المنشن:__** ${data.mentionLabel}\n\n` +
        `**__قوانين المزاد:__**\n` +
        `⛔ ممنوع تزيد ما معك فلوس\n` +
        `⛔ ممنوع تزيد أقل من 50k\n` +
        `⛔ ممنوع تزيد في سعر البداية\n` +
        `⛔ ممنوع الكلام خارج موضوع المزاد\n\n` +
        `⏳ **ينتهي المزاد:** <t:${endTime}:R>`;

    const sentMsg = await auctionChannel.send({
        content: `${data.mentionLabel}\n${auctionContent}`,
        files: imageUrl ? [imageUrl] : []
    });

    await channel.send(
        `🚀 **تم نشر مزادك بنجاح في <#${auctionChannelId}>!**\n` +
        `⏳ ينتهي المزاد <t:${endTime}:R> وبعدها يُغلق التكت تلقائياً.`
    );

    // مسح الرسائل وإغلاق التكت بعد انتهاء الوقت
    setTimeout(async () => {
        try {
            const msgs     = await auctionChannel.messages.fetch({ limit: 50 });
            const toDelete = msgs.filter(m => m.id !== sentMsg.id && !m.author.bot);
            if (toDelete.size > 0) await auctionChannel.bulkDelete(toDelete, true).catch(() => {});
            setTimeout(() => sentMsg.delete().catch(() => {}), 5000);
            await closeTicket(channel);
        } catch (e) {
            console.error('[Auctions] خطأ في نظام المسح:', e);
        }
    }, durationConfig.minutes * 60 * 1000);
}

// ─────────────────────────────────────
//   نشر يدوي احتياطي للمسؤولين
// ─────────────────────────────────────

async function handleManualPublish(interaction) {
    if (!interaction.member.roles.cache.has(cfg.staffRoleId)) {
        return interaction.reply({ content: '❌ للمسؤولين فقط!', flags: 64 });
    }

    const user        = interaction.options.getUser('user');
    const item        = interaction.options.getString('item');
    const price       = interaction.options.getString('price');
    const mentionType = interaction.options.getString('mention');
    const durationKey = interaction.options.getString('duration');
    const image       = interaction.options.getAttachment('image');
    const mentionLabel = cfg.mentionPrices[mentionType].label;

    await interaction.deferReply({ flags: 64 });

    // فحص توافر الرومات
    const availableRoom = await findAvailableRoom(interaction.guild, durationKey);

    if (!availableRoom) {
        const statuses    = await getRoomStatus(interaction.guild);
        const statusText  = buildRoomStatusText(statuses);
        return interaction.editReply({
            content: `❌ **لا يوجد روم متاح حالياً!**\n\n${statusText}`
        });
    }

    const finalDuration = availableRoom.key;
    if (finalDuration !== durationKey) {
        await interaction.editReply({
            content: `⚠️ الروم المختار مشغول، تم التحويل إلى <#${availableRoom.channelId}>`
        });
    }

    const fakeData = { duration: finalDuration, mentionLabel };
    await publishAuction(interaction.channel, fakeData, item, price, image?.url ?? null);

    if (finalDuration === durationKey) {
        await interaction.editReply({ content: '✅ تم النشر اليدوي بنجاح!' });
    }
}

// ─────────────────────────────────────
//   إغلاق التكت
// ─────────────────────────────────────

async function closeTicket(channel) {
    activeTickets.delete(channel.id);
    await channel.delete().catch(() => {});
}

module.exports = {
    sendAuctionPanel,
    handleAuctionStart,
    handleShowPrices,
    handleRoomStatus,
    handleMentionSelection,
    handleTicketMessages,
    handleAdminConfirmPayment,
    handleManualPublish,
    closeTicket,
    activeTickets
};

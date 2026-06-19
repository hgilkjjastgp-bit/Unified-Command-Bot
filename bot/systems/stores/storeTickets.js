// ═══════════════════════════════════════════════
//         نظام تذاكر شراء المتاجر
// ═══════════════════════════════════════════════

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits
} = require('discord.js');
const config = require('../../config.js');
const { createDefaultStoreData } = require('./storesData.js');

const cfg = config.stores;
let ticketCounter = 0;
const activePurchases = new Map();

// ── إرسال لوحة شراء المتاجر ──
async function sendStorePanel(channel) {
    const embed = new EmbedBuilder()
        .setTitle('🏪 متجر السيرفر الرسمي للمتاجر')
        .setDescription('لشراء متجر خاص بك، اضغط على زر الفئة التي تناسبك لفتح تذكرة الشراء.')
        .setColor('#1a1a1a')
        .addFields(
            { name: '👑 VIP Stores',     value: `السعر: \`2,000,000\`\nمنشنات: 30 @everyone | 20 @here`, inline: false },
            { name: '💎 Diamond Stores', value: `السعر: \`1,500,000\`\nمنشنات: 20 @everyone | 10 @here`, inline: false },
            { name: '🥇 Gold Stores',    value: `السعر: \`1,000,000\`\nمنشنات: 15 @everyone | 13 @here`, inline: false },
            { name: '🥉 Bronze Stores',  value: `السعر: \`800,000\`\nمنشنات: 10 @everyone | 5 @here`,   inline: false }
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('store_ticket_vip').setLabel('شراء VIP 👑').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('store_ticket_diamond').setLabel('شراء دايموند 💎').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('store_ticket_gold').setLabel('شراء ذهبي 🎖').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('store_ticket_bronze').setLabel('شراء برونزي 🥉').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// ── معالجة زر فتح التذكرة ──
async function handleTicketButton(interaction) {
    if (!interaction.customId.startsWith('store_ticket_')) return;

    const type = interaction.customId.replace('store_ticket_', '');
    const selectedCat = cfg.categories[type];
    if (!selectedCat) return;

    await interaction.reply({ content: '⏳ جاري إنشاء تذكرة الشراء...', flags: 64 });
    ticketCounter++;

    try {
        const ticketChannel = await interaction.guild.channels.create({
            name: `a-store-${ticketCounter}`,
            type: ChannelType.GuildText,
            parent: cfg.ticketsCategoryId,
            permissionOverwrites: [
                { id: interaction.guild.id,   deny:  [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id,    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: cfg.staffRoleId,        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🎟️ تذكرة شراء متجر')
            .setDescription(`مرحباً ${interaction.user}!\n\nأهلاً بك في نظام شراء المتاجر.\nلو عندك أسئلة انتظر المسؤولين.\n\n🗂️ **نوع المتجر المختار:** \`${selectedCat.name}\``)
            .setColor('#5865f2')
            .setFooter({ text: 'سيتم إرسال كود التحويل بالأسفل' });

        const lockRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`store_lock_ticket_${ticketChannel.id}`).setLabel('🔒 قفل التذكرة').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${interaction.user} <@&${cfg.staffRoleId}>`, embeds: [welcomeEmbed], components: [lockRow] });

        const priceWithTax  = Math.ceil(selectedCat.price / 0.95);
        const transferCode  = `c ${config.ownerId} ${priceWithTax}`;
        const transferEmbed = new EmbedBuilder()
            .setTitle('💸 كود التحويل')
            .setDescription(`لإتمام الشراء، حوّل المبلغ في روم الأوامر <#${cfg.bankChannelId}>:\n\n\`\`\`${transferCode}\`\`\`\n\n⚠️ البوت يراقب الروم تلقائياً — بعد التحويل سيطلب منك اسم متجرك هنا!`)
            .setColor('#ffcc00');

        await ticketChannel.send({ embeds: [transferEmbed] });
        await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${ticketChannel}`, flags: 64 });

        activePurchases.set(interaction.user.id, {
            channelId: ticketChannel.id,
            category:  selectedCat,
            userId:    interaction.user.id
        });

    } catch (err) {
        console.error('[Stores] خطأ عند إنشاء التذكرة:', err.message);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء إنشاء التذكرة.', flags: 64 });
    }
}

// ── معالجة زر قفل التذكرة ──
async function handleLockTicket(interaction) {
    if (!interaction.customId.startsWith('store_lock_ticket_')) return;

    const channelId = interaction.customId.replace('store_lock_ticket_', '');
    const channel   = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: '❌ القناة غير موجودة.', flags: 64 });

    await interaction.reply({ content: '🗑️ جاري حذف التذكرة...', flags: 64 });
    setTimeout(() => channel.delete('تم إغلاق التذكرة').catch(() => {}), 2000);
}

// ── مراقبة تحويلات بروبوت لإنشاء المتاجر ──
async function monitorStorePurchases(message) {
    if (message.channel.id !== cfg.bankChannelId) return;
    if (message.author.id !== config.probotId) return;

    const msgText = message.content || message.embeds[0]?.description || message.embeds[0]?.title || '';
    const lower   = msgText.toLowerCase();
    if (!lower.includes('has transferred') && !lower.includes('قام بتحويل') && !lower.includes('حوّل')) return;

    const amountClean  = msgText.replace(/[$,]/g, '');
    const match        = amountClean.match(/\d+/g);
    if (!match) return;
    const transferred  = parseInt(match[match.length - 1]);

    let purchaseData = null;
    let buyerUserId  = null;

    for (const [userId, data] of activePurchases.entries()) {
        const targetPriceWithTax = Math.ceil(data.category.price / 0.95);
        if (transferred === targetPriceWithTax || transferred >= data.category.price) {
            purchaseData = data;
            buyerUserId  = userId;
            break;
        }
    }

    if (!purchaseData) return;

    const targetChannel = message.guild.channels.cache.get(purchaseData.channelId);
    if (!targetChannel) return;

    await targetChannel.send({
        content:
            `🎉 **تم تأكيد استلام المبلغ بنجاح!**\n\n` +
            `👤 المشتري: <@${purchaseData.userId}>\n` +
            `🗂️ نوع المتجر: \`${purchaseData.category.name}\`\n` +
            `📊 المنشنات المتاحة: \`${purchaseData.category.everyone}\` لـ Everyone و \`${purchaseData.category.here}\` لـ Here.\n\n` +
            `✍️ **الآن اكتب اسم المتجر الذي تريده هنا وسيقوم البوت بإنشائه فوراً!**`
    });

    const filter    = m => m.author.id === purchaseData.userId;
    const collector = targetChannel.createMessageCollector({ filter, max: 1, time: 120000 });

    collector.on('collect', async msg => {
        await createStoreChannel(message.guild, purchaseData, msg.content, message.client);
        activePurchases.delete(purchaseData.userId);
        setTimeout(() => targetChannel.delete().catch(() => {}), 10000);
    });
}

// ── إنشاء روم المتجر الفعلي ──
async function createStoreChannel(guild, purchaseData, storeName, client) {
    const newStore = await guild.channels.create({
        name: `${storeName}${purchaseData.category.emoji}`,
        type: ChannelType.GuildText,
        parent: purchaseData.category.id,
        permissionOverwrites: [
            { id: guild.id,             allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
            { id: purchaseData.userId,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.MentionEveryone] },
            { id: client.user.id,       allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });

    global.storesData.set(newStore.id, createDefaultStoreData(
        newStore.id, purchaseData.userId, purchaseData.category.name,
        purchaseData.category.everyone, purchaseData.category.here
    ));
    if (global.saveStoresData) global.saveStoresData();

    const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const storeEmbed = new EmbedBuilder()
        .setTitle(`🏪 متجر » ${purchaseData.category.emoji} • ${storeName}`)
        .setDescription(
            `⚠️ **ملاحظة:** يجب الإلتزام بتشفير الكلمات لتجنب إخفاء رومك.\n\n` +
            `👑 • **صاحب الـمـتـجـر:** <@${purchaseData.userId}>\n` +
            `🗂️ • **نوع الـمـتـجـر:** \`< ${purchaseData.category.name} Stores >\`\n` +
            `📆 • **تاريخ الإنشاء:** اليوم`
        )
        .setColor('#2f3136')
        .addFields(
            { name: '📢 @everyone', value: `\`${purchaseData.category.everyone}\` منشنات متبقية`, inline: true },
            { name: '🔔 @here',     value: `\`${purchaseData.category.here}\` منشنات متبقية`,    inline: true }
        );

    await newStore.send({ content: line });
    await newStore.send({ content: `<@${purchaseData.userId}>`, embeds: [storeEmbed] });
    await newStore.send({ content: line });

    const tutorialEmbed = new EmbedBuilder()
        .setTitle('👋 مرحبًا بك في متجرك الجديد!')
        .setDescription(
            `يا غالي، لكي تتحكم في منشنات متجرك، وتشتري رصيدًا، أو تفعّل الخط والنشر التلقائي، قم بكتابة كلمة **\`منشن\`** هنا في الشات لفتح لوحة التحكم المركزية!\n\n` +
            `⚠️ **ملاحظة:** بعد كتابة الأمر، انتظر 5 دقائق بين كل مرة لمنع السبام. بالتوفيق! ✨`
        )
        .setColor('#00ffcc');

    await newStore.send({ embeds: [tutorialEmbed] }).catch(() => {});
}

module.exports = { sendStorePanel, handleTicketButton, handleLockTicket, monitorStorePurchases };

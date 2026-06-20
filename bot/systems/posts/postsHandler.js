// ═══════════════════════════════════════════════
//         نظام المنشورات - المعالج الرئيسي
// ═══════════════════════════════════════════════

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType
} = require('discord.js');
const config = require('../../config.js');
const { savePosts } = require('../../systems/posts/postsData.js');

const cfg = config.posts;

// ذاكرة مؤقتة لحفظ بيانات الشراء
const activePurchases = new Map();

// ── معالج أوامر السلاش ──
async function handleCommand(interaction) {

    if (interaction.commandName === 'setup_posts') {
        if (interaction.channelId !== cfg.setupChannelId) {
            return interaction.reply({
                content: `❌ هذا الأمر مخصص للاستخدام داخل قناة <#${cfg.setupChannelId}> فقط.`,
                flags: 64
            });
        }

        await interaction.reply({ content: '✅ تم إرسال الرسالة بنجاح.', flags: 64 });

        const embed = new EmbedBuilder()
            .setTitle('🛒 لوحة شراء المنشورات والطلبات الرسمية')
            .setDescription('**يمكنك شراء نشر إعلانك مع منشن مخصص عبر الضغط على الأزرار أدناه 👇**')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('posts_buy').setLabel('شراء طلب ✨').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('posts_prices').setLabel('اسعار طلبات 📑').setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === 'backup_post') {
        if (!interaction.member.roles.cache.has(cfg.adminRoleId)) {
            return interaction.reply({ content: '❌ عذراً، ليس لديك صلاحية الإدارة لاستخدام هذا الأمر.', flags: 64 });
        }

        const modal = new ModalBuilder().setCustomId('posts_backup_modal').setTitle('نشر منشور احتياطي إداري');
        const postInput = new TextInputBuilder()
            .setCustomId('post_content')
            .setLabel('محتوى المنشور')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(postInput));
        await interaction.showModal(modal);
    }
}

// ── معالج الأزرار ──
async function handleButton(interaction) {

    if (interaction.customId === 'posts_prices' || interaction.customId.startsWith('posts_prices_')) {
        const msg = `**__📑 قائمة أسعار المنشورات والمنشن الحالية:__**\n\n` +
            `• **منشن @everyone** 👈 \`${cfg.everyonePrice.toLocaleString()}\` كريدت\n` +
            `• **منشن @here** 👈 \`${cfg.herePrice.toLocaleString()}\` كريدت`;
        return interaction.reply({ content: msg, flags: 64 });
    }

    if (interaction.customId === 'posts_buy' || interaction.customId.startsWith('posts_buy_')) {
        const modal = new ModalBuilder().setCustomId('posts_post_modal').setTitle('📝 تفاصيل منشورك الخاص');
        const contentInput = new TextInputBuilder()
            .setCustomId('post_content')
            .setLabel('اكتب محتوى إعلانك أو طلبك بالتفصيل هنا')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(5);
        modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
        return interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('posts_owner_')) {
        const ownerId = interaction.customId.split('_')[2];
        return interaction.reply({
            content: `**🌐 صاحب هذا الطلب والإعلان هو العضو التالي:** <@${ownerId}>`,
            flags: 64
        });
    }

    if (interaction.customId === 'posts_select_everyone' || interaction.customId === 'posts_select_here') {
        const type = interaction.customId === 'posts_select_everyone' ? 'everyone' : 'here';
        const price = type === 'everyone' ? cfg.everyonePrice : cfg.herePrice;
        const data = activePurchases.get(interaction.user.id);

        if (!data) {
            return interaction.reply({ content: '❌ انتهت الجلسة، يرجى الضغط على زر "شراء طلب" مجدداً.', flags: 64 });
        }

        data.type = type;
        data.price = price;
        activePurchases.set(interaction.user.id, data);

        const taxPrice = Math.floor(price * 20 / 19) + 1;

        const invoiceMsg =
            `💳 **تفاصيل الفاتورة والتحويل لنوع (${type}):**\n\n` +
            `يرجى التوجه إلى روم الأوامر <#${cfg.commandsChannelId}> ونسخ الأمر التالي للتحويل المالي:\n` +
            `\`c ${config.ownerId} ${taxPrice}\`\n\n` +
            `⚠️ **ملاحظة:** سيقوم النظام بمراقبة التحويل تلقائياً ونشر طلبك فوراً في روم المنشورات.`;

        return interaction.update({ content: invoiceMsg, components: [], flags: 64 });
    }
}

// ── معالج المودال ──
async function handleModal(interaction) {

    if (interaction.customId === 'posts_post_modal') {
        const content = interaction.fields.getTextInputValue('post_content');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('posts_select_everyone').setLabel('everyone').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('posts_select_here').setLabel('here').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: '✅ تم حفظ نص منشورك بنجاح! الآن اختر نوع المنشن المطلوبة من الأزرار التالية:',
            components: [row],
            flags: 64
        });

        activePurchases.set(interaction.user.id, { content });
    }

    if (interaction.customId === 'posts_backup_modal') {
        const content = interaction.fields.getTextInputValue('post_content');
        try {
            const postChannel = await interaction.client.channels.fetch(cfg.postsChannelId);
            if (postChannel) {
                await postChannel.send({ content: `**__📢 منشور احتياطي إداري:__**\n\n${content}` });
                await interaction.reply({ content: '✅ تم نشر المنشور الاحتياطي بنجاح.', flags: 64 });
            }
        } catch (err) {
            console.error('[Posts] خطأ في جلب قناة المنشورات:', err);
            await interaction.reply({ content: '❌ حدث خطأ، تأكد من إعدادات الكونفيج.', flags: 64 });
        }
    }
}

// ── مراقبة تحويلات بروبوت ──
async function monitorTransfers(message) {
    if (message.author.id !== config.probotId) return;
    if (message.channelId !== cfg.commandsChannelId) return;

    const msgContent = message.content;
    const isTransferred = (msgContent.includes('has transferred') || msgContent.includes('قام بتحويل')) &&
        msgContent.includes(config.ownerId);

    if (!isTransferred) return;

    for (const [userId, purchaseData] of activePurchases.entries()) {
        const pricePattern = new RegExp(`\\$?${purchaseData.price}`);
        if (!pricePattern.test(msgContent)) continue;

        const mentionType = purchaseData.type === 'everyone' ? '@everyone' : '@here';

        try {
            const postChannel = await message.client.channels.fetch(cfg.postsChannelId);
            if (postChannel) {
                const formattedMessage =
                    `**__ - الــطـــلب : ${purchaseData.content}\n\n` +
                    `- صــاحــب الــطـــلب : <@${userId}>\n\n` +
                    `- الــمــنــشــن : ${mentionType} __**`;

                const postRow1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`posts_prices_${userId}`).setLabel('اسعار طلبات 📑').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`posts_buy_${userId}`).setLabel('شراء طلب ✨').setStyle(ButtonStyle.Success)
                );
                const postRow2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`posts_owner_${userId}`).setLabel('صاحب الطلب 🌐').setStyle(ButtonStyle.Secondary)
                );

                await postChannel.send({ content: formattedMessage, components: [postRow1, postRow2] });
            }

            const logChannel = await message.client.channels.fetch(cfg.logsChannelId);
            if (logChannel) {
                await logChannel.send(
                    `**✅ [عملية تحويل ناجحة للمنشور]**\n` +
                    `• **المشتري:** <@${userId}>\n` +
                    `• **المبلغ:** \`${purchaseData.price.toLocaleString()}\` كريدت\n` +
                    `• **نوع المنشن:** \`${purchaseData.type}\``
                );
            }

            savePosts({ userId, type: purchaseData.type, price: purchaseData.price, content: purchaseData.content, timestamp: new Date().toISOString() });

        } catch (err) {
            console.error('[Posts] خطأ أثناء معالجة التحويل:', err);
        }

        activePurchases.delete(userId);
        break;
    }
}

module.exports = { handleCommand, handleButton, handleModal, monitorTransfers };

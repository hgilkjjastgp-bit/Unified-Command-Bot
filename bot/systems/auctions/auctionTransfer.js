// ═══════════════════════════════════════════════
//         نظام تتبع تحويلات المزادات
// ═══════════════════════════════════════════════
// مزاد

const config = require('../../config.js');
const { activeTickets } = require('./auctionHandler.js');
const { saveAuction } = require('./auctionData.js');

const cfg = config.auctions;

async function monitorAuctionTransfers(message) {
    if (message.author.id !== config.probotId) return;
    if (message.channelId !== cfg.commandsChannelId) return;

    const content = message.content;
    const lower   = content.toLowerCase();
    const isTransferMsg = (lower.includes('has transferred') || lower.includes('قام بتحويل')) &&
        lower.includes(config.ownerId);

    if (!isTransferMsg) return;

    const cleanContent = content.replace(/,/g, '');

    for (const [channelId, ticketData] of activeTickets.entries()) {
        if (ticketData.step !== 'WAITING_PAYMENT') continue;

        const targetPrice = ticketData.totalPrice.toString();
        if (!cleanContent.includes(targetPrice)) continue;

        try {
            const guild   = message.guild;
            const channel = guild.channels.cache.get(channelId);
            if (!channel) { activeTickets.delete(channelId); continue; }

            ticketData.step = 'FILL_FORM';
            activeTickets.set(channelId, ticketData);

            saveAuction({
                userId:    ticketData.userId,
                amount:    ticketData.totalPrice,
                channelId,
                mention:   ticketData.mentionLabel,
                duration:  ticketData.duration,
                status:    'payment_confirmed'
            });

            const logChannel = guild.channels.cache.get(cfg.logChannelId);
            if (logChannel) {
                await logChannel.send(
                    `**✅ [عملية تحويل ناجحة للمزاد]**\n` +
                    `• **المشتري:** <@${ticketData.userId}>\n` +
                    `• **المبلغ الصافي:** \`${ticketData.totalPrice.toLocaleString()}\` كريدت\n` +
                    `• **نوع المنشن:** \`${ticketData.mentionLabel}\`\n` +
                    `• **التكت:** <#${channelId}>`
                );
            }

            const formText =
                `✅ **تم تأكيد الدفع بنجاح!**\n\n` +
                `الآن يا <@${ticketData.userId}> انسخ هذا النموذج وعبه (أرسله في رسالة واحدة مع الصورة):\n\n` +
                `\`\`\`\nالمنتج:\nالسعر:\n\`\`\`\n` +
                `*يرجى إرفاق صورة المنتج مع الرسالة.*`;

            await channel.send({ content: formText });

            // إرسال النموذج رسالة خاصة للمستخدم
            try {
                const member = await channel.guild.members.fetch(ticketData.userId);
                await member.send(`المنتج:\nالسعر:`);
            } catch { /* المستخدم أغلق الرسائل الخاصة */ }
            console.log(`[Auctions] تم تفعيل المزاد للمستخدم ${ticketData.userId}`);
            return;

        } catch (error) {
            console.error('[Auctions] خطأ أثناء معالجة التحويل:', error);
        }
    }
}

module.exports = { monitorAuctionTransfers };

// ═══════════════════════════════════════════════
//   أمر عرض الأسعار مع خصم 20٪ لجميع الأنظمة yp
//═══════════════════════════════════════════════

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

const DISC = 0.80; // خصم 20٪

function dis(n) {
    const after = Math.floor(Number(n) * DISC);
    return `~~\`${Number(n).toLocaleString()}\`~~ → \`${after.toLocaleString()}\` كريدت`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prices_discount')
        .setDescription('🎁 عرض الأسعار مع خصم بوكس 20٪ لجميع الأنظمة')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const p  = config.posts;
        const a  = config.auctions;
        const s  = config.stores;
        const sp = s.servicePrices;

        const postsEmbed = new EmbedBuilder()
            .setTitle('📰 منشورات — مع خصم 20٪')
            .setColor('#3498db')
            .addFields(
                { name: '📢 @everyone', value: dis(p.everyonePrice), inline: true },
                { name: '🔔 @here',     value: dis(p.herePrice),     inline: true }
            );

        const auctionsEmbed = new EmbedBuilder()
            .setTitle('🔨 مزادات — مع خصم 20٪')
            .setColor('#e67e22')
            .addFields(
                { name: '📢 منشن @everyone',  value: dis(a.mentionPrices.everyone.price), inline: true },
                { name: '🔔 منشن @here',      value: dis(a.mentionPrices.here.price),     inline: true },
                { name: '\u200b',              value: '\u200b',                             inline: false },
                { name: '1️⃣ مدة 5 دقائق',     value: dis(a.durations['1'].price),          inline: true },
                { name: '2️⃣ مدة 10 دقائق',    value: dis(a.durations['2'].price),          inline: true },
                { name: '3️⃣ مدة 15 دقيقة',    value: dis(a.durations['3'].price),          inline: true }
            );

        const storesBuyEmbed = new EmbedBuilder()
            .setTitle('🏪 شراء متاجر — مع خصم 20٪')
            .setColor('#9b59b6')
            .addFields(
                { name: '👑 VIP',      value: dis(s.categories.vip.price),     inline: true },
                { name: '💎 Diamond', value: dis(s.categories.diamond.price), inline: true },
                { name: '🎖 Gold',    value: dis(s.categories.gold.price),    inline: true },
                { name: '🥉 Bronze',  value: dis(s.categories.bronze.price),  inline: true }
            );

        const storesSvcEmbed = new EmbedBuilder()
            .setTitle('⚙️ خدمات لوحة المتاجر — مع خصم 20٪')
            .setColor('#1abc9c')
            .addFields(
                { name: '📢 شحن @everyone',      value: dis(sp.mention_everyone),  inline: true },
                { name: '🔔 شحن @here',          value: dis(sp.mention_here),      inline: true },
                { name: '\u200b',                  value: '\u200b',                   inline: false },
                { name: '📝 تغيير الاسم',         value: dis(sp.change_name),       inline: true },
                { name: '👑 تغيير المالك',        value: dis(sp.change_owner),      inline: true },
                { name: '🛡️ إزالة تحذير',         value: dis(sp.remove_warning),    inline: true },
                { name: '\u200b',                  value: '\u200b',                   inline: false },
                { name: '🚀 نشر تلقائي — يوم',    value: dis(sp.autopost_day),      inline: true },
                { name: '⚡ نشر تلقائي — يومين',  value: dis(sp.autopost_day2),     inline: true },
                { name: '🔥 نشر تلقائي — أسبوع', value: dis(sp.autopost_week),     inline: true },
                { name: '\u200b',                  value: '\u200b',                   inline: false },
                { name: '🎨 خط تلقائي',           value: dis(sp.autoline),          inline: true },
                { name: '🎁 بوكس الخصم',          value: dis(sp.discount_box),      inline: true }
            )
            .setFooter({ text: 'هذه الأسعار بعد تفعيل بوكس الخصم 20٪ • الضريبة 5٪ غير شاملة' })
            .setTimestamp();

        await interaction.reply({
            embeds: [postsEmbed, auctionsEmbed, storesBuyEmbed, storesSvcEmbed],
            flags: 64
        });
    }
};

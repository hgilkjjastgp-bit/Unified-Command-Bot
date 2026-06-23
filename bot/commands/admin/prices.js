// ═══════════════════════════════════════════════
//   أمر عرض الأسعار الحالية لجميع الأنظمة huy2
// ═══════════════════════════════════════════════

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

function fmt(n) { return `\`${Number(n).toLocaleString()}\` كريدت`; }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prices')
        .setDescription('💰 عرض جدول الأسعار الحالية لجميع الأنظمة')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const p  = config.posts;
        const a  = config.auctions;
        const s  = config.stores;
        const sp = s.servicePrices;

        const postsEmbed = new EmbedBuilder()
            .setTitle('📰 أسعار نظام المنشورات')
            .setColor('#3498db')
            .addFields(
                { name: '📢 @everyone', value: fmt(p.everyonePrice), inline: true },
                { name: '🔔 @here',     value: fmt(p.herePrice),     inline: true }
            );

        const auctionsEmbed = new EmbedBuilder()
            .setTitle('🔨 أسعار نظام المزادات')
            .setColor('#e67e22')
            .addFields(
                { name: '📢 منشن @everyone',    value: fmt(a.mentionPrices.everyone.price), inline: true },
                { name: '🔔 منشن @here',        value: fmt(a.mentionPrices.here.price),     inline: true },
                { name: '\u200b',                value: '\u200b',                             inline: false },
                { name: '1️⃣ مدة 5 دقائق',       value: fmt(a.durations['1'].price),          inline: true },
                { name: '2️⃣ مدة 10 دقائق',      value: fmt(a.durations['2'].price),          inline: true },
                { name: '3️⃣ مدة 15 دقيقة',      value: fmt(a.durations['3'].price),          inline: true }
            );

        const storesBuyEmbed = new EmbedBuilder()
            .setTitle('🏪 أسعار شراء المتاجر')
            .setColor('#9b59b6')
            .addFields(
                { name: '👑 VIP',        value: fmt(s.categories.vip.price),     inline: true },
                { name: '💎 دايموند',    value: fmt(s.categories.diamond.price), inline: true },
                { name: '🎖 ذهبي',       value: fmt(s.categories.gold.price),    inline: true },
                { name: '🥉 برونزي',     value: fmt(s.categories.bronze.price),  inline: true }
            );

        const storesSvcEmbed = new EmbedBuilder()
            .setTitle('⚙️ أسعار خدمات لوحة إدارة المتاجر')
            .setColor('#1abc9c')
            .addFields(
                { name: '📢 شحن @everyone',        value: fmt(sp.mention_everyone),  inline: true },
                { name: '🔔 شحن @here',            value: fmt(sp.mention_here),      inline: true },
                { name: '\u200b',                    value: '\u200b',                   inline: false },
                { name: '📝 تغيير الاسم',           value: fmt(sp.change_name),       inline: true },
                { name: '👑 تغيير المالك',          value: fmt(sp.change_owner),      inline: true },
                { name: '🛡️ إزالة تحذير',           value: fmt(sp.remove_warning),    inline: true },
                { name: '\u200b',                    value: '\u200b',                   inline: false },
                { name: '🚀 نشر تلقائي — يوم',      value: fmt(sp.autopost_day),      inline: true },
                { name: '⚡ نشر تلقائي — يومين',    value: fmt(sp.autopost_day2),     inline: true },
                { name: '🔥 نشر تلقائي — أسبوع',   value: fmt(sp.autopost_week),     inline: true },
                { name: '\u200b',                    value: '\u200b',                   inline: false },
                { name: '🎨 خط تلقائي',             value: fmt(sp.autoline),          inline: true },
                { name: '🎁 بوكس الخصم 20٪',        value: fmt(sp.discount_box),      inline: true }
            )
            .setFooter({ text: 'لتعديل أي سعر استخدم /set_prices • الأسعار لا تشمل ضريبة 5٪' })
            .setTimestamp();

        await interaction.reply({
            embeds: [postsEmbed, auctionsEmbed, storesBuyEmbed, storesSvcEmbed],
            flags: 64
        });
    }
};

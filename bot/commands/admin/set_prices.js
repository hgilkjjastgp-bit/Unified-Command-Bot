// ═══════════════════════════════════════════════
//   أمر تعديل الأسعار — للمسؤول الأعلى صلاحية فقط typ09
// ═══════════════════════════════════════════════

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { savePrice, getCurrentPrice } = require('../../systems/pricesManager.js');

// ── قائمة كل الأسعار القابلة للتعديل ──
const PRICE_CHOICES = [
    // منشورات
    { name: '📢 منشورات — @everyone',              value: 'posts.everyone' },
    { name: '🔔 منشورات — @here',                  value: 'posts.here' },
    // مزادات
    { name: '📢 مزادات — منشن @everyone',           value: 'auctions.mention.everyone' },
    { name: '🔔 مزادات — منشن @here',               value: 'auctions.mention.here' },
    { name: '1️⃣ مزادات — مدة 5 دقائق',              value: 'auctions.duration.1' },
    { name: '2️⃣ مزادات — مدة 10 دقائق',             value: 'auctions.duration.2' },
    { name: '3️⃣ مزادات — مدة 15 دقيقة',             value: 'auctions.duration.3' },
    // متاجر — شراء
    { name: '👑 متاجر — شراء VIP',                  value: 'stores.buy.vip' },
    { name: '💎 متاجر — شراء دايموند',               value: 'stores.buy.diamond' },
    { name: '🎖 متاجر — شراء ذهبي',                 value: 'stores.buy.gold' },
    { name: '🥉 متاجر — شراء برونزي',               value: 'stores.buy.bronze' },
    // متاجر — خدمات
    { name: '📢 متاجر — منشن @everyone (للمتجر)',    value: 'stores.service.mention_everyone' },
    { name: '🔔 متاجر — منشن @here (للمتجر)',        value: 'stores.service.mention_here' },
    { name: '📝 متاجر — تغيير الاسم',               value: 'stores.service.change_name' },
    { name: '👑 متاجر — تغيير المالك',              value: 'stores.service.change_owner' },
    { name: '🛡️ متاجر — إزالة تحذير',               value: 'stores.service.remove_warning' },
    { name: '🚀 متاجر — نشر تلقائي يوم',            value: 'stores.service.autopost_day' },
    { name: '⚡ متاجر — نشر تلقائي يومين',          value: 'stores.service.autopost_day2' },
    { name: '🔥 متاجر — نشر تلقائي أسبوع',          value: 'stores.service.autopost_week' },
    { name: '🎨 متاجر — خط تلقائي',                 value: 'stores.service.autoline' },
    { name: '🎁 متاجر — بوكس الخصم 20٪',            value: 'stores.service.discount_box' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_prices')
        .setDescription('💰 [للمسؤول الأعلى] تعديل أسعار الأنظمة')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('item')
                .setDescription('الخدمة المراد تعديل سعرها')
                .setRequired(true)
                .addChoices(...PRICE_CHOICES)
        )
        .addIntegerOption(opt =>
            opt.setName('new_price')
                .setDescription('السعر الجديد بالكريدت')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        // فحص صلاحية Administrator
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ هذا الأمر مخصص للمسؤول الأعلى صلاحية فقط (Administrator).',
                flags: 64
            });
        }

        const key      = interaction.options.getString('item');
        const newPrice = interaction.options.getInteger('new_price');
        const oldPrice = getCurrentPrice(key);

        if (oldPrice === null) {
            return interaction.reply({ content: '❌ حدث خطأ — المفتاح غير معروف.', flags: 64 });
        }

        savePrice(key, newPrice);

        const label = PRICE_CHOICES.find(c => c.value === key)?.name ?? key;

        const embed = new EmbedBuilder()
            .setTitle('💰 تم تعديل السعر بنجاح')
            .setColor('#2ecc71')
            .addFields(
                { name: '🏷️ الخدمة:',       value: label,                             inline: false },
                { name: '💵 السعر القديم:',  value: `\`${oldPrice.toLocaleString()}\` كريدت`, inline: true  },
                { name: '💰 السعر الجديد:',  value: `\`${newPrice.toLocaleString()}\` كريدت`, inline: true  },
                { name: '👤 عُدّل بواسطة:',  value: `${interaction.user}`,            inline: false }
            )
            .setFooter({ text: 'التغيير فعّال فوراً ومحفوظ بشكل دائم' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

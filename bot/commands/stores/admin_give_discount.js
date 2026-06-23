// تعديل بوكس خصم متجر يدوي
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_give_discount')
        .setDescription('🎁 [للإدارة] تفعيل بوكس الخصم (20%) لمتجر مجاناً')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });

        storeData.discountBox = { usedCount: 1, lastUsedTime: Date.now() };
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🎁 تم منح بوكس الخصم')
            .setColor('#2ecc71')
            .addFields(
                { name: '🏪 المتجر:', value: `${channel}`, inline: true },
                { name: '⏱️ المدة:', value: '`48 ساعة`', inline: true },
                { name: '👮 المسؤول:', value: `${interaction.user}`, inline: false }
            ).setTimestamp();

        await channel.send({ content: `<@${storeData.ownerId}> 🎉 **منحتك الإدارة بوكس خصم 20% مجاني لمدة 48 ساعة!**` }).catch(() => {});
        return interaction.reply({ embeds: [embed] });
    }
};

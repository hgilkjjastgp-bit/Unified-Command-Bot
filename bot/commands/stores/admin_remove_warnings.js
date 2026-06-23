// امر ازالة تحذيرات متجر يدوي
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_remove_warnings')
        .setDescription('🛡️ [للإدارة] إزالة تحذيرات المخالفات لمتجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('عدد التحذيرات المراد مسحها').setRequired(true).setMinValue(1)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const amount    = interaction.options.getInteger('amount');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });
        if (!storeData.warnings || storeData.warnings === 0)
            return interaction.reply({ content: '❌ هذا المتجر ليس لديه أي تحذيرات حالياً!', flags: 64 });

        const oldWarnings   = storeData.warnings;
        storeData.warnings  = Math.max(0, storeData.warnings - amount);
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🛡️ شطب تحذيرات المتجر')
            .setColor('#2ecc71')
            .addFields(
                { name: '🏪 المتجر:', value: `${channel}`, inline: true },
                { name: '👑 صاحب المتجر:', value: `<@${storeData.ownerId}>`, inline: true },
                { name: '📊 السابق:', value: `\`${oldWarnings} / 5\``, inline: true },
                { name: '📉 الممسوح:', value: `\`-${amount}\``, inline: true },
                { name: '✅ الحالي:', value: `\`${storeData.warnings} / 5\``, inline: true }
            ).setTimestamp();

        await channel.send({ content: `<@${storeData.ownerId}> 🎉 **قامت الإدارة بمسح ${amount} تحذير من متجرك!**` }).catch(() => {});
        return interaction.reply({ embeds: [embed] });
    }
};

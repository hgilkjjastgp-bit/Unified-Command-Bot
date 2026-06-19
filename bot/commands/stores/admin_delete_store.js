const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_delete_store')
        .setDescription('🚨 [للإدارة] حذف متجر بالكامل من النظام والرومات')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });

        global.storesData.delete(channel.id);
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🚨 تم حذف المتجر نهائياً')
            .setColor('#ff0000')
            .addFields(
                { name: '🏪 المتجر المحذوف:', value: `\`${channel.name}\` (\`${channel.id}\`)`, inline: true },
                { name: '👑 المالك السابق:',  value: `<@${storeData.ownerId}>`, inline: true },
                { name: '👮 المسؤول:',         value: `${interaction.user}`, inline: false }
            ).setTimestamp();

        await interaction.reply({ embeds: [embed] });
        setTimeout(() => channel.delete('حذف إداري للمتجر').catch(() => {}), 3000);
    }
};

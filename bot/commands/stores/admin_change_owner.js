// امر نقل ملكية متجر يدوي
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_change_owner')
        .setDescription('👑 [للإدارة] نقل ملكية متجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true))
        .addUserOption(opt => opt.setName('new_owner').setDescription('المالك الجديد').setRequired(true)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const newOwner  = interaction.options.getUser('new_owner');
        if (newOwner.bot) return interaction.reply({ content: '❌ لا يمكن نقل الملكية لبوت!', flags: 64 });

        const storeData = global.storesData.get(channel.id);
        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });

        const oldOwnerId    = storeData.ownerId;
        storeData.ownerId   = newOwner.id;
        if (global.saveStoresData) global.saveStoresData();

        await channel.permissionOverwrites.edit(oldOwnerId, { ViewChannel: null, SendMessages: null }).catch(() => {});
        await channel.permissionOverwrites.edit(newOwner.id, { ViewChannel: true, SendMessages: true, MentionEveryone: true }).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle('👑 تم نقل ملكية المتجر')
            .setColor('#ffaa00')
            .addFields(
                { name: '🏪 المتجر:',       value: `${channel}`,         inline: true },
                { name: '⬅️ المالك القديم:', value: `<@${oldOwnerId}>`, inline: true },
                { name: '➡️ المالك الجديد:', value: `${newOwner}`,        inline: true },
                { name: '👮 المسؤول:',       value: `${interaction.user}`, inline: false }
            ).setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

// تغير اسم متجر يدوي
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const EMOJI_MAP = { 'VIP': '👑', 'دايموند': '💎', 'ذهبي': '🥇', 'برونزي': '🥉' };

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_change_name')
        .setDescription('📝 [للإدارة] تغيير اسم روم متجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true))
        .addStringOption(opt => opt.setName('new_name').setDescription('الاسم الجديد').setRequired(true).setMinLength(2).setMaxLength(32)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel      = interaction.options.getChannel('channel');
        const newNameInput = interaction.options.getString('new_name').trim();
        const storeData    = global.storesData.get(channel.id);

        if (!storeData)
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });

        const currentType   = storeData.storeType || 'برونزي';
        const storeEmoji    = EMOJI_MAP[currentType] || '🏪';
        const cleanName     = newNameInput.replace(/[👑💎🥇🥉]/g, '').trim();
        const finalName     = `${storeEmoji}-${cleanName}`;

        await channel.setName(finalName).catch(err => console.error('[admin_change_name]', err.message));
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('📝 تم تعديل اسم المتجر')
            .setColor('#00ffff')
            .addFields(
                { name: '🏪 المتجر:',     value: `${channel}`,     inline: true },
                { name: '🔤 الاسم الجديد:', value: `\`${finalName}\``, inline: true },
                { name: '👮 المسؤول:',    value: `${interaction.user}`, inline: false }
            ).setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

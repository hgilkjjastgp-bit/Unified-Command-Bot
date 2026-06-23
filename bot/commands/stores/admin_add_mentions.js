// امر زيادة رصيد منشنات لي متاجر
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_add_mentions')
        .setDescription('➕ [للإدارة] زيادة رصيد المنشنات لمتجر محدد')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true))
        .addStringOption(opt => opt.setName('type').setDescription('نوع المنشن').setRequired(true)
            .addChoices({ name: '@everyone', value: 'everyoneLeft' }, { name: '@here', value: 'hereLeft' }))
        .addIntegerOption(opt => opt.setName('amount').setDescription('الكمية').setRequired(true).setMinValue(1)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel = interaction.options.getChannel('channel');
        const type    = interaction.options.getString('type');
        const amount  = interaction.options.getInteger('amount');
        const storeData = global.storesData.get(channel.id);

        if (!storeData)
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });

        if (!storeData.mentions) storeData.mentions = { everyoneLeft: 0, hereLeft: 0 };
        storeData.mentions[type] = (storeData.mentions[type] || 0) + amount;
        if (global.saveStoresData) global.saveStoresData();

        const typeLabel = type === 'everyoneLeft' ? '@everyone' : '@here';
        const embed = new EmbedBuilder()
            .setTitle('✅ تم شحن المنشنات يدوياً')
            .setColor('#00ff00')
            .addFields(
                { name: '🏪 المتجر:', value: `${channel}`, inline: true },
                { name: '📢 النوع:',  value: `\`${typeLabel}\``, inline: true },
                { name: '🔢 الكمية:', value: `\`+${amount}\` منشن`, inline: true },
                { name: '📊 الرصيد الجديد:', value: `\`${storeData.mentions[type]}\` منشن`, inline: false }
            ).setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

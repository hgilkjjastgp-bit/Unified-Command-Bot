const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const CATEGORY_MAP = {
    'VIP':      { id: "1509736323391688714", emoji: "👑" },
    'دايموند':  { id: "1509736509459136523", emoji: "💎" },
    'ذهبي':     { id: "1509736670499700757", emoji: "🥇" },
    'برونزي':   { id: "1509736906727100469", emoji: "🥉" }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_change_type')
        .setDescription('⚡ [للإدارة] تعديل فئة المتجر ونقله للكاتجيرو المخصص')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true))
        .addStringOption(opt => opt.setName('category').setDescription('الفئة الجديدة').setRequired(true)
            .addChoices(
                { name: '👑 VIP Stores',     value: 'VIP'     },
                { name: '💎 Diamond Stores', value: 'دايموند' },
                { name: '🥇 Gold Stores',    value: 'ذهبي'    },
                { name: '🥉 Bronze Stores',  value: 'برونزي'  }
            )),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const newType   = interaction.options.getString('category');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });
        if (storeData.storeType === newType) return interaction.reply({ content: '⚠️ المتجر مسجل بالفعل على نفس الفئة!', flags: 64 });

        const targetConfig      = CATEGORY_MAP[newType];
        const oldType           = storeData.storeType;
        storeData.storeType     = newType;
        if (global.saveStoresData) global.saveStoresData();

        await channel.setParent(targetConfig.id, { lockPermissions: false }).catch(err => console.error('[admin_change_type]', err.message));

        const embed = new EmbedBuilder()
            .setTitle('⚡ تم تعديل فئة المتجر')
            .setColor('#9b59b6')
            .addFields(
                { name: '🏪 المتجر:',       value: `${channel}`,             inline: true },
                { name: '📊 الفئة السابقة:', value: `\`${oldType || 'غير محددة'}\``, inline: true },
                { name: '🚀 الفئة الجديدة:', value: `${targetConfig.emoji} \`${newType}\` Stores`, inline: true },
                { name: '👮 المسؤول:',       value: `${interaction.user}`,    inline: false }
            ).setTimestamp();

        await channel.send({ content: `<@${storeData.ownerId}> ⚡ **مبروك! تمت ترقية متجرك إلى فئة ${targetConfig.emoji} ${newType}.**` }).catch(() => {});
        return interaction.reply({ embeds: [embed] });
    }
};

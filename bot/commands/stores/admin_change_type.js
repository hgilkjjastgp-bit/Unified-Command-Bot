const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

const CATEGORY_MAP = {
    VIP:     { catId: config.stores.categories.vip.id,     emoji: '👑' },
    Diamond: { catId: config.stores.categories.diamond.id, emoji: '💎' },
    Gold:    { catId: config.stores.categories.gold.id,    emoji: '🎖' },
    Bronze:  { catId: config.stores.categories.bronze.id,  emoji: '🥉' }
};

const STORE_EMOJIS = ['👑', '💎', '🎖', '🥉'];
function replaceStoreEmoji(channelName, newEmoji) {
    let name = channelName;
    for (const em of STORE_EMOJIS) name = name.split(em).join('');
    return `${name.replace(/\s+$/, '')}${newEmoji}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_change_type')
        .setDescription('⚡ [للإدارة] تعديل فئة المتجر ونقله للكاتجيرو المخصص')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true))
        .addStringOption(opt => opt.setName('category').setDescription('الفئة الجديدة').setRequired(true)
            .addChoices(
                { name: '👑 VIP Stores',     value: 'VIP'     },
                { name: '💎 Diamond Stores', value: 'Diamond' },
                { name: '🎖 Gold Stores',    value: 'Gold'    },
                { name: '🥉 Bronze Stores',  value: 'Bronze'  }
            )),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = config.stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const newType   = interaction.options.getString('category');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });
        if (storeData.storeType === newType) return interaction.reply({ content: '⚠️ المتجر مسجل بالفعل على نفس الفئة!', flags: 64 });

        const targetConfig = CATEGORY_MAP[newType];
        const oldType      = storeData.storeType;

        storeData.storeType = newType;
        if (global.saveStoresData) global.saveStoresData();

        // ── نقل الروم تلقائياً إلى الكاتجيرو الجديد ──
        await channel.setParent(targetConfig.catId, { lockPermissions: false })
            .catch(err => console.error('[admin_change_type] خطأ في نقل الروم:', err.message));

        // ── تحديث اسم الروم بأموجي الفئة الجديدة ──
        const newChannelName = replaceStoreEmoji(channel.name, targetConfig.emoji);
        if (newChannelName !== channel.name)
            await channel.setName(newChannelName)
                .catch(err => console.error('[admin_change_type] خطأ في تغيير الاسم:', err.message));

        const embed = new EmbedBuilder()
            .setTitle('⚡ تم تعديل فئة المتجر')
            .setColor('#9b59b6')
            .addFields(
                { name: '🏪 المتجر:',        value: `${channel}`,                                     inline: true  },
                { name: '📊 الفئة السابقة:', value: `\`${oldType || 'غير محددة'}\``,                  inline: true  },
                { name: '🚀 الفئة الجديدة:', value: `${targetConfig.emoji} \`${newType} Stores\``,    inline: true  },
                { name: '👮 المسؤول:',        value: `${interaction.user}`,                            inline: false }
            ).setTimestamp();

        await channel.send({
            content: `<@${storeData.ownerId}> ${targetConfig.emoji} **مبروك! تمت ترقية متجرك إلى فئة ${newType} Stores.**`
        }).catch(() => {});

        return interaction.reply({ embeds: [embed] });
    }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_give_warning')
        .setDescription('⚠️ [للإدارة] إعطاء تحذير رسمي لمتجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر المخالف').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('سبب التحذير').setRequired(true)
            .addChoices(
                { name: 'منشن وراه بعد ما استناه ساعة', value: 'منشن متكرر دون انتظار ساعة كاملة' },
                { name: 'كتب بدون تشفير',               value: 'كتابة كلمات محظورة بدون تشفير'  },
                { name: 'منشن ما عنده منشنات',           value: 'محاولة المنشن ورصيده صفر'       }
            )),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const reason    = interaction.options.getString('reason');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });

        storeData.warnings = (storeData.warnings || 0) + 1;
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🚨 تسجيل تحذير رسمي')
            .setColor('#ff0000')
            .addFields(
                { name: '🏪 المتجر المخالف:',    value: `${channel}`,                         inline: true  },
                { name: '👑 صاحب المتجر:',       value: `<@${storeData.ownerId}>`,             inline: true  },
                { name: '👮 المسؤول:',            value: `${interaction.user}`,                inline: true  },
                { name: '📊 مجموع التحذيرات:',   value: `\`${storeData.warnings} / 5\``,      inline: true  },
                { name: '📝 السبب:',              value: `\`\`\`${reason}\`\`\``,              inline: false }
            ).setTimestamp();

        await channel.send({ content: `<@${storeData.ownerId}> ⚠️ **تحذير إداري رسمي!**`, embeds: [embed] }).catch(() => {});
        return interaction.reply({ content: '✅ تم تسجيل التحذير.', embeds: [embed] });
    }
};

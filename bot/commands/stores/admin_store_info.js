const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_store_info')
        .setDescription('📊 [للإدارة] جلب بيانات المتجر الكاملة')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel   = interaction.options.getChannel('channel');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) return interaction.reply({ content: '❌ هذا الروم غير مسجل في قاعدة البيانات!', flags: 64 });

        const hasDiscount    = storeData.discountBox?.usedCount > 0 && (Date.now() - storeData.discountBox.lastUsedTime < 172800000);
        const autoPostStatus = storeData.autoPost?.isActive ? `🟢 نشط (باقة: ${storeData.autoPost.planType})` : '🔴 معطل';

        const infoEmbed = new EmbedBuilder()
            .setTitle('📊 تقرير بيانات المتجر')
            .setDescription(`بيانات المتجر المرتبط بروم: ${channel}`)
            .setColor(storeData.settings?.embedColor || '#2b2d31')
            .addFields(
                { name: '👑 المالك الحالي:',    value: `<@${storeData.ownerId}>`,                                inline: false },
                { name: '⚡ الفئة:',             value: `\`${storeData.storeType || 'غير محدد'}\` Stores`,       inline: true  },
                { name: '⚠️ التحذيرات:',        value: `\`${storeData.warnings || 0} / 5\``,                    inline: true  },
                { name: '📢 رصيد @everyone:',   value: `\`${storeData.mentions?.everyoneLeft || 0}\` منشن`,      inline: true  },
                { name: '🔔 رصيد @here:',       value: `\`${storeData.mentions?.hereLeft || 0}\` منشن`,          inline: true  },
                { name: '🚀 النشر التلقائي:',   value: autoPostStatus,                                           inline: true  },
                { name: '🎁 بوكس الخصم (20%):', value: hasDiscount ? '🟢 فعال' : '🔴 غير فعال',                inline: true  },
                { name: '🖌️ الخط التلقائي:',    value: storeData.settings?.autoLine ? '🟢 مفعل' : '🔴 معطل',   inline: false }
            )
            .setFooter({ text: `آيدي الروم: ${channel.id}` })
            .setTimestamp();

        return interaction.reply({ embeds: [infoEmbed], flags: 64 });
    }
};

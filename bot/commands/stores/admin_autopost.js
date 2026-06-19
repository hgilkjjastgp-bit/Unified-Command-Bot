const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_autopost')
        .setDescription('🚀 [للإدارة] تشغيل باقة نشر تلقائي لمتجر محدد')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(opt => opt.setName('channel').setDescription('روم المتجر').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('مدة الباقة').setRequired(true)
            .addChoices(
                { name: '⏱️ يوم واحد (24 ساعة)', value: 'day' },
                { name: '⚡ يومين (48 ساعة)',     value: 'day2' },
                { name: '🔥 أسبوع (7 أيام)',      value: 'week' }
            ))
        .addStringOption(opt => opt.setName('mention').setDescription('نوع المنشن').setRequired(true)
            .addChoices(
                { name: '@everyone', value: 'everyone' },
                { name: '@here',     value: 'here' },
                { name: '🎲 عشوائي', value: 'random' }
            ))
        .addStringOption(opt => opt.setName('text').setDescription('نص الإعلان').setRequired(true).setMinLength(3).setMaxLength(500)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = require('../../config.js').stores.staffRoleId;
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const channel     = interaction.options.getChannel('channel');
        const duration    = interaction.options.getString('duration');
        const mentionType = interaction.options.getString('mention');
        const postText    = interaction.options.getString('text').trim();
        const storeData   = global.storesData.get(channel.id);

        if (!storeData)
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط!', flags: 64 });

        const now = Date.now();
        const durationMs = { day: 86400000, day2: 172800000, week: 604800000 }[duration] || 86400000;
        const labelMap   = { day: 'يوم واحد', day2: 'يومين', week: 'أسبوع كامل' };

        storeData.autoPost = {
            isActive: true, planType: duration, text: postText, allowChange: true,
            mentionType, lastPostTime: 0, activatedAt: now, expiresAt: now + durationMs,
            dailyFeePaidToday: true, unpaidDaysCount: 0, speedHours: 1
        };
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🚀 تم تفعيل النشر التلقائي')
            .setColor('#3498db')
            .addFields(
                { name: '🏪 المتجر:',   value: `${channel}`, inline: true },
                { name: '⏱️ الباقة:',   value: `\`${labelMap[duration]}\``, inline: true },
                { name: '📢 المنشن:',   value: `\`@${mentionType}\``, inline: true },
                { name: '📝 نص الإعلان:', value: `\`\`\`${postText}\`\`\``, inline: false }
            ).setTimestamp();

        await channel.send({ content: `<@${storeData.ownerId}> 🚀 **تم تفعيل النشر التلقائي لمتجرك بواسطة الإدارة!**` }).catch(() => {});
        return interaction.reply({ embeds: [embed] });
    }
};

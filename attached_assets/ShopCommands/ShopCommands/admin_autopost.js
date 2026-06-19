const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_autopost')
        .setDescription('🚀 [للإدارة] تشغيل وجدولة باقة نشر تلقائي لمتجر محدد احتياطياً')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المستهدف للنشر')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('اختر مدة باقة النشر التلقائي')
                .setRequired(true)
                .addChoices(
                    { name: '⏱️ يوم واحد (24 ساعة)', value: 'day' },
                    { name: '⚡ يومين (48 ساعة)', value: 'day2' },
                    { name: '🔥 أسبوع كامل (7 أيام)', value: 'week' }
                ))
        .addStringOption(option =>
            option.setName('mention')
                .setDescription('نوع المنشن المرافق للإعلان المجدول')
                .setRequired(true)
                .addChoices(
                    { name: '@everyone', value: 'everyone' },
                    { name: '@here', value: 'here' },
                    { name: '🎲 عشوائي (Random)', value: 'random' }
                ))
        .addStringOption(option =>
            option.setName('text')
                .setDescription('اكتب نص الإعلان الكامل المراد نشره آلياً')
                .setRequired(true)
                .setMinLength(3)
                .setMaxLength(500)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const duration = interaction.options.getString('duration');
        const mentionType = interaction.options.getString('mention');
        const postText = interaction.options.getString('text').trim();

        const storeData = global.storesData.get(channel.id);
        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        // حساب أوقات انتهاء الباقات بالملي ثانية بدقة
        const now = Date.now();
        let durationMs = 24 * 60 * 60 * 1000; // الافتراضي يوم
        if (duration === 'day2') durationMs = 48 * 60 * 60 * 1000;
        if (duration === 'week') durationMs = 7 * 24 * 60 * 60 * 1000;

        const labelMap = { day: 'يوم واحد (24 ساعة)', day2: 'يومين (48 ساعة)', week: 'أسبوع كامل (7 أيام)' };

        // كتابة وتحديث بيانات النشر التلقائي بداخل الـ JSON الموحد فوراً
        storeData.autoPost = {
            isActive: true,
            planType: duration,
            text: postText,
            allowChange: true,
            mentionType: mentionType,
            lastPostTime: 0,
            activatedAt: now,
            expiresAt: now + durationMs,
            dailyFeePaidToday: true,
            unpaidDaysCount: 0,
            speedHours: 1
        };

        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🚀 تم تفعيل وجدولة النشر التلقائي')
            .setDescription(`قام مسؤول المتاجر بتشغيل النظام المجدول لمتجر بالخلفية ليعمل كل ساعة تلقائياً.`)
            .setColor('#3498db')
            .addFields(
                { name: '🏪 المتجر المستهدف:', value: `${channel}`, inline: true },
                { name: '⏱️ الباقة الزمنية:', value: `\`${labelMap[duration]}\``, inline: true },
                { name: '📢 نوع المنشن المعتمد:', value: `\`@${mentionType}\``, inline: true },
                { name: '📝 نص الإعلان المعتمد للنشر:', value: `\`\`\`${postText}\`\`\``, inline: false }
            )
            .setTimestamp();

        // إشعار شات المتجر ببدء تفعيل الجدولة الذكية
        await channel.send({ content: `<@${storeData.ownerId}> 🚀 **تم تفعيل خدمة النشر التلقائي المجدول لمتجرك بواسطة الإدارة بنجاح!**` }).catch(() => {});

        return interaction.reply({ embeds: [embed] });
    }
};

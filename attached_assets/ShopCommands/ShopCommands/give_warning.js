const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_give_warning')
        .setDescription('⚠️ [للإدارة] إعطاء تحذير رسمي لمخالفات المتجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المخالف')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('اختر سبب التحذير الجاهز من القائمة')
                .setRequired(true)
                .addChoices(
                    { name: 'منشن وراه بعد ما استناه ساعة', value: 'منشن متكرر دون انتظار ساعة كاملة بين المنشنين' },
                    { name: 'كتب بدون تشفير', value: 'كتابة كلمات محظورة أو إعلانية بدون استخدام نظام التشفير' },
                    { name: 'منشن ما عنده منشنات', value: 'محاولة المنشن اليدوي ورصيده الحالي بالنظام صفر منشن' }
                )),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const reason = interaction.options.getString('reason');

        const storeData = global.storesData.get(channel.id);
        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        // زيادة عداد التحذيرات يدوياً
        storeData.warnings = (storeData.warnings || 0) + 1;
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🚨 تسجيل تحذير رسمي لمتجر')
            .setDescription(`تم إعطاء مخالفة للمتجر أدناه لمخالفته قوانين السيرفر.`)
            .setColor('#ff0000')
            .addFields(
                { name: '🏪 المتجر المخالف:', value: `${channel} (\`${channel.id}\`)`, inline: true },
                { name: '👑 صاحب المتجر:', value: `<@${storeData.ownerId}>`, inline: true },
                { name: '👮 المسؤول صادر العقوبة:', value: `${interaction.user}`, inline: true },
                { name: '📊 مجموع التحذيرات الحالية:', value: `\`${storeData.warnings} / 5\``, inline: true },
                { name: '📝 السبب الموثق للمخالفة:', value: `\`\`\`${reason}\`\`\``, inline: false }
            )
            .setTimestamp();

        // إرسال رسالة تحذيرية داخل روم المتجر نفسه لتنبيه المالك والزبائن
        await channel.send({ content: `<@${storeData.ownerId}> ⚠️ **تحذير إداري رسمي!**`, embeds: [embed] }).catch(() => {});

        return interaction.reply({ content: `✅ تم تسجيل التحذير بنجاح وإرسال الإشعار لشات المتجر.`, embeds: [embed] });
    }
};

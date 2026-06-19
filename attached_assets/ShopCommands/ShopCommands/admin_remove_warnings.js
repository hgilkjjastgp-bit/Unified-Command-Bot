const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_remove_warnings')
        .setDescription('🛡️ [للإدارة] إزالة وتصفير تحذيرات المخالفات لمتجر محدد احتياطياً')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المستهدف')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('عدد التحذيرات المراد مسحها من السجل')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        // التحقق الحتمي الصارم من رتبة مسؤول المتاجر المعتمدة
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const amount = interaction.options.getInteger('amount');

        const storeData = global.storesData.get(channel.id);
        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        if (!storeData.warnings || storeData.warnings === 0) {
            return interaction.reply({ content: `❌ هذا المتجر ليس لديه أي تحذيرات أو مخالفات في السجل حالياً لتتم إزالتها!`, flags: 64 });
        }

        // إنقاص التحذيرات بالتأكيد على ألا تقل القيمة عن صفر مطلقاً لمنع الكراش
        const oldWarnings = storeData.warnings;
        storeData.warnings = Math.max(0, storeData.warnings - amount);
        
        if (global.saveStoresData) global.saveStoresData(); // حفظ فوري في قاعدة بيانات الـ JSON

        const embed = new EmbedBuilder()
            .setTitle('🛡️ شطب وإزالة مخالفات المتجر')
            .setDescription(`قام مسؤول المتاجر بتطهير وتعديل سجل المخالفات للمتجر بنجاح.`)
            .setColor('#2ecc71')
            .addFields(
                { name: '🏪 المتجر المستهدف:', value: `${channel} (\`${channel.id}\`)`, inline: true },
                { name: '👑 صاحب المتجر:', value: `<@${storeData.ownerId}>`, inline: true },
                { name: '📊 العداد السابق:', value: `\`${oldWarnings} / 5\``, inline: true },
                { name: '📉 الكمية الممسوحة:', value: `\`-${amount}\` تحذير`, inline: true },
                { name: '✅ الرصيد الحالي المعتمد:', value: `\`${storeData.warnings} / 5\``, inline: true },
                { name: '👮 المسؤول المنفذ:', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        // إرسال إشعار لشات المتجر لطمأنة صاحب المتجر
        await channel.send({ content: `<@${storeData.ownerId}> 🎉 **خبر سار! قامت الإدارة بمسح وإزالة عدد (\`${amount}\`) من تحذيرات متجرك الموثقة.**` }).catch(() => {});

        return interaction.reply({ embeds: [embed] });
    }
};

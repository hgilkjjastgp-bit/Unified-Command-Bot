const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_delete_store')
        .setDescription('🚨 [للإدارة] حذف وإزالة متجر بالكامل من النظام والرومات نهائياً')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المراد تصفيتها وإبادتها')
                .setRequired(true)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        const ownerId = storeData.ownerId;

        // إرسال رد مبدئي قبل تنفيذ الحذف المباشر لتفادي أخطاء تأخر الاستجابة
        await interaction.reply({ content: `⏳ جاري حذف المتجر المرتبط بروم \`${channel.name}\` وتطهير السجلات نهائياً...` });

        // 1. مسح وحذف البيانات فوراً من الـ JSON الموحد
        global.storesData.delete(channel.id);
        if (global.saveStoresData) global.saveStoresData();

        // 2. حذف روم القناة من السيرفر في ديسكورد
        setTimeout(async () => {
            await channel.delete(`تم الحذف احتياطياً بواسطة مسؤول المتاجر: ${interaction.user.tag}`).catch(() => {});
        }, 1500);

        const logEmbed = new EmbedBuilder()
            .setTitle('🚨 تصفية وحذف متجر نهائياً')
            .setDescription(`تمت إزالة المتجر وبياناته بالكامل من السيرفر والنظام.`)
            .setColor('#d35400')
            .addFields(
                { name: '🗑️ اسم الروم المحذوف:', value: `\`${channel.name}\``, inline: true },
                { name: '🆔 معرف الروم (ID):', value: `\`${channel.id}\``, inline: true },
                { name: '👑 المالك السابق للمتجر:', value: `<@${ownerId}>`, inline: true },
                { name: '👮 المسؤول المنفذ للحذف:', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        return interaction.followUp({ embeds: [logEmbed] }).catch(() => {});
    }
};

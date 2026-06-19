const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_change_owner')
        .setDescription('👑 [للإدارة] نقل ملكية وتغيير صاحب متجر محدد احتياطياً')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('new_owner')
                .setDescription('اختر المالك الجديد للمتجر')
                .setRequired(true)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const newOwner = interaction.options.getUser('new_owner');

        if (newOwner.bot) {
            return interaction.reply({ content: '❌ خطأ: لا يمكن نقل ملكية المتجر إلى حساب بوت تفاعلي!', flags: 64 });
        }

        const storeData = global.storesData.get(channel.id);
        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        const oldOwnerId = storeData.ownerId;
        
        // تحديث معرف المالك الجديد في قاعدة البيانات الفورية
        storeData.ownerId = newOwner.id;
        if (global.saveStoresData) global.saveStoresData();

        // تحديث صلاحيات الروم تلقائياً (إلغاء المالك القديم وإضافة المالك الجديد)
        await channel.permissionOverwrites.edit(oldOwnerId, { ViewChannel: null, SendMessages: null }).catch(() => {});
        await channel.permissionOverwrites.edit(newOwner.id, { ViewChannel: true, SendMessages: true }).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle('👑 تم نقل ملكية المتجر يدوياً')
            .setDescription(`تم سحب صلاحيات المتجر وإعطائها للمالك الجديد بواسطة الإدارة المباشرة.`)
            .setColor('#ffaa00')
            .addFields(
                { name: '🏪 روم المتجر:', value: `${channel}`, inline: true },
                { name: '⬅️ المالك القديم:', value: `<@${oldOwnerId}>`, inline: true },
                { name: '➡️ المالك الجديد المعتمد:', value: `${newOwner}`, inline: true },
                { name: '👮 المسؤول الناقل:', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

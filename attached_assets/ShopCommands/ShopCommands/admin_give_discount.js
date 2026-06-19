const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_give_discount')
        .setDescription('🎁 [للإدارة] تفعيل بوكس الخصم المالي (20%) لمتجر محدد مجاناً')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر')
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

        // تفعيل الخصم في قاعدة البيانات وتوثيق التاريخ الحركي الفوري لـ 48 ساعة
        storeData.discountBox = {
            usedCount: 1,
            lastUsedTime: Date.now()
        };

        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('🎁 تم منح بوكس الخصم الإداري')
            .setDescription(`تم تفعيل خصم الـ 20% الشامل على كافة الخدمات الفرعية لهذا المتجر بنجاح وبشكل مجاني.`)
            .setColor('#2ecc71')
            .addFields(
                { name: '🏪 المتجر المستفيد:', value: `${channel}`, inline: true },
                { name: '⏱️ مدة الصلاحية الفورية:', value: `\`48 ساعة كاملة\``, inline: true },
                { name: '👮 المسؤول المانح للهدية:', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        // إشعار شات المتجر بالهدية الإدارية
        await channel.send({ content: `<@${storeData.ownerId}> 🎉 **مبروك! منحتك الإدارة بوكس خصم مالي 20% مجاني ومفعل الآن لمدة 48 ساعة!**` }).catch(() => {});

        return interaction.reply({ embeds: [embed] });
    }
};

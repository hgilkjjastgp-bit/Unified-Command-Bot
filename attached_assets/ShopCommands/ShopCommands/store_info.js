const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_store_info')
        .setDescription('📊 [للإدارة] جلب واستعراض كامل بيانات المتجر من النظام')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المستهدف')
                .setRequired(true)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const storeData = global.storesData.get(channel.id);

        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في قاعدة البيانات!', flags: 64 });
        }

        const hasDiscount = storeData.discountBox && storeData.discountBox.usedCount > 0 && (Date.now() - storeData.discountBox.lastUsedTime < 48 * 60 * 60 * 1000);
        const autoPostStatus = storeData.autoPost && storeData.autoPost.isActive ? `🟢 نشط (باقة: ${storeData.autoPost.planType})` : '🔴 معطل';

        const infoEmbed = new EmbedBuilder()
            .setTitle(`📊 تقرير البيانات الرسمي للمتجر`)
            .setDescription(`مستند رقمي كامل وموثق لبيانات المتجر المرتبط بروم: ${channel}`)
            .setColor(storeData.settings?.embedColor || '#2b2d31')
            .addFields(
                { name: '👑 مالك المتجر الحالي:', value: `<@${storeData.ownerId}> (\`${storeData.ownerId}\`)`, inline: false },
                { name: '⚡ فئة ونوع المتجر:', value: `\`${storeData.storeType || 'غير محدد'}\` Stores`, inline: true },
                { name: '⚠️ عدد التحذيرات:', value: `\`${storeData.warnings || 0} / 5\``, inline: true },
                { name: '📢 رصيد منشن @everyone:', value: `\`${storeData.mentions?.everyoneLeft || 0}\` منشن متبقي`, inline: true },
                { name: '🔔 رصيد منشن @here:', value: `\`${storeData.mentions?.hereLeft || 0}\` منشن متبقي`, inline: true },
                { name: '🚀 حالة النشر التلقائي:', value: autoPostStatus, inline: true },
                { name: '🎁 بوكس الخصم المالي (20%):', value: hasDiscount ? '🟢 فعال ونشط' : '🔴 غير فعال', inline: true },
                { name: '🖌️ الخط التلقائي للمنشن:', value: storeData.settings?.autoLine ? '🟢 مفعل' : '🔴 معطل', inline: false }
            )
            .setFooter({ text: `معرّف الروم: ${channel.id}` })
            .setTimestamp();

        return interaction.reply({ embeds: [infoEmbed], flags: 64 });
    }
};

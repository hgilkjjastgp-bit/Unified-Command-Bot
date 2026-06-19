// و هون مجلد اوامر و في ملفات 11 اتوقع كل اوامر ادمجهم بي اوامر مزاد و مشنورات و ضيف امر الي في ملف رائيسي اقرا ملفات كلة في مجلد 

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_add_mentions')
        .setDescription('➕ [للإدارة] زيادة رصيد المنشنات لمتجر محدد')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers) // التحقق من صلاحية الإدارة
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المستهدف')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('نوع المنشن المراد زيادته')
                .setRequired(true)
                .addChoices(
                    { name: '@everyone', value: 'everyoneLeft' },
                    { name: '@here', value: 'hereLeft' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('الكمية المراد إضافتها للرصيد')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        // التحقق من الرتبة المحددة بأيدي المسؤولين في ملفك الأول
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const type = interaction.options.getString('type');
        const amount = interaction.options.getInteger('amount');

        const storeData = global.storesData.get(channel.id);
        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        // إضافة المنشنات تلقائياً وتحديث قاعدة البيانات الحركية
        if (!storeData.mentions) storeData.mentions = { everyoneLeft: 0, hereLeft: 0 };
        storeData.mentions[type] = (storeData.mentions[type] || 0) + amount;

        if (global.saveStoresData) global.saveStoresData(); // حفظ فوري في الـ JSON

        const typeLabel = type === 'everyoneLeft' ? '@everyone' : '@here';
        const embed = new EmbedBuilder()
            .setTitle('✅ تم شحن المنشنات يدوياً')
            .setDescription(`تمت إضافة المنشنات بنجاح بواسطة مسؤول المتاجر: ${interaction.user}`)
            .setColor('#00ff00')
            .addFields(
                { name: '🏪 المتجر المستهدف:', value: `${channel} (\`${channel.id}\`)`, inline: true },
                { name: '📢 نوع الشحن:', value: `\`${typeLabel}\``, inline: true },
                { name: '🔢 الكمية المضافة:', value: `\`+${amount}\` منشن`, inline: true },
                { name: '📊 الرصيد الجديد الحالي:', value: `\`${storeData.mentions[type]}\` منشن`, inline: false }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// خريطة الرموز التعبيرية المطابقة لنوع المتجر المسجل بالنظام
const EMOJI_MAP = {
    'VIP': '👑',
    'دايموند': '💎',
    'ذهبي': '🥇',
    'برونزي': '🥉'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_change_name')
        .setDescription('📝 [للإدارة] تغيير اسم روم متجر وتحديثه بالإيموجي التلقائي للفئة')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المراد تعديله')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('new_name')
                .setDescription('اكتب اسم المتجر الجديد (سيتم إضافة إيموجي الفئة تلقائياً)')
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(32)),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        let newNameInput = interaction.options.getString('new_name').trim();

        const storeData = global.storesData.get(channel.id);
        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        // تحديد الإيموجي بناءً على نوع المتجر المخزن في قاعدة بياناتك
        const currentType = storeData.storeType || 'برونزي';
        const storeEmoji = EMOJI_MAP[currentType] || '🏪';

        // تنظيف أي إيموجيات مكررة من المدخلات وتركيب الإيموجي الرسمي في البداية بدقة
        const cleanName = newNameInput.replace(/[👑💎🥇🥉]/g, '').trim();
        const finalChannelName = `${storeEmoji}-${cleanName}`;

        // تطبيق تغيير الاسم الفوري للروم في ديسكورد
        await channel.setName(finalChannelName).catch((err) => {
            console.error('❌ خطأ أثناء تعديل اسم الروم:', err.message);
        });

        // حفظ وتأكيد البيانات بالملف
        if (global.saveStoresData) global.saveStoresData();

        const embed = new EmbedBuilder()
            .setTitle('📝 تم تعديل اسم المتجر بنجاح')
            .setDescription(`قام مسؤول المتاجر بتحديث اسم القناة ودمج إيموجي التصنيف تلقائياً.`)
            .setColor('#00ffff')
            .addFields(
                { name: '🏪 المتجر المستهدف:', value: `${channel}`, inline: true },
                { name: '🏷️ باقة المتجر الحالية:', value: `\`${currentType}\` Stores`, inline: true },
                { name: '🔤 الاسم المعتمد الجديد:', value: `\`${finalChannelName}\``, inline: false },
                { name: '👮 المسؤول المعدل:', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// مصفوفة البيانات الثابتة للأنواع والكاتجيروات والرموز الخاصة بها
const CATEGORY_MAP = {
    'VIP':      { id: "1509736323391688714", emoji: "👑" },
    'دايموند': { id: "1509736509459136523", emoji: "💎" },
    'ذهبي':    { id: "1509736670499700757", emoji: "🥇" },
    'برونزي':  { id: "1509736906727100469", emoji: "🥉" }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_change_type')
        .setDescription('⚡ [للإدارة] تعديل فئة المتجر ونقله للكاتجيرو المخصص تلقائياً')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('اختر روم المتجر المستهدف')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('اختر الفئة الجديدة لتحويل المتجر إليها')
                .setRequired(true)
                .addChoices(
                    { name: '👑 VIP Stores', value: 'VIP' },
                    { name: '💎 Diamond Stores', value: 'دايموند' },
                    { name: '🥇 Gold Stores', value: 'ذهبي' },
                    { name: '🥉 Bronze Stores', value: 'برونزي' }
                )),

    async execute(interaction) {
        const REQUIRED_ROLE_ID = "1509576925478256663";
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لمسؤولي المتاجر فقط!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');
        const newType = interaction.options.getString('category');

        const storeData = global.storesData.get(channel.id);
        if (!storeData) {
            return interaction.reply({ content: '❌ هذا الروم غير مسجل كمتجر نشط في النظام!', flags: 64 });
        }

        const oldType = storeData.storeType;
        if (oldType === newType) {
            return interaction.reply({ content: '⚠️ هذا المتجر مسجل بالفعل على نفس الفئة المحددة!', flags: 64 });
        }

        // جلب بيانات الكاتجيرو المستهدف
        const targetConfig = CATEGORY_MAP[newType];

        // 1. تحديث البيانات في الذاكرة وفي الـ JSON
        storeData.storeType = newType;
        if (global.saveStoresData) global.saveStoresData();

        // 2. نقل الروم إلى الكاتجيرو الجديد حركياً تلقائياً
        await channel.setParent(targetConfig.id, { lockPermissions: false }).catch((err) => {
            console.error('❌ فشل نقل الروم للكاتجيرو الجديد:', err.message);
        });

        const embed = new EmbedBuilder()
            .setTitle('⚡ تم تعديل فئة المتجر ونقله')
            .setDescription(`قام مسؤول المتاجر بنقل المتجر وتحديث باقته الرقمية بنجاح.`)
            .setColor('#9b59b6')
            .addFields(
                { name: '🏪 روم المتجر المرن:', value: `${channel}`, inline: true },
                { name: '📊 الفئة السابقة:', value: `\`${oldType || 'غير محددة'}\``, inline: true },
                { name: '🚀 الفئة والكاتجيرو الحالي:', value: `${targetConfig.emoji} \`${newType}\` Stores`, inline: true },
                { name: '👮 المسؤول المنفذ:', value: `${interaction.user}`, inline: false }
            )
            .setTimestamp();

        // إشعار شات المتجر نفسه بالتحول الجديد للزبائن
        await channel.send({ content: `<@${storeData.ownerId}> ⚡ **مبروك! قامت الإدارة بنقل متجرك وترقيته رسمياً إلى فئة ${targetConfig.emoji} ${newType}.**` }).catch(() => {});

        return interaction.reply({ embeds: [embed] });
    }
};

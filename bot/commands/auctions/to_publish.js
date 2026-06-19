const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('to_publish')
        .setDescription('🚀 نشر مزاد يدوي احتياطي (للمسؤولين فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('user').setDescription('العضو صاحب المزاد').setRequired(true))
        .addStringOption(opt => opt.setName('item').setDescription('المنتج').setRequired(true))
        .addStringOption(opt => opt.setName('price').setDescription('السعر البداية').setRequired(true))
        .addStringOption(opt => opt.setName('mention').setDescription('نوع المنشن').setRequired(true)
            .addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }))
        .addStringOption(opt => opt.setName('duration').setDescription('مدة المزاد').setRequired(true)
            .addChoices(
                { name: '5 دقائق > 1 انعاش', value: '1' },
                { name: '10 دقائق > 2 انعاش', value: '2' },
                { name: '15 دقائق > 3 انعاش', value: '3' }
            ))
        .addAttachmentOption(opt => opt.setName('image').setDescription('صورة المزاد (اختياري)').setRequired(false)),
    system: 'auctions'
};

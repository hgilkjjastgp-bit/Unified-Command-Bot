const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_posts')
        .setDescription('📢 إرسال لوحة شراء المنشورات الرسمية في السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    system: 'posts'
};

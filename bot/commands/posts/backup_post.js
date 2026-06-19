const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup_post')
        .setDescription('📝 نشر منشور احتياطي فوري (للإدارة فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    system: 'posts'
};

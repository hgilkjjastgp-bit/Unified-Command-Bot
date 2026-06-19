const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket_store')
        .setDescription('🏪 إرسال لوحة شراء المتاجر في السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
    system: 'stores'
};

// امر لوحة شراء مزاد
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_auction_panel')
        .setDescription('📦 إرسال لوحة شراء المزاد الرئيسية')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    system: 'auctions'
};

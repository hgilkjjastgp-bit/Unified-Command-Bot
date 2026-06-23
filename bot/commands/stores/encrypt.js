// امر فتح لوحة التشفير اليدوي
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { encryptText } = require('../../systems/stores/autoPostManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('encrypt')
        .setDescription('🔐 فتح لوحة التشفير اليدوي الفوري للكلمات'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔐 نظام تشفير الكلمات')
            .setDescription('اضغط على الزر لكتابة إعلانك وسيقوم البوت بتشفيره فوراً!\n\n⚠️ **الحد الأقصى: 40 كلمة في المرة.**')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('encrypt_open_modal').setLabel('📝 ابدأ التشفير الآن').setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleButtonAndModal(interaction) {
        if (interaction.customId === 'encrypt_open_modal') {
            const modal = new ModalBuilder().setCustomId('encrypt_modal').setTitle('🔐 تشفير الكلمات يدوياً');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('text_to_encrypt').setLabel('اكتب النص (الحد 40 كلمة):')
                    .setStyle(TextInputStyle.Paragraph).setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'encrypt_modal') {
            await interaction.deferReply({ flags: 64 });
            const rawText   = interaction.fields.getTextInputValue('text_to_encrypt');
            const words     = rawText.trim().split(/\s+/);
            if (words.length > 40)
                return interaction.editReply({ content: `❌ النص يحتوي على \`${words.length}\` كلمة! الحد الأقصى 40 كلمة.`, flags: 64 });

            return interaction.editReply({ content: encryptText(rawText), flags: 64 });
        }
    }
};

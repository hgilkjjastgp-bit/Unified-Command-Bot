const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('encrypt')
        .setDescription('🔐 فتح لوحة التشفير اليدوي الفوري للكلمات'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔐 نظام تشفير الكلمات للحماية التلقائية')
            .setDescription('اضغط على الزر أدناه لكتابة إعلانك، وسيقوم البوت بتعديله وتشفيره فوراً لحمايتك من عقوبات الروبوت والبروبوت!\n\n⚠️ **تنبيه:** الحد الأقصى للمكتوب هو 40 كلمة فقط في المرة الواحدة.')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_admin_encrypt_manual')
                .setLabel('📝 ابدأ التشفير الآن')
                .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};

// مصفوفة الكلمات الحساسة والمنظومة المستدعاة من ملفك الثاني بدقة
const targetWords = [
    'مطلوب', 'كريدت', 'كاش', 'بيع', 'للبيع', 'متوفر', 'شراء', 
    'سيرفر', 'حساب', 'حسابات', 'خصم', 'عرض', 'متوفرة', 'فيزا', 'بنك', 'متجر', 'مبيعات'
];

// دالة الاستماع المتطورة لمعالجة الزر والمودال والتحقق الحركي من الكلمات والرد المخفي
module.exports.handleButtonAndModal = async (interaction) => {
    if (interaction.customId === 'btn_admin_encrypt_manual') {
        const modal = new ModalBuilder().setCustomId('modal_admin_encrypt_manual').setTitle('🔐 تشفير الكلمات يدوياً');
        const textInput = new TextInputBuilder()
            .setCustomId('text_to_encrypt_manual')
            .setLabel('اكتب النص (الحد الأقصى 40 كلمة):')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('مثال: مطلوب كريدت كاش متوفر حسابات مبيعات...')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(textInput));
        return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_admin_encrypt_manual') {
        // الرد المبدئي مخفي وسري بالكامل كما طلبت تماماً لحماية خصوصية المحتوى
        await interaction.deferReply({ flags: 64 });
        const rawText = interaction.fields.getTextInputValue('text_to_encrypt_manual');
        
        // 🎯 فحص وحساب عدد الكلمات الفعلي بناءً على الفراغات لمنع تجاوز الـ 40 كلمة
        const wordsArray = rawText.trim().split(/\s+/);
        if (wordsArray.length > 40) {
            return interaction.editReply({ 
                content: `❌ **خطأ بالحماية:** النص الذي كتبته طويل جداً ويحتوي على (\`${wordsArray.length}\`) كلمة! الحد الأقصى المسموح به للتشفير هو **40 كلمة** فقط لتفادي الكراش والمخالفات.`, 
                flags: 64 
            });
        }
        
        // البدء في معالجة التشفير الحركي للكلمات المستهدفة بإضافة الحرف المائي الرقمي (¹)
        for (let i = 0; i < wordsArray.length; i++) {
            if (wordsArray[i].startsWith('http') || wordsArray[i].startsWith('<:') || wordsArray[i].startsWith('<a:')) continue;
            
            let cleanWord = wordsArray[i].toLowerCase().replace(/[^а-яёА-ЯЁa-zA-Z0-9\u0600-\u06FF]/g, "");
            if (targetWords.includes(cleanWord)) {
                let mid = Math.floor(wordsArray[i].length / 2);
                if (mid === 0) mid = 1;
                wordsArray[i] = wordsArray[i].substring(0, mid) + '¹' + wordsArray[i].substring(mid);
            }
        }
        
        let encryptedText = wordsArray.join(' ');
        
        // إرسال النتيجة النهائية الجاهزة للنسخ في رسالة مخفية سرية حتمية للعضو
        return interaction.editReply({ 
            content: `${encryptedText}`, 
            flags: 64 
        });
    }
};

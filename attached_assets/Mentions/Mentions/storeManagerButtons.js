// ملف 2 حق امر منشن و مجلد Mentions و امر منشن  دخل مجلد ذا و نظام المنشنات و ازار و موديال و شغلات ثانية و في ملفات 5 اخرى الذي راح يكون امر منشن موحد بي بوت الي حكيت علية و بعطيك مجلد الي فيه 6 ملفات 

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js');

// استدعاء ملف المعاملات المالي الموحد الموثق
const dbManager = require('./dbManager');

// دالة حساب الأسعار التلقائية بناءً على خصم بوكس الـ 20%
function getDiscountedPrice(storeData, basePrice, actionType) {
    if (!storeData.discountBox || storeData.discountBox.usedCount === 0) return basePrice;
    
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    if (now - storeData.discountBox.lastUsedTime > fortyEightHours) return basePrice;

    const eligibleActions = ['buy_mentions', 'remove_warnings', 'change_store_type', 'buy_autopost'];
    if (eligibleActions.includes(actionType)) {
        return Math.floor(basePrice * 0.80);
    }
    return basePrice;
}

// حماية من التكرار — يمنع معالجة نفس الرسالة مرتين عند إعادة تشغيل البوت
const _processedMsgIds = new Set();

module.exports = {
    // الاستماع والرد الفوري لأمر "منشن" بشات المتجر
    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;
        if (message.content !== 'منشن') return;

        // منع معالجة نفس الرسالة مرتين (يحدث عند تشغيل نسختين من البوت)
        if (_processedMsgIds.has(message.id)) return;
        _processedMsgIds.add(message.id);
        setTimeout(() => _processedMsgIds.delete(message.id), 10000);

        const storeData = global.storesData.get(message.channel.id);
        if (!storeData) return;

        const allowedTypes = ['VIP', 'دايموند', 'ذهبي', 'برونزي'];
        if (!allowedTypes.includes(storeData.storeType)) return;

        if (message.author.id !== storeData.ownerId) {
            return message.reply({ content: '❌ هذا الأمر مخصص لإدارة وصاحب المتجر فقط!', flags: 64 }).catch(() => {});
        }

        const nowTime = Date.now();
        if (!storeData.cooldowns) storeData.cooldowns = { lastMentionTime: 0, lastMentionType: null, lastMenuOpenTime: 0 };
        
        // فحص الكولداون — lastMenuOpenTime > 0 لتجنب خطأ القيمة الصفرية الأولى
        if (storeData.cooldowns.lastMenuOpenTime > 0 && (nowTime - storeData.cooldowns.lastMenuOpenTime < 5 * 60 * 1000)) {
            const minutesLeft = Math.ceil((5 * 60 * 1000 - (nowTime - storeData.cooldowns.lastMenuOpenTime)) / 60000);
            
            const msgCooldown = await message.channel.send({ content: `⚠️ **الحماية الفورية:** لا يمكنك فتح لوحة المنشن مرتين وراء بعض بسرعة! الرجاء الانتظار \`${minutesLeft}\` دقائق لتفادي الحجب.` }).catch(() => null);
            if (msgCooldown) {
                setTimeout(() => msgCooldown.delete().catch(() => {}), 5000);
            }
            return;
        }
        
        storeData.cooldowns.lastMenuOpenTime = nowTime;
        if (global.saveStoresData) global.saveStoresData();
        // حذف رسالة "منشن" لإبقاء الشات نظيف
        message.delete().catch(() => {});

        // اللون الافتراضي أو المخصص المطور للمتجر
        const storeColor = storeData.settings?.embedColor || '#2b2d31';

        // الإمبيد الرئيسي الذي يظهر بالروم للجميع
        const mainEmbed = new EmbedBuilder()
            .setTitle(`⚙️ لوحة إدارة متجرك والمنشنات المركزية`)
            .setDescription(`مرحباً بك يا غالي في مركز التحكم. اضغط على الأزرار بالأسفل لفتح الإعدادات والعمليات بشكل **مخفي وسري وخاص بك تماماً** دون إغراق الشات:`)
            .setColor(storeColor)
            .addFields(
                { name: '📢 رصيد منشن @everyone:', value: `\`${storeData.mentions?.everyoneLeft || 0}\` منشن متبقي`, inline: true },
                { name: '🔔 رصيد منشن @here:', value: `\`${storeData.mentions?.hereLeft || 0}\` منشن متبقي`, inline: true },
                { name: '⚠️ عدد التحذيرات الحالية:', value: `\`${storeData.warnings || 0} / 5\``, inline: true }
            );

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_buy_mentions').setLabel('🛒 شراء منشن إضافي').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_encrypt_text').setLabel('🔐 تشفير الكلمات التلقائي').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_store_settings').setLabel('⚙️ فتح إعدادات متجري الشاملة').setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({ embeds: [mainEmbed], components: [row1] });
    },
    // معالج كافة التفاعلات والأزرار المباشرة بنظام مخفي حتمي Ephemeral
    async handleInteraction(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // استخدام channelId مباشرة — channel قد يكون null في المودال من ephemeral
        const channelId = interaction.channelId ?? interaction.channel?.id;
        if (!channelId) return;

        const storeData = global.storesData.get(channelId);
        if (!storeData) return;

        // فحص البصمة الرقمية الأمني الصارم لعدم تلاعب أي طرف آخر بالأزرار المخفية
        if (interaction.user.id !== storeData.ownerId) {
            return interaction.reply({ content: '❌ عذراً، هذه اللوحة محمية ومشفرة لصاحب المتجر فقط لسرية العمليات المالية والتحديثات!', flags: 64 });
        }

        const storeColor = storeData.settings?.embedColor || '#5865f2';

        // ─── زر نظام تشفير الكلمات الحركي المطور (رد مخفي خاص) ───
        if (interaction.customId === 'btn_encrypt_text') {
            const modal = new ModalBuilder().setCustomId('modal_encrypt_text').setTitle('🔐 نظام تشفير الكلمات للحماية');
            const textInput = new TextInputBuilder()
                .setCustomId('text_to_encrypt')
                .setLabel('اكتب النص الكامل المراد تشفيره بدقة:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('مثال: مطلوب كريدت كاش متوفر حسابات مبيعات...')
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === 'modal_encrypt_text') {
            await interaction.deferReply({ flags: 64 });
            const rawText = interaction.fields.getTextInputValue('text_to_encrypt');
            
            const targetWords = [
                'مطلوب', 'كريدت', 'كاش', 'بيع', 'للبيع', 'متوفر', 'شراء', 
                'سيرفر', 'حساب', 'حسابات', 'خصم', 'عرض', 'متوفرة', 'فيزا', 'بنك', 'متجر', 'مبيعات'
            ];
            
            let wordsArray = rawText.split(/\s+/);
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
            return interaction.editReply({ content: encryptedText, flags: 64 });
        }

        // ─── لوحة إعدادات متجري المطورة (الحل القوي والأنظمة المدمجة والمكبرة) ───
        if (interaction.customId === 'btn_store_settings') {
            const hasDiscount = storeData.discountBox && storeData.discountBox.usedCount > 0 && (Date.now() - storeData.discountBox.lastUsedTime < 48 * 60 * 60 * 1000);
            
            const settingsEmbed = new EmbedBuilder()
                .setTitle('⚙️ قائمة التحكم وإعدادات المتجر الإدارية اللامحدودة')
                .setDescription(
                    'مرحباً بك في اللوحة الخاصة السرية والمخفية والضخمة المحمية بالكامل للتحكم بخصائص متجرك بضغطة زر احترافية:\n\n' +
                    '🚀 **شرح النشر التلقائي:** ميزة ذكية تمكن البوت من نشر وتشفير إعلانك المجدول تلقائياً كل ساعة خلف الكواليس لجذب الزبائن.\n\n' +
                    '🎁 **شرح بوكس الخصم:** يمنحك تخفيضاً فورياً وصارماً بنسبة 20% على شحن المنشنات والترقيات وإزالة المخالفات لمدة 48 ساعة!\n\n' +
                    '🎨 **تخصيص الهوية البصرية:** ميزة فريدة لتغيير اللون الخاص باللوحة ليميز متجرك بالكامل عن البقية.'
                )
                .setColor(storeColor)
                .addFields(
                    { name: '📊 عدد تحذيرات المتجر الحالية:', value: `\`${storeData.warnings || 0} / 5\``, inline: true },
                    { name: '🚀 حالة النشر التلقائي:', value: storeData.autoPost && storeData.autoPost.isActive ? `🟢 شغال (باقة: ${storeData.autoPost.planType})` : '🔴 معطل', inline: true },
                    { name: '🎁 بوكس الخصم المالي (20%):', value: hasDiscount ? '🟢 فعال ونشط' : '🔴 غير فعال حالياً', inline: true },
                    { name: '🎨 لون الإمبيد الحالي للهوية:', value: `\`${storeData.settings?.embedColor || '#2b2d31'}\``, inline: true },
                    { name: '🖌️ ميزة الخط التلقائي للمنشن:', value: storeData.settings?.autoLine ? '🟢 شغال ومفعل' : '🔴 معطل', inline: false }
                );

            // السطر الأول: 3 أزرار التعديل الرئيسية
            const rowButtons1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('opt_change_name').setLabel('📝 تغيير اسم المتجر').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('opt_change_owner').setLabel('👑 تغيير مالك المتجر').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('opt_change_type').setLabel('⚡ تغيير نوع المتجر').setStyle(ButtonStyle.Secondary)
            );

            // السطر الثاني: تحذيرات + نشر تلقائي
            const rowButtons2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('opt_remove_warnings').setLabel('🛡️ إزالة تحذيرات المخالفات').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('opt_buy_autopost').setLabel('🚀 شراء خدمة النشر التلقائي').setStyle(ButtonStyle.Secondary)
            );

            // السطر الثالث: خط تلقائي + بوكس خصم
            const rowButtons3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('opt_buy_line').setLabel('🎨 تفعيل الخط التلقائي').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('opt_buy_discount_box').setLabel('🎁 تفعيل بوكس الخصم 20٪').setStyle(ButtonStyle.Success)
            );

            // السطر الرابع: حذف المتجر
            const rowButtons4 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_delete_store').setLabel('🔴 حذف المتجر نهائياً من النظام').setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ 
                embeds: [settingsEmbed], 
                components: [rowButtons1, rowButtons2, rowButtons3, rowButtons4], 
                flags: 64 
            });
        }
        // ─── زر شراء المنشن من اللوحة الرئيسية (مخفي وسري بالكامل) ───
        if (interaction.customId === 'btn_buy_mentions') {
            const pEveryone = getDiscountedPrice(storeData, 600000, 'buy_mentions');
            const pHere = getDiscountedPrice(storeData, 500000, 'buy_mentions');

            const storeColor = storeData.settings?.embedColor || '#5865f2';

            const mentEmbed = new EmbedBuilder()
                .setTitle('🛒 شحن رصيد منشنات المتجر المباشرة')
                .setDescription(
                    'اختر نوع المنشن الذي ترغب بشحن رصيده فوراً من الأزرار الكبيرة أدناه، وسيفتح لك السيستم أزرار تحديد الكميات رقمياً بشكل مخفي تماماً خاص بك وبدون أي تذاكر:\n\n' +
                    `📢 **سعر منشن @everyone الفردي:** \`${pEveryone.toLocaleString()}\` كريدت\n` +
                    `🔔 **سعر منشن @here الفردي:** \`${pHere.toLocaleString()}\` كريدت`
                )
                .setColor(storeColor);

            const mentRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ment_buy_everyone').setLabel('📢 شحن منشنات @everyone الكلية').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ment_buy_here').setLabel('🔔 شحن منشنات @here المخصصة').setStyle(ButtonStyle.Success)
            );

            return interaction.reply({ embeds: [mentEmbed], components: [mentRow], flags: 64 });
        }

        // تحديد كميات المنشن عبر 5 أزرار رقمية شبكية (Grid Layout) مخفية وإلغاء المنسدلات نهائياً
        if (interaction.customId === 'ment_buy_everyone' || interaction.customId === 'ment_buy_here') {
            const mType = interaction.customId === 'ment_buy_everyone' ? 'everyone' : 'here';
            
            const rowCountButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`order_ment_${mType}_1`).setLabel('1 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`order_ment_${mType}_2`).setLabel('2 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`order_ment_${mType}_3`).setLabel('3 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`order_ment_${mType}_4`).setLabel('4 🔢').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`order_ment_${mType}_5`).setLabel('5 🔢').setStyle(ButtonStyle.Primary)
            );

            return interaction.update({
                content: `🔢 **نظام التحديد الرقمي المباشر لقفل المنسدلات:** يرجى اختيار كمية منشنات \`@${mType}\` التي ترغب بشحنها بالضغط على أحد الأزرار أدناه (الحد الأقصى 5 منشنات في المرة):`,
                embeds: [],
                components: [rowCountButtons],
                flags: 64
            });
        }

        // معالجة الضغط الرقمي لشراء المنشن وحساب الفاتورة بدقة مع الضريبة لمدير البنك
        if (interaction.customId.startsWith('order_ment_')) {
            await interaction.deferReply({ flags: 64 });
            const parts = interaction.customId.split('_');
            const mentionType = parts[2];
            const count = parseInt(parts[3]);

            const singlePrice = mentionType === 'everyone' ? 600000 : 500000;
            const finalSinglePrice = getDiscountedPrice(storeData, singlePrice, 'buy_mentions');
            const totalBasePrice = finalSinglePrice * count;

            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, totalBasePrice, 'buy_mentions', { mentionType, count });
            const finalAmountWithTax = Math.ceil((totalBasePrice + code) / 0.95);

            return interaction.editReply({
                content: `ℹ️ **تفاصيل فاتورة شحن المنشنات:**\n• النوع: \`@${mentionType}\`\n• الكمية: \`${count}\` منشن\n• السعر الصافي: \`${totalBasePrice.toLocaleString()}\` كريدت\n• كود التحقق الثلاثي: \`${code}\`\n\n📥 **انسخ الأمر وحوله في روم الأوامر <#1509569386850291773>:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }
        // ─── زر تغيير اسم المتجر المطور (حل جذري مستقل ومفصل لمنع أي تضارب بالأزرار) ───
        if (interaction.customId === 'opt_change_name') {
            const modal = new ModalBuilder()
                .setCustomId('modal_change_name_system')
                .setTitle('📝 نظام تعديل اسم المتجر الحركي');

            const nameInput = new TextInputBuilder()
                .setCustomId('input_store_new_name')
                .setLabel('اسم المتجر الجديد:')
                .setStyle(TextInputStyle.Short)
                .setMinLength(2)
                .setMaxLength(32)
                .setPlaceholder('مثال: متجر تجارب عمليه متطوره وسريعه')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
            return interaction.showModal(modal); // فتح نافذة المودال فوراً للمالك بكفاءة وثبات
        }

        // معالجة استقبال بيانات مودال الاسم المطور وتوليد الفاتورة بدقة تامة
        if (interaction.isModalSubmit() && interaction.customId === 'modal_change_name_system') {
            await interaction.deferReply({ flags: 64 });
            const newName = interaction.fields.getTextInputValue('input_store_new_name').trim();
            
            const basePrice = 200000;
            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'change_name', { newName });
            const finalAmountWithTax = Math.ceil((basePrice + code) / 0.95);

            return interaction.editReply({
                content: `ℹ️ **تفاصيل فاتورة طلب تغيير الاسم الحركي الجديد (انسخ الأمر وحوله في روم الأوامر):**\n• الاسم المستهدف بدقة: \`${newName}\`\n• السعر المطلوب للخدمة: \`200,000\` كريدت\n• كود التحقق الثلاثي الموثق: \`${code}\`\n\n📥 **انسخ الكود وحوله في روم الأوامر <#1509569386850291773> ليتفعل تلقائياً:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }
        // ─── زر نقل ملكية وتغيير صاحب المتجر (نظام مودال نصي لجمع وتحقق أيدي المالك الجديد) ───
        if (interaction.customId === 'opt_change_owner') {
            const modal = new ModalBuilder()
                .setCustomId('modal_change_owner_system')
                .setTitle('👑 نقل ملكية وتغيير صاحب المتجر');

            const ownerInput = new TextInputBuilder()
                .setCustomId('input_store_new_owner_id')
                .setLabel('ضع أيدي (ID) المالك الجديد للمتجر بدقة تامة:')
                .setStyle(TextInputStyle.Short)
                .setMinLength(15)
                .setMaxLength(22)
                .setPlaceholder('مثال: 282859044593598464')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(ownerInput));
            return interaction.showModal(modal);
        }

        // معالجة استقبال مودال نقل الملكية والتحقق الفوري من العضو بالسيرفر
        if (interaction.isModalSubmit() && interaction.customId === 'modal_change_owner_system') {
            await interaction.deferReply({ flags: 64 });
            const newOwnerId = interaction.fields.getTextInputValue('input_store_new_owner_id').trim();
            
            // التحقق البرمجي الحتمي الفوري من وجود العضو لمنع الأخطاء والكراشات
            const targetMember = await interaction.guild.members.fetch(newOwnerId).catch(() => null);
            if (!targetMember) {
                return interaction.editReply({ content: '❌ خطأ أمني: لم يتم العثور على هذا الأيدي الرقمي داخل السيرفر! يرجى التأكد من كتابة الأيدي الصحيح.', flags: 64 });
            }
            if (targetMember.user.bot) {
                return interaction.editReply({ content: '❌ خطأ: لا يمكن نقل الملكية أو الصلاحيات إلى بوتات تفاعلية!', flags: 64 });
            }

            const basePrice = 500000;
            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'change_owner', { newOwnerId });
            const finalAmountWithTax = Math.ceil((basePrice + code) / 0.95);

            return interaction.editReply({
                content: `ℹ️ **تفاصيل فاتورة نقل الملكية الرسمية للمتجر (انسخ الأمر وحوله في روم الأوامر):**\n• المالك الجديد المستهدف: <@${newOwnerId}> (\`${newOwnerId}\`)\n• السعر المطلوب للخدمة: \`500,000\` كريدت\n• كود التحقق الثلاثي: \`${code}\`\n\n⚠️ **تنبيه هام:** بمجرد تحويلك للمبلغ بنجاح، سيقوم البوت تلقائياً بسحب كافة صلاحياتك وإلغائها وإعطائها بالكامل للمالك الجديد وتحديث السجل.\n\n📥 **انسخ الكود وحوله في روم الأوامر <#1509569386850291773>:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }

        // ─── زر معالجة وإزالة تحذيرات المتجر الحالية بالأزرار الرقمية المخفية ───
        if (interaction.customId === 'opt_remove_warnings') {
            if (!storeData.warnings || storeData.warnings === 0) {
                return interaction.reply({ content: '❌ ما عندك أي تحذيرات حالياً يا غالي! متجرك سليم ونظيف والحمد لله.', flags: 64 });
            }
            
            const basePricePerWarning = 700000;
            const currentPrice = getDiscountedPrice(storeData, basePricePerWarning, 'remove_warnings');

            const warnRow = new ActionRowBuilder();
            // بناء الأزرار الرقمية الضخمة والمباشرة بدلاً من المنسدلة بناءً على رصيد تحذيراته
            for (let i = 1; i <= Math.min(5, storeData.warnings); i++) {
                warnRow.addComponents(
                    new ButtonBuilder().setCustomId(`warn_remove_count_${i}`).setLabel(`مسح وإزالة (${i}) تحذير 🛡️`).setStyle(ButtonStyle.Primary)
                );
            }

            return interaction.update({
                content: `🛡️ **لوحة تصفير وإزالة تحذيرات المخالفات الصارمة بالأزرار الرقمية:**\n• السعر الأصلي لشطب التحذير الفردي: \`700,000\` كريدت.\n• السعر الحالي بعد احتساب نسبة خصم البوكس: \`${currentPrice.toLocaleString()}\` كريدت.\n\nيرجى تحديد عدد التحذيرات التي ترغب بإزالتها وتصفيرها بالضغط على الأزرار أدناه:`,
                embeds: [],
                components: [warnRow],
                flags: 64
            });
        }

        if (interaction.customId.startsWith('warn_remove_count_')) {
            await interaction.deferReply({ flags: 64 });
            const count = parseInt(interaction.customId.replace('warn_remove_count_', ''));
            const basePricePerWarning = 700000;
            const finalPricePerWarning = getDiscountedPrice(storeData, basePricePerWarning, 'remove_warnings');
            const totalBasePrice = finalPricePerWarning * count;

            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, totalBasePrice, 'remove_warnings', { count });
            const finalAmountWithTax = Math.ceil((totalBasePrice + code) / 0.95);

            return interaction.editReply({
                content: `ℹ️ **تفاصيل فاتورة طلب إزالة التحذيرات الموثقة (انسخ الأمر وحوله في روم الأوامر):**\n• العدد المطلوب مسحه وتطهيره: \`${count}\` تحذير مخالفة\n• السعر الإجمالي الكلي المطلوب: \`${totalBasePrice.toLocaleString()}\` كريدت\n• كود التحقق الثلاثي الموثق: \`${code}\`\n\n📥 **انسخ الكود الجاهز وحوله في روم الأوامر <#1509569386850291773> لتكتمل تلقائياً:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }

        // ─── زر تفعيل وشراء باقات النشر التلقائي الكبيرة والمحسنة ───
        if (interaction.customId === 'opt_buy_autopost') {
            const pDay = getDiscountedPrice(storeData, 700000, 'buy_autopost');
            const pDay2 = getDiscountedPrice(storeData, 1500000, 'buy_autopost');
            const pWeek = getDiscountedPrice(storeData, 3000000, 'buy_autopost');

            const storeColor = storeData.settings?.embedColor || '#5865f2';

            const postEmbed = new EmbedBuilder()
                .setTitle('🚀 نظام النشر التلقائي الذكي والمنشن المجدول الفوري')
                .setDescription(
                    'تفاصيل وإعدادات باقات النشر المتاحة لضبط متجرك لينشر ويمنشن آلياً على رأس كل ساعة وبأعلى حماية وتشفير ذكي:\n\n' +
                    `⏱️ **باقة يوم واحد (24 ساعة فحص فردي):** السعر الحالي \`${pDay.toLocaleString()}\` كريدت.\n\n` +
                    `⏱️ **باقة يومين (48 ساعة مع حماية عقوبات العمولة):** السعر الحالي \`${pDay2.toLocaleString()}\` كريدت.\n\n` +
                    `⏱️ **باقة أسبوع كامل (7 أيام للنشر فائق الأداء):** السعر الحالي \`${pWeek.toLocaleString()}\` كريدت.`
                )
                .setColor(storeColor);

            const rowButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('post_plan_day').setLabel('🚀 تفعيل باقة يوم كامل').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('post_plan_day2').setLabel('⚡ تفعيل باقة يومين').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('post_plan_week').setLabel('🔥 تفعيل باقة أسبوع').setStyle(ButtonStyle.Danger)
            );

            return interaction.update({ embeds: [postEmbed], components: [rowButtons], flags: 64 });
        }

        if (interaction.customId.startsWith('post_plan_')) {
            const plan = interaction.customId.replace('post_plan_', ''); 
            const modal = new ModalBuilder().setCustomId(`modal_autopost_text_${plan}`).setTitle('🚀 إعداد النشر التلقائي');
            const textInput = new TextInputBuilder()
                .setCustomId('post_text')
                .setLabel('نص الإعلان:')
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(3)
                .setMaxLength(500)
                .setPlaceholder('اكتب هنا ما تريد نشره في متجرك...')
                .setRequired(true);
            const mentionInput = new TextInputBuilder()
                .setCustomId('post_mention')
                .setLabel('نوع المنشن:')
                .setStyle(TextInputStyle.Short)
                .setMinLength(4)
                .setMaxLength(10)
                .setPlaceholder('everyone  أو  here  أو  random')
                .setRequired(true);
            modal.addComponents(
                new ActionRowBuilder().addComponents(textInput),
                new ActionRowBuilder().addComponents(mentionInput)
            );
            return interaction.showModal(modal);
        }

        // ─── معالجة submit مودال النشر التلقائي وتوليد الفاتورة ───
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_autopost_text_')) {
            await interaction.deferReply({ flags: 64 });
            const plan = interaction.customId.replace('modal_autopost_text_', '');
            const postText = interaction.fields.getTextInputValue('post_text').trim();
            const mentionRaw = interaction.fields.getTextInputValue('post_mention').trim().toLowerCase();

            const validMentions = ['everyone', 'here', 'random'];
            const mentionType = validMentions.includes(mentionRaw) ? mentionRaw : 'everyone';

            const priceMap = { day: 700000, day2: 1500000, week: 3000000 };
            const labelMap = { day: 'يوم واحد (24 ساعة)', day2: 'يومين (48 ساعة)', week: 'أسبوع كامل (7 أيام)' };
            const basePrice = getDiscountedPrice(storeData, priceMap[plan] ?? 700000, 'buy_autopost');
            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'buy_autopost', {
                planType: plan,
                text: postText,
                mentionType,
                allowChange: true
            });
            const finalAmountWithTax = Math.ceil((basePrice + code) / 0.95);

            return interaction.editReply({
                content: `🚀 **فاتورة تفعيل النشر التلقائي:**\n• الباقة: \`${labelMap[plan] ?? plan}\`\n• نوع المنشن: \`@${mentionType}\`\n• السعر: \`${basePrice.toLocaleString()}\` كريدت\n• كود التحقق الثلاثي: \`${code}\`\n\n📥 **انسخ الأمر وحوله في روم الأوامر <#1509569386850291773>:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }
        // ─── زر ترقية وتغيير فئة المتجر ونوعه بالأزرار الكبيرة والضخمة الاحترافية ───
        if (interaction.customId === 'opt_change_type') {
            const pVip = getDiscountedPrice(storeData, 2000000, 'change_store_type');
            const pDiam = getDiscountedPrice(storeData, 1800000, 'change_store_type');
            const pGold = getDiscountedPrice(storeData, 1500000, 'change_store_type');
            const pBron = getDiscountedPrice(storeData, 1000000, 'change_store_type');

            const storeColor = storeData.settings?.embedColor || '#5865f2';

            const typeEmbed = new EmbedBuilder()
                .setTitle('⚡ ترقية وتغيير فئة المتجر الحالية ونوعه')
                .setDescription(`فئة متجرك الحالية المسجلة بالنظام التاريخي لبيانات السيرفر هي: \`${storeData.storeType}\` Stores.\n\nاختر الفئة الجديدة المراد الترقية والتغيير إليها فوراً من الأزرار الكبيرة بالأسفل:`)
                .setColor(storeColor)
                .addFields(
                    { name: '👑 فئة VIP Stores المحدثة:', value: `السعر الإجمالي الحالي: \`${pVip.toLocaleString()}\` كريدت`, inline: true },
                    { name: '💎 فئة Diamond Stores المحدثة:', value: `السعر الإجمالي الحالي: \`${pDiam.toLocaleString()}\` كريدت`, inline: true },
                    { name: '🎖 فئة Gold Stores المحدثة:', value: `السعر الإجمالي الحالي: \`${pGold.toLocaleString()}\` كريدت`, inline: false },
                    { name: '🥉 فئة Bronze Stores المحدثة:', value: `السعر الإجمالي الحالي: \`${pBron.toLocaleString()}\` كريدت`, inline: false }
                );

            const typeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_type_VIP_2000000').setLabel('👑 ترقية لـ VIP').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_type_دايموند_1800000').setLabel('💎 ترقية لـ دايموند').setStyle(ButtonStyle.Success)
            );
            const typeRow2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_type_ذهبي_1500000').setLabel('🎖 تحويل لـ ذهبي').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_type_برونزي_1000000').setLabel('🥉 تحويل لـ برونزي').setStyle(ButtonStyle.Danger)
            );

            return interaction.update({ embeds: [typeEmbed], components: [typeRow, typeRow2], flags: 64 });
        }

        if (interaction.customId.startsWith('btn_type_')) {
            await interaction.deferReply({ flags: 64 });
            const parts = interaction.customId.split('_');
            const newType = parts[2];
            const rawPrice = parseInt(parts[3]);

            if (storeData.storeType === newType) return interaction.editReply({ content: '❌ خطأ: متجرك مسجل بالفعل ومثبت على نفس الفئة المحددة يا غالي!', flags: 64 });

            const finalPrice = getDiscountedPrice(storeData, rawPrice, 'change_store_type');
            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, finalPrice, 'change_store_type', { newType });
            const finalAmountWithTax = Math.ceil((finalPrice + code) / 0.95);

            return interaction.editReply({
                content: `ℹ️ **تفاصيل فاتورة طلب تعديل فئة المتجر ونوعه (انسخ الأمر وحوله في روم الأوامر):**\n• الفئة المستهدفة للترقية: \`${newType}\` Stores\n• السعر المطلـوب الفعلي: \`${finalPrice.toLocaleString()}\` كريدت\n• كود التحقق الثلاثي الموثق: \`${code}\`\n\n📥 **انسخ الكود وحوله في روم الأوامر <#1509569386850291773> لتتفعل فوراً:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }

        // ─── زر تفعيل الخط التلقائي للمتجر ───
        if (interaction.customId === 'opt_buy_line') {
            if (storeData.settings?.autoLine) {
                return interaction.reply({ content: '❌ ميزة الخط التلقائي مفعلة ومشتراة بالفعل لمتجرك يا غالي ولا تحتاج للشراء مجدداً!', flags: 64 });
            }
            const basePrice = 100000;
            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'buy_autoline');
            const finalAmountWithTax = Math.ceil((basePrice + code) / 0.95);

            return interaction.reply({
                content: `ℹ️ **تفاصيل طلب إضافة وتفعيل الخط التلقائي لمتجرك:**\n• السعر المطلوب الفعلي: \`100,000\` كريدت\n• كود التحقق الثلاثي الموثق: \`${code}\`\n\n📥 **انسخ الكود الجاهز وحوله في روم الأوامر <#1509569386850291773>:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }

        // ─── زر شراء بوكس الخصم المالي المطور (مخفي) ───
        if (interaction.customId === 'opt_buy_discount_box') {
            const hasDiscount = storeData.discountBox && storeData.discountBox.usedCount > 0 && (Date.now() - storeData.discountBox.lastUsedTime < 48 * 60 * 60 * 1000);
            if (hasDiscount) {
                return interaction.reply({ content: '❌ لديك بوكس خصم مالي فعال ونشط حالياً في متجرك! انتظر انتهاء الـ 48 ساعة لتتمكن من تجديده.', flags: 64 });
            }
            const basePrice = 500000;
            const code = dbManager.createPendingTransaction(channelId, interaction.user.id, basePrice, 'buy_discount_box');
            const finalAmountWithTax = Math.ceil((basePrice + code) / 0.95);

            return interaction.reply({
                content: `ℹ️ **تفاصيل فاتورة شراء بوكس الخصم المالي (20% كاملة):**\n• الميزة: تفعيل خصم مالي فوري بقيمة 20% على كافة خدمات شحن المنشنات والترقيات والتحذيرات لمدة 48 ساعة كاملة!\n• السعر المطلوب: \`500,000\` كريدت\n• كود التحقق الثلاثي: \`${code}\`\n\n📥 **انسخ الكود الجاهز وحوله في روم الأوامر <#1509569386850291773>:**\n\`\`\`\nC 1495139129111875594 ${finalAmountWithTax}\n\`\`\``,
                flags: 64
            });
        }

        // ─── زر حذف وتصفية المتجر النهائي والكامل من النظام ───
        if (interaction.customId === 'btn_delete_store') {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_del_store_final').setLabel('⚠️ نعم، أنا متأكد تماماً احذف الروم وامسح البيانات!').setStyle(ButtonStyle.Danger)
            );

            return interaction.update({
                content: '🚨 **تنبيه أمني صارم وعالي الخطورة:** هل أنت متأكد تماماً من رغبتك في حذف متجرك نهائياً؟ هذا الإجراء سيقوم **بحذف الروم فوراً وتصفير ومسح كافة بياناتك الفردية المسجلة بالكامل بالـ JSON** وبشكل لا يمكن استعادته مطلقاً!',
                embeds: [],
                components: [confirmRow],
                flags: 64
            });
        }

        if (interaction.customId === 'confirm_del_store_final') {
            await interaction.reply({ content: '🚨 [تلقائي] تم تأكيد طلبك الحتمي، جاري حذف وإزالة المتجر وتطهير السجل تماماً والمسح النهائي بعد 3 ثوانٍ...', flags: 64 });
            setTimeout(async () => {
                const targetChannel = interaction.channel;
                global.storesData.delete(targetChannel.id);
                if (global.saveStoresData) global.saveStoresData();
                await targetChannel.delete('قام المالك بطلب تصفية وحذف المتجر يدوياً من الأزرار الكبيرة للوحة').catch(() => {});
            }, 3000);
            return;
        }
    }
};

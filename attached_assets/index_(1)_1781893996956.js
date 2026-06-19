// ملف 1 حق منشورات البوت خاص لي اجتماع بي بوت موحد


require('dotenv').config(); // تفعيل مكتبة الحماية للتوكن
const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType 
} = require('discord.js');
const config = require('./config.js');

// إنشاء العميل وتفعيل خيارات الصلاحيات المطلوبة لقراءة الرسائل والمحتوى
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User],
});

// ذاكرة مؤقتة لحفظ بيانات الشراء لكل مستخدم
const activePurchases = new Map();

client.once('ready', () => {
    console.log(`⚡ البوت المطور يعمل بنجاح الآن باسم: ${client.user.tag}`);
    
    // تسجيل أوامر السلاش
    const data = [
        { name: 'setup', description: 'إرسال لوحة شراء المنشورات الرسمية في السيرفر' },
        { name: 'backup-post', description: 'نشر منشور احتياطي فوري (للإدارة فقط)' }
    ];
    client.application.commands.set(data);
});

client.on('interactionCreate', async interaction => {
    // 1️⃣ معالجة أوامر السلاش (Slash Commands)
    if (interaction.isChatInputCommand()) {
        
        if (interaction.commandName === 'setup') {
            // حماية الأمر ليعمل فقط في روم لوحة الشراء المخصص لها
            if (interaction.channelId !== config.setupChannelId) {
                return interaction.reply({ 
                    content: `❌ هذا الأمر مخصص للاستخدام داخل قناة <#${config.setupChannelId}> فقط.`, 
                    ephemeral: true 
                });
            }

            // الرد الفوري المخفي للإداري 🌟
            await interaction.reply({ content: '✅ تم إرسال الرسالة بنجاح.', ephemeral: true });

            // إرسال لوحة الشراء الرسمية في الروم على شكل إمبيد منسق مثل الصورة 🌟
            const embed = new EmbedBuilder()
                .setTitle('🛒 لوحة شراء المنشورات والطلبات الرسمية')
                .setDescription('**يمكنك شراء نشر إعلانك مع منشن مخصص عبر الضغط على الأزرار أدناه 👇**')
                .setColor('#2b2d31');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('buy_post').setLabel('شراء طلب ✨').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('show_prices').setLabel('اسعار طلبات 📑').setStyle(ButtonStyle.Primary)
                );

            // إرسالها مباشرة في القناة للأعضاء
            await interaction.channel.send({ embeds: [embed], components: [row] });
        }

        if (interaction.commandName === 'backup-post') {
            if (!interaction.member.roles.cache.has(config.adminRoleId)) {
                return interaction.reply({ content: '❌ عذراً، ليس لديك صلاحية الإدارة لاستخدام هذا الأمر.', ephemeral: true });
            }
            
            const modal = new ModalBuilder().setCustomId('backup_modal').setTitle('نشر منشور احتياطي إداري');
            const postInput = new TextInputBuilder().setCustomId('post_content').setLabel("محتوى المنشور").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(postInput));
            await interaction.showModal(modal);
        }
    }

    // 2️⃣ معالجة تفاعلات الأزرار (Buttons)
    if (interaction.isButton()) {
        
        // زر عرض الأسعار بالكريدت (مخفي وسري)
        if (interaction.customId === 'show_prices' || interaction.customId.startsWith('prices_')) {
            const pricesMessage = `**__📑 قائمة أسعار المنشورات والمنشن الحالية:__**\n\n• **منشن @everyone** 👈 \`${config.everyonePrice.toLocaleString()}\` كريدت\n• **منشن @here** 👈 \`${config.herePrice.toLocaleString()}\` كريدت`;
            return await interaction.reply({ content: pricesMessage, ephemeral: true });
        }

        // زر البدء في شراء منشور وكتابة النص (مخفي وسري)
        if (interaction.customId === 'buy_post' || interaction.customId.startsWith('buy_')) {
            const modal = new ModalBuilder().setCustomId('post_modal').setTitle('📝 تفاصيل منشورك الخاص');
            const contentInput = new TextInputBuilder()
                .setCustomId('post_content')
                .setLabel("اكتب محتوى إعلانك أو طلبك بالتفصيل هنا")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(5);
                
            modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
            return await interaction.showModal(modal);
        }

        // زر معرفة صاحب الطلب التفاعلي أسفل المنشور المنشور
        if (interaction.customId.startsWith('owner_')) {
            const ownerId = interaction.customId.split('_')[1];
            return await interaction.reply({ 
                content: `**🌐 صاحب هذا الطلب والإعلان هو العضو التالي:** <@${ownerId}>`, 
                ephemeral: true 
            });
        }

        // معالجة اختيار الأزرار السوداء (everyone أو here) وصياغة الفاتورة المطلوبة بدقة
        if (interaction.customId === 'select_everyone' || interaction.customId === 'select_here') {
            const type = interaction.customId === 'select_everyone' ? 'everyone' : 'here';
            const price = type === 'everyone' ? config.everyonePrice : config.herePrice;
            const data = activePurchases.get(interaction.user.id);

            if (!data) {
                return interaction.reply({ content: '❌ انتهت الجلسة، يرجى الضغط على زر "شراء طلب" مجدداً.', ephemeral: true });
            }

            data.type = type;
            data.price = price;
            activePurchases.set(interaction.user.id, data);

            // حساب قيمة الدفع شاملة ضريبة برو بوت بدقة
            const taxPrice = Math.floor(price * 20 / 19) + 1;

            // تعديل نص رسالة الفاتورة والتحويل بدقة كما طلبتها لتسهيل النسخ 🌟
            const invoiceMessage = `💳 **تفاصيل الفاتورة والتحويل لنوع (${type}):**\n\nيرجى التوجه إلى روم الأوامر <#${config.commandsChannelId}> ونسخ الأمر التالي للتحويل المالي:\n\`💵 c ${config.ownerId} ${taxPrice}\`\n\n⚠️ **ملاحظة:** سيقوم النظام بمراقبة التحويل تلقائياً ونشر طلبك فوراً في روم المنشورات العامة كرسالة عادية وزخارف كاملة.`;

            await interaction.update({ 
                content: invoiceMessage,
                components: [], 
                ephemeral: true 
            });
        }
    }

    // 3️⃣ معالجة النوافذ المنبثقة (Modal Submission)
    if (interaction.type === InteractionType.ModalSubmit) {
        
        if (interaction.customId === 'post_modal') {
            const content = interaction.fields.getTextInputValue('post_content');
            
            // صنع الأزرار باللون الأسود (Secondary) وبدون كلمة منشن كما طلبت 🌟
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('select_everyone').setLabel('everyone').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('select_here').setLabel('here').setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ 
                content: '✅ تم حفظ نص منشورك بنجاح! الآن اختر نوع المنشن المطلوبة لشراء المنشور من الأزرار التالية:', 
                components: [row], 
                ephemeral: true 
            });

            activePurchases.set(interaction.user.id, { content });
        }

        if (interaction.customId === 'backup_modal') {
            const content = interaction.fields.getTextInputValue('post_content');
            
            try {
                const postChannel = await client.channels.fetch(config.postsChannelId);
                if (postChannel) {
                    await postChannel.send({ content: `**__📢 منشور احتياطي إداري:__**\n\n${content}` });
                    await interaction.reply({ content: '✅ تم نشر المنشور الاحتياطي بنجاح في قنوات النشر الرسمية.', ephemeral: true });
                }
            } catch (err) {
                console.error("خطأ في جلب قناة المنشورات النهائية:", err);
                await interaction.reply({ content: '❌ حدث خطأ، يرجى التأكد من آيدي روم المنشورات في الـ config.', ephemeral: true });
            }
        }
    }
});

// 4️⃣ نظام تتبع وقراءة تحويلات برو بوت الصارمة والآمنة (ProBot ID: 282859044593598464)
client.on('messageCreate', async (message) => {
    // تحقق 1: يجب أن يكون مرسل الرسالة هو برو بوت الرسمي
    if (message.author.id !== '282859044593598464') return; 

    // تحقق 2: يجب أن تكون الرسالة داخل "روم الأوامر والتحويلات المخصص" حصراً لضمان التنظيم
    if (message.channelId !== config.commandsChannelId) return;

    const msgContent = message.content;

    // فحص جمل التحويل المعتمدة في برو بوت مع فحص وجود آيدي المستلم الصحيح
    const isTransferred = (msgContent.includes('has transferred') || msgContent.includes('قام بتحويل')) && msgContent.includes(config.ownerId);
    
    if (isTransferred) {
        // فحص كافة طلبات الشراء المعلقة
        for (const [userId, purchaseData] of activePurchases.entries()) {
            
            // تحقق دقيق من السعر المطلوب (بالكريدت) داخل نص رسالة برو بوت
            const pricePattern = new RegExp(`\\$?${purchaseData.price}`);
            
            if (pricePattern.test(msgContent)) {
                
                const mentionType = purchaseData.type === 'everyone' ? '@everyone' : '@here';
                
                try {
                    // 1. جلب روم المنشورات العامة لإرسال المنشور المطور كرسالة عادية ومزخرفة بدون إمبيد 🌟
                    const postChannel = await client.channels.fetch(config.postsChannelId);
                    if (postChannel) {
                        
                        // صياغة نص الرسالة العادية المزخرفة بالخط العريض مطابقة لطلبك 🌟
                        const formattedMessage = `**__ - الــطـــلب : ${purchaseData.content}\n\n- صــاحــب الــطـــلب : <@${userId}>\n\n- الــمــنــشــن : ${mentionType} __**`;

                        // صنع الأزرار الثلاثة التفاعلية وتمرير آيدي العضو لكي تعمل عند الجميع بدون خطأ أحمر
                        const postRow1 = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`prices_${userId}`).setLabel('اسعار طلبات 📑').setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId(`buy_${userId}`).setLabel('شراء طلب ✨').setStyle(ButtonStyle.Success)
                            );

                        const postRow2 = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`owner_${userId}`).setLabel('صاحب الطلب 🌐').setStyle(ButtonStyle.Secondary)
                            );

                        // إرسال المنشور المنسق كرسالة عادية مع الأزرار للروم العام
                        await postChannel.send({
                            content: formattedMessage,
                            components: [postRow1, postRow2]
                        });
                    }
                        
                    // 2. إرسال سجل العملية للإدارة لتوثيق الحسابات المالية للبيع
                    const logChannel = await client.channels.fetch(config.logsChannelId);
                    if (logChannel) {
                        const logMessage = `**✅ [عملية تحويل ناجحة]**\n• **المشتري:** <@${userId}> (\`${userId}\`)\n• **المبلغ:** \`${purchaseData.price.toLocaleString()}\` كريدت\n• **نوع المنشن:** \`${purchaseData.type}\``;
                        await logChannel.send({ content: logMessage });
                    }
                    
                } catch (error) {
                    console.error("خطأ أثناء معالجة وإرسال قنوات الإعلانات أو اللوج:", error);
                }

                // تنظيف الذاكرة المؤقتة لحماية البوت من تكرار العملية بنفس التحويل
                activePurchases.delete(userId);
                break; 
            } 
        }
    }
});

// تشغيل البوت باستخدام التوكن المحمي والمخزن بملف البيئة
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ فشل تشغيل البوت، تأكد من صحة التوكن في ملف .env وتفعيل خيارات الـ Intents كاملة:", err);
});

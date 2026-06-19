// بوت متجر ملف 1 نظام تكت لشراء المتاجر ملف رائيسي و بوت منشورات و بوت متجر و بوت مزاد الذي سوفا يتم بوت موحد 

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

// سيرفر صغير مطلوب لتشغيل البوت على المنصة لمنع التوقف
http.createServer((_, res) => res.end('ok')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ================= CONFIGURATION (الإعدادات المركزية للسيرفر الخاص بك) =================
const BANK_CHANNEL_ID = "1509569386850291773";    // روم تحويلات المتاجر (روم الأوامر)
const PROBOT_ID = "282859044593598464";          // أيدي بوت بروبوت الرسمي
const TICKETS_CATEGORY_ID = "1509569033823981649"; // كاتجيرو التذاكر (تذاكر مسؤولين متاجر)
const BANK_ACCOUNT_ID = "1495139129111875594";   // أيدي صاحب السيرفر (المستلم الشخصي للكريدت)

// تفاصيل الكاتيجيروات والأسعار والمنشنات المحددة بدقة (ثابتة ولم تُعدل)
const CATEGORIES = {
    vip:     { name: 'VIP',      emoji: '👑', price: 2000000, id: "1509736323391688714", everyone: 30, here: 20 },
    diamond: { name: 'دايموند', emoji: '💎', price: 1500000, id: "1509736509459136523", everyone: 20, here: 10 },
    gold:    { name: 'ذهبي',    emoji: '🎖', price: 1000000, id: "1509736670499700757", everyone: 15, here: 13 },
    bronze:  { name: 'برونزي',  emoji: '🥉', price: 800000,  id: "1509736906727100469", everyone: 10, here: 5  }
};

// حفظ البيانات مؤقتاً (لالمتاجر النشطة في التذاكر)
const activePurchases = new Map();

// ================== نظام تخزين وقراءة البيانات المطور الموحد ==================
global.storesData = new Map();
const dbPath = path.join(__dirname, 'stores_database.json'); // الارتباط الفوري بملف بياناتك

// دالة تحميل البيانات من ملف JSON الموحد عند تشغيل البوت
function loadStoresData() {
    try {
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf8');
            const parsed = JSON.parse(data);
            for (const [key, value] of Object.entries(parsed)) {
                global.storesData.set(key, value);
            }
            console.log('📦 [Database] Stores data loaded successfully from stores_database.json');
        }
    } catch (error) {
        console.error('❌ [Database] Error loading JSON file:', error);
    }
}

// دالة حفظ البيانات الفورية تلقائياً عند أي تغيير حركي بالأزرار
global.saveStoresData = function() {
    try {
        const obj = Object.fromEntries(global.storesData);
        fs.writeFileSync(dbPath, JSON.stringify(obj, null, 4), 'utf8');
    } catch (error) {
        console.error('❌ [Database] Error saving JSON file:', error);
    }
};

// تشغيل جلب قاعدة البيانات الموحدة فوراً
loadStoresData();

let ticketCounter = 0;
// ================== نظام معالجة وتحميل مجلد الأوامر ==================
client.commands = new Collection();
const commandsArray = [];

// تم ضبط المسار ليتعرف على اسم مجلد الأوامر الخاص بك بدقة تامة
const commandsFolder = path.join(__dirname, 'ShopCommands'); 

if (fs.existsSync(commandsFolder)) {
    const commandFiles = fs.readdirSync(commandsFolder).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsFolder, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsArray.push(command.data.toJSON());
            console.log(`📡 Loaded Slash Command Successfully: ${file}`);
        }
    }
}

// تشغيل وتدوير الأوامر المائية عند تشغيل البوت تلقائياً في ديسكورد
client.once('ready', async () => {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        console.log('⏳ بدأ تسجيل وتحديث الأوامر المائية (Slash Commands) في ديسكورد...');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsArray },
        );
        
        console.log('✅ تم تسجيل وتحديث الأوامر المائية بنجاح في السيرفر!');
    } catch (error) {
        console.error('❌ حدث خطأ أثناء تدوير وتحديث الأوامر المائية:', error);
    }
});

// الاستماع لتنفيذ الأوامر المائية المكتوبة والموجودة بداخل مجلد ShopCommands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر!', flags: 64 });
        } else {
            await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر!', flags: 64 });
        }
    }
});
// التفاعل الأساسي مع الأمر المائل لطباعة لوحة شراء المتاجر الفخمة للأعضاء
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ticket_store') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏪 متجر السيرفر الرسمي للمتاجر')
            .setDescription('لشراء متجر خاص بك، يرجى الضغط على زر الكاتجيرو الذي يناسبك بالأسفل لفتح تذكرة شراء.')
            .setColor('#1a1a1a')
            .addFields(
                { name: '👑 VIP Stores',     value: 'السعر: `2,000,000`\nمنشنات: 30 @everyone | 20 @here', inline: false },
                { name: '💎 Diamond Stores', value: 'السعر: `1,500,000`\nمنشنات: 20 @everyone | 10 @here', inline: false },
                { name: '🥇 Gold Stores',    value: 'السعر: `1,000,000`\nمنشنات: 15 @everyone | 13 @here', inline: false },
                { name: '🥉 Bronze Stores',  value: 'السعر: `800,000`\nمنشنات: 10 @everyone | 5 @here',   inline: false }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('ticket_buy_vip').setLabel('شراء VIP 👑').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_buy_diamond').setLabel('شراء دايموند 💎').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_buy_gold').setLabel('شراء ذهبي 🥇').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_buy_bronze').setLabel('شراء برونزي 🥉').setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

// التفاعل اللانهائي عند الضغط على أزرار فتح التذاكر أو قفلها يدوياً
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('ticket_buy_')) {
        const type = interaction.customId.replace('ticket_buy_', '');
        const selectedCat = CATEGORIES[type];

        await interaction.reply({ content: '⏳ جاري إنشاء تذكرة الشراء الخاصة بك والتأكد من الصلاحيات...', flags: 64 });
        ticketCounter++;

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `a-store-${ticketCounter}`,
                type: ChannelType.GuildText,
                parent: TICKETS_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: '1509576925478256663', allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🎟️ تذكرة شراء متجر')
                .setDescription(`مرحباً ${interaction.user}!\n\nأهلاً بك في نظام شراء المتاجر.\nلو عندك أسئلة انتظر المسؤولين وسيردون على أي سؤال.\n\n🗂️ **نوع المتجر المختار:** \`${selectedCat.name}\``)
                .setColor('#5865f2')
                .setFooter({ text: 'سيتم إرسال كود التحويل بالأسفل' });

            const lockRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`lock_ticket_${ticketChannel.id}`)
                    .setLabel('🔒 قفل التذكرة')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `${interaction.user} <@&1509576925478256663>`, embeds: [welcomeEmbed], components: [lockRow] });

            // 🎯 تصليح ضروري: حساب كود التحويل ليتضمن ضريبة البروبوت الكاملة تلقائيًا ليقبله مستمع البوت فورا
            const priceWithTax = Math.ceil(selectedCat.price / 0.95);
            const transferCode = `c ${BANK_ACCOUNT_ID} ${priceWithTax}`;
            
            const transferEmbed = new EmbedBuilder()
                .setTitle('💸 كود التحويل')
                .setDescription(`لإتمام الشراء, حوّل المبلغ في روم الأوامر <#${BANK_CHANNEL_ID}> بنسخ الكود الجاهز بالضريبة أدناه:\n\n\`\`\`${transferCode}\`\`\`\n\n⚠️ البوت يراقب الروم تلقائياً — بعد التحويل الناجح سيطلب منك اسم متجرك هنا مباشرة!`)
                .setColor('#ffcc00');

            await ticketChannel.send({ embeds: [transferEmbed] });
            await interaction.editReply({ content: `✅ تم فتح تذكرتك بنجاح: ${ticketChannel}`, flags: 64 });

            activePurchases.set(interaction.user.id, {
                channelId: ticketChannel.id,
                category: selectedCat,
                userId: interaction.user.id
            });

        } catch (err) {
            console.error('❌ خطأ عند إنشاء التذكرة:', err.message);
            await interaction.editReply({ content: '❌ حدث خطأ أثناء إنشاء التذكرة. تأكد من صلاحيات البوت.', flags: 64 });
        }
    }
    // ─── زر حذف وإغلاق التذكرة يدوياً ───
    if (interaction.customId.startsWith('lock_ticket_')) {
        const channelId = interaction.customId.replace('lock_ticket_', '');
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) return interaction.reply({ content: '❌ القناة غير موجودة.', flags: 64 });

        await interaction.reply({ content: '🗑️ جاري حذف التذكرة...', flags: 64 });

        setTimeout(async () => {
            await channel.delete('تم إغلاق التذكرة وحذفها').catch(() => {});
        }, 2000);
    }
});

// نظام قراءة تحويل بروبوت وتأكيد الشراء داخل التذاكر تلقائياً وحفظ البيانات
client.on('messageCreate', async (message) => {
    if (message.channel.id === BANK_CHANNEL_ID && message.author.id === PROBOT_ID) {

        const msgText = message.content
            || (message.embeds[0]?.description ?? '')
            || (message.embeds[0]?.title ?? '');

        const lowerMsg = msgText.toLowerCase();
        if (lowerMsg.includes("has transferred") || lowerMsg.includes("قام بتحويل") || lowerMsg.includes("حوّل")) {

            const amountClean = msgText.replace(/[$,]/g, '');
            const match = amountClean.match(/\d+/g);
            if (!match) return;

            const transferredAmount = parseInt(match[match.length - 1]);

            // 🎯 مطابقة ذكية وآمنة لربط عملية التحويل بالتذكرة المعلقة المفتوحة
            let purchaseData = null;
            let buyerUserId = null;
            for (const [userId, data] of activePurchases.entries()) {
                // فحص دقيق للمبلغ المحول متضمناً الضريبة لضمان التطابق التام
                const targetPriceWithTax = Math.ceil(data.category.price / 0.95);
                if (transferredAmount === targetPriceWithTax || transferredAmount >= data.category.price) {
                    purchaseData = data;
                    buyerUserId = userId;
                    break;
                }
            }

            if (!purchaseData) return;

            const targetChannel = message.guild.channels.cache.get(purchaseData.channelId);
            if (!targetChannel) return;

            await targetChannel.send({ content: `🎉 **تم تأكيد استلام المبلغ بنجاح واحتساب الضريبة!**\n\n👤 المشتري: <@${purchaseData.userId}>\n🗂️ نوع المتجر: \`${purchaseData.category.name}\`\n📊 المنشنات المتاحة لك: \`${purchaseData.category.everyone}\` لـ Everyone و \`${purchaseData.category.here}\` لـ Here.\n\n✍️ **الآن اكتب اسم المتجر الذي تريده في الشات هنا وسيقوم البوت بإنشائه فوراً!**` });

            const filter = m => m.author.id === purchaseData.userId;
            const collector = targetChannel.createMessageCollector({ filter, max: 1, time: 120000 });

            collector.on('collect', async (msg) => {
                const storeName = msg.content;

                const newStore = await message.guild.channels.create({
                    name: `${storeName}${purchaseData.category.emoji}`,
                    type: ChannelType.GuildText,
                    parent: purchaseData.category.id,
                    permissionOverwrites: [
                        {
                            id: message.guild.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: purchaseData.userId,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.MentionEveryone
                            ]
                        },
                        {
                            id: client.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages
                            ]
                        }
                    ]
                });

                // تخزين بيانات المتجر كاملة وحفظها في JSON الموحد المطور والمطابق
                global.storesData.set(newStore.id, {
                    storeId: newStore.id,
                    ownerId: purchaseData.userId,
                    storeType: purchaseData.category.name,
                    warnings: 0,
                    mentions: {
                        everyoneLeft: purchaseData.category.everyone,
                        hereLeft: purchaseData.category.here
                    },
                    cooldowns: {
                        lastMentionTime: 0,
                        lastMentionType: null,
                        lastMenuOpenTime: 0
                    },
                    settings: {
                        autoLine: false,
                        lineImageUrl: "https://example.com" 
                    },
                    autoPost: {
                        isActive: false,
                        planType: null,
                        text: null,
                        allowChange: false,
                        mentionType: null,
                        lastPostTime: 0,
                        activatedAt: 0,
                        expiresAt: 0,
                        dailyFeePaidToday: false,
                        unpaidDaysCount: 0,
                        speedHours: 1
                    },
                    discountBox: {
                        usedCount: 0,
                        lastUsedTime: 0
                    },
                    pendingTransactions: null
                });

                if (global.saveStoresData) global.saveStoresData();
                const line = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
                const storeEmbed = new EmbedBuilder()
                    .setTitle(`🏪 متجر » ${purchaseData.category.emoji} • ${storeName}`)
                    .setDescription(`⚠️ **ملاحظة:** يجب الإلتزام بتشفير الكلمات لتجنب إخفاء رومك من الظهور.\n\n👑 • **صاحب الـمـتـجـر :** <@${purchaseData.userId}>\n🗂️ • **نوع الـمـتـجـر :** \`< ${purchaseData.category.name} Stores >\`\n📆 • **تاريخ الإنشاء :** اليوم\n👤 • **بـواسـطـة :** ${client.user}`)
                    .setColor('#2f3136')
                    .addFields(
                        { name: '📢 @everyone', value: `\`${purchaseData.category.everyone}\` منشنات متبقية`, inline: true },
                        { name: '🔔 @here',     value: `\`${purchaseData.category.here}\` منشنات متبقية`,     inline: true }
                    )
                    .setFooter({ text: `Dev by Bot | ${new Date().toLocaleDateString()}` });

                await newStore.send({ content: `${line}` });
                await newStore.send({ content: `<@${purchaseData.userId}>`, embeds: [storeEmbed] });
                await newStore.send({ content: `${line}` });

                const tutorialEmbed = new EmbedBuilder()
                    .setTitle('👋 مرحبًا بك في متجرك الجديد والذكي!')
                    .setDescription(`يا غالي، لكي تتحكم في منشنات متجرك، وتشتري رصيدًا، أو تفعّل الخط والنشر التلقائي، قم بكتابة كلمة **\`منشن\`** هنا في الشات فورًا لفتح لوحة التحكم المركزية السرية الخاصة بك!\n\n⚠️ **ملاحظة:** بعد كتابتك للأمر لأول مرة، سيعمل نظام الحماية التلقائي ويجبرك على الانتظار 5 دقائق بين كل مرة تكتب فيها الأمر لمنع السبام وحفظ نظافة شات الروم. بالتوفيق لك في مبيعاتك! ✨`)
                    .setColor('#00ffcc');
                
                await newStore.send({ embeds: [tutorialEmbed] }).catch(() => {});

                await targetChannel.send({ content: `✅ **مبروك! تم إنشاء متجرك بنجاح هنا:** ${newStore}\nسيتم إغلاق هذه التذكرة تلقائياً بعد قليل.` });
                activePurchases.delete(purchaseData.userId);
                setTimeout(() => targetChannel.delete().catch(() => {}), 10000);
            });
        }
    }
});
   
// ── توجيه الأزرار والمودالات والمنسدلات لأوامر ShopCommands التي تملك handleButtonAndModal ──
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) return;

    for (const [, command] of client.commands) {
        if (typeof command.handleButtonAndModal === 'function') {
            try {
                await command.handleButtonAndModal(interaction);
            } catch (e) {
                console.error(`❌ [handleButtonAndModal] ${command.data?.name ?? '?'} — ${e.message}`);
            }
        }
    }
});

// ================== Mentions Folder Loader ==================
const mentionsFolder = path.join(__dirname, 'Mentions');
const activeModules = [];

if (fs.existsSync(mentionsFolder)) {
    const files = fs.readdirSync(mentionsFolder)
        .filter(file => file.endsWith('.js') && !file.startsWith('.'));

    for (const file of files) {
        try {
            const modulePath = path.join(mentionsFolder, file);
            const mentionModule = require(modulePath);

            if (typeof mentionModule.init === 'function') {
                client.once('ready', () => mentionModule.init(client));
            }

            activeModules.push(mentionModule);
            console.log(`✅ Loaded Mentions Module: ${file}`);
        } catch (err) {
            console.error(`❌ Error loading module ${file}:`, err);
        }
    }
}

// ── المستمع الموحد والوحيد للرسائل: يوزع المهام على الـ 6 ملفات بأمان تام ──
client.on('messageCreate', async (message) => {
    for (const mod of activeModules) {
        if (typeof mod.handleMessage === 'function') {
            try { await mod.handleMessage(message); } catch (e) { console.error(`❌ [handleMessage] ${e.message}`); }
        }
    }
});

// ── المستمع الموحد والوحيد للتفاعلات: فك كراش الأزرار المتعددة والمودال والعودة للرئيسية ──
client.on('interactionCreate', async (interaction) => {
    for (const mod of activeModules) {
        if (typeof mod.handleInteraction === 'function') {
            try { await mod.handleInteraction(interaction); } catch (e) { console.error(`❌ [handleInteraction] ${interaction.customId ?? ''} — ${e.message}`); }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

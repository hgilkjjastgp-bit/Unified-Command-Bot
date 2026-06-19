const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create_backup_store')
        .setDescription('👑 [للمسؤولين] إنشاء متجر احتياطي لعضو وتخزين بياناته تلقائياً')
        .addUserOption(option => 
            option.setName('owner')
                .setDescription('اختر صاحب المتجر الاحتياطي')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('اختر فئة ونوع المتجر')
                .setRequired(true)
                .addChoices(
                    { name: '👑 VIP Store', value: 'vip' },
                    { name: '💎 Diamond Store', value: 'diamond' },
                    { name: '🎖 Gold Store', value: 'gold' },
                    { name: '🥉 Bronze Store', value: 'bronze' }
                ))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('اكتب اسم المتجر الاحتياطي')
                .setRequired(true)),

    async execute(interaction, client) {
        const STAFF_ROLE_ID = "1509576925478256663"; 

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ 
                content: '❌ هذا الأمر مخصص فقط لمسؤولين المتاجر الفوقيين ولا يمكنك استخدامه.', 
                flags: 64 
            });
        }

        const owner = interaction.options.getUser('owner');
        const categoryType = interaction.options.getString('category');
        const storeName = interaction.options.getString('name');

        await interaction.deferReply({ flags: 64 });

        const SERVER_CATEGORIES = {
            vip:     { name: 'VIP',      emoji: '👑', id: "1509736323391688714", everyone: 30, here: 20 },
            diamond: { name: 'دايموند', emoji: '💎', id: "1509736509459136523", everyone: 20, here: 10 },
            gold:    { name: 'ذهبي',    emoji: '🎖', id: "1509736670499700757", everyone: 15, here: 13 },
            bronze:  { name: 'برونزي',  emoji: '🥉', id: "1509736906727100469", everyone: 10, here: 5  }
        };

        const selectedCat = SERVER_CATEGORIES[categoryType];

        try {
            // إنشاء الروم
            const newStore = await interaction.guild.channels.create({
                name: `${storeName}${selectedCat.emoji}`,
                type: ChannelType.GuildText,
                parent: selectedCat.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: [PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: owner.id,
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
                    },
                    {
                        id: STAFF_ROLE_ID,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages
                        ]
                    }
                ]
            });

            // حقن البيانات في الكولكشن العالمي
            global.storesData.set(newStore.id, {
                storeId: newStore.id,
                ownerId: owner.id,
                storeType: selectedCat.name,
                warnings: 0,
                mentions: {
                    everyoneLeft: selectedCat.everyone,
                    hereLeft: selectedCat.here
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

            if (global.saveStoresData) {
                global.saveStoresData();
            }

            const line = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
            const storeEmbed = new EmbedBuilder()
                .setTitle(`🏪 متجر احتياطي » ${selectedCat.emoji} • ${storeName}`)
                .setDescription(`⚠️ **ملاحظة:** يجب الإلتزام بتشفير الكلمات لتجنب إخفاء رومك من الظهور.\n\n👑 • **صاحب الـمـتـجـر :** ${owner}\n🗂️ • **نوع الـمـتـجـر :** \`< ${selectedCat.name} Stores >\`\n📆 • **تاريخ الإنشاء :** اليوم (متجر احتياطي طوارئ)\n👤 • **بـواسـطـة :** ${interaction.user}`)
                .setColor('#2f3136')
                .addFields(
                    { name: '📢 @everyone', value: `\`${selectedCat.everyone}\` منشنات متبقية`, inline: true },
                    { name: '🔔 @here',     value: `\`${selectedCat.here}\` منشنات متبقية`,     inline: true }
                )
                .setFooter({ text: `Dev by Bot | ${new Date().toLocaleDateString()}` });

            await newStore.send({ content: `${line}` });
            await newStore.send({ content: `${owner}`, embeds: [storeEmbed] });
            await newStore.send({ content: `${line}` });

            const tutorialEmbed = new EmbedBuilder()
                .setTitle('👋 مرحبًا بك في متجرك الاحتياطي الجديد!')
                .setDescription(`يا غالي، لكي تتحكم في منشنات متجرك، وتشتري رصيدًا، أو تفعّل الخط والنشر التلقائي، قم بكتابة كلمة **\`منشن\`** هنا في الشات فورًا لفتح لوحة التحكم المركزية السرية الخاصة بك!\n\n⚠️ **ملاحظة:** بعد كتابتك للأمر لأول مرة، سيعمل نظام الحماية التلقائي ويجبرك على الانتظار 5 دقائق بين كل مرة تكتب فيها الأمر لمنع السبام وحفظ نظافة شات الروم. بالتوفيق لك في مبيعاتك! ✨`)
                .setColor('#00ffcc');
            
            await newStore.send({ embeds: [tutorialEmbed] }).catch(() => {});

            return interaction.editReply({ 
                content: `✅ **تم إنشاء المتجر الاحتياطي بنجاح وحقن بياناته الجديدة!**\nالروم: ${newStore}\nصاحب المتجر: ${owner}` 
            });

        } catch (error) {
            console.error('❌ خطأ تفصيلي أثناء إنشاء المتجر الاحتياطي:', error);
            return interaction.editReply({ 
                content: `❌ فشل إنشاء الروم. تأكد أن البوت يمتلك صلاحية \`Manage Channels\` وصلاحية \`Administrator\` وأن رتبته في السيرفر أعلى من الجميع.` 
            });
        }
    }
};

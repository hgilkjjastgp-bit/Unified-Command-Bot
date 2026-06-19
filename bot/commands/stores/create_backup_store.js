const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { createDefaultStoreData } = require('../../systems/stores/storesData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create_backup_store')
        .setDescription('👑 [للمسؤولين] إنشاء متجر احتياطي لعضو وتخزين بياناته')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addUserOption(opt => opt.setName('owner').setDescription('صاحب المتجر').setRequired(true))
        .addStringOption(opt => opt.setName('category').setDescription('فئة المتجر').setRequired(true)
            .addChoices(
                { name: '👑 VIP Store',    value: 'vip'     },
                { name: '💎 Diamond Store', value: 'diamond' },
                { name: '🎖 Gold Store',   value: 'gold'    },
                { name: '🥉 Bronze Store', value: 'bronze'  }
            ))
        .addStringOption(opt => opt.setName('name').setDescription('اسم المتجر').setRequired(true)),

    async execute(interaction, client) {
        const cfg = require('../../config.js').stores;
        if (!interaction.member.roles.cache.has(cfg.staffRoleId))
            return interaction.reply({ content: '❌ هذا الأمر للمسؤولين فقط!', flags: 64 });

        const owner       = interaction.options.getUser('owner');
        const categoryKey = interaction.options.getString('category');
        const storeName   = interaction.options.getString('name');
        const selectedCat = cfg.categories[categoryKey];

        await interaction.deferReply({ flags: 64 });

        try {
            const newStore = await interaction.guild.channels.create({
                name: `${storeName}${selectedCat.emoji}`,
                type: ChannelType.GuildText,
                parent: selectedCat.id,
                permissionOverwrites: [
                    { id: interaction.guild.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
                    { id: owner.id,             allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.MentionEveryone] },
                    { id: (client || interaction.client).user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: cfg.staffRoleId,      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            global.storesData.set(newStore.id, createDefaultStoreData(
                newStore.id, owner.id, selectedCat.name, selectedCat.everyone, selectedCat.here
            ));
            if (global.saveStoresData) global.saveStoresData();

            const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
            const storeEmbed = new EmbedBuilder()
                .setTitle(`🏪 متجر احتياطي » ${selectedCat.emoji} • ${storeName}`)
                .setDescription(
                    `⚠️ يجب الإلتزام بتشفير الكلمات.\n\n` +
                    `👑 • **صاحب المتجر:** ${owner}\n` +
                    `🗂️ • **النوع:** \`< ${selectedCat.name} Stores >\`\n` +
                    `📆 • **بواسطة:** ${interaction.user}`
                )
                .setColor('#2f3136')
                .addFields(
                    { name: '📢 @everyone', value: `\`${selectedCat.everyone}\` منشنات`, inline: true },
                    { name: '🔔 @here',     value: `\`${selectedCat.here}\` منشنات`,    inline: true }
                );

            await newStore.send({ content: line });
            await newStore.send({ content: `${owner}`, embeds: [storeEmbed] });
            await newStore.send({ content: line });
            await newStore.send({ embeds: [new EmbedBuilder().setTitle('👋 مرحبًا بك في متجرك الاحتياطي!').setDescription('اكتب كلمة **`منشن`** لفتح لوحة التحكم المركزية! ✨').setColor('#00ffcc')] });

            return interaction.editReply({ content: `✅ تم إنشاء المتجر الاحتياطي بنجاح!\nالروم: ${newStore}\nصاحب المتجر: ${owner}` });
        } catch (error) {
            console.error('[create_backup_store]', error);
            return interaction.editReply({ content: '❌ فشل إنشاء الروم. تأكد من صلاحيات البوت.' });
        }
    }
};

// ═══════════════════════════════════════════════════════════════
//                  البوت الموحد — المدخل الرئيسي
//         يجمع: نظام المنشورات | نظام المزادات | نظام المتاجر
// ═══════════════════════════════════════════════════════════════

const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const config = require('./config.js');

// ─────────────────────────────────────
//         تهيئة البوت
// ─────────────────────────────────────

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.commands = new Collection();

// ─────────────────────────────────────
//         تهيئة بيانات المتاجر العالمية
// ─────────────────────────────────────

global.storesData = new Map();
const { loadStoresData, saveStoresData } = require('./systems/stores/storesData.js');
global.saveStoresData = saveStoresData;
loadStoresData();

// ─────────────────────────────────────
//         تحميل الأوامر (Slash Commands)
// ─────────────────────────────────────

const commandFolders = ['posts', 'auctions', 'stores'];

for (const folder of commandFolders) {
    const folderPath = path.join(__dirname, 'commands', folder);
    const files      = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const cmd = require(path.join(folderPath, file));
        if (cmd.data && cmd.data.name) {
            client.commands.set(cmd.data.name, cmd);
            console.log(`✅ Command: /${cmd.data.name}`);
        }
    }
}

// ─────────────────────────────────────
//         تسجيل الأوامر في ديسكورد
// ─────────────────────────────────────

async function deployCommands() {
    const commands = [];
    for (const [, cmd] of client.commands) {
        commands.push(cmd.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log(`🔄 تسجيل ${commands.length} أمر...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID || client.user.id, config.guildId),
            { body: commands }
        );
        console.log('✅ تم تسجيل جميع الأوامر بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الأوامر:', error);
    }
}

// ─────────────────────────────────────
//         تحميل أنظمة المتاجر
// ─────────────────────────────────────

const storeModules = [
    require('./systems/stores/mentionHandler.js'),
    require('./systems/stores/autoPostManager.js'),
    require('./systems/stores/storeButtons.js'),
    require('./systems/stores/discountBox.js'),
    require('./systems/stores/dbManager.js'),
    require('./systems/stores/systemCleaner.js')
];

const storeTickets = require('./systems/stores/storeTickets.js');

// ─────────────────────────────────────
//         تحميل أنظمة المنشورات والمزادات
// ─────────────────────────────────────

const postsHandler     = require('./systems/posts/postsHandler.js');
const auctionHandler   = require('./systems/auctions/auctionHandler.js');
const auctionTransfer  = require('./systems/auctions/auctionTransfer.js');

// ─────────────────────────────────────
//         حدث Ready — تشغيل الكل
// ─────────────────────────────────────

client.once('ready', async () => {
    console.log(`\n🤖 البوت يعمل: ${client.user.tag}`);
    console.log(`📡 متصل بـ ${client.guilds.cache.size} سيرفر`);

    // تهيئة الأنظمة
    for (const mod of storeModules) {
        if (typeof mod.init === 'function') mod.init(client);
    }

    // تسجيل الأوامر
    await deployCommands();
    console.log('✅ جميع الأنظمة تعمل!\n');
});

// ─────────────────────────────────────
//         معالج الأوامر Slash
// ─────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        // الأوامر التي تملك execute خاص
        if (typeof command.execute === 'function') {
            await command.execute(interaction, client);
            return;
        }

        // توجيه الأوامر بدون execute مباشر حسب النظام
        if (command.system === 'posts') {
            await postsHandler.handleCommand(interaction);
        } else if (command.system === 'auctions') {
            if (interaction.commandName === 'setup_auction_panel') {
                await auctionHandler.sendAuctionPanel(interaction.channel);
                await interaction.reply({ content: '✅ تم إرسال لوحة المزادات!', flags: 64 });
            } else if (interaction.commandName === 'to_publish') {
                await auctionHandler.handleManualPublish(interaction);
            }
        } else if (command.system === 'stores') {
            if (interaction.commandName === 'ticket_store') {
                await storeTickets.sendStorePanel(interaction.channel);
                await interaction.reply({ content: '✅ تم إرسال لوحة المتاجر!', flags: 64 });
            }
        }
    } catch (error) {
        console.error(`❌ خطأ في الأمر /${interaction.commandName}:`, error);
        const errMsg = { content: '❌ حدث خطأ أثناء تنفيذ الأمر.', flags: 64 };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errMsg).catch(() => {});
        } else {
            await interaction.reply(errMsg).catch(() => {});
        }
    }
});

// ─────────────────────────────────────
//         معالج الأزرار والمودال الموحد
// ─────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) return;

    const id = interaction.customId ?? '';

    try {
        // ── نظام المنشورات ──
        if (id.startsWith('posts_')) {
            if (interaction.isButton())      await postsHandler.handleButton(interaction);
            if (interaction.isModalSubmit()) await postsHandler.handleModal(interaction);
            return;
        }

        // ── نظام المزادات ──
        if (id.startsWith('auction_')) {
            if (id === 'auction_buy_start')  return auctionHandler.handleAuctionStart(interaction);
            if (id === 'auction_show_prices') return auctionHandler.handleShowPrices(interaction);
            if (id === 'auction_mention_everyone') return auctionHandler.handleMentionSelection(interaction, 'everyone');
            if (id === 'auction_mention_here')     return auctionHandler.handleMentionSelection(interaction, 'here');
            if (id === 'auction_close_ticket') {
                if (!interaction.member.roles.cache.has(config.auctions.staffRoleId) &&
                    interaction.user.id !== (auctionHandler.activeTickets.get(interaction.channel.id)?.userId))
                    return interaction.reply({ content: '❌ ليس لديك صلاحية إغلاق هذا التكت.', flags: 64 });
                return auctionHandler.closeTicket(interaction.channel);
            }
            if (id === 'auction_admin_confirm') return auctionHandler.handleAdminConfirmPayment(interaction);
            return;
        }

        // ── نظام المتاجر — تذاكر الشراء ──
        if (id.startsWith('store_ticket_')) {
            return storeTickets.handleTicketButton(interaction);
        }
        if (id.startsWith('store_lock_ticket_')) {
            return storeTickets.handleLockTicket(interaction);
        }

        // ── نظام المتاجر — أزرار التشفير مستقلة ──
        if (id === 'encrypt_open_modal' || (interaction.isModalSubmit() && id === 'encrypt_modal')) {
            const encryptCmd = client.commands.get('encrypt');
            if (encryptCmd?.handleButtonAndModal) return encryptCmd.handleButtonAndModal(interaction);
        }

        // ── نظام المتاجر — لوحة التحكم والأزرار ──
        for (const mod of storeModules) {
            if (typeof mod.handleInteraction === 'function') {
                try { await mod.handleInteraction(interaction); } catch (e) { console.error(`❌ [${mod.constructor?.name ?? 'mod'}] ${e.message}`); }
            }
        }

    } catch (error) {
        console.error(`❌ [interactionCreate] ${id}:`, error);
    }
});

// ─────────────────────────────────────
//         معالج الرسائل الموحد
// ─────────────────────────────────────

client.on('messageCreate', async (message) => {
    if (!message.guild) return;

    try {
        // ── مراقبة تحويلات المنشورات ──
        await postsHandler.monitorTransfers(message);

        // ── مراقبة تحويلات المزادات ──
        await auctionTransfer.monitorAuctionTransfers(message);

        // ── رسائل تكتات المزادات (نموذج المنتج والسعر) ──
        await auctionHandler.handleTicketMessages(message);

        // ── مراقبة تحويلات شراء المتاجر ──
        await storeTickets.monitorStorePurchases(message);

        // ── رسائل أنظمة المتاجر ──
        for (const mod of storeModules) {
            if (typeof mod.handleMessage === 'function') {
                await mod.handleMessage(message).catch(e => console.error(`❌ [handleMessage] ${e.message}`));
            }
        }

    } catch (error) {
        console.error('❌ [messageCreate]:', error);
    }
});

// ─────────────────────────────────────
//         تشغيل البوت — التوكن آخراً
// ─────────────────────────────────────

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('❌ فشل تشغيل البوت — تأكد من صحة التوكن في ملف .env:', err.message);
    process.exit(1);
});

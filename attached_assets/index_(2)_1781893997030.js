// بوت مزاد ملف 1 نظام بوت و لي تجميع بي بوت منشورات خاص

import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  PermissionFlagsBits
} from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { 
  handleAuctionStart, 
  handleMentionSelection, 
  handleTicketMessages, 
  handleManualPublishCommand,
  handleAdminConfirmPayment,
  cleanAndCloseTicket,
  sendAuctionPanel,
  handleShowMentionPrices
} from './auction.js';
import { monitorTransfers } from './transferHandler.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

const commands = [
  new SlashCommandBuilder()
    .setName('setup-auction-panel')
    .setDescription('إرسال لوحة شراء المزاد الرئيسية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('to_publish')
    .setDescription('نشر مزاد يدوي احتياطي (للمسؤولين فقط)')
    .addUserOption(option => option.setName('user').setDescription('العضو صاحب المزاد').setRequired(true))
    .addStringOption(option => option.setName('item').setDescription('المنتج').setRequired(true))
    .addStringOption(option => option.setName('price').setDescription('السعر البداية').setRequired(true))
    .addStringOption(option => option.setName('mention').setDescription('نوع المنشن').setRequired(true)
        .addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' }))
    .addStringOption(option => option.setName('duration').setDescription('مدة المزاد').setRequired(true)
        .addChoices(
          { name: '5 دقائق > 1 انعاش', value: '1' },
          { name: '10 دقائق > 2 انعاش', value: '2' },
          { name: '15 دقائق > 3 انعاش', value: '3' }
        ))
    .addAttachmentOption(option => option.setName('image').setDescription('صورة المزاد (اختياري)').setRequired(false))
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    console.log('✅ تم تسجيل أوامر المزاد بنجاح!');
  } catch (error) { console.error(error); }
}

// --- نظام البيانات السحري المدمج ---
const DATA_FILE_PATH = path.join(process.cwd(), 'auctions.json');

global.saveAuctionData = (data) => {
  try {
    let currentData = [];
    if (fs.existsSync(DATA_FILE_PATH)) {
      const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf8');
      if (fileContent.trim() !== "") currentData = JSON.parse(fileContent);
    }
    currentData.push({ timestamp: new Date().toISOString(), ...data });
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [نظام البيانات]: تم الحفظ بنجاح في auctions.json");
  } catch (error) {
    console.error("❌ [نظام البيانات]: خطأ في الحفظ:", error);
  }
};

client.once('ready', async () => {
  console.log(`🤖 بوت المزادات جاهز: ${client.user.tag}`);
  
  // إنشاء الملف فوراً عند التشغيل للتأكد من الصلاحيات
  if (!fs.existsSync(DATA_FILE_PATH)) {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify([], null, 2));
    console.log("🆕 [نظام البيانات]: تم إنشاء ملف auctions.json الجديد.");
  } else {
    // 🔍 أمر الفحص للتأكد من أن الملف موجود وقابل للقراءة
    try {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf8');
      console.log("🔍 [فحص الرادار]: تم رصد الملف على الهاردسك بنجاح ومحتواه الحالي هو:", content);
    } catch (e) {
      console.error("❌ فشل فحص قراءة الملف:", e);
    }
  }

  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    if (commandName === 'setup-auction-panel') {
      await interaction.reply({ content: '⏳ جاري الإرسال...', ephemeral: true });
      await sendAuctionPanel(interaction.channel);
    } 
    else if (commandName === 'to_publish') {
      await handleManualPublishCommand(interaction);
    }
  }

  if (interaction.isButton()) {
    const { customId } = interaction;
    if (customId === 'buy_auction_start') return handleAuctionStart(interaction);
    if (customId === 'show_mention_prices') return handleShowMentionPrices(interaction);
    if (customId === 'auction_mention_here') return handleMentionSelection(interaction, 'here');
    if (customId === 'auction_mention_everyone') return handleMentionSelection(interaction, 'everyone');
    
    if (customId === 'claim_ticket') return handleClaimTicket(interaction);
    if (customId === 'admin_confirm_payment') return handleAdminConfirmPayment(interaction);
    if (customId === 'close_ticket') {
      await interaction.reply({ content: '🔒 سيتم إغلاق التذكرة خلال 5 ثوانٍ...' });
      return cleanAndCloseTicket(interaction.channel);
    }
  }
});

client.on('messageCreate', async (message) => {
  await monitorTransfers(message);
  await handleTicketMessages(message);
});

client.login(config.token).catch(console.error);

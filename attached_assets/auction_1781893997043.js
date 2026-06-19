// بوت مزاد ملف 2 و لي تجميع بي بوت منشورات خاص نظام مزادات هنا 

import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  ChannelType, 
  PermissionFlagsBits,
  Collection
} from 'discord.js';
import { config } from './config.js';

export const activeTickets = new Collection();

// دالة إرسال لوحة المزاد الرئيسية
export async function sendAuctionPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("📦 لوحة شراء المزادات الرسمية")
    .setDescription(
      `**مرحباً بك في نظام المزادات الاحترافي!**\n\n` +
      `يمكنك الآن حجز غرف المزاد والبدء في بيع منتجاتك بكل سهولة.\n` +
      `**للبدء، اضغط على زر "شراء مزاد ✨" أدناه.**\n\n` +
      `**💡 لمعرفة كيفية عمل المزادات، يرجى زيارة:** <#${config.explanationChannelId}>\n`
    )
    .setColor("#2b2d31");

  const buyButton = new ButtonBuilder()
    .setCustomId("buy_auction_start")
    .setLabel("شراء مزاد ✨")
    .setStyle(ButtonStyle.Success);

  const pricesButton = new ButtonBuilder()
    .setCustomId("show_mention_prices")
    .setLabel("أسعار المنشنات 💰")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(buyButton, pricesButton);
  await channel.send({ embeds: [embed], components: [row] });
}

// دالة بدء عملية الشراء واختيار المنشن
export async function handleAuctionStart(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('auction_mention_here').setLabel('here').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('auction_mention_everyone').setLabel('everyone').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: '✅ **تم بدء الطلب!** اختر نوع المنشن المطلوبة لمزادك من الأزرار التالية:',
    components: [row],
    ephemeral: true
  });
}

// دالة فتح تكت المزاد وتوليد الكود الثلاثي
export async function handleMentionSelection(interaction, type) {
  const mentionConfig = config.mentionPrices[type];
  const user = interaction.user;

  await interaction.deferReply({ ephemeral: true });

  try {
    const ticketChannel = await interaction.guild.channels.create({
      name: `auction-${user.username}`,
      type: ChannelType.GuildText,
      parent: config.auctionCategoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: config.auctionStaffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ]
    });

    const verificationCode = Math.floor(100 + Math.random() * 899);

    activeTickets.set(ticketChannel.id, {
      userId: user.id,
      selectedMention: type,
      mentionPrice: mentionConfig.price,
      mentionLabel: mentionConfig.label,
      verificationCode: verificationCode,
      step: 'SELECT_DURATION'
    });

    const welcomeEmbed = new EmbedBuilder()
      .setTitle("👋 مرحباً بك في تكت المزاد")
      .setDescription(
        `مرحباً بك يا <@${user.id}>.\n\n` +
        `**كلمتين ورد غطاها:**\n` +
        `اكتب **رقم المدة** اللي تبيها تحت وبس! 👇\n\n` +
        `**⏱️ اختر مدة المزاد:**\n` +
        `**[ 1 ]** 5 دقائق > 1 انعاش\n` +
        `**[ 2 ]** 10 دقائق > 2 انعاش\n` +
        `**[ 3 ]** 15 دقائق > 3 انعاش`
      )
      .setColor('#2b2d31');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التكت 🔒').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ 
      content: `<@${user.id}> | <@&${config.auctionStaffRoleId}>`, 
      embeds: [welcomeEmbed], 
      components: [row] 
    });

    await interaction.editReply({ content: `✅ تم إنشاء تذكرتك: <#${ticketChannel.id}>`, ephemeral: true });

  } catch (error) {
    console.error(error);
    await interaction.editReply({ content: "❌ حدث خطأ في إنشاء التكت.", ephemeral: true });
  }
}

// دالة معالجة الرسائل داخل التكت
export async function handleTicketMessages(message) {
  if (message.author.bot) return;
  const ticketData = activeTickets.get(message.channel.id);
  if (!ticketData || message.author.id !== ticketData.userId) return;

  // اختيار المدة
  if (ticketData.step === 'SELECT_DURATION') {
    const choice = message.content.trim();
    if (!['1', '2', '3'].includes(choice)) return;

    const durationConfig = config.durations[choice];
    const basePrice = ticketData.mentionPrice + durationConfig.price;
    
    // تحويل القيم لأرقام لضمان حساب رياضي سليم
    const numericBasePrice = Number(basePrice) || 0;
    const numericVerifyCode = Number(ticketData.verificationCode) || 0;

    // دمج كود التحقق مع السعر (المبلغ الصافي)
    const finalPrice = numericBasePrice + numericVerifyCode;
    
    // حساب المبلغ المطلوب شامل الضريبة (5%)
    const taxPrice = Math.floor(finalPrice * 20 / 19) + 1;
    
    ticketData.duration = choice;
    ticketData.totalPrice = finalPrice; 
    ticketData.step = 'WAITING_PAYMENT';
    activeTickets.set(message.channel.id, ticketData);

    // 🌟 استدعاء نظام الحفظ السحري المربوط بـ index.js بأمان
    if (typeof global.saveAuctionData === 'function') {
        global.saveAuctionData(ticketData);
    } else {
        console.log("⚠️ [نظام البيانات]: دالة الحفظ غير جاهزة في النطاق العام بعد.");
    }

    const paymentEmbed = new EmbedBuilder()
      .setTitle("💳 تفاصيل الدفع للمزاد")
      .setDescription(
        `**تفاصيل الحجز:**\n` +
        `> **سعر المنشن (${ticketData.mentionLabel}):** \`${ticketData.mentionPrice.toLocaleString()}\` كريدت\n` +
        `> **سعر المدة (${durationConfig.description}):** \`${durationConfig.price.toLocaleString()}\` كريدت\n` +
        `> **المجموع الكلي (الصافي):** \`${finalPrice.toLocaleString()}\` كريدت\n\n` +
        `**رمز التحقق الخاص بك:** \`\`\`\n${ticketData.verificationCode}\`\`\`` +
        `\n\n` +
        `**لإتمام عملية الشراء، يرجى تحويل المبلغ في روم الأوامر <#${config.commandsChannelId}>.**\n` +
        `**💡 ملاحظة:** سيتم النشر في روم <#${config.auctionChannels[choice]}>.`
      )
      .setFooter({ text: `تأكد من تحويل المبلغ الموضح في الرسالة التالية بالضبط لضمان التأكيد التلقائي.` })
      .setColor("#2b2d31");

    await message.channel.send({ embeds: [paymentEmbed] });
    
    // الرسالة الثانية للنسخ السريع للأمر
    await message.channel.send({ content: `c <@${config.ownerId}> ${taxPrice}` });
  }

  // تعبئة نموذج المزاد بعد الدفع الناجح
  if (ticketData.step === 'FILL_FORM') {
    if (!message.content.includes('المنتج:')) return;
    
    const lines = message.content.split('\n');
    let item = "غير محدد";
    let price = "غير محدد";
    
    lines.forEach(line => {
      if (line.includes('المنتج:')) item = line.split('المنتج:')[1].trim();
      if (line.includes('السعر:')) price = line.split('السعر:')[1].trim();
    });

    const imageUrl = message.attachments.size > 0 ? message.attachments.first().url : null;
    
    ticketData.step = 'PUBLISHING';
    const auctionChannelId = config.auctionChannels[ticketData.duration];
    const auctionChannel = message.guild.channels.cache.get(auctionChannelId);
    
    if (!auctionChannel) return message.channel.send("❌ حدث خطأ: لا يمكن العثور على روم المزاد المطابق.");

    // فحص آخر رسالة في روم المزاد للتأكد من خلوه
    const lastMessages = await auctionChannel.messages.fetch({ limit: 1 });
    const isBusy = lastMessages.size > 0 && (Date.now() - lastMessages.first().createdTimestamp < config.durations[ticketData.duration].minutes * 60 * 1000);

    if (isBusy) {
      ticketData.step = 'FILL_FORM'; // إعادة خطوة النموذج حتى يعيد الإرسال
      return message.channel.send("⚠️ **عذراً، روم المزاد المطلوب مشغول حالياً بمزاد آخر.** يرجى الانتظار قليلاً حتى ينتهي المزاد الحالي ثم أرسل النموذج مرة أخرى.");
    }

    activeTickets.set(message.channel.id, ticketData);
    await startAuctionPublish(message.channel, ticketData, item, price, imageUrl, message.author);
  }
}

// دالة التأكيد اليدوي من الإدارة في حال عطل البروبوت
export async function handleAdminConfirmPayment(interaction) {
  if (!interaction.member.roles.cache.has(config.auctionStaffRoleId)) return interaction.reply({ content: "❌ للمسؤولين فقط!", ephemeral: true });

  const ticketData = activeTickets.get(interaction.channel.id);
  if (!ticketData || ticketData.step !== 'WAITING_PAYMENT') return interaction.reply({ content: "❌ لا يمكن تأكيد الدفع الآن.", ephemeral: true });

  ticketData.step = 'FILL_FORM';
  activeTickets.set(interaction.channel.id, ticketData);

  const formText = 
    `✅ **تم تأكيد الدفع بنجاح!**\n\n` +
    `الآن يا <@${ticketData.userId}> انسخ هذا النموذج وعبه:\n\n` +
    `\`\`\`\nالمنتج:\nالسعر:\nالمنشن: ${ticketData.mentionLabel}\nصورة: (أرفق صورة مع الرسالة)\n\`\`\``;

  await interaction.reply({ content: formText });
}

// دالة نشر المزاد الفعلية في الرومات الرسمية والمسح التلقائي
async function startAuctionPublish(channel, data, item, price, imageUrl, user) {
  const auctionChannel = channel.guild.channels.cache.get(config.auctionChannels[data.duration]);
  const durationConfig = config.durations[data.duration];

  if (!auctionChannel || !durationConfig) return channel.send("❌ فشل النشر: نقص في إعدادات المدة أو القنوات.");

  // حساب وقت الانتهاء بصيغة الديسكورد التنازلية
  const endTime = Math.floor((Date.now() + durationConfig.minutes * 60 * 1000) / 1000);

  const auctionContent = 
    `>>> **__المنتج:__** ${item}\n` +
    `**__السعر:__** ${price}\n` +
    `**__المنشن:__** ${data.mentionLabel}\n\n` +
    `**__قوانين المزاد:__**\n` +
    `* ⛔ ممنوع تزيد ما معك فلوس\n` +
    `* ⛔ ممنوع تزيد اقل من 50k\n` +
    `* ⛔ ممنوع تزيد في سعر بدايه\n` +
    `* ⛔ ممنوع تكلم مواضيع غير مزاد\n\n` +
    `⏳ **ينتهي المزاد:** <t:${endTime}:R>`;

  const sentMsg = await auctionChannel.send({ 
    content: `${data.mentionLabel}\n${auctionContent}`, 
    files: imageUrl ? [imageUrl] : [] 
  });

  await channel.send("🚀 **تم نشر المزاد بنجاح! سيتم مسح الرسائل وإغلاق التكت بعد انتهاء الوقت.**");

  // نظام التنظيف والمسح التلقائي وإغلاق التكت عند نهاية المزاد
  setTimeout(async () => {
    try {
      const messages = await auctionChannel.messages.fetch({ limit: 50 });
      const toDelete = messages.filter(m => m.id !== sentMsg.id && !m.author.bot);
      if (toDelete.size > 0) await auctionChannel.bulkDelete(toDelete, true).catch(() => {});
      
      setTimeout(() => sentMsg.delete().catch(() => {}), 5000);
      await cleanAndCloseTicket(channel);
    } catch (e) {
      console.error("خطأ في نظام المسح:", e);
    }
  }, durationConfig.minutes * 60 * 1000);
}

// دالة مسح بيانات التكت وإغلاقها
export async function cleanAndCloseTicket(channel) {
  activeTickets.delete(channel.id);
  await channel.delete().catch(() => {});
}

// دالة عرض أسعار المنشنات للمستخدمين
export async function handleShowMentionPrices(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("💰 أسعار المنشنات المتاحة")
    .setDescription(
      `**هنا يمكنك الاطلاع على أسعار المنشنات المختلفة للمزادات:**\n\n` +
      `**@everyone:** ${config.mentionPrices.everyone.displayPrice} كريدت\n` +
      `**@here:** ${config.mentionPrices.here.displayPrice} كريدت\n\n` +
      `*الأسعار قابلة للتغيير، يرجى مراجعتها قبل الشراء.*`
    )
    .setColor("#0099ff");

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// دالة النشر اليدوي الاحتياطي للمسؤولين والإداريين
export async function handleManualPublishCommand(interaction) {
  if (!interaction.member.roles.cache.has(config.auctionStaffRoleId)) return interaction.reply({ content: "❌ للمسؤولين فقط!", ephemeral: true });

  const user = interaction.options.getUser('user');
  const item = interaction.options.getString('item');
  const price = interaction.options.getString('price');
  const mentionType = interaction.options.getString('mention');
  const durationKey = interaction.options.getString('duration');
  const image = interaction.options.getAttachment('image');

  const mentionLabel = config.mentionPrices[mentionType].label;

  await interaction.reply({ content: "⏳ جاري النشر اليدوي...", ephemeral: true });

  const fakeData = { duration: durationKey, mentionLabel: mentionLabel };
  await startAuctionPublish(interaction.channel, fakeData, item, price, image ? image.url : null, user);
}

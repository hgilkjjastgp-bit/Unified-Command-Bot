// بوت مزاد ملف 3 نظام تحقيق تحويلات خاص لي بوت و تجميع بوت منشورات بي بوت موحد 

import { config } from './config.js';
import { activeTickets } from './auction.js'; // 🌟 تم حذف saveAuctionData من الاستيراد لأنها أصبحت global

export async function monitorTransfers(message) {
  // 1. الحماية: التأكد أن الرسالة من بوت البروبوت الرسمي فقط وفي روم الأوامر
  if (!config.allowedBotIds.includes(message.author.id)) return;
  if (message.channelId !== config.commandsChannelId) return;

  const content = message.content;
  
  // تحويل النص لأحرف صغيرة وتجهيز نص التحويل الإنجليزي والعربي لضمان المطابقة
  const lowerContent = content.toLowerCase();
  const isTransferMsg = (lowerContent.includes('has transferred') || lowerContent.includes('قام بتحويل')) && lowerContent.includes(config.ownerId);
  
  if (!isTransferMsg) return;

  // 3. فحص جميع التذاكر النشطة للبحث عن تطابق المبلغ
  for (const [channelId, ticketData] of activeTickets.entries()) {
    if (ticketData.step !== 'WAITING_PAYMENT') continue;

    // تنظيف المحتوى من الفواصل لمطابقة الرقم الصافي
    const cleanContent = content.replace(/,/g, '');
    const targetPrice = ticketData.totalPrice.toString();

    // إذا كانت الرسالة تحتوي على المبلغ المطلوب
    if (cleanContent.includes(targetPrice)) {
      try {
        const guild = message.guild;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
          activeTickets.delete(channelId);
          continue;
        }

        // تحديث حالة التذكرة
        ticketData.step = 'FILL_FORM';
        activeTickets.set(channelId, ticketData);

        // 🌟 حفظ البيانات في الملف عبر دالة global السحرية بأمان
        if (typeof global.saveAuctionData === 'function') {
          global.saveAuctionData({
            userId: ticketData.userId,
            amount: ticketData.totalPrice,
            channelId: channelId,
            mention: ticketData.mentionLabel,
            duration: ticketData.duration
          });
        }

        // إرسال سجل العملية في روم اللوق
        const logChannel = guild.channels.cache.get(config.logChannelId);
        if (logChannel) {
          const logMsg = `**✅ [عملية تحويل ناجحة للمزاد]**\n` +
                         `• **المشتري:** <@${ticketData.userId}> (\`${ticketData.userId}\`)\n` +
                         `• **المبلغ المستلم الصافي:** \`${ticketData.totalPrice.toLocaleString()}\` كريدت\n` +
                         `• **نوع المنشن:** \`${ticketData.mentionLabel}\`\n` +
                         `• **التكت:** <#${channelId}>`;
          await logChannel.send({ content: logMsg });
        }

        // إرسال النموذج للمستخدم في التكت
        const formText = 
          `✅ **تم تأكيد الدفع بنجاح!**\n\n` +
          `الآن يا <@${ticketData.userId}> انسخ هذا النموذج وعبه (أرسله في رسالة واحدة مع الصورة):\n\n` +
          `\`\`\`\nالمنتج:\nالسعر:\nالمنشن: ${ticketData.mentionLabel}\n\`\`\`\n` +
          `*يرجى إرفاق صورة المنتج مع الرسالة.*`;

        await channel.send({ content: formText });
        console.log(`✅ تم تفعيل المزاد بنجاح للمستخدم ${ticketData.userId} في تكت ${channel.name}`);
        return;
      } catch (error) {
        console.error("خطأ أثناء معالجة التحويل الناجح:", error);
      }
    } // 🌟 تم إغلاق قوس شرط تطابق السعر بنجاح هنا
  }
}

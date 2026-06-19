// بوت مزادات ملف اخيرا 4 اعدادات البوت مزاد خاص و بي تجميع بوت منشورات بي توحيد بوت موحد

export const config = {
  // توكن البوت والآيدي الخاص به (يُقرأ من Secrets في Replit)
  token: process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN_HERE",
  clientId: process.env.CLIENT_ID || "YOUR_CLIENT_ID_HERE",
  
  // إعدادات السيرفر
  guildId: "1508807148740542494", // آيدي السيرفر الرئيسي
  ownerId: "1495139129111875594", // آيدي صاحب السيرفر (المستلم)
  allowedBotIds: ["282859044593598464", "1509569386850291773"], // آيديات البوتات المسموح لها (بروبوت + أي بوتات أخرى)

  // رتبة مسؤول المزاد
  auctionStaffRoleId: "1512202234992267344",

  // إعدادات الرومات
  auctionCategoryId: "1512219416543236096", // الكاتجري الخاص بتذاكر المزاد
  explanationChannelId: "1512220134285115484", // روم شرح المزاد
  commandsChannelId: "1509569386850291773", // روم أوامر بروبوت (الروم الذي يحول فيه المستخدم)
  logChannelId: "1513609705551954041", // روم اللوق (الروم الذي تظهر فيه رسالة نجاح الشراء)

  // رومات نشر المزاد حسب المدة
  auctionChannels: {
    "1": "1511528369899180132",
    "2": "1511528452359196803",
    "3": "1511528575759679608",
    "4": "1511528691774263498"
  },

  // أسعار المنشنات للمزاد
  mentionPrices: {
    everyone: { label: "@everyone", price: 2000000, displayPrice: "2m" },
    here: { label: "@here", price: 1000000, displayPrice: "1m" }
  },

  // أسعار ومدد المزادات النهائية
  durations: {
    "1": { minutes: 5, price: 1000000, displayPrice: "1m", description: "5 دقائق > 1 انعاش" },
    "2": { minutes: 10, price: 3000000, displayPrice: "3m", description: "10 دقائق > 2 انعاش" },
    "3": { minutes: 15, price: 4000000, displayPrice: "4m", description: "15 دقيقة > 3 انعاش" }
  }
};

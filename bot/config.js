// ═══════════════════════════════════════════════
//         إعدادات البوت الموحد المركزية
// ═══════════════════════════════════════════════

module.exports = {

    // ── إعدادات البوت الأساسية ──
    guildId:   "1508807148740542494",
    ownerId:   "1495139129111875594",  // آيدي صاحب السيرفر (المستلم)
    probotId:  "282859044593598464",   // آيدي بروبوت الرسمي

    // ─────────────────────────────────────
    //         نظام المنشورات
    // ─────────────────────────────────────
    posts: {
        adminRoleId:      "1512202234992267344",
        everyonePrice:    1000000,
        herePrice:        800000,
        setupChannelId:   "1512221942520877106",
        commandsChannelId:"1509569386850291773",
        postsChannelId:   "1511932549033889803",
        logsChannelId:    "1513609705551954041"
    },

    // ─────────────────────────────────────
    //         نظام المزادات
    // ─────────────────────────────────────
    auctions: {
        staffRoleId:       "1512202234992267344",
        categoryId:        "1512219416543236096",
        explanationChannelId: "1512220134285115484",
        commandsChannelId: "1509569386850291773",
        logChannelId:      "1513609705551954041",
        channels: {
            "1": "1511528369899180132",
            "2": "1511528452359196803",
            "3": "1511528575759679608"
        },
        mentionPrices: {
            everyone: { label: "@everyone", price: 2000000, displayPrice: "2m" },
            here:     { label: "@here",     price: 1000000, displayPrice: "1m" }
        },
        durations: {
            "1": { minutes: 5,  price: 1000000, displayPrice: "1m", description: "5 دقائق > 1 انعاش" },
            "2": { minutes: 10, price: 3000000, displayPrice: "3m", description: "10 دقائق > 2 انعاش" },
            "3": { minutes: 15, price: 4000000, displayPrice: "4m", description: "15 دقيقة > 3 انعاش" }
        }
    },

    // ─────────────────────────────────────
    //         نظام المتاجر
    // ─────────────────────────────────────
    stores: {
        staffRoleId:       "1509576925478256663",
        ticketsCategoryId: "1509569033823981649",
        bankChannelId:     "1509569386850291773",
        logChannelId:      "1513609705551954041",
        categories: {
            vip:     { name: "VIP",      emoji: "👑", id: "1509736323391688714", everyone: 30, here: 20, price: 2000000 },
            diamond: { name: "دايموند",  emoji: "💎", id: "1509736509459136523", everyone: 20, here: 10, price: 1500000 },
            gold:    { name: "ذهبي",     emoji: "🎖", id: "1509736670499700757", everyone: 15, here: 13, price: 1000000 },
            bronze:  { name: "برونزي",   emoji: "🥉", id: "1509736906727100469", everyone: 10, here: 5,  price: 800000  }
        }
    }
};

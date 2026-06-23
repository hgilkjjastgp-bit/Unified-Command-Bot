// ═══════════════════════════════════════════════
//         مدير الأسعار — تحميل وحفظ الأسعار تعااج
// ═══════════════════════════════════════════════

const fs     = require('fs');
const path   = require('path');
const config = require('../config.js');

const PRICES_FILE = path.join(__dirname, '../data/prices.json');

function loadPrices() {
    if (!fs.existsSync(PRICES_FILE)) return;
    try {
        const saved = JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
        for (const [key, value] of Object.entries(saved)) setByKey(key, value);
        console.log('[PricesManager] تم تحميل الأسعار المخصصة.');
    } catch (e) {
        console.error('[PricesManager] خطأ في قراءة prices.json:', e.message);
    }
}

function savePrice(key, newValue) {
    setByKey(key, newValue);
    let saved = {};
    if (fs.existsSync(PRICES_FILE)) {
        try { saved = JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8')); } catch {}
    }
    saved[key] = newValue;
    const dir = path.dirname(PRICES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PRICES_FILE, JSON.stringify(saved, null, 2), 'utf8');
}

function getCurrentPrice(key) {
    const getters = {
        'posts.everyone':                  () => config.posts.everyonePrice,
        'posts.here':                      () => config.posts.herePrice,
        'auctions.mention.everyone':       () => config.auctions.mentionPrices.everyone.price,
        'auctions.mention.here':           () => config.auctions.mentionPrices.here.price,
        'auctions.duration.1':             () => config.auctions.durations['1'].price,
        'auctions.duration.2':             () => config.auctions.durations['2'].price,
        'auctions.duration.3':             () => config.auctions.durations['3'].price,
        'stores.buy.vip':                  () => config.stores.categories.vip.price,
        'stores.buy.diamond':              () => config.stores.categories.diamond.price,
        'stores.buy.gold':                 () => config.stores.categories.gold.price,
        'stores.buy.bronze':               () => config.stores.categories.bronze.price,
        'stores.service.mention_everyone': () => config.stores.servicePrices.mention_everyone,
        'stores.service.mention_here':     () => config.stores.servicePrices.mention_here,
        'stores.service.change_name':      () => config.stores.servicePrices.change_name,
        'stores.service.change_owner':     () => config.stores.servicePrices.change_owner,
        'stores.service.remove_warning':   () => config.stores.servicePrices.remove_warning,
        'stores.service.autopost_day':     () => config.stores.servicePrices.autopost_day,
        'stores.service.autopost_day2':    () => config.stores.servicePrices.autopost_day2,
        'stores.service.autopost_week':    () => config.stores.servicePrices.autopost_week,
        'stores.service.autoline':         () => config.stores.servicePrices.autoline,
        'stores.service.discount_box':     () => config.stores.servicePrices.discount_box,
    };
    try { return getters[key]?.() ?? null; } catch { return null; }
}

function setByKey(key, val) {
    const setters = {
        'posts.everyone':                  () => { config.posts.everyonePrice = val; },
        'posts.here':                      () => { config.posts.herePrice = val; },
        'auctions.mention.everyone':       () => { config.auctions.mentionPrices.everyone.price = val; },
        'auctions.mention.here':           () => { config.auctions.mentionPrices.here.price = val; },
        'auctions.duration.1':             () => { config.auctions.durations['1'].price = val; },
        'auctions.duration.2':             () => { config.auctions.durations['2'].price = val; },
        'auctions.duration.3':             () => { config.auctions.durations['3'].price = val; },
        'stores.buy.vip':                  () => { config.stores.categories.vip.price = val; },
        'stores.buy.diamond':              () => { config.stores.categories.diamond.price = val; },
        'stores.buy.gold':                 () => { config.stores.categories.gold.price = val; },
        'stores.buy.bronze':               () => { config.stores.categories.bronze.price = val; },
        'stores.service.mention_everyone': () => { config.stores.servicePrices.mention_everyone = val; },
        'stores.service.mention_here':     () => { config.stores.servicePrices.mention_here = val; },
        'stores.service.change_name':      () => { config.stores.servicePrices.change_name = val; },
        'stores.service.change_owner':     () => { config.stores.servicePrices.change_owner = val; },
        'stores.service.remove_warning':   () => { config.stores.servicePrices.remove_warning = val; },
        'stores.service.autopost_day':     () => { config.stores.servicePrices.autopost_day = val; },
        'stores.service.autopost_day2':    () => { config.stores.servicePrices.autopost_day2 = val; },
        'stores.service.autopost_week':    () => { config.stores.servicePrices.autopost_week = val; },
        'stores.service.autoline':         () => { config.stores.servicePrices.autoline = val; },
        'stores.service.discount_box':     () => { config.stores.servicePrices.discount_box = val; },
    };
    setters[key]?.();
}

module.exports = { loadPrices, savePrice, getCurrentPrice };

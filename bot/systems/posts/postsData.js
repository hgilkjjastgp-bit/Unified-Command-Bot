// ═══════════════════════════════════════════════
//         نظام بيانات المنشورات
// ═══════════════════════════════════════════════
// نظام منشورات

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/posts_data.json');

function loadPosts() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            const content = fs.readFileSync(DATA_PATH, 'utf8').trim();
            if (content) return JSON.parse(content);
        }
    } catch (e) {
        console.error('[Posts] خطأ في تحميل البيانات:', e);
    }
    return [];
}

function savePosts(entry) {
    try {
        const data = loadPosts();
        data.push(entry);
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[Posts] خطأ في حفظ البيانات:', e);
    }
}

module.exports = { loadPosts, savePosts };

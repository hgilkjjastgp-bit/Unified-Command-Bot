// ═══════════════════════════════════════════════
//   تتبع رسائل التحويل القابلة للنسخ + حذفها تلقائياً
// ═══════════════════════════════════════════════

const pending = new Map(); // verificationCode -> { message, timeoutId }

const AUTO_DELETE_MS = 60_000; // دقيقة واحدة

function track(code, message) {
    const existing = pending.get(code);
    if (existing) {
        clearTimeout(existing.timeoutId);
        existing.message.delete().catch(() => {});
    }

    const timeoutId = setTimeout(() => {
        const entry = pending.get(code);
        if (entry) {
            entry.message.delete().catch(() => {});
            pending.delete(code);
        }
    }, AUTO_DELETE_MS);

    pending.set(code, { message, timeoutId });
}

function remove(code) {
    const entry = pending.get(code);
    if (!entry) return;
    clearTimeout(entry.timeoutId);
    entry.message.delete().catch(() => {});
    pending.delete(code);
}

module.exports = { track, remove };

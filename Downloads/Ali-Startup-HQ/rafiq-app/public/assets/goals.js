/* Onboarding goal checks (harness). One source for the browser (window.RQG) and for scripts/harness-test.mjs (module.exports).
   A step is "done" only when its goal is visible in the data, never because a button was clicked. */
(function (root) {
  function goalCheck(step, d) {
    d = d || {};
    switch (step) {
      case 'imp': return d.importedRows > 0 && (d.summaryReady == null || d.summaryReady === d.importedRows) ? { ok: true } : { ok: false, why: d.flag ? 'الاستيراد انحفظ لكن المرضى ما رجعوا للجلسة أو العدد ما يطابق' : 'ما فيه مرضى مستوردين' };
      case 'rec': return d.visits > 0 || d.recorded ? { ok: true } : { ok: false, why: 'ما انسجلت زيارة' };
      case 'apr': return d.visits > 0 ? { ok: true } : { ok: false, why: 'ما فيه ملف معتمد' };
      case 'snd': return d.sent > 0 && d.sentLog > 0 ? { ok: true } : { ok: false, why: 'ما انفتحت أي متابعة' };
      case 'inv': return d.invited ? { ok: true } : { ok: false, why: 'الدعوة ما انفتحت أو اننسخت فعلاً' };
      case 'rep': return d.seenReport && (d.visits > 0 || d.sent > 0) ? { ok: true } : { ok: false, why: d.seenReport ? 'التقرير فاضي لأنه ما فيه نشاط حقيقي بعد' : 'ما انفتح التقرير' };
      default: return { ok: false, why: 'خطوة غير معروفة' };
    }
  }
  var api = { goalCheck: goalCheck };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RQG = api;
})(typeof window !== 'undefined' ? window : this);

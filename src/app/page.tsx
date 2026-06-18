'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Lang = 'en' | 'ar'
type AuthState = 'loading' | 'visitor' | 'user'

// ─── Color tokens — Linear-style, no orange dominant ─────────────────────────
const C = {
  bg:            '#09090B',
  surface:       '#111113',
  surfaceRaised: '#18181B',
  border:        'rgba(255,255,255,0.08)',
  borderSubtle:  'rgba(255,255,255,0.05)',
  text:          '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted:     '#71717A',
  textDim:       '#3F3F46',
  continue:      '#3B82F6',
  scale:         '#22C55E',
  kill:          '#EF4444',
  foundingBorder:'rgba(250,250,250,0.2)',
}

// ─── Bilingual copy ───────────────────────────────────────────────────────────
const COPY = {
  en: {
    nav: {
      pricing: 'Pricing',
      cta_visitor: 'Start your first experiment',
      cta_user: 'Open dashboard',
    },
    hero: {
      headline_1: 'Stop wasting weeks on experiments',
      headline_2: 'that should have died in days.',
      sub: 'Growva helps solo founders turn growth experiments into clear decisions: what to test, what to stop, what to continue, and what to scale — using real signals, not gut feeling.',
      cta_visitor: 'Start your first experiment',
      cta_user: 'Open dashboard',
      cta_secondary: 'See how it works ↓',
    },
    card: {
      verdict: 'STOP',
      experiment: '"AI meal planner — paid waitlist"',
      stats: '312 visits · 1 signup',
      threshold_label: 'THRESHOLD',
      threshold: 'Reached — 300 visits ✓',
      reason_label: 'REASON',
      reason: 'Enough traffic, almost no intent. 0.3% vs ~3% viable.',
      next_label: 'NEXT ACTION',
      next: 'Kill it now. You just saved ~3 weeks of building.',
      accent: '#EF4444',
    },
    demo: {
      section_label: 'Sample founder scenario',
      title: 'See how Growva decides.',
      subtitle: 'Walk through a real solo-founder growth test in under 60 seconds.',
      steps: ['Pick scenario', 'Read signals', 'Get verdict', 'Take next action'],
      experiment_label: 'Experiment',
      views_label: 'Views',
      signups_label: 'Signups',
      threshold_views: 300,
      threshold_signups: 10,
      why_label: 'Why',
      action_label: 'Next action',
      next_label: 'Next experiment',
      cta_primary: 'Start your first decision',
      cta_secondary: 'See how it works',
      scenarios: [
        {
          tone: 'continue',
          tab: 'No traffic yet',
          scenario: 'You launched a landing page but nobody is reaching it.',
          experiment: 'Landing page — paid waitlist',
          views: 0,
          signups: 0,
          signal_summary: '0 views · 1 click · 0 signups',
          verdict: 'CONTINUE',
          diagnosis: 'Weak distribution',
          why: 'Not enough traffic arrived to judge the offer.',
          action: 'Run one focused distribution sprint.',
          next: 'Test one channel with one audience and one message for 48 hours.',
        },
        {
          tone: 'stop',
          tab: 'Traffic but no signups',
          scenario: 'Your page gets visitors, but almost nobody signs up.',
          experiment: 'Landing page — free trial',
          views: 400,
          signups: 2,
          signal_summary: '400 views · 2 signups · 0 purchases',
          verdict: 'STOP',
          diagnosis: 'Weak conversion',
          why: 'Signup rate is far below the target threshold.',
          action: 'Do not send more traffic yet. Rewrite the offer around the customer pain.',
          next: 'Run a pain-led headline and CTA test.',
        },
        {
          tone: 'amber',
          tab: 'Promising but too early',
          scenario: 'Early visitors are converting, but the sample is still small.',
          experiment: 'Landing page — early access',
          views: 55,
          signups: 8,
          signal_summary: '55 views · 8 signups · 0 purchases',
          verdict: 'CONTINUE',
          diagnosis: 'Promising but under-sampled',
          why: 'The signal is strong, but the sample is too small to scale confidently.',
          action: 'Increase sample before changing the offer.',
          next: 'Repeat the same test until 300 visits or 10+ signups.',
        },
      ],
    },
    simple: {
      section_label: 'Growva, explained simply',
      title: 'Imagine you have a big idea 💡',
      steps: [
        { art: 'idea',   title: 'You get an exciting idea', body: 'A new app, a new feature, a new offer. You can already picture everyone loving it.' },
        { art: 'trap',   title: 'So you build… and build…', body: 'Weeks disappear. You add feature after feature, night after night — sure that THIS is the thing people want.' },
        { art: 'reveal', title: 'Then… crickets 🦗', body: 'You launch. Almost nobody signs up. You just spent ~3 weeks of your life building something no one asked for.' },
        { art: 'growva', title: 'Growva flips the order', body: 'Test the idea FIRST — in 48 hours, with real people and real signals. Then Growva tells you plainly: build it, change it, or stop. Before you burn a single week.' },
      ],
      punch: 'You don\'t just save money — you save weeks of your life, and stop building features nobody wanted.',
    },
    paths: {
      section_label: 'Two paths into Growva',
      title: 'Do you have traffic?',
      yes_title: 'Yes, I have traffic',
      yes_body: 'Use a tracking link or site snippet. Growva collects clicks, signups, and purchases in real time — and turns them into a decision.',
      no_title: 'No traffic yet',
      no_body: 'Growva creates a 48-hour sprint — gives you the script and a tracking link, then turns the results into a decision.',
    },
    tracking: {
      section_label: 'Signal collection',
      title: 'Two ways to collect signal',
      link_title: 'Tracking Link',
      link_body: 'For posts, DMs, X, Reddit, emails. Growva measures every click and its source.',
      snippet_title: 'Site Snippet',
      snippet_body: 'For landing pages. Measures page views, signups, and purchases automatically.',
    },
    how: {
      section_label: 'How it works',
      title: 'Three steps from question to decision',
      steps: [
        { n: '01', title: 'Add your product and hypothesis', body: 'Define what you\'re testing and who it\'s for. Growva structures the experiment around a clear goal.' },
        { n: '02', title: 'Run the experiment', body: 'No traffic? Run a 48-hour sprint. Have traffic? Track it with a link or snippet. Growva collects the signal either way.' },
        { n: '03', title: 'Get the decision', body: 'Scale, Continue, or Stop — with a reason, based on real numbers. Not a vague recommendation.' },
      ],
    },
    pricing: {
      section_label: 'Pricing',
      title: 'One tool. One decision at a time.',
      beta: {
        label: 'Private Beta',
        price: 'Free while in beta',
        note: 'Controlled access · Not a public free plan',
        features: [
          '1 product',
          'Core decision engine',
          'Tracking link',
          '48-hour sprint mode',
          'Beta feedback access',
        ],
        cta: 'Join private beta',
        disclaimer: 'Beta is limited and controlled. We may close access at any time.',
      },
      founding: {
        badge: 'Main Offer',
        label: 'Founding Access',
        price: '$199',
        period: 'one-time · lifetime',
        note: 'First 1,000 founders only. Price increases after.',
        features: [
          '1 product',
          'Core decision engine',
          'Sprint mode',
          'Site snippet',
          'Tracking links',
          'Decision feed',
          'All future core updates',
        ],
        cta: 'Get Founding Access — $199',
      },
      growth: {
        label: 'Growth',
        price: '$99',
        period: '/month',
        for: 'For later-stage founders',
        features: [
          'Multiple products',
          'Advanced automation',
          'Memory systems',
          'Operator tools',
          'Higher tracking capacity',
        ],
        cta: 'Coming after founding access',
        note: 'Available after the founding round closes.',
      },
    },
    final: {
      headline: 'Stop guessing. Start deciding.',
      sub: 'Founding access · $199 · 1,000 spots only.',
      cta_visitor: 'Start your first experiment →',
      cta_user: 'Open dashboard →',
    },
    footer: {
      tagline: 'Decision infrastructure for solo founders.',
      legal: 'All payments secured by Stripe',
      email: 'hello@growva.co',
    },
  },
  ar: {
    nav: {
      pricing: 'الأسعار',
      cta_visitor: 'ابدأ أول تجربة',
      cta_user: 'افتح لوحة التحكم',
    },
    hero: {
      headline_1: 'لا تضيع أسابيع على تجربة',
      headline_2: 'كان المفروض توقفها من أول يومين.',
      sub: 'Growva يساعد المؤسس الفردي يحوّل التجارب إلى قرارات واضحة: وش تختبر، وش توقف، وش تكمل، وش تكبر — بناءً على إشارات حقيقية، مو إحساس.',
      cta_visitor: 'ابدأ أول تجربة',
      cta_user: 'افتح لوحة التحكم',
      cta_secondary: 'كيف يعمل؟ ↓',
    },
    card: {
      verdict: 'أوقفها',
      experiment: '"مخطط وجبات بالذكاء — قائمة انتظار مدفوعة"',
      stats: '312 زيارة · تسجيل واحد',
      threshold_label: 'الحد الأدنى',
      threshold: 'تحقق — 300 زيارة ✓',
      reason_label: 'السبب',
      reason: 'traffic كافٍ لكن النية شبه معدومة. 0.3% مقابل ~3% مجدية.',
      next_label: 'الخطوة التالية',
      next: 'أوقفها الآن. وفّرت للتو ~3 أسابيع بناء.',
      accent: '#EF4444',
    },
    demo: {
      section_label: 'سيناريو مؤسس — مثال',
      title: 'شوف كيف يقرّر Growva.',
      subtitle: 'مُرّ على تجربة نمو حقيقية لمؤسس فردي في أقل من 60 ثانية.',
      steps: ['اختر السيناريو', 'اقرأ الإشارات', 'خذ القرار', 'نفّذ الخطوة التالية'],
      experiment_label: 'التجربة',
      views_label: 'الزيارات',
      signups_label: 'التسجيلات',
      threshold_views: 300,
      threshold_signups: 10,
      why_label: 'السبب',
      action_label: 'الخطوة التالية',
      next_label: 'التجربة التالية',
      cta_primary: 'ابدأ أول قرار',
      cta_secondary: 'كيف يعمل',
      scenarios: [
        {
          tone: 'continue',
          tab: 'ما فيه زيارات بعد',
          scenario: 'أطلقت صفحة هبوط لكن محد يوصلها.',
          experiment: 'صفحة هبوط — قائمة انتظار مدفوعة',
          views: 0,
          signups: 0,
          signal_summary: '0 زيارة · كليك واحد · 0 تسجيل',
          verdict: 'استمر',
          diagnosis: 'توزيع ضعيف',
          why: 'ما وصل traffic كافٍ للحكم على العرض.',
          action: 'شغّل sprint توزيع واحد مركّز.',
          next: 'اختبر قناة واحدة، جمهور واحد، رسالة واحدة، لمدة 48 ساعة.',
        },
        {
          tone: 'stop',
          tab: 'زيارات بدون تسجيلات',
          scenario: 'صفحتك تجيها زيارات، لكن تقريبًا محد يسجّل.',
          experiment: 'صفحة هبوط — تجربة مجانية',
          views: 400,
          signups: 2,
          signal_summary: '400 زيارة · تسجيلان · 0 شراء',
          verdict: 'أوقف',
          diagnosis: 'تحويل ضعيف',
          why: 'نسبة التسجيل أقل بكثير من الحد المطلوب.',
          action: 'لا ترسل traffic أكثر الآن. أعد صياغة العرض حول ألم العميل.',
          next: 'اختبر عنوانًا و CTA مبنيين على الألم.',
        },
        {
          tone: 'amber',
          tab: 'واعد لكن مبكر',
          scenario: 'الزوار الأوائل يتحولون، لكن العينة لسه صغيرة.',
          experiment: 'صفحة هبوط — وصول مبكر',
          views: 55,
          signups: 8,
          signal_summary: '55 زيارة · 8 تسجيلات · 0 شراء',
          verdict: 'استمر',
          diagnosis: 'واعد لكن العينة صغيرة',
          why: 'الإشارة قوية، لكن العينة أصغر من أن تُكبَّر بثقة.',
          action: 'كبّر العينة قبل تغيير العرض.',
          next: 'كرّر نفس الاختبار حتى 300 زيارة أو 10+ تسجيلات.',
        },
      ],
    },
    simple: {
      section_label: 'قروفا، ببساطة',
      title: 'تخيّل عندك فكرة كبيرة 💡',
      steps: [
        { art: 'idea',   title: 'تجيك فكرة تحمّسك', body: 'تطبيق جديد، فيتشر جديد، عرض جديد. وتتخيّل الناس كلها بتحبه.' },
        { art: 'trap',   title: 'فتبدأ تبني… وتبني…', body: 'الأسابيع تروح. تضيف فيتشر ورا فيتشر، ليلة ورا ليلة — وأنت متأكد إن هذا الي الناس تبيه.' },
        { art: 'reveal', title: 'وبعدها… سكوت تام 🦗', body: 'تطلق المنتج. تقريباً محد يسجّل. تكون صرفت ~3 أسابيع من عمرك تبني شي محد طلبه.' },
        { art: 'growva', title: 'قروفا يقلب الترتيب', body: 'اختبر الفكرة الأول — في 48 ساعة، بناس حقيقيين وإشارات حقيقية. وبعدها قروفا يقولك بصراحة: ابنِها، غيّرها، أو أوقفها. قبل لا تحرق أسبوع واحد.' },
      ],
      punch: 'مو بس توفّر فلوس — توفّر أسابيع من عمرك، وتبطّل تبني فيتشرات محد يبيها.',
    },
    paths: {
      section_label: 'طريقتان للدخول إلى Growva',
      title: 'هل عندك زيارات؟',
      yes_title: 'نعم، عندي زيارات',
      yes_body: 'استخدم رابط التتبع أو كود الموقع. Growva يجمع الكليكات والتسجيلات والمشتريات لحظة بلحظة — ويحوّلها لقرار.',
      no_title: 'ما عندي زيارات بعد',
      no_body: 'Growva يعطيك Sprint لـ 48 ساعة — سكريبت جاهز، رابط تتبع، والنتيجة تتحول لقرار واضح.',
    },
    tracking: {
      section_label: 'جمع الإشارة',
      title: 'طريقتان لجمع الإشارة',
      link_title: 'رابط التتبع',
      link_body: 'للبوستات، DMs، X، Reddit، الإيميل. Growva يقيس كل كليك ومصدره.',
      snippet_title: 'كود الموقع',
      snippet_body: 'لصفحة الهبوط. يقيس الزيارات، التسجيلات، والمشتريات تلقائياً.',
    },
    how: {
      section_label: 'كيف يعمل',
      title: 'ثلاث خطوات من السؤال إلى القرار',
      steps: [
        { n: '01', title: 'أضف منتجك وفرضيتك', body: 'حدد ما تختبره ومن هو جمهورك. Growva يبني التجربة حول هدف واضح.' },
        { n: '02', title: 'شغّل التجربة', body: 'ما عندك traffic؟ شغّل Sprint لـ 48 ساعة. عندك traffic؟ تتبّعه برابط أو كود. Growva يجمع الإشارة بكل الحالات.' },
        { n: '03', title: 'احصل على القرار', body: 'كبّر، استمر، أو أوقف — مع السبب، بناءً على أرقام حقيقية. مو توصية مبهمة.' },
      ],
    },
    pricing: {
      section_label: 'الأسعار',
      title: 'أداة واحدة. قرار واحد في كل مرة.',
      beta: {
        label: 'البيتا الخاصة',
        price: 'مجاني أثناء البيتا',
        note: 'وصول محدود · غير متاح للعموم',
        features: [
          'منتج واحد',
          'محرك القرار الأساسي',
          'رابط التتبع',
          'وضع Sprint لـ 48 ساعة',
          'وصول تجريبي',
        ],
        cta: 'انضم للبيتا الخاصة',
        disclaimer: 'البيتا محدودة ومضبوطة. قد نوقف التسجيل في أي وقت.',
      },
      founding: {
        badge: 'العرض الأساسي',
        label: 'وصول المؤسسين',
        price: '$199',
        period: 'دفعة واحدة · مدى الحياة',
        note: 'أول 1,000 مؤسس فقط. السعر يرتفع بعدها.',
        features: [
          'منتج واحد',
          'محرك القرار الأساسي',
          'وضع Sprint',
          'كود الموقع',
          'روابط التتبع',
          'سجل القرارات',
          'جميع التحديثات الأساسية',
        ],
        cta: 'احصل على وصول المؤسسين — $199',
      },
      growth: {
        label: 'النمو',
        price: '$99',
        period: '/شهر',
        for: 'للمؤسسين في مراحل متقدمة',
        features: [
          'منتجات متعددة',
          'أتمتة متقدمة',
          'أنظمة الذاكرة',
          'أدوات المشغّل',
          'طاقة تتبع أعلى',
        ],
        cta: 'متاح بعد جولة المؤسسين',
        note: 'يُتاح بعد إغلاق جولة المؤسسين.',
      },
    },
    final: {
      headline: 'توقف عن التخمين. ابدأ القرار.',
      sub: 'وصول المؤسسين · $199 · 1,000 مقعد فقط.',
      cta_visitor: 'ابدأ أول تجربة →',
      cta_user: 'افتح لوحة التحكم →',
    },
    footer: {
      tagline: 'بنية تحتية للقرار — للمؤسسين المستقلين.',
      legal: 'جميع المدفوعات مؤمّنة عبر Stripe',
      email: 'hello@growva.co',
    },
  },
}

// ─── Decision Card ────────────────────────────────────────────────────────────
function DecisionCard({ c: copy, isAr }: { c: typeof COPY['en']['card']; isAr: boolean }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '28px 28px',
      width: '100%',
      maxWidth: 340,
      fontFamily: 'inherit',
    }}>
      {/* Verdict badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: (copy as any).accent || C.continue, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: (copy as any).accent || C.continue, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {copy.verdict}
        </span>
      </div>

      {/* Experiment name */}
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4, fontStyle: 'italic' }}>
        {copy.experiment}
      </div>

      {/* Stats */}
      <div style={{ fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>
        {copy.stats}
      </div>

      <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

      {/* Threshold */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          {copy.threshold_label}
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
          {copy.threshold}
        </div>
      </div>

      {/* Reason */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          {copy.reason_label}
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
          {copy.reason}
        </div>
      </div>

      {/* Next action */}
      <div style={{ background: C.surfaceRaised, borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          {copy.next_label}
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, fontWeight: 500 }}>
          {copy.next}
        </div>
      </div>
    </div>
  )
}

// ─── Simple-section illustrations (on-brand, flat line art) ─────────────────────
function SimpleArt({ kind }: { kind: string }) {
  const svg = { width: '100%', height: 84, fill: 'none' as const }
  if (kind === 'idea') {
    return (
      <svg {...svg} viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="40" r="26" fill={C.continue} opacity="0.12" />
        <circle cx="60" cy="40" r="16" stroke={C.text} strokeWidth="2.5" />
        <rect x="53" y="54" width="14" height="11" rx="2" stroke={C.text} strokeWidth="2.5" />
        <line x1="56" y1="60" x2="64" y2="60" stroke={C.text} strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="8" x2="60" y2="15" stroke={C.continue} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="35" y1="18" x2="40" y2="23" stroke={C.continue} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="85" y1="18" x2="80" y2="23" stroke={C.continue} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'trap') {
    return (
      <svg {...svg} viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="58" width="24" height="20" rx="3" stroke={C.textSecondary} strokeWidth="2.5" />
        <rect x="32" y="38" width="24" height="20" rx="3" stroke={C.textSecondary} strokeWidth="2.5" />
        <rect x="28" y="18" width="24" height="20" rx="3" stroke={C.textSecondary} strokeWidth="2.5" />
        <circle cx="84" cy="58" r="17" stroke={C.kill} strokeWidth="2.5" />
        <line x1="84" y1="58" x2="84" y2="47" stroke={C.kill} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="84" y1="58" x2="92" y2="63" stroke={C.kill} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'reveal') {
    return (
      <svg {...svg} viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg">
        <line x1="22" y1="16" x2="22" y2="74" stroke={C.textDim} strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="74" x2="100" y2="74" stroke={C.textDim} strokeWidth="2" strokeLinecap="round" />
        <path d="M26 67 L96 65" stroke={C.kill} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 7" />
        <circle cx="96" cy="65" r="3.5" fill={C.kill} />
      </svg>
    )
  }
  return (
    <svg {...svg} viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg">
      <rect x="36" y="14" width="48" height="68" rx="8" fill={C.surfaceRaised} stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
      <circle cx="50" cy="34" r="4.5" fill={C.kill} />
      <circle cx="50" cy="48" r="4.5" fill={C.continue} opacity="0.45" />
      <circle cx="50" cy="62" r="4.5" fill={C.scale} />
      <line x1="60" y1="34" x2="74" y2="34" stroke={C.textSecondary} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="48" x2="74" y2="48" stroke={C.textDim} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="62" x2="74" y2="62" stroke={C.textSecondary} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Label ────────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  )
}

// ─── Interactive demo — mini Decision Room ──────────────────────────────────────
const DEMO_TONE: Record<string, string> = {
  continue: C.continue,
  stop: C.kill,
  scale: C.scale,
  amber: '#F59E0B',
}

function DemoSection({ c, ctaHref }: { c: typeof COPY['en']['demo']; ctaHref: string }) {
  const [idx, setIdx] = useState(0)
  const s = c.scenarios[idx]
  const accent = DEMO_TONE[s.tone] || C.continue
  const viewsPct = Math.min(100, (s.views / c.threshold_views) * 100)
  const signupsPct = Math.min(100, (s.signups / c.threshold_signups) * 100)

  const labelStyle = {
    fontSize: 10, fontWeight: 700, color: C.textDim,
    letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 4,
  }

  return (
    <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <SectionLabel>{c.section_label}</SectionLabel>
        <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 10px', color: C.text }}>
          {c.title}
        </h2>
        <p style={{ fontSize: 16, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 560 }}>
          {c.subtitle}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
          {c.steps.map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: C.surfaceRaised, border: `1px solid ${C.border}`,
                color: C.textMuted, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Selector + decision panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>

          {/* Scenario selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {c.scenarios.map((sc, i) => {
              const selected = i === idx
              const scAccent = DEMO_TONE[sc.tone] || C.continue
              return (
                <button
                  key={sc.tab}
                  onClick={() => setIdx(i)}
                  style={{
                    width: '100%', textAlign: 'start', cursor: 'pointer', fontFamily: 'inherit',
                    background: selected ? C.surfaceRaised : C.surface,
                    border: `1px solid ${selected ? scAccent : C.border}`,
                    borderRadius: 12, padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: scAccent, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{sc.tab}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.5 }}>{sc.scenario}</div>
                </button>
              )
            })}
          </div>

          {/* Decision panel */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px 24px' }}>
            <div style={labelStyle}>{c.experiment_label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 20, letterSpacing: -0.3 }}>
              {s.experiment}
            </div>

            {/* Signals + progress bars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: C.textMuted }}>{c.views_label}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{s.views} <span style={{ color: C.textDim }}>/ {c.threshold_views}</span></span>
            </div>
            <div style={{ height: 6, background: C.surfaceRaised, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${viewsPct}%`, background: C.continue, borderRadius: 99, transition: 'width .3s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: C.textMuted }}>{c.signups_label}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{s.signups} <span style={{ color: C.textDim }}>/ {c.threshold_signups}</span></span>
            </div>
            <div style={{ height: 6, background: C.surfaceRaised, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${signupsPct}%`, background: C.scale, borderRadius: 99, transition: 'width .3s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18 }}>{s.signal_summary}</div>

            <div style={{ height: 1, background: C.border, marginBottom: 18 }} />

            {/* Verdict + diagnosis */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: accent, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: accent, letterSpacing: 1, textTransform: 'uppercase' }}>{s.verdict}</span>
              <span style={{ fontSize: 12, color: C.textDim }}>·</span>
              <span style={{ fontSize: 12.5, color: C.textSecondary }}>{s.diagnosis}</span>
            </div>

            {/* Why */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{c.why_label}</div>
              <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6 }}>{s.why}</div>
            </div>

            {/* Next action */}
            <div style={{ background: C.surfaceRaised, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              <div style={labelStyle}>{c.action_label}</div>
              <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6, fontWeight: 500 }}>{s.action}</div>
            </div>

            {/* Next experiment */}
            <div style={{ background: C.surfaceRaised, borderRadius: 10, padding: '12px 14px' }}>
              <div style={labelStyle}>{c.next_label}</div>
              <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6 }}>{s.next}</div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
          <Link
            href={ctaHref}
            style={{
              flex: '1 1 200px', textAlign: 'center', padding: '13px 28px',
              background: C.text, color: C.bg, fontSize: 14, fontWeight: 600,
              textDecoration: 'none', borderRadius: 10,
            }}
          >
            {c.cta_primary}
          </Link>
          <a
            href="#how"
            style={{
              flex: '1 1 200px', textAlign: 'center', padding: '13px 24px',
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.textSecondary, fontSize: 14, textDecoration: 'none', borderRadius: 10,
            }}
          >
            {c.cta_secondary}
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const [auth, setAuth] = useState<AuthState>('loading')
  const isAr = lang === 'ar'
  const c = COPY[lang]
  const isLoggedIn = auth === 'user'

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(user => setAuth(user ? 'user' : 'visitor'))
      .catch(() => setAuth('visitor'))
  }, [])

  const heroCta = isLoggedIn ? c.hero.cta_user : c.hero.cta_visitor
  const heroCtaHref = isLoggedIn ? '/dashboard' : '/login'
  const navCta = isLoggedIn ? c.nav.cta_user : c.nav.cta_visitor

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        background: C.bg,
        fontFamily: isAr
          ? "'Tajawal', 'Segoe UI', 'Arial', sans-serif"
          : "'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif",
        color: C.text,
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '0 28px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3, color: C.text }}>
          Growva
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Language toggle */}
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            style={{
              padding: '5px 12px', background: 'transparent', border: `1px solid ${C.border}`,
              color: C.textMuted, fontSize: 12, fontWeight: 500, borderRadius: 7, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isAr ? 'EN' : 'ع'}
          </button>
          <a href="#pricing" style={{ padding: '6px 14px', color: C.textMuted, fontSize: 13, textDecoration: 'none' }}>
            {c.nav.pricing}
          </a>
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            style={{
              padding: '7px 16px', background: C.text, color: C.bg,
              fontSize: 13, fontWeight: 600, textDecoration: 'none', borderRadius: 8,
            }}
          >
            {navCta}
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 120, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '48px 64px',
            alignItems: 'center',
          }}>
            {/* Copy */}
            <div>
              <h1 style={{
                fontSize: 'clamp(32px, 5vw, 52px)',
                fontWeight: 700,
                letterSpacing: -1.5,
                lineHeight: 1.1,
                margin: '0 0 24px',
                color: C.text,
              }}>
                {c.hero.headline_1}<br />
                <span style={{ color: C.textSecondary }}>{c.hero.headline_2}</span>
              </h1>
              <p style={{
                fontSize: 17,
                color: C.textSecondary,
                lineHeight: 1.7,
                margin: '0 0 36px',
                maxWidth: 480,
                fontWeight: 400,
              }}>
                {c.hero.sub}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href={heroCtaHref}
                  style={{
                    padding: '13px 28px', background: C.text, color: C.bg,
                    fontSize: 14, fontWeight: 600, textDecoration: 'none', borderRadius: 10,
                    display: 'inline-block',
                  }}
                >
                  {heroCta}
                </Link>
                <a
                  href="#how"
                  style={{
                    padding: '13px 24px',
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: C.textSecondary,
                    fontSize: 14, textDecoration: 'none', borderRadius: 10,
                    display: 'inline-block',
                  }}
                >
                  {c.hero.cta_secondary}
                </a>
              </div>
            </div>

            {/* Decision Card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <DecisionCard c={c.card} isAr={isAr} />
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE DEMO ── */}
      <DemoSection c={c.demo} ctaHref={heroCtaHref} />

      {/* ── EXPLAINED SIMPLY ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <SectionLabel>{c.simple.section_label}</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 40px', color: C.text }}>
            {c.simple.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
            {c.simple.steps.map((step) => {
              const isGrowva = step.art === 'growva'
              return (
                <div key={step.title} style={{
                  background: isGrowva ? 'rgba(34,197,94,0.06)' : C.surface,
                  border: `1px solid ${isGrowva ? 'rgba(34,197,94,0.35)' : C.border}`,
                  borderRadius: 14, padding: '22px 22px',
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <SimpleArt kind={step.art} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, letterSpacing: -0.2, lineHeight: 1.35 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                    {step.body}
                  </div>
                </div>
              )
            })}
          </div>
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: 600, color: C.text,
            textAlign: 'center', margin: '40px auto 0', maxWidth: 640, lineHeight: 1.6, letterSpacing: -0.3,
          }}>
            {c.simple.punch}
          </p>
        </div>
      </section>

      {/* ── TWO PATHS ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionLabel>{c.paths.section_label}</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 40px', color: C.text }}>
            {c.paths.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { title: c.paths.yes_title, body: c.paths.yes_body, icon: '📡' },
              { title: c.paths.no_title,  body: c.paths.no_body,  icon: '⚡' },
            ].map(({ title, body, icon }) => (
              <div key={title} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '28px 28px',
              }}>
                <div style={{ fontSize: 24, marginBottom: 14 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, letterSpacing: -0.2 }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  {body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKING ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionLabel>{c.tracking.section_label}</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 40px', color: C.text }}>
            {c.tracking.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              {
                title: c.tracking.link_title,
                body: c.tracking.link_body,
                tag: isAr ? 'رابط' : 'Link',
                tagColor: '#6366F1',
              },
              {
                title: c.tracking.snippet_title,
                body: c.tracking.snippet_body,
                tag: isAr ? 'كود' : 'Snippet',
                tagColor: '#0EA5E9',
              },
            ].map(({ title, body, tag, tagColor }) => (
              <div key={title} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '28px 28px',
              }}>
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                  background: `${tagColor}18`, border: `1px solid ${tagColor}30`,
                  color: tagColor, fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
                  marginBottom: 14,
                }}>
                  {tag}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, letterSpacing: -0.2 }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  {body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionLabel>{c.how.section_label}</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 40px', color: C.text }}>
            {c.how.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {c.how.steps.map(({ n, title, body }) => (
              <div key={n} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '28px 28px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, marginBottom: 18 }}>{n}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, letterSpacing: -0.2, lineHeight: 1.35 }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  {body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <SectionLabel>{c.pricing.section_label}</SectionLabel>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: 0, color: C.text }}>
              {c.pricing.title}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>

            {/* ── Beta ── */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: '32px 28px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                {c.pricing.beta.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 4, letterSpacing: -0.5 }}>
                {c.pricing.beta.price}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
                {c.pricing.beta.note}
              </div>
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.pricing.beta.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.textMuted, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                style={{
                  display: 'block', padding: '12px 0', textAlign: 'center',
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', borderRadius: 9,
                }}
              >
                {c.pricing.beta.cta}
              </Link>
              <p style={{ fontSize: 11, color: C.textDim, margin: '14px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
                {c.pricing.beta.disclaimer}
              </p>
            </div>

            {/* ── Founding (main offer) ── */}
            <div style={{
              background: C.surface,
              border: `1px solid ${C.foundingBorder}`,
              borderRadius: 16, padding: '32px 28px',
              position: 'relative',
            }}>
              {/* Badge */}
              <div style={{
                position: 'absolute', top: -13,
                left: isAr ? undefined : '50%',
                right: isAr ? '50%' : undefined,
                transform: 'translateX(-50%)',
                background: C.text, color: C.bg,
                fontSize: 11, fontWeight: 700, padding: '4px 16px',
                borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: 0.5,
              }}>
                {c.pricing.founding.badge}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                {c.pricing.founding.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: C.text, letterSpacing: -1.5, lineHeight: 1 }}>
                  {c.pricing.founding.price}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
                {c.pricing.founding.period}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
                {c.pricing.founding.note}
              </div>
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.pricing.founding.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.text, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                style={{
                  display: 'block', padding: '13px 0', textAlign: 'center',
                  background: C.text, color: C.bg,
                  fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', borderRadius: 9,
                }}
              >
                {c.pricing.founding.cta}
              </Link>
            </div>

            {/* ── Growth ── */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: '32px 28px',
              opacity: 0.75,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                {c.pricing.growth.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: C.text, letterSpacing: -1.5, lineHeight: 1 }}>
                  {c.pricing.growth.price}
                </span>
                <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 400 }}>
                  {c.pricing.growth.period}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
                {c.pricing.growth.for}
              </div>
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.pricing.growth.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.textMuted, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <div style={{
                display: 'block', padding: '12px 0', textAlign: 'center',
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textMuted, fontSize: 13, borderRadius: 9,
              }}>
                {c.pricing.growth.cta}
              </div>
              <p style={{ fontSize: 11, color: C.textDim, margin: '14px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
                {c.pricing.growth.note}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 42px)', fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.1, margin: '0 0 16px', color: C.text }}>
            {c.final.headline}
          </h2>
          <p style={{ fontSize: 15, color: C.textMuted, margin: '0 0 36px', lineHeight: 1.6 }}>
            {c.final.sub}
          </p>
          <Link
            href={heroCtaHref}
            style={{
              display: 'inline-block', padding: '14px 36px',
              background: C.text, color: C.bg,
              fontSize: 15, fontWeight: 700,
              textDecoration: 'none', borderRadius: 11,
            }}
          >
            {isLoggedIn ? c.final.cta_user : c.final.cta_visitor}
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '28px 28px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>Growva</div>
        <p style={{ fontSize: 12, color: C.textDim, margin: '0 0 4px' }}>{c.footer.tagline}</p>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
          {c.footer.legal} ·{' '}
          <a href={`mailto:${c.footer.email}`} style={{ color: C.textDim, textDecoration: 'none' }}>
            {c.footer.email}
          </a>
        </p>
      </footer>
    </div>
  )
}

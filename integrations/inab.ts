/**
 * Revenue Engine — Inab Integration
 * ضع هذا الملف في: src/lib/revenue-engine.ts
 *
 * بعدها استدعيه في أي مكان في عنب:
 *   import { trackEvent } from '@/lib/revenue-engine'
 *   await trackEvent('SIGNUP', experimentId)
 */

const REVENUE_ENGINE_URL = process.env.REVENUE_ENGINE_URL || 'https://your-engine.railway.app'
const REVENUE_ENGINE_KEY = process.env.REVENUE_ENGINE_KEY || ''

type EventType = 'PAGE_VIEW' | 'CLICK' | 'SIGNUP' | 'PURCHASE' | 'CHURN'

export async function trackEvent(
  type: EventType,
  experimentId?: string,
  value: number = 1
) {
  if (!REVENUE_ENGINE_KEY) return // silent if not configured

  try {
    await fetch(`${REVENUE_ENGINE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': REVENUE_ENGINE_KEY,
      },
      body: JSON.stringify({ type, experimentId, value }),
    })
  } catch {
    // fire and forget — never block main flow
  }
}

/**
 * أمثلة الاستخدام في عنب:
 *
 * // عند فتح صفحة الـ landing
 * await trackEvent('PAGE_VIEW', req.headers.get('x-experiment-id'))
 *
 * // عند تسجيل مستخدم جديد
 * await trackEvent('SIGNUP')
 *
 * // عند إغلاق صفقة (قيمة الصفقة)
 * await trackEvent('PURCHASE', undefined, deal.amount)
 *
 * // عند إلغاء اشتراك
 * await trackEvent('CHURN')
 */

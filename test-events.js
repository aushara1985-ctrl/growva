#!/usr/bin/env node
/**
 * Revenue Engine — Test Script
 * يرسل events حقيقية لأي منتج عندك
 *
 * استخدام:
 *   node test-events.js <API_KEY> <BASE_URL>
 *
 * مثال:
 *   node test-events.js rk_inab_a1b2c3d4 https://your-app.railway.app
 *   node test-events.js rk_inab_a1b2c3d4 http://localhost:3000
 */

const API_KEY = process.argv[2]
const BASE_URL = process.argv[3] || 'http://localhost:3000'

if (!API_KEY) {
  console.error('Usage: node test-events.js <API_KEY> [BASE_URL]')
  process.exit(1)
}

async function sendEvent(type, experimentId, value = 1) {
  const res = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ type, experimentId, value }),
  })
  const data = await res.json()
  if (res.ok) {
    console.log(`✓ ${type}${experimentId ? ` [exp: ${experimentId.slice(0,8)}...]` : ''} ${value !== 1 ? `$${value}` : ''}`)
  } else {
    console.error(`✗ ${type} failed:`, data.error)
  }
}

async function getProduct() {
  // First get experiments for this product via dashboard
  const res = await fetch(`${BASE_URL}/api/dashboard`)
  const data = await res.json()
  const product = data.productList?.find(p => p.apiKey === API_KEY)
  return product
}

async function runSimulation() {
  console.log(`\n🚀 Revenue Engine — Test Events`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`API Key: ${API_KEY}\n`)

  // Get active experiments
  const res = await fetch(`${BASE_URL}/api/dashboard`)
  if (!res.ok) { console.error('Cannot reach server. Is it running?'); process.exit(1) }

  const dashboard = await res.json()
  const product = dashboard.productList?.find(p => p.apiKey === API_KEY)

  if (!product) {
    console.error('Product not found with this API key')
    console.log('Available products:')
    dashboard.productList?.forEach(p => console.log(`  ${p.name}: ${p.apiKey}`))
    process.exit(1)
  }

  console.log(`Product: ${product.name}`)
  const activeExps = product.experiments?.filter(e => e.status === 'ACTIVE') || []
  console.log(`Active experiments: ${activeExps.length}\n`)

  if (activeExps.length === 0) {
    console.log('No active experiments. Start growth mode first from the dashboard.')
    process.exit(0)
  }

  // Simulate realistic traffic for 30 seconds
  console.log('Simulating 60 events over 10 seconds...\n')

  for (let i = 0; i < 60; i++) {
    const exp = activeExps[Math.floor(Math.random() * activeExps.length)]
    const roll = Math.random()

    if (roll < 0.55) {
      await sendEvent('PAGE_VIEW', exp.id)
    } else if (roll < 0.75) {
      await sendEvent('CLICK', exp.id)
    } else if (roll < 0.92) {
      await sendEvent('SIGNUP', exp.id)
    } else {
      await sendEvent('PURCHASE', exp.id, Math.round(Math.random() * 80 + 20))
    }

    await new Promise(r => setTimeout(r, 160))
  }

  console.log('\n✅ Done. Check dashboard for updated metrics.')
  console.log(`\nDashboard: ${BASE_URL}/dashboard`)
}

runSimulation().catch(console.error)

import { NextRequest } from 'next/server'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://growva-production.up.railway.app'

// GET /api/g.js  — Growva tracking snippet
// Founder adds:
//   <script src=".../api/g.js" data-key="API_KEY" data-experiment="EXP_ID"></script>
// Then optionally:
//   growva.track('SIGNUP')
//   growva.track('PURCHASE', { amount: 29, currency: 'USD' })
//   growva.track('CUSTOM', { name: 'demo_booked' })

export async function GET(_req: NextRequest) {
  const snippet = `(function(){
  var s=document.currentScript;
  var KEY=s&&s.getAttribute('data-key');
  var EID=s&&s.getAttribute('data-experiment');
  var BASE='${BASE}';
  if(!KEY){console.warn('[Growva] data-key missing on script tag');return;}

  /* Anonymous visitor ID — persists in localStorage */
  var VID;
  try{
    VID=localStorage.getItem('_gv');
    if(!VID){VID=(Date.now().toString(36)+Math.random().toString(36).slice(2));localStorage.setItem('_gv',VID);}
  }catch(e){VID=Math.random().toString(36).slice(2);}

  var Q=new URLSearchParams(window.location.search);

  function track(type,extra){
    var body={
      type:type,
      visitorId:VID,
      value:(extra&&extra.amount)?Number(extra.amount):1,
      metadata:Object.assign({
        url:window.location.href,
        referrer:document.referrer||null,
        utm_source:Q.get('utm_source'),
        utm_medium:Q.get('utm_medium'),
        utm_campaign:Q.get('utm_campaign'),
        utm_content:Q.get('utm_content')
      },extra||{})
    };
    if(EID)body.experimentId=EID;
    fetch(BASE+'/api/events',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':KEY},
      body:JSON.stringify(body),
      keepalive:true
    }).catch(function(){});
  }

  /* Auto page view */
  track('PAGE_VIEW');

  /* Global API */
  window.growva={track:track};
})();`

  return new Response(snippet, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

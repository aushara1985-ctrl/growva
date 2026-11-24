import type { Metadata } from 'next'
import './globals.css'

const SITE = 'https://www.growva.live'
const DESCRIPTION =
  'Stop wasting weeks on experiments that should have died in days. Growva turns your growth experiments into clear decisions — what to test, stop, continue, and scale — using real signals, not gut feeling.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Growva — Decision infrastructure for solo founders',
    template: '%s · Growva',
  },
  description: DESCRIPTION,
  applicationName: 'Growva',
  keywords: [
    'growth experiments',
    'startup validation',
    'solo founder',
    'indie hacker',
    'product validation',
    'experiment decision',
    'when to kill an experiment',
  ],
  authors: [{ name: 'Growva' }],
  alternates: { canonical: SITE },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Growva',
    title: 'Growva — Decision infrastructure for solo founders',
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Growva — Decision infrastructure for solo founders',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'Growva',
      url: SITE,
      logo: `${SITE}/icon`,
      email: 'hello@growva.co',
      description: 'Decision infrastructure for solo founders.',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Growva',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE,
      description: DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free during private beta',
      },
      publisher: { '@id': `${SITE}/#organization` },
    },
  ],
}

// PostHog product analytics (EU cloud). Public project key, safe for front-end code.
const POSTHOG_SNIPPET = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('phc_pkKbUEZAdwEa5BMM2rmq7qn374XuyJgoyhZYDsXELzYt',{api_host:'https://eu.i.posthog.com',person_profiles:'identified_only',capture_pageview:true,autocapture:true,session_recording:{maskAllInputs:true}});posthog.register({product:'Growva'});(function(){try{var K='growva_attr',q=new URLSearchParams(location.search),v=null;try{v=JSON.parse(localStorage.getItem(K)||'null')}catch(e){}if(!v||!v.t||Date.now()-v.t>2592e6){var a={};['utm_source','utm_medium','utm_campaign','ref'].forEach(function(k){if(q.get(k))a[k]=String(q.get(k)).slice(0,80)});try{var h=document.referrer?new URL(document.referrer).hostname:'';if(h&&h!==location.hostname)a.referrer=h}catch(e){}if(Object.keys(a).length){v={t:Date.now(),a:a};try{localStorage.setItem(K,JSON.stringify(v))}catch(e){}try{document.cookie='gv_attr='+encodeURIComponent(JSON.stringify(a))+';path=/;max-age=2592000;SameSite=Lax'}catch(e){}}else v=null}if(v&&v.a){var f=v.a;posthog.register({src:f.utm_source||f.ref||f.referrer||'direct',first_utm_source:f.utm_source||'',first_utm_medium:f.utm_medium||'',first_utm_campaign:f.utm_campaign||'',first_ref:f.ref||'',first_referrer:f.referrer||''})}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: POSTHOG_SNIPPET }} />
      </head>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#080808' }}>
        {children}
      </body>
    </html>
  )
}

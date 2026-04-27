'use client'
import { useEffect, useState } from 'react'

const FIRE = '#FF4500'
const AMBER = '#FF9200'
const GREEN = '#1DEB7A'
const BLUE = '#4F7CFF'
const RED = '#FF3B30'
const DIM = '#3A3A48'
const MUTED = '#7A7A8A'

const s = {
  page: { minHeight:'100vh', background:'#09090B', fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif", color:'#F2F0E8', fontSize:14 },
  nav: { background:'#0F0F12', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 28px', height:52, display:'flex' as const, alignItems:'center' as const, justifyContent:'space-between' as const },
  wrap: { maxWidth:1280, margin:'0 auto', padding:'28px' },
  tabBar: { display:'flex' as const, gap:4, marginBottom:28, background:'#0F0F12', padding:4, borderRadius:10, width:'fit-content' as const, flexWrap:'wrap' as const },
  tab: (a:boolean) => ({ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:600 as const, cursor:'pointer' as const, border:'none', background: a?'#1A1A22':'transparent', color: a?'#F2F0E8':MUTED, transition:'all 0.15s' }),
  g4: { display:'grid' as const, gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  g2: { display:'grid' as const, gridTemplateColumns:'1fr 1fr', gap:14 },
  g3: { display:'grid' as const, gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 },
  card: { background:'#0F0F12', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden' as const },
  cardBody: { padding:20 },
  cardHead: { padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex' as const, alignItems:'center' as const, justifyContent:'space-between' as const },
  ct: { fontSize:13, fontWeight:700 as const },
  sv: { fontSize:30, fontWeight:800 as const, letterSpacing:-1.5, lineHeight:1 },
  sl: { fontSize:10, color:DIM, fontWeight:700 as const, textTransform:'uppercase' as const, letterSpacing:0.8, marginBottom:8 },
  row: { display:'flex' as const, alignItems:'flex-start' as const, gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  chip: (c:string) => ({ fontSize:10, padding:'3px 10px', borderRadius:100, background:c+'18', color:c, border:`1px solid ${c}30`, fontWeight:700 as const, whiteSpace:'nowrap' as const }),
  btnFire: { padding:'8px 18px', background:`linear-gradient(90deg,${FIRE},${AMBER})`, color:'#000', border:'none', borderRadius:8, fontSize:12, fontWeight:700 as const, cursor:'pointer' as const },
  btnOut: { padding:'7px 14px', background:'transparent', color:MUTED, border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, fontSize:12, cursor:'pointer' as const },
  btnRed: { padding:'7px 14px', background:'rgba(255,59,48,0.1)', color:RED, border:`1px solid rgba(255,59,48,0.2)`, borderRadius:8, fontSize:12, cursor:'pointer' as const },
  badge: (c:string) => ({ fontSize:10, padding:'2px 8px', borderRadius:100, background:c+'18', color:c, fontWeight:700 as const }),
}

export default function AdminPage() {
  const [data, setData] = useState<any>(null)
  const [decisions, setDecisions] = useState<any[]>([])
  const [buildQueue, setBuildQueue] = useState<any[]>([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string|null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin').then(r=>r.json()),
      fetch('/api/decisions-v2?limit=20').then(r=>r.json()).catch(()=>[]),
      fetch('/api/build-queue').then(r=>r.json()).catch(()=>[]),
    ]).then(([d, dec, bq]) => {
      setData(d); setDecisions(Array.isArray(dec)?dec:[]); setBuildQueue(Array.isArray(bq)?bq:[])
      setLoading(false)
    })
  }, [])

  const founderAction = async (decisionId: string, action: string) => {
    setActing(decisionId)
    await fetch('/api/decisions-v2', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'founder_action', featureDecisionId: decisionId, founderAction: action })
    })
    setDecisions(prev => prev.map(d => d.id===decisionId ? {...d, founderAction: action} : d))
    setActing(null)
  }

  const approveExec = async (id: string) => {
    await fetch('/api/execution/approve', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({approvalId:id}) })
    location.reload()
  }
  const rejectExec = async (id: string) => {
    await fetch('/api/execution/reject', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({approvalId:id}) })
    location.reload()
  }

  if (loading) return <div style={{...s.page, display:'flex', alignItems:'center', justifyContent:'center', color:MUTED}}>Loading Growva Oracle...</div>
  if (!data) return null

  const { overview, executionQueue, featureDemand, competitorGaps, billingOpportunities, monopolyStatus, recentDecisions } = data

  const decisionColor = (d: string) => d==='BUILD_NOW'?GREEN:d==='WAIT'?AMBER:RED
  const statusColor = (s: string) => ({queued:MUTED,sent_to_github:BLUE,in_progress:AMBER,pr_opened:GREEN,failed:RED,merged:GREEN}[s]||MUTED)

  const tabs = ['overview','decisions','build-queue','execution','features','competitors','billing','monopoly']

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={s.nav}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${FIRE},${AMBER})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#000'}}>G</div>
          <span style={{fontWeight:800,letterSpacing:-0.3}}>Growva Oracle</span>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          {overview?.pendingApprovals>0&&<span style={{fontSize:12,color:AMBER,fontWeight:700}}>⚠ {overview.pendingApprovals} pending</span>}
          {decisions.filter(d=>!d.founderAction&&d.decision==='BUILD_NOW').length>0&&
            <span style={{fontSize:12,color:GREEN,fontWeight:700}}>🔥 {decisions.filter(d=>!d.founderAction&&d.decision==='BUILD_NOW').length} ready to build</span>}
        </div>
      </div>

      <div style={s.wrap}>
        <div style={s.tabBar}>
          {tabs.map(t=><button key={t} style={s.tab(tab===t)} onClick={()=>setTab(t)}>
            {t==='decisions'?'🔥 Decisions':t==='build-queue'?'🏗 Build Queue':t.charAt(0).toUpperCase()+t.slice(1)}
          </button>)}
        </div>

        {/* ── OVERVIEW ────────────────────────────────────────────── */}
        {tab==='overview'&&<>
          <div style={s.g4}>
            {[
              {l:'Users',v:overview?.totalUsers||0,c:'#F2F0E8'},
              {l:'Products',v:overview?.totalProducts||0,c:'#F2F0E8'},
              {l:'Experiments',v:overview?.totalExperiments||0,c:'#F2F0E8'},
              {l:'Signups 7d',v:overview?.signups7d||0,c:GREEN},
            ].map(({l,v,c})=>(
              <div key={l} style={s.card}><div style={s.cardBody}>
                <div style={s.sl}>{l}</div>
                <div style={{...s.sv,color:c}}>{v}</div>
              </div></div>
            ))}
          </div>
          <div style={s.g2}>
            <div style={s.card}>
              <div style={s.cardHead}><span style={s.ct}>Recent decisions</span></div>
              <div style={s.cardBody}>
                {(recentDecisions||[]).map((d:any,i:number)=>(
                  <div key={i} style={s.row}>
                    <span style={s.chip(d.action==='SCALE'?GREEN:d.action==='KILL'?RED:BLUE)}>{d.action}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{d.experiment?.product?.name||'—'}</div>
                      <div style={{fontSize:11,color:MUTED}}>{d.reason?.slice(0,60)}...</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:MUTED}}>{d.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.card}>
              <div style={s.cardHead}><span style={s.ct}>Monopoly status</span></div>
              <div style={s.cardBody}>
                <div style={{fontSize:32,fontWeight:800,color:AMBER,letterSpacing:-1,marginBottom:4}}>{monopolyStatus?.moatStrength||'Building'}</div>
                <div style={{fontSize:12,color:MUTED,marginBottom:16}}>Data moat strength</div>
                {Object.entries(monopolyStatus?.datapoints||{}).map(([k,v]:any)=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <span style={{color:MUTED}}>{k.replace(/([A-Z])/g,' $1').trim()}</span>
                    <span style={{fontWeight:700}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ── DECISIONS V2 ────────────────────────────────────────── */}
        {tab==='decisions'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,letterSpacing:-0.8,marginBottom:4}}>Feature Decision Board</div>
              <div style={{fontSize:13,color:MUTED}}>Top 3 are this week's priority. Everything else: wait or reject.</div>
            </div>
            <button style={s.btnFire} onClick={()=>fetch('/api/decisions-v2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'evaluate_all'})}).then(()=>location.reload())}>
              ⚡ Evaluate all features
            </button>
          </div>

          {decisions.length===0&&(
            <div style={{...s.card}}>
              <div style={s.cardBody}>
                <div style={{fontSize:13,color:MUTED,textAlign:'center',padding:40}}>
                  No feature decisions yet. Add feature requests via /api/features, then click "Evaluate all features".
                </div>
              </div>
            </div>
          )}

          {decisions.map((d:any,i:number)=>{
            const fr = d.featureRequest
            const isTop = i < 3
            const isDone = !!d.founderAction
            return (
              <div key={d.id} style={{...s.card, marginBottom:14, border:`1px solid ${isTop&&!isDone?FIRE+'30':'rgba(255,255,255,0.07)'}`, opacity: isDone?0.55:1}}>
                <div style={{...s.cardHead, background: isTop&&!isDone?'rgba(255,69,0,0.06)':'transparent'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {isTop&&!isDone&&<span style={{fontSize:11,fontWeight:800,color:FIRE,letterSpacing:1}}>🔥 THIS WEEK</span>}
                    <span style={s.chip(decisionColor(d.decision))}>{d.decision}</span>
                    <span style={{fontWeight:700,fontSize:14}}>{fr?.normalizedFeature||'—'}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,color:MUTED}}>Focus: <b style={{color:d.focusScore>=75?GREEN:d.focusScore>=50?AMBER:RED}}>{Math.round(d.focusScore)}</b>/100</span>
                    <span style={{fontSize:12,color:MUTED}}>Confidence: <b>{d.confidence}%</b></span>
                  </div>
                </div>

                <div style={s.cardBody}>
                  {/* ONE LINE */}
                  <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:d.decision==='BUILD_NOW'?GREEN:d.decision==='WAIT'?AMBER:MUTED}}>
                    "{d.oneLine}"
                  </div>

                  {/* DECISION CARD GRID */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                    <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14}}>
                      <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:1,marginBottom:8}}>📊 Demand</div>
                      <div style={{fontSize:12,lineHeight:1.6}}>{d.demandReasoning?.slice(0,80)}</div>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14}}>
                      <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:1,marginBottom:8}}>💰 Revenue</div>
                      <div style={{fontSize:12,lineHeight:1.6}}>{d.revenueReasoning?.slice(0,80)}</div>
                      {d.revenueUplift&&<div style={{fontSize:12,color:GREEN,fontWeight:700,marginTop:6}}>{d.revenueUplift}</div>}
                    </div>
                    <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14}}>
                      <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:1,marginBottom:8}}>🧬 Monopoly</div>
                      <div style={{fontSize:12,lineHeight:1.6}}>{d.monopolyReasoning?.slice(0,80)}</div>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                    <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14}}>
                      <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:1,marginBottom:8}}>⚡ Execution</div>
                      <div style={{fontSize:12}}>Complexity: <b>{d.complexity}</b></div>
                      <div style={{fontSize:12}}>Time: <b>{d.estimatedTime||'TBD'}</b></div>
                      {d.retentionImpact&&<div style={{fontSize:12,color:BLUE,marginTop:4}}>Retention: {d.retentionImpact}</div>}
                    </div>
                    <div style={{background:`rgba(255,59,48,0.07)`,borderRadius:10,padding:14,border:'1px solid rgba(255,59,48,0.15)'}}>
                      <div style={{fontSize:10,color:RED,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:1,marginBottom:8}}>💀 If ignored</div>
                      <div style={{fontSize:12,color:'#F2F0E8',lineHeight:1.6}}>{d.downsideIfIgnored?.slice(0,100)}</div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  {!isDone?(
                    <div style={{display:'flex',gap:10,paddingTop:4}}>
                      <button
                        style={{...s.btnFire, opacity: acting===d.id?0.6:1}}
                        onClick={()=>founderAction(d.id,'BUILD_NOW')}
                        disabled={acting===d.id}
                      >
                        🔥 BUILD NOW
                      </button>
                      <button style={s.btnOut} onClick={()=>founderAction(d.id,'WAIT')}>⏳ Wait 7 days</button>
                      <button style={s.btnRed} onClick={()=>founderAction(d.id,'REJECT')}>✕ Reject</button>
                    </div>
                  ):(
                    <div style={{paddingTop:4}}>
                      <span style={s.chip(decisionColor(d.founderAction))}>Founder: {d.founderAction}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </>}

        {/* ── BUILD QUEUE ─────────────────────────────────────────── */}
        {tab==='build-queue'&&<>
          <div style={{fontSize:20,fontWeight:800,letterSpacing:-0.8,marginBottom:20}}>Build Queue</div>
          {buildQueue.length===0&&(
            <div style={s.card}><div style={s.cardBody}>
              <div style={{fontSize:13,color:MUTED,textAlign:'center',padding:40}}>
                No build tickets yet. Approve a feature decision with BUILD NOW to create one.
              </div>
            </div></div>
          )}
          {buildQueue.map((t:any)=>(
            <div key={t.id} style={{...s.card,marginBottom:12}}>
              <div style={s.cardHead}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={s.chip(statusColor(t.status))}>{t.status}</span>
                  <span style={{fontWeight:700}}>{t.title}</span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={s.chip(t.priority==='high'?RED:t.priority==='medium'?AMBER:MUTED)}>{t.priority}</span>
                  <span style={s.chip(t.riskLevel==='risky'?RED:GREEN)}>{t.riskLevel}</span>
                </div>
              </div>
              <div style={s.cardBody}>
                <div style={{fontSize:13,color:MUTED,marginBottom:12}}>{t.description?.slice(0,120)}</div>
                <div style={{display:'flex',gap:20,fontSize:12}}>
                  {t.githubIssueUrl&&<a href={t.githubIssueUrl} target="_blank" rel="noopener noreferrer" style={{color:BLUE}}>GitHub Issue #{t.githubIssueNumber}</a>}
                  {t.githubPrUrl&&<a href={t.githubPrUrl} target="_blank" rel="noopener noreferrer" style={{color:GREEN}}>PR #{t.githubPrNumber}</a>}
                  {t.githubError&&<span style={{color:RED}}>{t.githubError}</span>}
                  <span style={{color:MUTED}}>Created {new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </>}

        {/* ── EXECUTION ───────────────────────────────────────────── */}
        {tab==='execution'&&<div style={s.g2}>
          <div style={s.card}>
            <div style={s.cardHead}><span style={s.ct}>Pending approvals ({executionQueue?.pending?.length||0})</span></div>
            <div style={s.cardBody}>
              {(executionQueue?.pending||[]).length===0&&<div style={{fontSize:13,color:MUTED}}>No pending approvals.</div>}
              {(executionQueue?.pending||[]).map((a:any)=>(
                <div key={a.id} style={s.row}>
                  <span style={s.chip(a.riskLevel==='high'?RED:a.riskLevel==='medium'?AMBER:GREEN)}>{a.riskLevel}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:12,marginBottom:3}}>{a.actionType}</div>
                    <div style={{fontSize:11,color:MUTED}}>{JSON.stringify(a.proposedAction).slice(0,70)}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button style={s.btnFire} onClick={()=>approveExec(a.id)}>Approve</button>
                    <button style={s.btnRed} onClick={()=>rejectExec(a.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardHead}><span style={s.ct}>Recent actions</span></div>
            <div style={s.cardBody}>
              {(executionQueue?.recentActions||[]).slice(0,8).map((a:any,i:number)=>(
                <div key={i} style={s.row}>
                  <span style={s.chip(a.status==='success'?GREEN:a.status==='failed'?RED:AMBER)}>{a.status}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:12}}>{a.actionType}</div>
                    {a.errorMessage&&<div style={{fontSize:11,color:RED}}>{a.errorMessage.slice(0,50)}</div>}
                  </div>
                  <span style={{fontSize:11,color:MUTED}}>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* ── FEATURES ────────────────────────────────────────────── */}
        {tab==='features'&&<div style={s.card}>
          <div style={s.cardHead}><span style={s.ct}>Feature demand board ({featureDemand?.length||0})</span></div>
          <div style={s.cardBody}>
            {(featureDemand||[]).length===0&&<div style={{fontSize:13,color:MUTED}}>No feature requests yet.</div>}
            {(featureDemand||[]).map((f:any,i:number)=>(
              <div key={i} style={s.row}>
                <span style={s.chip(f.opportunityScore>=7?GREEN:f.opportunityScore>=5?AMBER:MUTED)}>{f.status}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{f.normalizedFeature}</div>
                  <div style={{fontSize:11,color:MUTED}}>{f.reasoning?.slice(0,80)}</div>
                </div>
                <div style={{textAlign:'right' as const}}>
                  <div style={{fontSize:16,fontWeight:800,color:AMBER}}>{f.opportunityScore?.toFixed(1)}</div>
                  <div style={{fontSize:10,color:MUTED}}>score</div>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* ── COMPETITORS ─────────────────────────────────────────── */}
        {tab==='competitors'&&<div style={s.card}>
          <div style={s.cardHead}><span style={s.ct}>Competitor gaps</span></div>
          <div style={s.cardBody}>
            {(competitorGaps||[]).length===0&&<div style={{fontSize:13,color:MUTED}}>No signals yet.</div>}
            {(competitorGaps||[]).map((c:any,i:number)=>(
              <div key={i} style={{padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <div style={{display:'flex',gap:8,marginBottom:6}}>
                  <span style={s.chip(AMBER)}>{c.competitorName}</span>
                  <span style={{fontWeight:600,fontSize:13}}>{c.summary}</span>
                </div>
                {c.weakness&&<div style={{fontSize:12,color:MUTED,marginBottom:4}}>⚠ {c.weakness}</div>}
                {c.opportunity&&<div style={{fontSize:12,color:GREEN}}>→ {c.opportunity}</div>}
              </div>
            ))}
          </div>
        </div>}

        {/* ── BILLING ─────────────────────────────────────────────── */}
        {tab==='billing'&&<div style={s.card}>
          <div style={s.cardHead}><span style={s.ct}>Billing opportunities</span></div>
          <div style={s.cardBody}>
            {(billingOpportunities||[]).length===0&&<div style={{fontSize:13,color:MUTED}}>No opportunities.</div>}
            {(billingOpportunities||[]).map((b:any,i:number)=>(
              <div key={i} style={s.row}>
                <span style={s.chip(b.type==='upgrade'?GREEN:AMBER)}>{b.type}</span>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{b.description?.slice(0,90)}</div></div>
                <div style={{textAlign:'right' as const}}>
                  <div style={{fontSize:15,fontWeight:800,color:GREEN}}>${b.potentialMrr}/mo</div>
                  <div style={{fontSize:10,color:MUTED}}>{Math.round(b.probability*100)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* ── MONOPOLY ────────────────────────────────────────────── */}
        {tab==='monopoly'&&<div style={s.g2}>
          <div style={s.card}>
            <div style={s.cardHead}><span style={s.ct}>Monopoly score</span></div>
            <div style={s.cardBody}>
              <div style={{fontSize:44,fontWeight:800,color:AMBER,letterSpacing:-2,marginBottom:4}}>{monopolyStatus?.moatStrength}</div>
              <div style={{fontSize:13,color:MUTED,marginBottom:20}}>Current defensibility</div>
              {(monopolyStatus?.topPredictions||[]).map((p:any,i:number)=>(
                <div key={i} style={s.row}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:12}}>{p.angle}</div>
                    <div style={{fontSize:11,color:MUTED}}>{p.channel} · {p.basedOn} experiments</div>
                  </div>
                  <span style={{fontSize:15,fontWeight:800,color:GREEN}}>{p.winRate}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardHead}><span style={s.ct}>Data points</span></div>
            <div style={s.cardBody}>
              {Object.entries(monopolyStatus?.datapoints||{}).map(([k,v]:any)=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:13}}>
                  <span style={{color:MUTED}}>{k.replace(/([A-Z])/g,' $1').trim()}</span>
                  <span style={{fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}

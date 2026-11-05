const {roster}=require('./engine.cjs');
const {summarize,snapshots}=require('./snapshots.cjs');

async function run() {
  const account=process.env.CLOUDFLARE_ACCOUNT_ID;
  const db=process.env.CLOUDFLARE_D1_ID;
  const token=process.env.CLOUDFLARE_API_TOKEN;
  const henrik=process.env.HENRIK_API_KEY;
  if(!account||!db||!token||!henrik)throw Error('Required synchronization secrets are missing');
  async function query(sql,params=[]) {
    const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+db+'/query',
      {method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(60000)});
    const payload=await response.json();
    if(!response.ok||!payload.success)throw Error('Cloud database query failed (HTTP '+response.status+')');
    return payload.result[0].results;
  }
  const setState=async value=>query(
    "INSERT INTO sync_state(key,value) VALUES ('status',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [JSON.stringify(value)]);
  const previous=await query("SELECT value FROM sync_state WHERE key='status'");
  const previousStatus=previous[0]?JSON.parse(previous[0].value):{};
  let added=0;
  try {
    // Load only compact per-match metrics; raw opponent data is never published.
    const stored=[];let after='';
    while(true) {
      const page=await query('SELECT id,summary FROM matches WHERE id>? ORDER BY id LIMIT 200',[after]);
      stored.push(...page.map(row=>JSON.parse(row.summary)));
      if(page.length<200)break;
      after=page.at(-1).id;
    }
    const byId=new Map(stored.map(row=>[row.id,row]));
    for(const player of roster) {
      const signatures=new Set();
      let finished=false;
      for(let offset=0;offset<1000;offset+=10) {
        let response;
        for(let attempt=0;attempt<5;attempt++) {
          response=await fetch('https://api.henrikdev.xyz/valorant/v4/by-puuid/matches/eu/pc/'+player.puuid+
            '?mode=competitive&size=10&start='+offset,
            {headers:{Authorization:henrik},signal:AbortSignal.timeout(60000)});
          if(response.status!==429&&response.status<500)break;
          console.log('Match API busy; waiting before retry');
          const seconds=Math.max(5,Math.min(120,Number(response.headers.get('retry-after'))||60));
          await new Promise(resolve=>setTimeout(resolve,seconds*1000));
        }
        if(!response?.ok)throw Error('Match API HTTP '+response?.status);
        const payload=await response.json();
        if(!Array.isArray(payload.data))throw Error('Invalid matchlist response');
        const matches=payload.data;
        const signature=matches.map(match=>match.metadata?.match_id).join();
        if(signatures.has(signature))throw Error('Match API repeated a pagination page');
        signatures.add(signature);
        let fresh=0;
        for(const match of matches) {
          if(byId.has(match.metadata?.match_id))continue;
          const row=summarize(match);
          if(!row)continue;
          await query('INSERT OR IGNORE INTO matches(id,started_at,act,summary) VALUES (?,?,?,?)',
            [row.id,row.date,row.act,JSON.stringify(row)]);
          byId.set(row.id,row);fresh++;added++;
        }
        console.log(player.name+': checked '+matches.length+', '+fresh+' new matches');
        const beforeArchive=matches.length&&matches.every(match=>match.metadata?.started_at<'2026-08-15');
        if(matches.length<10||fresh===0||beforeArchive){finished=true;break;}
        await new Promise(resolve=>setTimeout(resolve,2000));
      }
      if(!finished)throw Error('History page limit reached; another pass is required');
      await new Promise(resolve=>setTimeout(resolve,2000));
    }
    const compiled=snapshots([...byId.values()]);
    const now=new Date().toISOString();
    // Publish both snapshots in one SQL transaction to preserve matching totals.
    const statement="INSERT INTO snapshots(name,payload,updated_at) VALUES ('profiles',?,?),('compositions',?,?) "+
      "ON CONFLICT(name) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at";
    await query(statement,[JSON.stringify(compiled.profiles),now,JSON.stringify(compiled.compositions),now]);
    await setState({ok:true,checkedAt:now,lastSuccess:now,
      lastNewMatch:added?now:previousStatus.lastNewMatch||null,
      added,matches:byId.size,message:added?added+' yeni maç işlendi':'Yeni maç kontrolü tamamlandı'});
    console.log('Published '+byId.size+' unique matches');
  } catch(error) {
    await setState({...previousStatus,ok:false,checkedAt:new Date().toISOString(),added,message:error.message});
    throw error;
  }
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});

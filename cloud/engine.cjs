const roster=[
{id:'7bay',name:'7Bay',puuid:'c07f3fbc-b09f-55c6-bc44-db20ace261d7',color:'#638da8'},
{id:'lain',name:'Lain',puuid:'b0a54f88-a1f6-556c-80c6-5deeb0b6453c',color:'#78b8bc'},
{id:'onlyherif',name:'OnlyHerif',puuid:'e58a4307-a821-5c28-acf6-c3cb3fe504a4',color:'#849bb6'},
{id:'sarisin',name:'SARIŞINSEVDALISI',puuid:'8f6d7efe-da2f-5b55-a0e7-80c1cef7c9a5',color:'#ba9a72'},
{id:'burak',name:'burak6541',puuid:'5f5c948f-4a89-5d62-97fa-8c44cc2bba64',color:'#9e8dc5'}];
const ratio=(a,b)=>b?a/b:null, pct=(a,b)=>b?100*a/b:null;
function teamMatch(m){const ps=roster.map(p=>m.players.find(q=>q.puuid===p.puuid));return ps.every(Boolean)&&new Set(ps.map(p=>p.team_id)).size===1&&ps[0].party_id&&new Set(ps.map(p=>p.party_id)).size===1;}
function soloMatch(m,p){return !!p.party_id&&m.players.filter(q=>q.party_id===p.party_id).length===1;}
function analyzeRound(m,r){
 const events=m.kills.filter(k=>k.round===r.id).sort((a,b)=>a.time_in_round_in_ms-b.time_in_round_in_ms);
 const enemy=events.filter(k=>k.killer?.team!==k.victim?.team);
 const traded=new Set(),trades=[];
 for(const death of enemy){
  const trade=enemy.find(k=>k.time_in_round_in_ms>death.time_in_round_in_ms&&k.time_in_round_in_ms-death.time_in_round_in_ms<=5000&&k.victim.puuid===death.killer.puuid&&k.killer.team===death.victim.team&&k.killer.puuid!==death.victim.puuid);
  if(trade){traded.add(death.victim.puuid);trades.push({saved:death.victim.puuid,by:trade.killer.puuid});}
 }
 const alive=new Map(m.players.map(p=>[p.puuid,p.team_id])),clutches=new Map();let uncertain=false;
 for(const k of events){
  // Repeated deaths or a previously dead killer indicate a revival. Such rounds
  // are excluded from clutch denominators because the archive has no revive timeline.
  if(!alive.has(k.victim.puuid)||(k.killer?.puuid&&k.killer.team!==k.victim.team&&!alive.has(k.killer.puuid)))uncertain=true;
  alive.delete(k.victim.puuid);
  for(const team of new Set(m.players.map(p=>p.team_id))){
   const ours=[...alive].filter(([,t])=>t===team),others=[...alive].filter(([,t])=>t!==team);
   if(ours.length===1&&others.length>0&&!clutches.has(ours[0][0]))clutches.set(ours[0][0],{against:others.length,won:r.winning_team===team});
  }
 }
 let attack=null;
 if(r.winning_team_role){const role=String(r.winning_team_role).toLowerCase();if(role.includes('attack'))attack=r.winning_team;else if(role.includes('defend'))attack=m.teams.find(t=>t.team_id!==r.winning_team)?.team_id;}
 if(!attack&&r.plant?.player?.team)attack=r.plant.player.team;
 return {events,enemy,traded,trades,clutches:uncertain?new Map():clutches,uncertain,attack};
}
function aggregate(rows){
 const g={matches:rows.length,wins:0,draws:0,rounds:0,kills:0,deaths:0,assists:0,fk:0,fd:0,mvp:0,kastRounds:0,clutchWins:0,clutchAttempts:0,clutchExcluded:0,tradedDeaths:0,tradeKills:0,multiKills:0,aces:0,plants:0,defuses:0,performanceMatches:0,agents:[],maps:[],history:[],weapons:[]};
 let hs=0,shots=0,damage=0,received=0,score=0,perf=0,perfRounds=0;
 const agents={},maps={},weapons={};
 for(const {m,p} of rows){
  const won=m.teams.find(t=>t.team_id===p.team_id)?.won===true,n=m.rounds.length;
  g.wins+=+won;g.draws+=+m.teams.every(t=>!t.won);g.rounds+=n;
  for(const k of ['kills','deaths','assists'])g[k]+=p.stats[k]||0;
  hs+=p.stats.headshots;shots+=p.stats.headshots+p.stats.bodyshots+p.stats.legshots;damage+=p.stats.damage.dealt;received+=p.stats.damage.received;score+=p.stats.score;
  // Prefer the recorded match MVP; use the ACS leader when that field is absent.
  g.mvp+=+(m.metadata.mvp?.puuid ? m.metadata.mvp.puuid===p.puuid : p.stats.score===Math.max(...m.players.map(q=>q.stats.score)));
  if(Number.isFinite(p.performance?.score)){perf+=p.performance.score*n;perfRounds+=n;g.performanceMatches++;}
  for(const [bucket,name] of [[agents,p.agent.name],[maps,m.metadata.map.name]]){const b=bucket[name]||={name,matches:0,wins:0,rounds:0,kills:0,deaths:0,damage:0};b.matches++;b.wins+=+won;b.rounds+=n;b.kills+=p.stats.kills;b.deaths+=p.stats.deaths;b.damage+=p.stats.damage.dealt;}
  for(const r of m.rounds){
   const a=r.analysis,id=p.puuid;
   const kills=a.enemy.filter(k=>k.killer.puuid===id),deaths=a.events.filter(k=>k.victim.puuid===id);
   const assists=a.enemy.some(k=>k.assistants?.some(q=>q.puuid===id));
   g.kastRounds+=+(kills.length>0||assists||!deaths.length||a.traded.has(id));
   g.fk+=+(a.enemy[0]?.killer.puuid===id);g.fd+=+(a.enemy[0]?.victim.puuid===id);
   g.tradedDeaths+=a.trades.filter(t=>t.saved===id).length;g.tradeKills+=a.trades.filter(t=>t.by===id).length;
   g.multiKills+=+(kills.length>=3);g.aces+=+(kills.length>=5);
   g.plants+=+(r.plant?.player?.puuid===id);g.defuses+=+(r.defuse?.player?.puuid===id);
   g.clutchExcluded+=+a.uncertain;
   const c=a.clutches.get(id);if(c){g.clutchAttempts++;g.clutchWins+=+c.won;}
   for(const k of kills)if(k.weapon?.type==='Weapon'&&k.weapon.name){weapons[k.weapon.name]=(weapons[k.weapon.name]||0)+1;}
  }
  const t=m.teams.find(t=>t.team_id===p.team_id);
  g.history.push({date:m.metadata.started_at,map:m.metadata.map.name,agent:p.agent.name,won,score:t.rounds.won+'–'+t.rounds.lost,kills:p.stats.kills,deaths:p.stats.deaths,assists:p.stats.assists,rounds:n,damage:p.stats.damage.dealt,adr:ratio(p.stats.damage.dealt,n)});
 }
 for(const b of Object.values(agents).concat(Object.values(maps))){b.adr=ratio(b.damage,b.rounds);b.kd=ratio(b.kills,b.deaths);}
 g.agents=Object.values(agents).sort((a,b)=>b.matches-a.matches);g.maps=Object.values(maps).sort((a,b)=>b.matches-a.matches);
 g.agent=g.agents[0]?.name||null;g.agentMatches=g.agents[0]?.matches||0;
 g.bestMap=[...g.maps].sort((a,b)=>b.wins/b.matches-a.wins/a.matches||b.matches-a.matches)[0]||null;
 g.weapons=Object.entries(weapons).map(([name,kills])=>({name,kills})).sort((a,b)=>b.kills-a.kills).slice(0,3);
 Object.assign(g,{kd:ratio(g.kills,g.deaths),kda:ratio(g.kills+g.assists,g.deaths),hs:pct(hs,shots),adr:ratio(damage,g.rounds),acs:ratio(score,g.rounds),dd:ratio(damage-received,g.rounds),kast:pct(g.kastRounds,g.rounds),clutch:pct(g.clutchWins,g.clutchAttempts),performance:ratio(perf,perfRounds),rank:rows.at(-1)?.p.tier||null});
 g._totals={hs,shots,damage,received,score,perf,perfRounds};
 g._weapons=weapons;
 return g;
}
function aggregateTeam(matches){
 const g={matches:matches.length,wins:0,rounds:0,roundWins:0,maps:[],comps:[],pairs:[],economy:[],sides:{attack:{rounds:0,wins:0},defense:{rounds:0,wins:0}},opening:{rounds:0,wins:0},conceded:{rounds:0,wins:0},pistol:{rounds:0,wins:0},postplant:{rounds:0,wins:0},retake:{rounds:0,wins:0}};
 const maps={},comps={},pairs={},economy={};
 const add=(b,won)=>{b.rounds++;b.wins+=+won;};
 for(const m of matches){
  const ps=roster.map(p=>m.players.find(q=>q.puuid===p.puuid)),team=ps[0].team_id,won=m.teams.find(t=>t.team_id===team).won;
  g.wins+=+won;
  const map=maps[m.metadata.map.name]||={name:m.metadata.map.name,matches:0,wins:0};map.matches++;map.wins+=+won;
  const names=ps.map(p=>p.agent.name),ck=m.metadata.map.name+':'+names.join('/');
  const comp=comps[ck]||={map:m.metadata.map.name,agents:names,matches:0,wins:0};comp.matches++;comp.wins+=+won;
  for(const r of m.rounds){
   const a=r.analysis,win=r.winning_team===team;g.rounds++;g.roundWins+=+win;
   if(a.attack)add(a.attack===team?g.sides.attack:g.sides.defense,win);
   if(a.enemy[0])add(a.enemy[0].killer.team===team?g.opening:g.conceded,win);
   if(r.id===0||r.id===12)add(g.pistol,win);
   if(r.plant)add(r.plant.player.team===team?g.postplant:g.retake,win);
   const load=r.stats.filter(s=>s.player.team===team).map(s=>s.economy?.loadout_value);
   if(load.length===5&&load.every(Number.isFinite)){
    const avg=load.reduce((a,b)=>a+b,0)/5,category=(r.id===0||r.id===12)?'Pistol':avg<2000?'Eco':avg<3900?'Düşük / karma alım':'Full buy';
    const b=economy[category]||={name:category,rounds:0,wins:0};add(b,win);
   }
   for(const t of a.trades){const by=roster.find(p=>p.puuid===t.by),saved=roster.find(p=>p.puuid===t.saved);if(by&&saved){const key=by.id+saved.id;const b=pairs[key]||={by:by.name,saved:saved.name,count:0};b.count++;}}
  }
 }
 g.maps=Object.values(maps).sort((a,b)=>b.matches-a.matches);g.comps=Object.values(comps).sort((a,b)=>b.matches-a.matches);g.pairs=Object.values(pairs).sort((a,b)=>b.count-a.count);g.economy=Object.values(economy);return g;
}

module.exports={roster,analyzeRound,aggregate,aggregateTeam,teamMatch,soloMatch};

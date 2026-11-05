const {roster,analyzeRound,aggregate,aggregateTeam,teamMatch}=require('./engine.cjs');
const mapCompositions=require('../work/map-compositions.cjs');

function includedAct(act) {
  const match=/^e(\d+)a(\d+)$/.exec(act||'');
  return !!match && (+match[1]>11 || (+match[1]===11 && +match[2]>=5));
}

function summarize(match) {
  if(!includedAct(match.metadata?.season?.short) || !match.metadata.is_completed ||
     match.metadata.queue?.id!=='competitive' || !match.rounds?.length) return null;
  for(const round of match.rounds) round.analysis=analyzeRound(match,round);
  const team=!!teamMatch(match);
  const players={};
  for(const player of roster) {
    const p=match.players.find(p=>p.puuid===player.puuid);
    if(p) players[player.id]={tag:p.tag,group:aggregate([{m:match,p}])};
  }
  if(!Object.keys(players).length)return null;
  return {id:match.metadata.match_id,act:match.metadata.season.short,
    date:match.metadata.started_at,players,team:team?aggregateTeam([match]):null};
}

function mergeBuckets(rows,key,fields) {
  const groups=new Map();
  for(const row of rows) {
    const id=key(row);
    if(!groups.has(id))groups.set(id,{...row,...Object.fromEntries(fields.map(k=>[k,0]))});
    const result=groups.get(id);
    for(const field of fields)result[field]+=row[field]||0;
  }
  return [...groups.values()];
}

function mergePlayer(rows) {
  const result=aggregate([]);
  for(const field of ['matches','wins','draws','rounds','kills','deaths','assists','fk','fd','mvp',
    'kastRounds','clutchWins','clutchAttempts','clutchExcluded','tradedDeaths','tradeKills',
    'multiKills','aces','plants','defuses','performanceMatches']) {
    result[field]=rows.reduce((total,row)=>total+row[field],0);
  }
  const totals={};
  for(const field of ['hs','shots','damage','received','score','perf','perfRounds'])
    totals[field]=rows.reduce((total,row)=>total+row._totals[field],0);
  const divide=(a,b)=>b?a/b:null;
  result.kd=divide(result.kills,result.deaths);
  result.kda=divide(result.kills+result.assists,result.deaths);
  result.hs=divide(100*totals.hs,totals.shots);
  result.adr=divide(totals.damage,result.rounds);
  result.acs=divide(totals.score,result.rounds);
  result.dd=divide(totals.damage-totals.received,result.rounds);
  result.kast=divide(100*result.kastRounds,result.rounds);
  result.clutch=divide(100*result.clutchWins,result.clutchAttempts);
  result.performance=divide(totals.perf,totals.perfRounds);
  for(const field of ['agents','maps']) {
    result[field]=mergeBuckets(rows.flatMap(row=>row[field]),row=>row.name,
      ['matches','wins','rounds','kills','deaths','damage']);
    for(const group of result[field]) {
      group.adr=divide(group.damage,group.rounds);
      group.kd=divide(group.kills,group.deaths);
    }
    result[field].sort((a,b)=>b.matches-a.matches);
  }
  result.agent=result.agents[0]?.name||null;
  result.agentMatches=result.agents[0]?.matches||0;
  result.bestMap=[...result.maps].sort((a,b)=>b.wins/b.matches-a.wins/a.matches||b.matches-a.matches)[0]||null;
  const weapons={};
  for(const row of rows)for(const [name,kills] of Object.entries(row._weapons))
    weapons[name]=(weapons[name]||0)+kills;
  result.weapons=Object.entries(weapons).map(([name,kills])=>({name,kills})).sort((a,b)=>b.kills-a.kills).slice(0,3);
  result.history=rows.flatMap(row=>row.history);
  result.rank=rows.at(-1)?.rank||null;
  return result;
}

function mergeTeam(rows) {
  const result=aggregateTeam([]);
  for(const field of ['matches','wins','rounds','roundWins'])
    result[field]=rows.reduce((total,row)=>total+row[field],0);
  for(const field of ['opening','conceded','pistol','postplant','retake']) {
    result[field]={rounds:0,wins:0};
    for(const row of rows) {
      result[field].rounds+=row[field].rounds;
      result[field].wins+=row[field].wins;
    }
  }
  for(const side of ['attack','defense'])for(const field of ['rounds','wins'])
    result.sides[side][field]=rows.reduce((total,row)=>total+row.sides[side][field],0);
  result.maps=mergeBuckets(rows.flatMap(row=>row.maps),row=>row.name,['matches','wins']).sort((a,b)=>b.matches-a.matches);
  result.comps=mergeBuckets(rows.flatMap(row=>row.comps),row=>row.map+':'+row.agents.join('/'),['matches','wins']).sort((a,b)=>b.matches-a.matches);
  result.pairs=mergeBuckets(rows.flatMap(row=>row.pairs),row=>row.by+':'+row.saved,['count']).sort((a,b)=>b.count-a.count);
  result.economy=mergeBuckets(rows.flatMap(row=>row.economy),row=>row.name,['rounds','wins']);
  return result;
}

function snapshots(summaries) {
  const sorted=[...summaries].sort((a,b)=>a.date.localeCompare(b.date));
  const acts=[...new Set(sorted.map(row=>row.act))].reverse();
  const data={start:sorted[0]?.date,end:sorted.at(-1)?.date,acts,players:[],team:{}};
  for(const player of roster) {
    const available=sorted.filter(row=>row.players[player.id]);
    const scopes={team:{},'no-team':{}};
    for(const act of ['all',...acts])for(const scope of ['team','no-team']) {
      const rows=available.filter(row=>(act==='all'||row.act===act)&&
        (scope==='team'?!!row.team:!row.team));
      scopes[scope][act]=mergePlayer(rows.map(row=>row.players[player.id].group));
    }
    let tag=available.at(-1)?.players[player.id].tag||'';
    if(/[ÃÄÅ]/.test(tag)) {
      try{tag=new TextDecoder().decode(Uint8Array.from(tag,c=>c.charCodeAt(0)));}catch{}
    }
    data.players.push({id:player.id,name:player.name,color:player.color,tag,
      groups:scopes.team,scopes});
  }
  for(const act of ['all',...acts])
    data.team[act]=mergeTeam(sorted.filter(row=>row.team&&(act==='all'||row.act===act)).map(row=>row.team));
  return {profiles:data,compositions:{players:roster.map(p=>p.name),maps:mapCompositions(data.team.all.comps)}};
}
module.exports={summarize,snapshots,includedAct};

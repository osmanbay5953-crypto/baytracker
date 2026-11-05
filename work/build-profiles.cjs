const fs=require('node:fs');
const {roster,analyzeRound,aggregate,aggregateTeam,teamMatch,soloMatch}=require('../cloud/engine.cjs');
function build(){
 const unique=new Map();
 for(const f of fs.readdirSync('work/matches').filter(f=>f.endsWith('.json'))){const m=JSON.parse(fs.readFileSync('work/matches/'+f,'utf8').replace(/^\uFEFF/,''));if(m.metadata.is_completed&&m.metadata.queue.id==='competitive')unique.set(m.metadata.match_id,m);}
 // Use the recorded act, so matches at a season boundary do not depend on time zone.
 const all=[...unique.values()].filter(match=>{
  const season=/^e(\d+)a(\d+)$/.exec(match.metadata.season?.short);
  if(!season)return false;
  const episode=Number(season[1]),act=Number(season[2]);
  return episode>11 || (episode===11 && act>=5);
 }).sort((a,b)=>a.metadata.started_at.localeCompare(b.metadata.started_at));
 for(const m of all)for(const r of m.rounds)r.analysis=analyzeRound(m,r);
 const acts=[...new Set(all.map(m=>m.metadata.season.short))].reverse(),team=all.filter(teamMatch);
 const out={start:all[0]?.metadata.started_at,end:all.at(-1)?.metadata.started_at,acts,players:[],team:{}};
 for(const player of roster){
  const rows=all.flatMap(m=>{const p=m.players.find(p=>p.puuid===player.puuid);return p?[{m,p}]:[];});
  const scopes={team:{},'no-team':{}};
  for(const act of ['all',...acts]){
   const period=rows.filter(({m})=>act==='all'||m.metadata.season.short===act);
   const withTeam=[],noTeam=[];
   for(const row of period)(teamMatch(row.m)?withTeam:noTeam).push(row);
   scopes.team[act]=aggregate(withTeam);
   scopes['no-team'][act]=aggregate(noTeam);
  }
  const tag=rows.at(-1)?.p.tag||'';
  out.players.push({id:player.id,name:player.name,color:player.color,tag:/[ÃÄÅ]/.test(tag)?Buffer.from(tag,'latin1').toString('utf8'):tag,groups:scopes.team,scopes});
 }
 for(const act of ['all',...acts])out.team[act]=aggregateTeam(team.filter(m=>act==='all'||m.metadata.season.short===act));
 const maps=require('./map-compositions.cjs')(out.team.all.comps);
 fs.writeFileSync('assets/map-compositions.json',JSON.stringify({players:roster.map(p=>p.name),maps}));
 fs.writeFileSync('assets/profiles-data.json',JSON.stringify(out));
 console.log(JSON.stringify({matches:all.length,team:team.length,acts,players:out.players.map(p=>({name:p.name,kast:p.groups.all.kast,clutch:[p.groups.all.clutchWins,p.groups.all.clutchAttempts],mvp:p.groups.all.mvp,noTeam:p.scopes['no-team'].all.matches}))},null,2));
 return out;
}
if(require.main===module)build();
module.exports={analyzeRound,aggregate,aggregateTeam,teamMatch,soloMatch,build};

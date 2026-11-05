const fs=require('fs');
(async()=>{
const event='https://www.vlr.gg/event/matches/2766/valorant-champions-2026/?group=completed&series_id=all';
const html=await(await fetch(event)).text();
const urls=[...new Set([...html.matchAll(/href="(\/\d+\/[^"]+-vs-[^"]+)"/g)].map(m=>'https://www.vlr.gg'+m[1]))];
const teams=['LOUD','Team Vitality','100 Thieves','G2 Esports'],records=[];
for(const url of urls){
 const html=await(await fetch(url)).text();
 const blocks=html.split(/<div class="vm-stats-game\s*" data-game-id="/).slice(1);
 for(const block of blocks){
  const header=block.split('vm-stats-game-header')[1]?.split('vlr-rounds')[0]||'';
  const names=[...header.matchAll(/class="team-name">\s*([^<]+)/g)].map(m=>m[1].trim());
  const scores=[...header.matchAll(/class="score[^"]*"[^>]*>\s*(\d+)/g)].map(m=>+m[1]);
  const map=header.match(/class="map-name">\s*<span[^>]*>\s*([^<]+)/)?.[1].trim();
  const agents=[...block.matchAll(/src="\/img\/vlr\/game\/agents\/[^"]+" alt="[^"]+" title="([^"]+)"/g)].map(m=>m[1]);
  if(names.length!==2||scores.length!==2||agents.length!==10||!map)continue;
  for(let i=0;i<2;i++)if(teams.includes(names[i]))records.push({team:names[i],map,agents:agents.slice(i*5,i*5+5).map(a=>a==='Kayo'?'KAY/O':a),won:scores[i]>scores[1-i],url});
 }
}
const groups=new Map();
for(const r of records){r.agents.sort();const key=[r.map,r.team,...r.agents].join('|');if(!groups.has(key))groups.set(key,{map:r.map,team:r.team,agents:r.agents,matches:0,wins:0,sources:[]});const g=groups.get(key);g.matches++;g.wins+=+r.won;g.sources.push(r.url);}
const maps={};for(const g of groups.values())(maps[g.map]??=[]).push(g);
for(const list of Object.values(maps))list.sort((a,b)=>b.wins/b.matches-a.wins/a.matches||b.matches-a.matches||teams.indexOf(a.team)-teams.indexOf(b.team));
if(!records.length)throw Error('No validated records');
fs.writeFileSync('assets/vct-compositions.json',JSON.stringify({event:'Champions Shanghai 2026',teams,selection:'Champions 2026 ilk dört',source:event,maps}));
console.log({series:urls.length,records:records.length,maps:Object.keys(maps),sample:records[0]});
})().catch(e=>{console.error(e);process.exit(1)});

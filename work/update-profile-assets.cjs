const fs=require('fs');
(async()=>{
 const data=JSON.parse(fs.readFileSync('assets/profiles-data.json','utf8'));
 const groups=data.players.flatMap(p=>Object.values(p.scopes).flatMap(s=>Object.values(s)));
 const agents=(await (await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')).json()).data;
 for(const name of new Set(groups.map(g=>g.agent).filter(Boolean))){
  const a=agents.find(a=>a.displayName===name);if(!a)continue;
  for(const [suffix,url] of [['',a.fullPortrait],['-icon',a.displayIcon]]){const file='assets/agents/'+name.toLowerCase().replace(/[^a-z0-9-]/g,'-')+suffix+'.png';if(!fs.existsSync(file)){fs.writeFileSync(file,Buffer.from(await (await fetch(url)).arrayBuffer()));console.log('Added '+file);}}
 }
 const tiers=(await (await fetch('https://valorant-api.com/v1/competitivetiers')).json()).data.at(-1).tiers;
 for(const id of new Set(groups.map(g=>g.rank?.id).filter(Boolean))){const file='assets/ranks/'+id+'.png';if(!fs.existsSync(file)){const t=tiers.find(t=>t.tier===id);if(t?.largeIcon)fs.writeFileSync(file,Buffer.from(await (await fetch(t.largeIcon)).arrayBuffer()));}}
})();

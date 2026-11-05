const fs=require('node:fs');
const ids=['c07f3fbc-b09f-55c6-bc44-db20ace261d7','b0a54f88-a1f6-556c-80c6-5deeb0b6453c','e58a4307-a821-5c28-acf6-c3cb3fe504a4','8f6d7efe-da2f-5b55-a0e7-80c1cef7c9a5','5f5c948f-4a89-5d62-97fa-8c44cc2bba64'];
const local=new Set(fs.readdirSync('work/matches').map(f=>f.slice(0,-5)));
async function run(token){
 const pending=new Set();
 async function get(path){
  for(let i=0;i<5;i++){
   let r;try{r=await fetch('https://api.henrikdev.xyz/valorant/'+path,{headers:{Authorization:token},signal:AbortSignal.timeout(45000)});}catch(e){if(i===4)throw e;continue;}
   if(r.status===429||r.status>=500){await new Promise(resolve=>setTimeout(resolve,1000*(Number(r.headers.get('retry-after'))||12)));continue;}
   if(!r.ok)throw Error('HTTP '+r.status+' '+(await r.text()).slice(0,180));return r.json();
  }throw Error('retry limit');
 }
 for(const [i,id] of ids.entries()){
  let seen=new Set();for(let page=1;;page++){
   const res=await get('v2/by-puuid/stored-mmr-history/eu/pc/'+id+'?mode=competitive&size=100&page='+page);
   const rows=res.data;if(!Array.isArray(rows))throw Error('invalid history');if(!rows.length)break;
   if(page===1&&i===0)console.log('schema',JSON.stringify(rows[0]),Object.keys(rows[0]),res.results);
   let fresh=0,old=0;
   for(const row of rows){const m=row;const key=m.match_id||m.match?.id;if(!key||seen.has(key))continue;seen.add(key);fresh++;const date=m.date||m.started_at;if(date&&date<'2026-08-15'){old++;continue;}if(!local.has(key))pending.add(key);}
   if(!fresh||old===fresh||rows.length<100)break;
  }
  console.log('player',i+1,'history',seen.size,'missing candidates',pending.size);
 }
 let added=0;for(const id of pending){if(!/^[0-9a-f-]{36}$/i.test(id))continue;try{const {data:m}=await get('v4/match/eu/'+id);if(m?.metadata?.match_id!==id||m.metadata.queue.id!=='competitive'||!/^e11a[56]$/.test(m.metadata.season.short)||!m.rounds?.length)continue;fs.writeFileSync('work/matches/'+id+'.json',JSON.stringify(m),{flag:'wx'});added++;}catch(e){console.log(id,e.message);}}
 console.log('added',added);
}
console.log('Ready');process.stdin.setRawMode(true);let input='';process.stdin.on('data',chunk=>{input+=chunk;if(!/[\r\n]/.test(input))return;process.stdin.removeAllListeners('data');process.stdin.pause();run(input.trim()).then(()=>process.exit(0)).catch(e=>{console.log(e.message);process.exit(1)});input='';});

const fs=require('fs');
const roster=['c07f3fbc-b09f-55c6-bc44-db20ace261d7','b0a54f88-a1f6-556c-80c6-5deeb0b6453c','e58a4307-a821-5c28-acf6-c3cb3fe504a4','8f6d7efe-da2f-5b55-a0e7-80c1cef7c9a5','5f5c948f-4a89-5d62-97fa-8c44cc2bba64'];
console.log('Ready for API credential on hidden stdin');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
let input='';
process.stdin.on('data',async chunk=>{
 input+=chunk.toString();if(!/[\r\n]/.test(input))return;
 process.stdin.removeAllListeners('data');process.stdin.pause();
 const token=input.trim();input='';
 let added=0;
 try{
 for(let player=0;player<roster.length;player++){
  for(let start=0;start<5000;start+=10){
   let response;
   for(let attempt=0;attempt<4;attempt++){
    try { response=await fetch('https://api.henrikdev.xyz/valorant/v4/by-puuid/matches/eu/pc/'+roster[player]+'?size=10&start='+start,{headers:{Authorization:token},signal:AbortSignal.timeout(60000)}); } catch(e) { console.log('Network retry '+(attempt+1)+' '+(e.cause?.code||e.name)); await new Promise(r=>setTimeout(r,5000)); continue; }
    if(response.status!==429)break;
    const seconds=Math.max(1,Math.min(120,Number(response.headers.get('retry-after'))||60));console.log('Rate limit; waiting '+seconds+'s');await new Promise(r=>setTimeout(r,seconds*1000));
   }
   if(!response){console.log('Player '+(player+1)+' network unavailable');break;}
   if(!response.ok){console.log('Player '+(player+1)+' HTTP '+response.status);break;}
   const json=await response.json(),matches=json.data;
   if(!Array.isArray(matches)||!matches.length)break;
   if(matches.every(m=>m.metadata?.started_at<'2026-08-15'))break;
   let fresh=0;
   for(const m of matches){const id=m.metadata?.match_id;if(!id||!Array.isArray(m.players)||m.metadata.queue?.id!=='competitive')continue;const file='work/matches/'+id+'.json';if(!fs.existsSync(file)){fs.writeFileSync(file,JSON.stringify(m));fresh++;added++;}}
   console.log('Player '+(player+1)+' offset '+start+': '+matches.length+' fetched, '+fresh+' new');
   if(matches.length<10)break;
   // The endpoint may ignore pagination; terminate when an entire page repeats.
   const signature=matches.map(m=>m.metadata?.match_id).join();
   if(signature===global.lastPage)break;global.lastPage=signature;
   await new Promise(r=>setTimeout(r,2200));
  }
 }
 console.log('Done: '+added+' new matches');
 }catch(e){console.log('Sync stopped: '+e.name);}
 process.exit(0);
});

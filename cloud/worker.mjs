export {QuizRoom} from './quiz-room.mjs';
export {MatchSync} from './match-sync.mjs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export default {
  async scheduled(event,env,ctx) {
    ctx.waitUntil(env.MATCH_SYNC.get(env.MATCH_SYNC.idFromName('roster')).fetch('https://internal/ensure'));
  },
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/quiz/rooms')){
      let code=url.pathname.match(/^\/api\/quiz\/rooms\/([A-Z2-9]{6})(?:\/|$)/)?.[1];
      if(url.pathname==='/api/quiz/rooms'&&request.method==='POST'){
        const random=new Uint8Array(6);crypto.getRandomValues(random);
        const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        code=[...random].map(value=>alphabet[value%alphabet.length]).join('');
        url.searchParams.set('code',code);
      }
      if(!code)return json({error:'Geçersiz oda kodu.'},400);
      return env.QUIZ_ROOMS.get(env.QUIZ_ROOMS.idFromName(code)).fetch(new Request(url,request));
    }
    const endpoints={'/assets/profiles-data.json':'profiles','/assets/map-compositions.json':'compositions'};
    if(endpoints[url.pathname]) {
      const row=await env.DB.prepare('SELECT payload FROM snapshots WHERE name=?').bind(endpoints[url.pathname]).first();
      if(row)return new Response(row.payload,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
      return env.ASSETS.fetch(request);
    }
    if(url.pathname==='/api/status') {
      const schedulerResponse=await env.MATCH_SYNC.get(env.MATCH_SYNC.idFromName('roster')).fetch('https://internal/ensure');
      const scheduler=await schedulerResponse.json();
      const state=await env.DB.prepare('SELECT value FROM sync_state WHERE key=?').bind('status').first();
      const status=state?JSON.parse(state.value):null;
      const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM matches').first();
      return json({...(status||{ok:false,message:'İlk otomatik kontrol bekleniyor'}),matches:count.count,scheduler});
    }
    if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
    return env.ASSETS.fetch(request);
  }
};

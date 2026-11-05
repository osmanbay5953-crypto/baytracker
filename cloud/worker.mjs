const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    const endpoints={'/assets/profiles-data.json':'profiles','/assets/map-compositions.json':'compositions'};
    if(endpoints[url.pathname]) {
      const row=await env.DB.prepare('SELECT payload FROM snapshots WHERE name=?').bind(endpoints[url.pathname]).first();
      if(row)return new Response(row.payload,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
      return env.ASSETS.fetch(request);
    }
    if(url.pathname==='/api/status') {
      const state=await env.DB.prepare('SELECT value FROM sync_state WHERE key=?').bind('status').first();
      const status=state?JSON.parse(state.value):null;
      const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM matches').first();
      return json({...(status||{ok:false,message:'İlk otomatik kontrol bekleniyor'}),matches:count.count});
    }
    if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
    return env.ASSETS.fetch(request);
  }
};

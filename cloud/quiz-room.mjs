import {DurableObject} from 'cloudflare:workers';
import {makeQuestions,scoreAnswer,leaderboard,normalizeCategories,durationFor,answerQuality} from './quiz-questions.mjs';

const response=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const cleanName=value=>typeof value==='string'?value.trim().replace(/[\x00-\x1f]/g,'').slice(0,20):'';
function cookie(request){
  return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('quiz_session='))?.slice(13);
}

export class QuizRoom extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room')||null;});
  }
  async save(){
    await this.ctx.storage.put('room',this.room);
    const next=['question','reveal'].includes(this.room.phase)?this.room.deadline:this.room.expiresAt;
    await this.ctx.storage.setAlarm(Math.max(Date.now()+1,next));
  }
  state(playerId){
    const room=this.room;
    const current=room.questions[room.index];
    const reveal=room.phase==='reveal'||room.phase==='finished';
    const players=leaderboard(room.players).map(player=>({
      id:player.id,name:player.name,score:player.score,correct:player.correct,totalTime:player.totalTime,
      answered:!!room.answers[player.id],connected:this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.id===player.id)
    }));
    return {
      code:room.code,mode:room.mode,topic:room.topic,categories:room.categories,count:room.count,duration:room.duration||15000,
      phase:room.phase,index:room.index,startsAt:room.startsAt,deadline:room.deadline,
      serverTime:Date.now(),host:room.host,me:playerId,players,
      answer:room.answers[playerId]?{point:room.answers[playerId].point,bet:room.answers[playerId].bet,choice:room.answers[playerId].choice,order:room.answers[playerId].order,choices:room.answers[playerId].choices,...(reveal?{points:room.answers[playerId].points,elapsed:room.answers[playerId].elapsed,quality:room.answers[playerId].quality}:{})}:null,
      question:current&&room.phase!=='lobby'?{
        prompt:current.prompt,options:current.options,category:current.category,categoryId:current.categoryId,
        kind:current.kind||'choice',difficulty:current.difficulty||'hard',unit:current.unit,radar:current.radar,killSlots:current.killSlots,kdaSlots:current.kdaSlots,matchCard:current.matchCard,
        image:current.image?'/api/quiz/rooms/'+room.code+'/media/'+room.index:null,
        audio:current.audio?'/api/quiz/rooms/'+room.code+'/media/'+room.index:null,
        agents:current.agents||null,effect:current.effect,position:current.position,
        ...(reveal?{correct:current.answer,explanation:current.explanation,target:current.target,values:current.rankValues,source:current.source}: {})
      }:null
    };
  }
  broadcast(){
    for(const ws of this.ctx.getWebSockets()){
      try{ws.send(JSON.stringify(this.state(ws.deserializeAttachment().id)));}catch{}
    }
  }
  async fetch(request){
    return this.ctx.blockConcurrencyWhile(async()=>{
      try{return await this.handle(request);}
      catch(error){console.error('Quiz room error',error.message);return response({error:'Oda işlemi tamamlanamadı. Tekrar dene.'},500);}
    });
  }
  async body(request){
    const text=await request.text();
    if(text.length>2048)throw Error('Oversized body');
    try{return JSON.parse(text);}catch{return {};}
  }
  async handle(request){
    const url=new URL(request.url),action=url.pathname.split('/').at(-1);
    if(request.method==='POST'&&Number(request.headers.get('content-length'))>2048)return response({error:'İstek çok büyük.'},413);
    if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return response({error:'Geçersiz istek.'},403);
    if(action==='rooms'&&request.method==='POST'){
      if(this.room)return response({error:'Oda kodu dolu.'},409);
      const body=await this.body(request),name=cleanName(body.name);
      if(!name)return response({error:'Oyuncu adını yaz.'},400);
      const categories=normalizeCategories(body.categories,body.topic);
      if(!categories.length)return response({error:'En az bir kategori seç.'},400);
      if(!Number.isInteger(body.count)||body.count<5||body.count>40)return response({error:'5–40 arasında soru sayısı seç.'},400);
      const code=url.searchParams.get('code');
      const player={id:crypto.randomUUID(),token:crypto.randomUUID(),name,score:0,correct:0,totalTime:0,joinedAt:Date.now()};
      this.room={code,mode:body.mode==='solo'?'solo':'coop',topic:['team','valorant','mixed'].includes(body.topic)?body.topic:'mixed',
        categories,count:body.count,phase:'lobby',host:player.id,
        players:[player],questions:[],index:-1,answers:{},startsAt:0,deadline:0,expiresAt:Date.now()+7200000};
      try{if(this.room.mode==='solo')await this.start();else await this.prepare();}
      catch(error){this.room=null;return response({error:error.message},400);}
      await this.save();
      return this.session(request,player);
    }
    if(!this.room||this.room.expiresAt<=Date.now())return response({error:'Oda bulunamadı veya süresi doldu.'},404);
    const token=cookie(request);
    let player=this.room.players.find(player=>player.token===token);
    if(action==='join'&&request.method==='POST'){
      if(player)return this.session(request,player);
      if(this.room.mode==='solo'||this.room.phase!=='lobby')return response({error:'Bu tur başladı. Yeni tur için oda sahibini bekle.'},409);
      if(this.room.players.length>=5)return response({error:'Oda dolu. En fazla 5 kişi katılabilir.'},409);
      const body=await this.body(request),name=cleanName(body.name);
      if(!name)return response({error:'Oyuncu adını yaz.'},400);
      if(this.room.players.some(p=>p.name.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr')))
        return response({error:'Bu isim odada kullanılıyor.'},409);
      player={id:crypto.randomUUID(),token:crypto.randomUUID(),name,score:0,correct:0,totalTime:0,joinedAt:Date.now()};
      this.room.players.push(player);await this.save();this.broadcast();return this.session(request,player);
    }
    if(!player)return response({error:'Odaya yeniden katıl.'},401);
    if(url.pathname.includes('/media/')){
      const index=Number(action),question=this.room.questions[index];
      if(!Number.isInteger(index)||index!==this.room.index||!(question?.image||question?.audio))return response({error:'Görsel yok.'},404);
      const assetUrl=new URL('/'+(question.image||question.audio),url);
      const asset=await this.env.ASSETS.fetch(new Request(assetUrl));
      return new Response(asset.body,{status:asset.status,headers:{'Content-Type':asset.headers.get('Content-Type')||'image/png','Cache-Control':'private, no-store'}});
    }
    if(action==='ws'){
      if(request.headers.get('origin')!==url.origin||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')
        return response({error:'Geçersiz bağlantı.'},400);
      const samePlayer=this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment()?.id===player.id);
      if(samePlayer.length>=3)samePlayer[0].close(4001,'Another tab is active');
      const pair=new WebSocketPair(),client=pair[0],server=pair[1];
      server.serializeAttachment({id:player.id});
      this.ctx.acceptWebSocket(server);
      this.broadcast();
      return new Response(null,{status:101,webSocket:client});
    }
    if(action==='state'&&request.method==='GET')return response(this.state(player.id));
    if(action==='start'&&request.method==='POST'){
      if(player.id!==this.room.host)return response({error:'Turu oda sahibi başlatır.'},403);
      if(!['lobby','finished'].includes(this.room.phase))return response({error:'Tur zaten başladı.'},409);
      if(this.room.mode==='coop'&&this.room.players.length<2)return response({error:'Başlamak için en az 2 oyuncu gerekiyor.'},409);
      try{await this.start();}catch(error){return response({error:error.message},400);}
      await this.save();this.broadcast();return response(this.state(player.id));
    }
    if(action==='answer'&&request.method==='POST'){
      const body=await this.body(request),now=Date.now();
      if(this.room.phase!=='question'||body.index!==this.room.index||now<this.room.startsAt||now>=this.room.deadline)
        return response({error:'Bu sorunun cevap süresi kapalı.'},409);
      if(this.room.answers[player.id])return response({error:'Bu soruya zaten cevap verdin.'},409);
      const question=this.room.questions[this.room.index];
      let graded;try{graded=answerQuality(question,body);}catch(error){return response({error:error.message},400);}
      const elapsed=now-this.room.startsAt;
      const base=scoreAnswer(true,elapsed,this.room.duration||15000);
      const bet=body.bet===true;
      const points=bet?(graded.quality===1?Math.round(base*1.5):-base):Math.round(base*graded.quality);
      // Correctness and points are disclosed only when the question is over.
      this.room.answers[player.id]={...graded,elapsed,points,bet};
      if(question.categoryId!=='lineup'&&this.room.players.every(p=>this.room.answers[p.id]))this.reveal();
      await this.save();this.broadcast();return response(this.state(player.id));
    }
    if(action==='leave'&&request.method==='POST'){
      if(this.room.phase==='lobby'){
        this.room.players=this.room.players.filter(p=>p.id!==player.id);
        if(this.room.host===player.id)this.room.host=this.room.players[0]?.id||null;
        if(!this.room.players.length)this.room.expiresAt=Date.now()+1000;
      }
      for(const ws of this.ctx.getWebSockets())if(ws.deserializeAttachment()?.id===player.id)ws.close(1000,'Left room');
      await this.save();this.broadcast();return response({ok:true},200);
    }
    return response({error:'İşlem bulunamadı.'},404);
  }
  session(request,player){
    const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
    return response(this.state(player.id),200,{'Set-Cookie':'quiz_session='+player.token+
      '; HttpOnly; SameSite=Strict; Max-Age=7200; Path=/api/quiz/rooms/'+this.room.code+secure});
  }
  async prepare(){
    const record=await this.env.DB.prepare("SELECT payload FROM snapshots WHERE name='profiles'").first();
    const data=record?JSON.parse(record.payload):null;
    const recent=[...(this.room.questions||[]).map(q=>q.id),...(this.room.recent||[])];
    const questions=makeQuestions(data,this.room.topic,this.room.count,this.room.categories,recent);
    return questions;
  }
  async start(){
    const questions=await this.prepare();
    this.room.recent=[...(this.room.questions||[]).map(q=>q.id),...(this.room.recent||[])].slice(0,100);
    this.room.questions=questions;
    this.room.index=0;this.room.phase='question';this.room.answers={};
    this.room.duration=durationFor(questions[0]);
    this.room.startsAt=Date.now()+3000;this.room.deadline=this.room.startsAt+this.room.duration;
    for(const player of this.room.players){player.score=0;player.correct=0;player.totalTime=0;}
  }
  reveal(){
    if(this.room.phase!=='question')return;
    const correct=this.room.questions[this.room.index].answer;
    for(const player of this.room.players){
      const answer=this.room.answers[player.id];
      if(answer){player.score+=answer.points;if((answer.quality??+(answer.choice===correct))===1)player.correct++;if(answer.points)player.totalTime+=answer.elapsed;}
    }
    this.room.phase='reveal';this.room.deadline=Date.now()+5000;
  }
  async alarm(){
    return this.ctx.blockConcurrencyWhile(async()=>{
      if(!this.room)return;
      if(this.room.expiresAt<=Date.now()){
        for(const ws of this.ctx.getWebSockets())ws.close(1000,'Oda süresi doldu');
        this.room=null;await this.ctx.storage.deleteAll();return;
      }
      if(Date.now()<this.room.deadline&&['question','reveal'].includes(this.room.phase)){await this.save();return;}
      if(this.room.phase==='question')this.reveal();
      else if(this.room.phase==='reveal'){
        if(this.room.index+1>=this.room.count){this.room.phase='finished';this.room.expiresAt=Date.now()+1800000;}
        else{
          this.room.index++;this.room.phase='question';this.room.answers={};
          this.room.duration=durationFor(this.room.questions[this.room.index]);
          this.room.startsAt=Date.now()+1500;this.room.deadline=this.room.startsAt+this.room.duration;
        }
      }
      await this.save();this.broadcast();
    });
  }
  async webSocketClose(){this.broadcast();}
  async webSocketError(){this.broadcast();}
  async webSocketMessage(ws,message){
    if(message==='ping')ws.send('pong');
  }
}

const app=document.querySelector('#quiz-app');
const errorBox=document.querySelector('#quiz-error');
const node=(tag,className,text)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!=null)element.textContent=text;
  return element;
};
const number=value=>new Intl.NumberFormat('tr-TR').format(value);
const params=new URLSearchParams(location.search);
let state=null,socket=null,offset=0,pending=false,retryTimer=null;
let renderedQuestion='';
let currentCode=params.get('room')?.toUpperCase()||'';
let rememberedName='';
try{rememberedName=localStorage.getItem('baytracker.quiz.name')||'';}catch{}
const icons={
  solo:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 22v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3',
  room:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 3a4 4 0 0 1 0 8 M18 15a4 4 0 0 1 4 4v2',
  trophy:'M7 3h10v5a5 5 0 0 1-10 0z M7 5H3v2c0 3 2 4 5 4 M17 5h4v2c0 3-2 4-5 4 M12 13v7 M8 21h8'
};
function icon(type){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','quiz-icon');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',icons[type]);svg.append(path);return svg;
}
function button(text,callback,className='quiz-button'){
  const b=node('button',className,text);b.type='button';b.addEventListener('click',callback);return b;
}
function input(label,name,value,max=20){
  const wrap=node('label','quiz-field',label),field=node('input');
  field.name=name;field.value=value;field.maxLength=max;field.required=true;field.autocomplete=name==='name'?'nickname':'off';
  wrap.append(field);return {wrap,field};
}
function topicName(topic){return {team:'Bizim takım',valorant:'VALORANT',mixed:'Karışık'}[topic];}
function report(error){errorBox.textContent=error.message||'İşlem tamamlanamadı. Tekrar dene.';}
async function api(path,body){
  const response=await fetch('/api/quiz/rooms'+path,{
    method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store'
  });
  let payload;try{payload=await response.json();}catch{throw Error('Quiz servisine ulaşılamıyor. Biraz sonra tekrar dene.');}
  if(!response.ok)throw Error(payload.error||'Quiz servisine ulaşılamıyor.');
  return payload;
}
function setState(next){
  if(state&&next.code===state.code&&next.serverTime<state.serverTime)return;
  state=next;currentCode=next.code;offset=Date.now()-next.serverTime;
  render();
}
function connect(){
  if(socket){socket.onclose=null;socket.close();}
  clearTimeout(retryTimer);
  const connection=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/quiz/rooms/'+currentCode+'/ws');
  socket=connection;
  connection.onmessage=event=>{if(event.data==='pong')return;try{setState(JSON.parse(event.data));}catch{}};
  connection.onopen=()=>{const status=document.querySelector('#connection');if(status)status.textContent='Canlı';};
  connection.onclose=event=>{
    if(socket!==connection)return;
    if(event.code===4001){report(new Error('Quiz diğer sekmende açık. O sekmeden devam edebilirsin.'));return;}
    const status=document.querySelector('#connection');if(status)status.textContent='Yeniden bağlanıyor…';
    retryTimer=setTimeout(async()=>{
      try{setState(await api('/'+currentCode+'/state'));connect();}
      catch(error){report(error);socket=null;}
    },2000);
  };
}
function remember(name){try{localStorage.setItem('baytracker.quiz.name',name);}catch{}}
async function enter(mode,form){
  const values=new FormData(form),name=String(values.get('name')||'').trim();
  if(!form.reportValidity())return;
  errorBox.textContent='';
  for(const b of form.querySelectorAll('button'))b.disabled=true;
  try{
    const next=mode==='join'?await api('/'+String(values.get('code')).trim().toUpperCase()+'/join',{name}):
      await api('',{name,mode,topic:values.get('topic'),count:Number(values.get('count'))});
    remember(name);
    history.replaceState(null,'','quiz.html?room='+next.code);
    setState(next);connect();
  }catch(error){report(error);for(const b of form.querySelectorAll('button'))b.disabled=false;}
}
function home(){
  state=null;
  const hero=node('section','quiz-hero');
  const copy=node('div');
  copy.append(node('span','quiz-kicker','BAYTRACKER QUIZ'),node('h1',null,'OYUNU NE KADAR\nİYİ TANIYORSUN?'),
    node('p',null,'Takımını hatırla. Ajanı tanı. Hızlı cevapla.'));
  const visual=node('img','quiz-hero-art');visual.src='assets/cypher.png';visual.alt='';
  hero.append(copy,visual);
  const setup=node('form','quiz-setup');
  const name=input('Oyuncu adın','name',rememberedName);setup.append(name.wrap);
  for(const [title,key,options] of [
    ['Konu','topic',[['mixed','Karışık'],['team','Bizim takım'],['valorant','VALORANT']]],
    ['Tur uzunluğu','count',[['10','10 soru'],['15','15 soru'],['20','20 soru']]]
  ]){
    const label=node('label','quiz-field',title),select=node('select');select.name=key;
    for(const [value,text] of options){const option=node('option',null,text);option.value=value;select.append(option);}
    label.append(select);setup.append(label);
  }
  const modes=node('div','quiz-modes');
  for(const [mode,title,description] of [['solo','Solo oyna','Kendi puanını yükselt.'],['coop','Oda kur','2–5 kişi aynı sorularda yarışın.']]){
    const b=button('',()=>enter(mode,setup),'mode-card');
    b.append(icon(mode==='solo'?'solo':'room'),node('strong',null,title),node('span',null,description));modes.append(b);
  }
  setup.append(modes);setup.addEventListener('submit',event=>event.preventDefault());
  const join=node('form','quiz-join'),title=node('h2',null,'Bir odaya katıl');
  const joinName=input('Oyuncu adın','name',rememberedName),code=input('Oda kodu','code',currentCode,6);
  code.field.className='room-code-input';code.field.pattern='[A-Za-z2-9]{6}';
  const b=node('button','quiz-button','Katıl');b.type='submit';
  join.append(title,joinName.wrap,code.wrap,b);
  join.addEventListener('submit',event=>{event.preventDefault();enter('join',join);});
  app.replaceChildren(hero,setup,join,node('p','quiz-rules','15 saniye · Doğru cevaba 500 + hız puanı · Eşitlikte doğru sayısı ve cevap süresi'));
}
function rankings(){
  const aside=node('aside','quiz-rankings');
  const title=node('h2',null,'Sıralama');title.prepend(icon('trophy'));aside.append(title);
  state.players.forEach((player,index)=>{
    const row=node('div','ranking-row'+(player.id===state.me?' is-me':''));
    const avatar=node('span','quiz-avatar',player.name[0].toUpperCase());
    const copy=node('span','ranking-copy');
    copy.append(node('strong',null,player.name),node('small',null,
      (player.id===state.me?'Sen · ':'')+(state.phase==='question'&&player.answered?'Cevapladı':player.correct+' doğru')));
    row.append(node('span','rank-position',String(index+1)),avatar,copy,node('b',null,number(player.score)));
    aside.append(row);
  });
  aside.append(node('small','ranking-note','Eşit puanda doğru sayısı, ardından doğru cevap süresi.'));
  return aside;
}
async function copyLink(){
  try{await navigator.clipboard.writeText(location.origin+'/quiz.html?room='+state.code);
    const status=document.querySelector('#room-feedback');if(status)status.textContent='Oda bağlantısı kopyalandı.';}
  catch{const status=document.querySelector('#room-feedback');if(status)status.textContent='Oda kodu: '+state.code;}
}
async function start(){
  try{errorBox.textContent='';setState(await api('/'+state.code+'/start',{}));}catch(error){report(error);}
}
function lobby(){
  const section=node('section','quiz-lobby');
  section.append(icon('room'),node('span','quiz-kicker',topicName(state.topic)+' · '+state.count+' soru'),
    node('h1',null,'ODA HAZIR'),node('p',null,'Kodu paylaş, arkadaşların katılsın.'));
  section.append(button(state.code,copyLink,'room-code'),button('Bağlantıyı kopyala',copyLink,'quiz-button secondary'));
  section.append(node('p','room-feedback',''));
  section.lastElementChild.id='room-feedback';
  if(state.host===state.me){
    const b=button('Turu başlat',start);b.disabled=state.players.length<2;section.append(b);
    section.append(node('small','ranking-note',state.players.length<2?'Başlamak için bir arkadaşını bekle.':'Herkes hazırsa başlatabilirsin.'));
  }else section.append(node('p',null,'Oda sahibi turu başlatacak.'));
  return section;
}
async function answer(index){
  if(pending||state.answer)return;
  pending=true;tick();errorBox.textContent='';
  try{setState(await api('/'+state.code+'/answer',{index:state.index,choice:index}));}
  catch(error){report(error);}
  finally{pending=false;tick();}
}
function question(){
  const q=state.question,panel=node('section','quiz-question');
  const top=node('div','question-top');
  top.append(node('span','quiz-kicker',(state.index+1)+' / '+state.count+' · '+(q.category==='team'?'Bizim takım':'VALORANT')));
  const timer=node('span','quiz-timer');timer.id='quiz-timer';top.append(timer);
  const track=node('div','quiz-time-track'),fill=node('i');fill.id='quiz-time-fill';track.append(fill);
  panel.append(top,track,node('h1',null,q.prompt));
  if(q.image){
    const frame=node('div','question-media '+q.effect),image=node('img');
    image.src=q.image;image.alt='Soru görseli';if(q.position)image.style.objectPosition=q.position;
    frame.append(image);panel.append(frame);
  }
  if(q.audio){
    const frame=node('div','question-audio');
    frame.append(node('span','audio-wave','▂ ▅ ▇ ▃ ▆ ▂ ▇ ▄ ▃ ▆ ▂'),node('p',null,'Dinle ve silahı bul'));
    const audio=node('audio');audio.src=q.audio;audio.controls=true;audio.preload='auto';audio.volume=.35;
    frame.append(audio);panel.append(frame);
  }
  if(q.agents){
    const agents=node('div','question-agents');
    for(const agent of q.agents){
      const tile=node('div'),img=node('img');img.src='assets/agents/'+agent.toLowerCase().replace(/[^a-z0-9-]/g,'-')+'-icon.png';img.alt='';
      tile.append(img,node('span',null,agent));agents.append(tile);
    }
    agents.append(node('span','missing-agent','?'));panel.append(agents);
  }
  const choices=node('div','quiz-choices');
  q.options.forEach((option,index)=>{
    const b=button('',()=>answer(index),'quiz-choice');
    b.dataset.choice=index;
    b.append(node('span','choice-letter',String.fromCharCode(65+index)),node('span',null,option));
    if(state.answer?.choice===index)b.classList.add('selected');
    if(state.phase==='reveal'){
      if(q.correct===index)b.classList.add('correct');
      else if(state.answer?.choice===index)b.classList.add('incorrect');
    }
    choices.append(b);
  });
  panel.append(choices);
  const feedback=node('div','quiz-feedback');feedback.setAttribute('aria-live','polite');
  if(state.phase==='reveal'){
    const correct=state.answer?.choice===q.correct;
    feedback.append(node('strong',correct?'positive':'',correct?'Doğru! +'+number(state.answer.points)+' puan':state.answer?'Bu kez olmadı.':'Süre doldu.'));
    feedback.append(node('p',null,q.explanation));
  }else if(state.answer)feedback.append(node('p',null,'Cevabın kaydedildi. Diğer oyuncuları bekliyoruz.'));
  panel.append(feedback);return panel;
}
function results(){
  const section=node('section','quiz-results'),me=state.players.find(p=>p.id===state.me),winner=state.players[0];
  section.append(icon('trophy'),node('span','quiz-kicker','TUR TAMAMLANDI'),
    node('h1',null,state.mode==='solo'?'İYİ OYUNDU, '+me.name.toUpperCase():winner.name.toUpperCase()+' KAZANDI!'),
    node('strong','final-score',number(state.mode==='solo'?me.score:winner.score)),
    node('p',null,state.mode==='solo'?me.correct+' / '+state.count+' doğru · '+(me.correct?(me.totalTime/me.correct/1000).toFixed(1):'—')+' sn ortalama':winner.correct+' doğru cevap'));
  if(state.host===state.me)section.append(button('Yeni tur',start));
  else section.append(node('p',null,'Yeni turu oda sahibi başlatabilir.'));
  return section;
}
async function leave(){
  if(!confirm('Odadan çıkmak istiyor musun?'))return;
  try{await api('/'+state.code+'/leave',{});}catch{}
  if(socket){socket.onclose=null;socket.close();socket=null;}
  clearTimeout(retryTimer);currentCode='';history.replaceState(null,'','quiz.html');home();
}
function render(){
  const viewKey=state.code+':'+state.phase+':'+state.index;
  if(state.phase==='question'&&viewKey===renderedQuestion&&app.querySelector('.quiz-question')){
    app.querySelector('.quiz-rankings')?.replaceWith(rankings());
    for(const choice of app.querySelectorAll('[data-choice]'))
      choice.classList.toggle('selected',Number(choice.dataset.choice)===state.answer?.choice);
    if(state.answer)app.querySelector('.quiz-feedback').textContent='Cevabın kaydedildi. Diğer oyuncuları bekliyoruz.';
    tick();return;
  }
  renderedQuestion=viewKey;
  const previous=document.activeElement?.dataset.choice;
  const toolbar=node('div','quiz-toolbar');
  toolbar.append(node('h2',null,state.mode==='solo'?'SOLO QUIZ':'ODA '+state.code));
  const connected=node('span','connection',socket?.readyState===1?'Canlı':'Bağlanıyor…');connected.id='connection';
  toolbar.append(connected,button('Çık',leave,'quiz-exit'));
  const layout=node('div','quiz-layout');
  layout.append(state.phase==='lobby'?lobby():state.phase==='finished'?results():question(),rankings());
  app.replaceChildren(toolbar,layout);tick();
  if(previous!=null)app.querySelector('[data-choice="'+previous+'"]')?.focus();
}
function tick(){
  if(!state)return;
  const now=Date.now()-offset;
  const active=state.phase==='question'&&now>=state.startsAt&&now<state.deadline;
  const timer=document.querySelector('#quiz-timer'),fill=document.querySelector('#quiz-time-fill');
  if(timer)timer.textContent=state.phase==='reveal'?'Sonraki soru '+Math.max(0,Math.ceil((state.deadline-now)/1000))+' sn':
    now<state.startsAt?'Başlıyor '+Math.ceil((state.startsAt-now)/1000):
    Math.max(0,Math.ceil((state.deadline-now)/1000))+' sn';
  if(fill)fill.style.width=(state.phase==='question'?Math.min(100,Math.max(0,(state.deadline-now)/150)):0)+'%';
  for(const button of app.querySelectorAll('[data-choice]'))button.disabled=!active||!!state.answer||pending;
}
setInterval(tick,100);
document.addEventListener('visibilitychange',async()=>{
  if(document.hidden||!state)return;
  try{setState(await api('/'+currentCode+'/state'));if(!socket||socket.readyState>1)connect();}catch(error){report(error);}
});
(async()=>{
  if(currentCode&&/^[A-Z2-9]{6}$/.test(currentCode)){
    try{setState(await api('/'+currentCode+'/state'));connect();return;}catch{}
  }
  home();
})();

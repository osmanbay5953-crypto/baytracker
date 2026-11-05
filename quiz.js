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
let pinDraft=null,betDraft=false;
let renderedQuestion='',draftKey='',rankDraft=[],multiDraft=new Set(),lastCue='',lastTick='';
const quizSettings=await fetch('assets/quiz-settings.json').then(r=>r.json());
const categoryLabel=id=>quizSettings.categories.find(c=>c.id===id)?.label||'VALORANT';
const cue=name=>window.BayUI?.quizSound?.(name);
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function burst(panel){
  if(!panel||reducedMotion())return;
  const particles=node('div','quiz-sparks');particles.setAttribute('aria-hidden','true');
  for(let i=0;i<12;i++){const spark=node('i');spark.style.setProperty('--angle',i*30+'deg');spark.style.setProperty('--distance',45+(i%3)*17+'px');spark.style.setProperty('--delay',(i%4)*22+'ms');particles.append(spark);}
  panel.append(particles);setTimeout(()=>particles.remove(),1000);
}
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
      await api('',{name,mode,topic:values.get('topic'),count:Number(values.get('count')),categories:values.getAll('categories')});
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
  const count=input('Soru sayısı','count','15',2);count.field.type='number';count.field.min=5;count.field.max=40;count.field.step=1;const countNote=node('small','count-note','5–40 soru');count.wrap.append(countNote);setup.append(count.wrap);
  const categoryBox=node('details','quiz-categories'),legend=node('summary',null,'Kategoriler');categoryBox.append(legend);
  const presets=node('div','category-presets');
  const updateLimit=()=>{const ids=[...categoryBox.querySelectorAll('input:checked')].map(c=>c.value);const limit=Math.min(40,ids.reduce((sum,id)=>sum+(quizSettings.categories.find(c=>c.id===id)?.limit||40),0));legend.textContent='Kategoriler · '+ids.length+' seçili';count.field.max=String(Math.max(5,limit));count.field.title='Bu seçimde en fazla '+limit+' soru';countNote.textContent=ids.length?'5–'+limit+' soru':'Kategori seç';if(Number(count.field.value)>limit&&limit>=5)count.field.value=String(limit);};
  const selectCategories=ids=>{for(const field of categoryBox.querySelectorAll('input'))field.checked=ids.includes(field.value);updateLimit();};
  const teamIds=['records','favorites','comps','ranking','lineup'];
  for(const [label,ids]of [['Tümü',quizSettings.categories.map(c=>c.id)],['Takım',teamIds],['VALORANT',quizSettings.categories.filter(c=>!teamIds.includes(c.id)).map(c=>c.id)]])presets.append(button(label,()=>selectCategories(ids),'category-preset'));
  categoryBox.append(presets);
  const chips=node('div','category-chips');
  for(const category of quizSettings.categories){const label=node('label','category-chip'),check=node('input');check.type='checkbox';check.name='categories';check.value=category.id;check.checked=true;label.append(check,node('span',null,category.label));chips.append(label);}
  categoryBox.append(chips);categoryBox.addEventListener('change',updateLimit);setup.append(categoryBox);updateLimit();
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
  app.replaceChildren(hero,setup,join,node('p','quiz-rules','Soruya göre 20–35 saniye · Doğruluk + hız puanı · Sıralama ve çoklu seçimlerde kısmi puan'));
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
  section.append(icon('room'),node('span','quiz-kicker',(state.categories?.length||0)+' kategori · '+state.count+' soru'),
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
async function answer(payload){
  if(pending||state.answer)return;
  cue('lock');
  const selected=app.querySelector('[data-choice="'+payload.choice+'"]');
  selected?.classList.add('answer-lock');
  pending=true;tick();errorBox.textContent='';
  try{setState(await api('/'+state.code+'/answer',{index:state.index,bet:betDraft,...payload}));}
  catch(error){report(error);}
  finally{pending=false;tick();}
}
function question(){
  const q=state.question,panel=node('section','quiz-question');
  const key=state.code+':'+state.index;if(draftKey!==key){draftKey=key;pinDraft=null;betDraft=false;rankDraft=q.options.map((_,i)=>i);multiDraft=new Set();}
  const top=node('div','question-top');
  const meta=node('div','question-meta');meta.append(node('span','quiz-kicker',(state.index+1)+' / '+state.count+' · '+categoryLabel(q.categoryId)),node('span','difficulty '+(q.difficulty||'hard'),q.difficulty==='expert'?'UZMAN':'ZOR'));top.append(meta);
  const timer=node('span','quiz-timer');timer.id='quiz-timer';top.append(timer);
  const track=node('div','quiz-time-track'),fill=node('i');fill.id='quiz-time-fill';track.append(fill);
  panel.append(top,track);
  if(q.matchCard){
    const {date,map,score}=q.matchCard;
    const banner=node('header','lineup-banner');
    const art=node('img');art.src='assets/maps/'+encodeURIComponent(map.toLowerCase())+'-bg.png';art.alt='';
    const [ours,theirs]=score.split(/[–-]/).map(Number);
    const result=node('h1','lineup-score '+(ours===theirs?'draw':ours>theirs?'win':'loss'),score);
    result.setAttribute('aria-label','Takımımız '+ours+', rakip '+theirs);
    banner.append(art,node('time','lineup-date',date),result,node('span','lineup-map',map));panel.append(banner);
  }else panel.append(node('h1',null,q.prompt));
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
  const kind=q.kind||'choice';
  if(state.phase==='question'){
    const bet=button('Bahis',()=>{if(pending||state.answer)return;betDraft=!betDraft;bet.setAttribute('aria-pressed',String(betDraft));cue('select');},'quiz-bet');
    bet.setAttribute('aria-pressed',String(state.answer?.bet??betDraft));bet.title='Tam doğruysa normal puanın 1,5 katını kazanırsın. Diğer sonuçlarda normal puan kadar kaybedersin.';panel.append(bet);
  }
  if(kind==='pin'){
    const board=node('div','pin-board');board.tabIndex=0;board.setAttribute('aria-label','Konumu seç. Ok tuşlarıyla da taşıyabilirsin.');
    const radar=node('img');radar.src=q.radar;radar.alt='Harita planı';board.append(radar);
    const marker=(point,cls)=>{const dot=node('i','pin-dot '+cls);dot.style.left=point[0]*100+'%';dot.style.top=point[1]*100+'%';board.append(dot);};
    const paint=()=>{board.querySelectorAll('i').forEach(dot=>dot.remove());const point=state.answer?.point||pinDraft;if(point)marker(point,'guess');if(q.target)marker(q.target,'solution');};
    board.onclick=e=>{if(state.phase!=='question'||state.answer||pending)return;const rect=board.getBoundingClientRect();pinDraft=[(e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height].map(v=>Math.max(0,Math.min(1,v)));paint();cue('move');};
    board.onkeydown=e=>{if(!e.key.startsWith('Arrow')||state.answer||state.phase!=='question')return;e.preventDefault();pinDraft??=[.5,.5];const axis=['ArrowLeft','ArrowRight'].includes(e.key)?0:1;pinDraft[axis]=Math.min(1,Math.max(0,pinDraft[axis]+(['ArrowLeft','ArrowUp'].includes(e.key)?-.02:.02)));paint();};
    paint();panel.append(board);
    if(state.phase==='question')panel.append(button('Konumu gönder',()=>pinDraft?answer({point:pinDraft}):report(Error('Önce haritada bir nokta seç.')),'quiz-button quiz-submit'));
    else panel.append(node('p','question-hint','Altın halka tahminin, yeşil nokta doğru bölge.'));
  }else if(kind==='ranking'){
    if(q.killSlots)panel.append(node('strong','kill-strip',q.killSlots.join('   /   ')+'   KILL'));
    if(q.kdaSlots)panel.append(node('p','lineup-instruction','Oyuncuları soldaki K / D / A değerleriyle eşleştir.'));
    else panel.append(node('p','question-hint','Sürükle veya oklarla taşı. 1 = en yüksek. Doğru ikili sıralamalar kadar puan kazanırsın.'));
    const list=node('ol','quiz-ordering');
    const paint=()=>{
      list.replaceChildren();
      const order=state.answer?.order||rankDraft;
      order.forEach((item,position)=>{
        const row=node('li','ordering-row');if(q.kdaSlots)row.classList.add('kda-row');row.draggable=state.phase==='question'&&!state.answer;row.tabIndex=0;row.dataset.item=item;
        row.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();move(position,position+(event.key==='ArrowUp'?-1:1));}});
        row.append(node('span','ordering-position',q.kdaSlots?q.kdaSlots[position].join(' / '):q.killSlots?q.killSlots[position]+' K':String(position+1)),node('span','ordering-grip','⠿'),node('strong',null,q.options[item]));
        if(state.phase==='reveal'){
          const correctValue=q.values?.[q.correct[position]],right=q.kdaSlots?q.kdaSlots[q.correct.indexOf(item)].join()===q.kdaSlots[position].join():q.values?.[item]===correctValue;row.classList.add(right?'rank-right':'rank-off');
          row.append(node('small',null,number(q.values?.[item]||0)+' '+(q.unit||'')));
        }else{
          const controls=node('span','ordering-controls');
          for(const [text,delta]of [['↑',-1],['↓',1]]){const b=button(text,()=>move(position,position+delta),'order-move');b.setAttribute('aria-label',q.options[item]+' '+(delta<0?'yukarı':'aşağı'));b.disabled=!!state.answer||position+delta<0||position+delta>=order.length;b.dataset.orderControl='';b.dataset.edge=String(position+delta<0||position+delta>=order.length);controls.append(b);}row.append(controls);
        }
        row.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',String(position));row.classList.add('dragging');});
        row.addEventListener('dragover',event=>{if(!state.answer){event.preventDefault();row.classList.add('drop-target');}});
        row.addEventListener('dragleave',()=>row.classList.remove('drop-target'));
        row.addEventListener('dragend',()=>row.classList.remove('dragging'));
        row.addEventListener('drop',event=>{event.preventDefault();row.classList.remove('drop-target');const value=event.dataTransfer.getData('text/plain');if(/^\d+$/.test(value))move(Number(value),position);});
        list.append(row);
      });
    };
    const move=(from,to)=>{
      if(state.answer||state.phase!=='question'||to===from||to<0||to>=rankDraft.length||from<0||from>=rankDraft.length)return;
      const before=new Map([...list.children].map(row=>[row.dataset.item,row.getBoundingClientRect().top]));
      const [item]=rankDraft.splice(from,1);rankDraft.splice(to,0,item);cue('move');paint();tick();
      if(!q.kdaSlots&&!reducedMotion())for(const row of list.children){const dy=before.get(row.dataset.item)-row.getBoundingClientRect().top;row.animate([{transform:'translateY('+dy+'px)'},{transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});}
      list.children[to]?.classList.add('just-moved');list.children[to]?.focus({preventScroll:true});
    };
    paint();panel.append(list);
    if(state.phase!=='reveal'){const submit=button('Sıralamayı gönder',()=>answer({order:rankDraft}),'quiz-button quiz-submit');panel.append(submit);}
    else{const solution=node('div','rank-solution');solution.append(node('h3',null,'Doğru sıralama'));for(const [position,i]of q.correct.entries())solution.append(node('p',null,(position+1)+'. '+q.options[i]+' · '+number(q.values[i])+' '+(q.unit||'')));panel.append(solution);}
  }else{
    if(kind==='multiple')panel.append(node('p','question-hint','Birden fazla seçeneği işaretle ve gönder. Yanlış işaretler puanı azaltır.'));
    const choices=node('div','quiz-choices');
    q.options.forEach((option,index)=>{
      const b=button('',()=>{
        if(kind==='choice')answer({choice:index});
        else{multiDraft.has(index)?multiDraft.delete(index):multiDraft.add(index);b.classList.toggle('selected',multiDraft.has(index));b.setAttribute('aria-pressed',String(multiDraft.has(index)));cue('select');}
      },'quiz-choice');b.dataset.choice=index;
      b.append(node('span','choice-letter',kind==='multiple'?'□':String.fromCharCode(65+index)),node('span',null,option));
      const selected=kind==='multiple'?(state.answer?.choices||[...multiDraft]).includes(index):state.answer?.choice===index;
      if(selected)b.classList.add('selected');
      if(kind==='multiple')b.setAttribute('aria-pressed',String(selected));
      if(state.phase==='reveal'){
        if(kind==='multiple'?q.correct.includes(index):q.correct===index)b.classList.add('correct');
        else if(selected)b.classList.add('incorrect');
      }
      choices.append(b);
    });
    panel.append(choices);
    if(kind==='multiple'&&state.phase!=='reveal')panel.append(button('Seçimleri gönder',()=>answer({choices:[...multiDraft]}),'quiz-button quiz-submit'));
  }
  const feedback=node('div','quiz-feedback');feedback.setAttribute('aria-live','polite');
  if(state.phase==='reveal'){
    const quality=state.answer?.quality??+(!!state.answer&&state.answer.choice===q.correct),correct=quality===1;
    panel.dataset.outcome=correct?'correct':state.answer?.points>0?'partial':'wrong';
    const badge=node('span','feedback-badge',correct?'✓':state.answer?.points>0?'↗':'−');badge.setAttribute('aria-hidden','true');feedback.append(badge);
    feedback.append(node('strong',correct?'positive':'',correct?'Tam doğru! +'+number(state.answer.points)+' puan':state.answer?.points<0?'Bahis kaybedildi · '+number(state.answer.points)+' puan':state.answer?.points?'%'+Math.round(quality*100)+' uyum · +'+number(state.answer.points)+' puan':state.answer?'Bu kez olmadı.':'Süre doldu.'));
    feedback.append(node('p',null,q.explanation));
    if(q.source){const source=node('a','quiz-source','Kaynak');source.href=q.source;source.target='_blank';source.rel='noopener noreferrer';feedback.append(source);}
  }else if(state.answer)feedback.append(node('p',null,'Cevabın kaydedildi. Sonuç bekleniyor.'));
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
  if(lastCue!==viewKey){lastCue=viewKey;cue(state.phase==='reveal'?(state.answer?.quality===1?'correct':state.answer?.points>0?'partial':'wrong'):state.phase==='finished'?'finish':'question');}
  if(state.phase==='question'&&viewKey===renderedQuestion&&app.querySelector('.quiz-question')){
    app.querySelector('.quiz-rankings')?.replaceWith(rankings());
    for(const choice of app.querySelectorAll('[data-choice]'))
      choice.classList.toggle('selected',state.question.kind==='multiple'?(state.answer?.choices||[...multiDraft]).includes(Number(choice.dataset.choice)):Number(choice.dataset.choice)===state.answer?.choice);
    if(state.answer)app.querySelector('.quiz-feedback').textContent='Cevabın kaydedildi. Sonuç bekleniyor.';
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
  if(state.phase==='reveal'&&state.answer?.quality===1)burst(layout.querySelector('.quiz-question'));
  if(state.phase==='finished')burst(layout.querySelector('.quiz-results'));
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
  if(fill)fill.style.width=(state.phase==='question'?Math.min(100,Math.max(0,100*(state.deadline-now)/(state.duration||15000))):0)+'%';
  for(const button of app.querySelectorAll('[data-choice],.quiz-submit'))button.disabled=!active||!!state.answer||pending;
  for(const button of app.querySelectorAll('[data-order-control]'))button.disabled=!active||!!state.answer||pending||button.dataset.edge==='true';
  const bet=app.querySelector('.quiz-bet');if(bet)bet.disabled=!!state.answer||pending;
  const millisecondsLeft=state.deadline-now,remaining=Math.ceil(millisecondsLeft/1000);
  app.querySelector('.quiz-question')?.classList.toggle('time-critical',active&&!state.answer&&remaining<=5);
  if(active&&!state.answer&&!pending&&remaining<=8){
    const interval=remaining<=2?250:remaining<=4?500:1000;
    const tickKey=[state.code,state.index,interval,Math.ceil(millisecondsLeft/interval)].join(':');
    if(lastTick!==tickKey){
      lastTick=tickKey;
      cue(interval===250?'tickUrgent':interval===500?'tickFast':'tick');
    }
  }
}
setInterval(tick,100);
app.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'||reducedMotion())return;
  const card=event.target.closest('.quiz-choice,.mode-card');if(!card)return;
  const box=card.getBoundingClientRect();card.style.setProperty('--pointer-x',event.clientX-box.left+'px');card.style.setProperty('--pointer-y',event.clientY-box.top+'px');
});
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

import pins from './quiz-pins.json' with {type:'json'};
import catalog from './quiz-catalog.json' with {type:'json'};
import settings from '../assets/quiz-settings.json' with {type:'json'};

export const categoryIds=settings.categories.map(c=>c.id);
const teamCategories=['records','favorites','comps','ranking','lineup'];
export function normalizeCategories(value,topic='mixed'){
  if(Array.isArray(value))return [...new Set(value.filter(x=>categoryIds.includes(x)))];
  return topic==='team'?teamCategories:topic==='valorant'?categoryIds.filter(x=>!teamCategories.includes(x)):categoryIds;
}
export function durationFor(q){return q?.kind==='ranking'?35000:q?.kind==='multiple'?25000:20000;}

export function shuffle(items) {
  const list=[...items];
  for(let i=list.length-1;i>0;i--){
    const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
    const j=bytes[0]%(i+1);[list[i],list[j]]=[list[j],list[i]];
  }
  return list;
}
const slug=name=>name.toLowerCase().replace(/[^a-z0-9-]/g,'-');
const dateLabel=value=>new Date(value).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'});

function choice(id,prompt,correct,alternatives,explanation,extra={}) {
  const options=shuffle([correct,...shuffle([...new Set(alternatives)].filter(x=>x!==correct)).slice(0,3)]);
  if(options.length!==4)return null;
  return {id,kind:'choice',difficulty:'hard',category:'team',prompt,options,answer:options.indexOf(correct),explanation,...extra};
}

export function teamQuestions(data) {
  const questions=[];
  if(!data?.players?.length)return questions;
  const players=data.players;
  const names=players.map(p=>p.name);
  const agentNames=[...new Set(players.flatMap(p=>p.groups.all.agents.map(a=>a.name)))];
  for(const player of players){
    for(const act of data.acts){
      const group=player.groups[act];if(!group?.matches)continue;
      const label=act.replace(/^e(\d+)a(\d+)$/,'Bölüm $1 Act $2');
      if(group.agents.length&&group.agents[0].matches>(group.agents[1]?.matches||0)){
        questions.push(choice('favorite-'+player.id+act,
          label+' beşli maçlarında '+player.name+' en çok hangi ajanı oynadı?',
          group.agent,agentNames,group.agent+' ile '+group.agentMatches+' maç. Bu sorunun arşivinde toplam '+group.matches+' beşli maç var.'));
      }
    }
    for(const match of player.groups.all.history){
      const signature=match.kills+' / '+match.assists+' / '+match.deaths;
      const ambiguous=players.some(other=>other.id!==player.id&&other.groups.all.history.some(
        row=>row.date===match.date&&row.agent===match.agent&&row.kills===match.kills&&
          row.assists===match.assists&&row.deaths===match.deaths));
      if(ambiguous)continue;
      questions.push(choice('score-'+player.id+match.date,
        dateLabel(match.date)+' · '+match.map+' · '+match.agent+' ile '+signature+' K/A/D kimin?',
        player.name,names,player.name+' bu maçta '+match.agent+' oynadı. Takım skoru '+match.score+'.',
        {image:'assets/maps/'+slug(match.map)+'-bg.png',effect:'map-wide'}));
    }
  }
  const uniqueComps=new Set();
  for(const comp of data.team.all.comps){
    const signature=comp.map+comp.agents.slice().sort().join();
    if(uniqueComps.has(signature))continue;uniqueComps.add(signature);
    const missing=comp.agents[0];
    questions.push(choice('missing-'+signature,
      comp.map+' comp’umuzdaki eksik ajan hangisi?',missing,
      agentNames.filter(name=>!comp.agents.includes(name)),
      'Oynadığımız beşli: '+comp.agents.join(', ')+'.',
      {agents:comp.agents.slice(1),effect:'missing-agent'}));
  }
  return questions.filter(Boolean).map(q=>({...q,categoryId:q.id.startsWith('favorite-')?'favorites':q.id.startsWith('missing-')?'comps':'records'}));
}

export function rankingQuestions(data){
  if(data?.players?.length!==5)return [];
  const questions=[],players=data.players;
  for(const act of ['all',...(data.acts||[])]){
    const groups=players.map(p=>p.scopes?.team?.[act]||p.groups[act]);
    if(groups.some(g=>!g?.matches))continue;
    const label=act==='all'?'Tüm arşiv':act.replace(/^e(\d+)a(\d+)$/,'Bölüm $1 Act $2');
    const add=(key,prompt,values,unit)=>{
      if(values.some(v=>!Number.isFinite(v))||new Set(values).size<3)return;
      const order=shuffle(players.map((p,i)=>({name:p.name,value:values[i]})));
      const options=order.map(p=>p.name),rankValues=order.map(p=>p.value);
      const answer=options.map((_,i)=>i).sort((a,b)=>rankValues[b]-rankValues[a]);
      questions.push({id:'ranking-'+act+'-'+key,kind:'ranking',difficulty:'expert',category:'team',categoryId:'ranking',
        prompt:label+' · Beşli maçlarda '+prompt+' En yüksekten en düşüğe sırala.',options,rankValues,answer,
        explanation:'Arşivdeki beşli maçların toplamları. Eşit değerlerin kendi aralarındaki sırası puanı etkilemez.',unit});
    };
    for(const [key,label,unit]of [['kills','toplam kill sayısı','kill'],['assists','toplam asist sayısı','asist'],['fk','ilk kill sayısı','ilk kill'],['plants','Spike kurma sayısı','kurma'],['tradeKills','trade kill sayısı','trade'],['clutchWins','kazanılan clutch sayısı','clutch']])
      add(key,label,groups.map(g=>g[key]),unit);
    const weaponNames=[...new Set(groups.flatMap(g=>Object.keys(g.weaponKills||g._weapons||{})))];
    for(const weapon of weaponNames){
      // Never treat an omitted top-three weapon as zero. Require the complete counter.
      if(!groups.every(g=>g.weaponKills&&typeof g.weaponKills==='object'))continue;
      const values=groups.map(g=>g.weaponKills[weapon]||0);
      if(values.reduce((a,b)=>a+b,0)<50)continue;
      add('weapon-'+slug(weapon),weapon+' ile alınan kill sayısı',values,'kill');
    }
  }
  return questions;
}

export function matchLineups(data){
  const players=data?.players||[];
  if(players.length!==5)return [];
  const histories=players.map(p=>new Map(p.groups.all.history.map(m=>[m.date,m])));
  return [...histories[0]].flatMap(([date,match])=>{
    const rows=shuffle(players.map((p,i)=>({name:p.name,match:histories[i].get(date)})));
    if(rows.some(r=>!r.match||r.match.map!==match.map||r.match.score!==match.score))return [];
    const rankValues=rows.map(r=>r.match.kills);
    if(new Set(rankValues).size<2)return [];
    const answer=rankValues.map((_,i)=>i).sort((a,b)=>rankValues[b]-rankValues[a]);
    return [{id:'lineup-'+date,kind:'ranking',category:'team',categoryId:'lineup',difficulty:'expert',prompt:dateLabel(date)+' · '+match.map+' · '+match.score,options:rows.map(r=>r.name),rankValues,answer,killSlots:answer.map(i=>rankValues[i]),unit:'kill',explanation:'Maçın kill tablosu. Eşit killer kendi aralarında değişebilir.'}];
  });
}
export function makeQuestions(data,topic,count,selected,recent=[]){
  const categories=normalizeCategories(selected,topic);
  if(!categories.length)throw Error('En az bir kategori seç.');
  const candidates=shuffle([...teamQuestions(data),...rankingQuestions(data),...matchLineups(data),...pins,...catalog]).filter(q=>categories.includes(q.categoryId));
  // Prefer unseen questions on replay, while allowing a small selected pool to be reused.
  candidates.sort((a,b)=>Number(recent.includes(a.id))-Number(recent.includes(b.id)));
  const families=new Map();
  for(const question of candidates){
    const family=question.categoryId;
    if(!families.has(family))families.set(family,[]);
    families.get(family).push(question);
  }
  const used=new Set(),bank=[];
  while(bank.length<count&&families.size){
    for(const family of shuffle([...families.keys()])){
      const pool=families.get(family);
      const question=pool.shift();
      if(!pool.length)families.delete(family);
      const key=question.id.startsWith('map-')?question.id.replace(/-\d+$/,''):question.id;
      if(used.has(key))continue;
      used.add(key);bank.push(question);
      if(bank.length===count)break;
    }
  }
  if(bank.length<count)throw Error('Seçtiğin kategorilerde '+bank.length+' farklı soru var. Soru sayısını azalt veya kategori ekle.');
  return bank.slice(0,count).map(q=>{
    if(q.kind==='ranking'||q.kind==='pin')return q;
    const order=shuffle(q.options.map((_,i)=>i));
    return {...q,options:order.map(i=>q.options[i]),answer:q.kind==='multiple'?q.answer.map(i=>order.indexOf(i)):order.indexOf(q.answer)};
  });
}

export function answerQuality(q,answer){
  const kind=q.kind||'choice',n=q.options.length;
  if(kind==='pin'){
    const point=answer.point;
    if(!Array.isArray(point)||point.length!==2||point.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Haritada bir nokta seç.');
    const distance=Math.hypot(point[0]-q.target[0],point[1]-q.target[1]);
    return {point,quality:Math.max(0,Math.min(1,(.30-distance)/.24))};
  }
  if(kind==='choice'){
    if(!Number.isInteger(answer.choice)||answer.choice<0||answer.choice>=n)throw Error('Bir şık seç.');
    return {quality:answer.choice===q.answer?1:0,choice:answer.choice};
  }
  const values=kind==='ranking'?answer.order:answer.choices;
  if(!Array.isArray(values)||new Set(values).size!==values.length||values.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Geçersiz cevap.');
  if(kind==='ranking'){
    if(values.length!==n)throw Error('Beş oyuncunun tamamını sırala.');
    let pairs=0,right=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      const a=values[i],b=values[j];
      if(q.rankValues[a]===q.rankValues[b])continue;
      pairs++;right+=+(q.rankValues[a]>q.rankValues[b]);
    }
    return {quality:pairs?right/pairs:1,order:values};
  }
  if(!values.length)throw Error('En az bir seçenek işaretle.');
  const right=values.filter(i=>q.answer.includes(i)).length,wrong=values.length-right;
  return {quality:Math.max(0,right/q.answer.length-wrong/(n-q.answer.length)),choices:values};
}
export function scoreAnswer(correct,elapsed,duration=15000) {
  if(!correct||elapsed<0||elapsed>=duration)return 0;
  return 500+Math.round(500*(1-elapsed/duration));
}
export function leaderboard(players) {
  return [...players].sort((a,b)=>b.score-a.score||b.correct-a.correct||a.totalTime-b.totalTime||a.joinedAt-b.joinedAt);
}

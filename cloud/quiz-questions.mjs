import catalog from './quiz-catalog.json' with {type:'json'};

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
  return {id,category:'team',prompt,options,answer:options.indexOf(correct),explanation,...extra};
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
  return questions.filter(Boolean);
}

export function makeQuestions(data,topic,count) {
  const team=shuffle(teamQuestions(data)),valorant=shuffle(catalog);
  const candidates=topic==='team'?team:topic==='valorant'?valorant:[...team,...valorant];
  const families=new Map();
  for(const question of candidates){
    const prefix=question.id.split('-')[0];
    const family=['portrait','map','sound','favorite','score','missing','vct'].includes(prefix)?prefix:'ability';
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
  if(bank.length<count)throw Error('Bu konu için yeterli soru yok.');
  return bank.slice(0,count);
}
export function scoreAnswer(correct,elapsed,duration=15000) {
  if(!correct||elapsed<0||elapsed>=duration)return 0;
  return 500+Math.round(500*(1-elapsed/duration));
}
export function leaderboard(players) {
  return [...players].sort((a,b)=>b.score-a.score||b.correct-a.correct||a.totalTime-b.totalTime||a.joinedAt-b.joinedAt);
}

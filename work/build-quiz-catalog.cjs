const fs=require('node:fs');
const {createHash}=require('node:crypto');
(async()=>{
  const response=await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=tr-TR');
  if(!response.ok)throw Error('Agent catalog unavailable');
  const agents=(await response.json()).data;
  const questions=[];
  const shuffle=items=>[...items].sort(()=>Math.random()-.5);
  async function asset(url) {
    const name=createHash('sha256').update(url).digest('hex').slice(0,20)+'.png';
    const file='assets/quiz/'+name;
    if(!fs.existsSync(file)){
      const response=await fetch(url);if(!response.ok)throw Error('Quiz image download failed');
      fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));
    }
    return file;
  }
  for(const agent of agents){
    const names=shuffle(agents.filter(a=>a.uuid!==agent.uuid)).slice(0,3).map(a=>a.displayName);
    const options=shuffle([agent.displayName,...names]);
    questions.push({id:'portrait-'+agent.uuid,category:'valorant',prompt:'Silüetteki ajan kim?',
      options,answer:options.indexOf(agent.displayName),explanation:'Bu ajan '+agent.displayName+'.',
      image:await asset(agent.displayIcon),effect:'silhouette'});
    for(const ability of agent.abilities.filter(a=>a.displayIcon&&a.slot!=='Passive')){
      questions.push({id:agent.uuid+'-'+ability.slot,category:'valorant',prompt:'Bu yetenek hangi ajana ait?',
        options,answer:options.indexOf(agent.displayName),explanation:ability.displayName+' — '+agent.displayName+'.',
        image:await asset(ability.displayIcon),effect:'ability'});
    }
  }
  const maps=fs.readdirSync('assets/maps').filter(name=>name.endsWith('-bg.png')).map(name=>name.replace('-bg.png',''));
  for(const name of maps){
    const options=shuffle([name,...shuffle(maps.filter(m=>m!==name)).slice(0,3)]).map(n=>n[0].toUpperCase()+n.slice(1));
    for(const [index,position] of ['25% 35%','70% 50%'].entries())questions.push({
      id:'map-'+name+'-'+index,category:'valorant',prompt:'Bu yakın plan hangi haritadan?',
      options,answer:options.indexOf(name[0].toUpperCase()+name.slice(1)),
      explanation:'Harita '+name[0].toUpperCase()+name.slice(1)+'.',
      image:'assets/maps/'+name+'-bg.png',effect:'map-crop',position
    });
  }
  fs.writeFileSync('cloud/quiz-catalog.json',JSON.stringify(questions));
  console.log(questions.length+' visual questions prepared');
})().catch(error=>{console.error(error);process.exitCode=1});

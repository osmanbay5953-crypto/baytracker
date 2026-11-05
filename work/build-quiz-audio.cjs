const fs=require('fs'),{execFileSync}=require('child_process');
const ffmpeg=require('./media-tools/node_modules/@ffmpeg-installer/ffmpeg').path;
(async()=>{
  const weapons=(await(await fetch('https://valorant-api.com/v1/weapons')).json()).data;
  const catalog=JSON.parse(fs.readFileSync('cloud/quiz-catalog.json'));
  const names=['Classic','Vandal','Phantom','Operator','Odin','Sheriff','Spectre','Judge'];
  for(const name of names){
    const weapon=weapons.find(w=>w.displayName===name);
    const video=weapon?.skins.flatMap(s=>s.levels).find(l=>l.streamedVideo)?.streamedVideo;
    if(!video)continue;
    const file='work/media-tools/'+name+'.mp4';
    const r=await fetch(video);if(!r.ok)continue;
    fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));
    const hash=require('crypto').createHash('sha256').update(video).digest('hex').slice(0,20);
    const audio='assets/quiz/'+hash+'.mp3';
    try{
      execFileSync(ffmpeg,['-y','-i',file,'-vn','-t','8','-af','loudnorm=I=-23:TP=-3:LRA=7','-codec:a','libmp3lame','-b:a','96k',audio],{stdio:'pipe'});
      const options=[name,...names.filter(w=>w!==name).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
      catalog.push({id:'sound-'+name,category:'valorant',prompt:'Bu tanıtım sesindeki silah hangisi?',
        options,answer:options.indexOf(name),explanation:name+' için Riot’un silah kaplaması tanıtımından bir ses kesiti.',
        audio,effect:'audio',source:video});
      console.log('Audio prepared: '+name);
    }catch{console.log('No usable audio: '+name);}
  }
  fs.writeFileSync('cloud/quiz-catalog.json',JSON.stringify(catalog));
})();

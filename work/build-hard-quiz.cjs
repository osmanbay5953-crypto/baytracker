const fs=require('node:fs');
const {createHash}=require('node:crypto');
const sharp=require('./media-tools/node_modules/sharp');
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,20);
const read=name=>JSON.parse(fs.readFileSync('work/quiz-source-'+name+'.json')).data;
const shuffle=list=>[...list].sort(()=>Math.random()-.5);
const title=s=>s.toLocaleLowerCase('tr-TR').replace(/(^|[ /])\p{L}/gu,c=>c.toLocaleUpperCase('tr-TR'));
async function asset(url){const file='assets/quiz/'+hash(url)+'.png';if(!fs.existsSync(file)){const r=await fetch(url);if(!r.ok)throw Error(r.status+' '+url);fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));}return file;}
function question(id,prompt,correct,wrong,explanation,extra={}){const options=shuffle([correct,...wrong]);if(new Set(options).size!==4)throw Error(id+' duplicate options');return{id,category:'valorant',prompt,options,answer:options.indexOf(correct),explanation,...extra};}
const variants={
 'KANKUŞ':['Kankardeş','Kanatdaş','Kankuşum'],'ŞAŞKIN':['Şaşkınlık','Şaşırtan','Şaşkın Bakış'],'ZORBA':['Zorbalık','Zorbaca','Zorlayıcı'],
 'MIHLA':['Mıhlama','Mıhlayıcı','Mühürle'],'MUSALLAT':['Musallat Ol','Musallak','Musibet'],'ECEL':['Ecel Vakti','Ecel İzi','Ecel Avı'],
 'ZELZELE':['Zelzele Hattı','Yer Sarsıntısı','Deprem Dalgası'],'NANOÇEKİM':['Nanoçekim Ağı','Nanokapan','Nanoçekici'],
 'KISKIVRAK':['Kıskıvrak Kapan','Kıskapan','Kıskaç'],'BOMBOT':['Bombotçu','Bombacı Bot','Bomba Botu'],
 'BULUŞMA':['Buluşma Noktası','Buluşma Yeri','Buluşma Anı'],'KARTVİZİT':['Kartvizitçi','Kartvizitim','Kart İzi'],
 'İZSÜRENLER':['İz Takipçileri','İz Avcıları','İzsüren'],'NANOSÜRÜ':['Nano Sürüsü','Nanobulut','Nanoakın'],
 'TARET':['Taretçi','Otomatik Taret','Gözcü Taret'],'TECRİT':['Tecrit Alanı','Tecrit Bölgesi','Tecrit Çemberi'],
 'TAŞKIN':['Taşkın Dalgası','Taşkın Duvarı','Taşkın Akını'],'UÇUŞ':['Uçuş Noktası','Yükseliş','Uçuş Hattı'],
 'YERİNDEN ET':['Yerinden Çek','Yerinden Savur','Yerinden Kopar'],'ASILI KAL':['Asılı Tut','Askıda Kal','Askıya Al'],
 'GERİ SAR':['Geri Sarım','Geri Dön','Geri Çağır'],'EVRİM':['Evrilme','Evrimleşme','Evrimleş'],
 'YAKICI':['Yakıcı Alan','Yakıcı Atış','Yakıcı Alev'],'FAKE AT':['Fake Yap','Sahte At','Fake Ver'],
 'YAKARDÖNER':['Yakar Döngü','Yakıp Dön','Yeniden Alev'],'GAREZ':['Garez Dalgası','Garezli','Garez Oku'],
 'KATAKULLİ':['Katakulli Perdesi','Katakulli Bulutu','Katakulli Alanı'],'İŞGÜZAR':['İşgüzarlık','İşgüzar Küre','İşgüzar Atış'],
 'TUTULMA':['Işık Tutulması','Tutulma Küresi','Tam Tutulma'],'SÖMÜR':['Sömürü','Ruh Sömürüsü','Sömürge'],
 'AZLET':['Azlediş','Azledilme','Azledici'],'DİRİLİŞ':['Yeniden Diriliş','Diriltme','Diriliş Işığı'],
 'İMPARATORİÇE':['İmparatoriçe Hiddeti','İmparatoriçenin Gazabı','İmparatoriçenin Gücü'],'PARANOYA':['Paranoyak','Paranoya Dalgası','Paranoyanın Gölgesi'],
 'HAFİFLE':['Hafifleme','Yüksel','Hafif Adım'],'ARMONİ':['Armoni Dalgası','Armonik Bağ','Armoni Akımı']
};
const extraVariants=JSON.parse(fs.readFileSync('work/quiz-ability-decoys.json','utf8').replace(/^\uFEFF/,''));
function decoys(name){const result=extraVariants[name]||variants[name];if(!result)throw Error('Missing curated distractors: '+name);return result;}
(async()=>{
 for(const [name,url] of Object.entries({agents:'https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=tr-TR',weapons:'https://valorant-api.com/v1/weapons?language=tr-TR',tiers:'https://valorant-api.com/v1/contenttiers?language=tr-TR'})){
   const file='work/quiz-source-'+name+'.json';if(!fs.existsSync(file)){const r=await fetch(url);if(!r.ok)throw Error('Catalog fetch '+r.status);fs.writeFileSync(file,await r.text());}
 }
 if(!fs.existsSync('work/quiz-source-mapdata.json')){const r=await fetch('https://playvalorant.com/en-us/maps/');if(!r.ok)throw Error('Maps fetch '+r.status);const html=await r.text();const json=html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);if(!json)throw Error('Map gallery not found');fs.writeFileSync('work/quiz-source-mapdata.json',json[1]);}
 const agents=read('agents'),weapons=read('weapons'),tiers=read('tiers');
 const questions=[];
 const allNames=new Set(agents.flatMap(a=>a.abilities.map(b=>title(b.displayName))));
 for(const a of agents)for(const b of a.abilities.filter(b=>b.displayIcon&&b.slot!=='Passive')){
   const correct=title(b.displayName);let wrong=decoys(b.displayName);
   // All distractors are intentionally near-name alternatives, never agent names.
   wrong=wrong.map(title);if(wrong.some(x=>x===correct||allNames.has(x)))wrong=wrong.map((x,i)=>allNames.has(x)?x+' '+['Alanı','Dalgası','Etkisi'][i]:x);
   questions.push(question('ability-'+a.uuid+'-'+b.slot,'Bu yeteneğin oyun içindeki Türkçe adı hangisi?',correct,wrong,correct+' — '+a.displayName+'.',{image:await asset(b.displayIcon),effect:'ability'}));
 }
 const mapdata=JSON.parse(fs.readFileSync('work/quiz-source-mapdata.json'));
 const maps=mapdata.props.pageProps.page.blades.filter(b=>b.groups&&fs.existsSync('assets/maps/'+b.fragmentId+'-bg.png'));
 const crops=[];
 for(const map of maps){
   // Skip minimap and splash. These are ground-level views from Riot's map gallery.
   const scenes=map.groups.slice(3,6).map(g=>g.content.media);
   if(map.fragmentId==='sunset')scenes[0]=map.groups[6].content.media;
   for(const [i,scene]of scenes.entries()){
    const url=new URL(scene.url);url.searchParams.set('w','1100');const source='work/media-tools/'+hash(url.href)+'.png';
    if(!fs.existsSync(source)){const r=await fetch(url);if(!r.ok)throw Error('Map download '+r.status);fs.writeFileSync(source,Buffer.from(await r.arrayBuffer()));}
    const meta=await sharp(source).metadata();const size=Math.round(meta.height*.15);
    const centers={summit:[[.48,.7],[.3,.32],[.48,.2]],corrode:[[.35,.25],[.8,.6],[.24,.4]],abyss:[[.69,.4],[.65,.35],[.53,.53]],sunset:[[.35,.55],[.75,.35],[.42,.32]],lotus:[[.7,.45],[.28,.45],[.8,.35]],pearl:[[.65,.6],[.18,.6],[.28,.4]],fracture:[[.7,.65],[.2,.55],[.25,.35]],breeze:[[.3,.5],[.65,.4],[.65,.45]],icebox:[[.53,.32],[.23,.28],[.65,.35]],ascent:[[.66,.72],[.2,.3],[.37,.3]],split:[[.55,.4],[.3,.3],[.45,.38]],haven:[[.48,.4],[.4,.28],[.75,.4]],bind:[[.2,.5],[.45,.4],[.5,.6]]};
    const [cx,cy]=centers[map.fragmentId][i];
    const rect={left:Math.round(meta.width*cx-size/2),top:Math.round(meta.height*cy-size/2),width:size,height:size};
    const file='assets/quiz/'+hash(scene.url+JSON.stringify(rect)+'detail-v2')+'.png';
    await sharp(source).extract(rect).resize(440,440).png().toFile(file);
    const correct=title(map.fragmentId),wrong=shuffle(maps.filter(b=>b!==map)).slice(0,3).map(b=>title(b.fragmentId));
    questions.push(question('map-'+map.fragmentId+'-'+i,'Bu küçük detay hangi haritanın içinden?',correct,wrong,correct+' haritasındaki oyun içi bir detay.',{image:file,effect:'map-detail'}));
    crops.push({map:map.fragmentId,index:i,image:file,source:scene.url,rect,sourceWidth:meta.width,sourceHeight:meta.height});
   }
 }
 const select=tiers.find(t=>t.devName==='Select').uuid,deluxe=tiers.find(t=>t.devName==='Deluxe').uuid;
 let skinCount=0;
 for(const w of weapons.filter(w=>!w.assetPath.includes('Melee'))){
  const eligible=w.skins.filter(s=>[select,deluxe].includes(s.contentTierUuid)&&s.displayIcon);
  // Mostly lowest Select tier; include two Deluxe skins for variety.
  const selected=[...eligible.filter(s=>s.contentTierUuid===select).slice(0,6),...eligible.filter(s=>s.contentTierUuid===deluxe).slice(0,2)];
  for(const skin of selected){
   const wrong=shuffle(eligible.filter(s=>s.uuid!==skin.uuid)).slice(0,3).map(s=>s.displayName);if(new Set(wrong).size!==3)continue;
   const tier=tiers.find(t=>t.uuid===skin.contentTierUuid);
   questions.push(question('skin-'+skin.uuid,'Bu '+title(w.displayName)+' skininin adı hangisi?',skin.displayName,wrong,skin.displayName+' · '+tier.displayName+'.',{image:await asset(skin.displayIcon),effect:'weapon-skin',tier:tier.devName}));skinCount++;
  }
 }
 fs.writeFileSync('work/quiz-map-crops.json',JSON.stringify(crops,null,2));
 fs.writeFileSync('cloud/quiz-sources.json',JSON.stringify({updated:'2026-11-05',maps:'https://playvalorant.com/en-us/maps/',agents:'https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=tr-TR',weapons:'https://valorant-api.com/v1/weapons?language=tr-TR',note:'Turkish game labels and current descriptions checked when building. Map images are permanent small crops of ground-level gallery screenshots, not aerial splashes.'},null,2));
 for(const q of questions){q.kind='choice';q.difficulty=q.id.startsWith('map-')?'expert':'hard';q.categoryId=q.id.split('-')[0];}
 const advanced=JSON.parse(fs.readFileSync('work/quiz-advanced.json','utf8').replace(/^\uFEFF/,''));questions.push(...advanced);
 fs.writeFileSync('cloud/quiz-catalog.json',JSON.stringify(questions));
 console.log(JSON.stringify({total:questions.length,maps:crops.length,agents:questions.filter(q=>q.categoryId==='agent').length,skins:skinCount,selectSkins:questions.filter(q=>q.tier==='Select').length}));
 // Contact sheet for visual QA, no runtime dependency on sharp.
 const tiles=await Promise.all(crops.map(async(c,i)=>({input:await sharp(c.image).resize(140,140).extend({top:0,left:0,right:0,bottom:24,background:'#14202b'}).composite([{input:Buffer.from('<svg width="140" height="24"><text x="4" y="17" fill="white" font-size="12">'+c.map+' '+c.index+'</text></svg>'),top:140,left:0}]).png().toBuffer(),left:i%6*140,top:Math.floor(i/6)*164})));
 await sharp({create:{width:840,height:Math.ceil(crops.length/6)*164,channels:3,background:'#14202b'}}).composite(tiles).png().toFile('work/media-tools/quiz-map-contact.png');
})().catch(e=>{console.error(e);process.exitCode=1});

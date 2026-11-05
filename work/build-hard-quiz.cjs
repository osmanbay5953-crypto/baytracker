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
const facts=[
 ['GEKKO','Zorba kullanıldıktan sonra en fazla kaç kez küre olarak geri alınabilir?','Bir kez',['İki kez','Üç kez','Hiç alınamaz'],'Zorba yalnızca bir kez küreye dönüşerek yeniden alınabilir.'],
 ['FADE','Mıhla, bağladığı rakiplere hangi iki etkiyi birlikte uygular?','Sağırlaştırma ve çürüme',['Görüş kısıtlama ve savunmasızlık','Sindirme ve çürüme','Sersemletme ve sağırlaştırma'],'Mıhla rakipleri bağlar; aynı zamanda sağırlaştırır ve çürüme uygular.'],
 ['BREACH','Fay Hattı hazırlanırken ateş tuşunu basılı tutmak neyi değiştirir?','Etki mesafesini',['Sersemletme süresini','Dalga sayısını','Etki genişliğini'],'Tuşu basılı tutmak Fay Hattı’nın ulaşacağı mesafeyi artırır.'],
 ['DEADLOCK','Bariyer Ağı’nın oluşturduğu engel doğrudan neyi durdurur?','Oyuncuların hareketini',['Gelen tüm mermileri','Bütün yetenekleri','Yalnızca düşmanların görüşünü'],'Bariyer Ağı oyuncuların geçişini engelleyen bariyerler oluşturur.'],
 ['TEJO','Özel Teslimat’ın alternatif atışı hangi farkı yaratır?','Sektirerek fırlatır',['Daha büyük alan oluşturur','İki bomba gönderir','Patlama etkisini sindirmeye çevirir'],'Alternatif atış Özel Teslimat’ı sektirerek fırlatır.'],
 ['RAZE','Patlayıcı Çanta düşmana hasar verebilmek için hangi koşulu sağlamalıdır?','Tamamen hazır hale gelmeli',['Bir yüzeye değmeden patlamalı','İkinci çantaya temas etmeli','Raze havada olmalı'],'Çanta tamamen hazır hale geldikten sonra düşmanlara hasar verebilir.'],
 ['CHAMBER','Keskin Tarz ile skor alındığında oluşan alan kimi yavaşlatabilir?','Alana giren tüm oyuncuları',['Yalnızca düşmanları','Yalnızca hasar almış düşmanları','Yalnızca silah taşıyan oyuncuları'],'Keskin Tarz’ın skor sonrası alanı tüm oyuncuları yavaşlatır.'],
 ['KAY/O','İPTAL/Komut etkinken ölümcül hasar alan KAY/O için hangisi doğrudur?','Çöker ve yeniden stabil hale getirilebilir',['Doğrudan doğma noktasına döner','Kısa süreliğine görünmez olur','Ulti tamamen sona ermeden hasar alamaz'],'Ulti sırasında çöken KAY/O yeniden stabil hale getirilebilir.'],
 ['SKYE','İzsürenler hedeflerine ulaştığında hangi iki etkiyi uygular?','Görüş kısıtlama ve yavaşlatma',['Kör etme ve çürüme','Sindirme ve yavaşlatma','Sersemletme ve savunmasızlık'],'İzsürenler çarptıkları düşmanın görüşünü kısıtlar ve onu yavaşlatır.'],
 ['CYPHER','Nöron Hırsızı hayattaki rakiplerin anlık görüntüsünü kaç kez alır?','İki kez',['Bir kez','Üç kez','Dört kez'],'Ölü bir düşman üzerinden kullanılan Nöron Hırsızı iki anlık görüntü verir.'],
 ['SOVA','Avcının Hiddeti’nin isabet ettirdiği düşmanlar kime açığa çıkarılır?','Sova’ya',['Tüm takıma','Yalnızca en yakındaki takım arkadaşına','Kimseye; sadece hasar verir'],'Yetenek açıklamasına göre isabet alan düşmanlar Sova için açığa çıkarılır.'],
 ['KILLJOY','Alarm Botu patladığında hedefe hangi zayıflatmayı uygular?','Savunmasızlık',['Çürüme','Sindirme','Sağırlaştırma'],'Alarm Botu takip ettiği hedefin yakınında patlayarak savunmasızlık uygular.'],
 ['HARBOR','Dalgakıran’ın dumanı hangi işlemle kalkana dönüştürülür?','Duman kullanıldıktan sonra yeniden etkinleştirilerek',['İlk atışta alternatif atış basılı tutularak','Dumanın içine girip etkileşime basılarak','Doldurma tuşuna iki kez basılarak'],'Dumanı kullandıktan sonra yeteneği tekrar etkinleştirmek yok edilebilir kalkan oluşturur.'],
 ['VYSE','Çelik Bahçesi düşmanların hangi silahlarına tutukluk yaptırır?','Birincil silahlarına',['Birincil ve ikincil silahlarına','Yalnızca kuşanılmış silahlarına','İkincil silahlarına'],'Çelik Bahçesi’nin tutukluk etkisi birincil silahları hedefler.'],
 ['VIPER','Asit Havuzu hasarın yanında hangi etkiyi uygular?','Savunmasızlık',['Çürüme','Sindirme','Görüş kısıtlama'],'Asit Havuzu alanındaki oyunculara hasar ve savunmasızlık uygular.'],
 ['PHOENIX','Yakardöner dönüşünde zırh miktarı neye göre belirlenir?','Yetenek etkinleştirildiğindeki zırha',['Daima tam ağır zırha','Dönüşten önce kalan zırha','Daima sıfır zırha'],'Phoenix işarete tam canla ve ultiyi etkinleştirdiğinde sahip olduğu zırhla döner.'],
 ['ASTRA','Çekim Alanı patladığında alanın içindekilere hangi etkiyi uygular?','Savunmasızlık',['Sindirme','Çürüme','Görüş kısıtlama'],'Çekim Alanı önce merkeze çeker, ardından patlayarak savunmasızlık uygular.'],
 ['BRIMSTONE','Kuvvet İşareti silah arkadaşlarına hangi iki güçlendirmeyi verir?','Kuvvetli savaş etkisi ve hız',['Aşırı iyileştirme ve hız','Kuvvetli savaş etkisi ve zırh','İyileşme ve geri tepme bağışıklığı'],'Kuvvet İşareti’nin alanı silah arkadaşlarına kuvvetli savaş etkisi ve hız verir.'],
 ['ISO','B Planı’nın alternatif atışı neyi değiştirir?','Duvarın ilerleme hızını',['Duvarın dayanıklılığını','Duvarın genişliğini','Duvarın geçirdiği mermi sayısını'],'Alternatif atış daha yavaş ilerleyen bir duvar gönderir.'],
 ['CLOVE','Daha Ölmedik sonrası hayatta kalmak için hangisi yeterlidir?','Skor almak veya hasar vererek asist yapmak',['Sadece herhangi bir asist almak','Bir düşmanı açığa çıkarmak','Tur bitene kadar hiç hasar almamak'],'Clove yeniden doğduktan sonra skor almalı veya hasar vererek asist yapmalıdır.'],
 ['NEON','Elektro Ok bir yüzeyden sektiğinde sersemletme nerede oluşur?','Hem sekme hem son çarpma noktasında',['Yalnızca son çarpma noktasında','Yalnızca ilk sekme noktasında','Sadece doğrudan rakibe değerse'],'Elektro Ok bir kez seker ve her temas ettiği yüzeyde sersemleten alan oluşturur.'],
 ['YORU','Fake At kopyası vurulduğunda önce hangi hedefe döner?','Kendisine ateş eden ilk düşmana',['En yakındaki düşmana','En son görülen düşmana','Yoru’nun nişangâhının yönüne'],'Kopya kendisine ateş eden ilk düşmana döner, ardından ona bakan oyuncuları flaşlar.'],
 ['WAYLAY','Işık Hızı atılmalarının yukarı doğru kullanımı için hangi kural geçerlidir?','Yalnızca ilk atılma yukarı yapılabilir',['Her iki atılma da yukarı yapılabilir','Yalnızca ikinci atılma yukarı yapılabilir','Alternatif atış iki dikey atılma verir'],'Işık Hızı’nda sadece ilk atılma yukarı yönlü olabilir.'],
 ['REYNA','Ulti etkinken Azlet’in normal kullanımına hangi ek özellik gelir?','Görünmezlik',['Sindirmeye bağışıklık','Anında tam zırh','Düşmanların konumunu görme'],'Azlet normalde saydamlık sağlar; ulti etkinken görünmezlik de verir.'],
 ['OMEN','Paranoya hangi iki zayıflatmayı birlikte uygular?','Görüş kısıtlama ve sağırlaştırma',['Kör etme ve sindirme','Görüş kısıtlama ve çürüme','Sersemletme ve sağırlaştırma'],'Paranoya isabet alan oyuncuların görüşünü kısıtlar ve onları sağırlaştırır.'],
 ['JETT','Keskin Fırtına’nın alternatif atışıyla skor alındığında ne olur?','Bıçaklar yenilenmez',['Tüm bıçaklar yenilenir','Yalnızca üç bıçak yenilenir','Rüzgâr Gibi anında yenilenir'],'Alternatif atış kalan tüm bıçakları fırlatır; bu kullanım bıçakları yenilemez.']
];
(async()=>{
 for(const [name,url] of Object.entries({agents:'https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=tr-TR',weapons:'https://valorant-api.com/v1/weapons?language=tr-TR',tiers:'https://valorant-api.com/v1/contenttiers?language=tr-TR'})){
   const file='work/quiz-source-'+name+'.json';if(!fs.existsSync(file)){const r=await fetch(url);if(!r.ok)throw Error('Catalog fetch '+r.status);fs.writeFileSync(file,await r.text());}
 }
 if(!fs.existsSync('work/quiz-source-mapdata.json')){const r=await fetch('https://playvalorant.com/en-us/maps/');if(!r.ok)throw Error('Maps fetch '+r.status);const html=await r.text();const json=html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);if(!json)throw Error('Map gallery not found');fs.writeFileSync('work/quiz-source-mapdata.json',json[1]);}
 const agents=read('agents'),weapons=read('weapons'),tiers=read('tiers');
 const old=JSON.parse(fs.readFileSync('cloud/quiz-catalog.json'));const questions=old.filter(q=>q.id.startsWith('sound-'));
 const allNames=new Set(agents.flatMap(a=>a.abilities.map(b=>title(b.displayName))));
 for(const a of agents)for(const b of a.abilities.filter(b=>b.displayIcon&&b.slot!=='Passive')){
   const correct=title(b.displayName);let wrong=decoys(b.displayName);
   // All distractors are intentionally near-name alternatives, never agent names.
   wrong=wrong.map(title);if(wrong.some(x=>x===correct||allNames.has(x)))wrong=wrong.map((x,i)=>allNames.has(x)?x+' '+['Alanı','Dalgası','Etkisi'][i]:x);
   questions.push(question('ability-'+a.uuid+'-'+b.slot,'Bu yeteneğin oyun içindeki Türkçe adı hangisi?',correct,wrong,correct+' — '+a.displayName+'.',{image:await asset(b.displayIcon),effect:'ability'}));
 }
 for(const [index,[agent,prompt,correct,wrong,explanation]]of facts.entries()){
  if(!agents.some(a=>a.displayName===agent))throw Error('Unknown agent '+agent);
  questions.push(question('agent-'+index,agent+' · '+prompt,correct,wrong,explanation));
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
    const meta=await sharp(source).metadata();const size=Math.round(meta.height*.24);
    const centers={summit:[[.48,.7],[.3,.32],[.48,.2]],corrode:[[.35,.25],[.8,.6],[.24,.4]],abyss:[[.2,.42],[.65,.35],[.22,.7]],sunset:[[.35,.55],[.75,.35],[.42,.32]],lotus:[[.7,.45],[.28,.45],[.8,.35]],pearl:[[.65,.6],[.18,.6],[.28,.4]],fracture:[[.7,.65],[.2,.55],[.25,.35]],breeze:[[.3,.5],[.65,.4],[.65,.45]],icebox:[[.53,.32],[.23,.28],[.65,.35]],ascent:[[.66,.72],[.2,.3],[.37,.3]],split:[[.55,.4],[.3,.3],[.45,.38]],haven:[[.48,.4],[.4,.28],[.75,.4]],bind:[[.2,.5],[.45,.4],[.5,.6]]};
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
 fs.writeFileSync('cloud/quiz-catalog.json',JSON.stringify(questions));
 fs.writeFileSync('work/quiz-map-crops.json',JSON.stringify(crops,null,2));
 fs.writeFileSync('cloud/quiz-sources.json',JSON.stringify({updated:'2026-11-05',maps:'https://playvalorant.com/en-us/maps/',agents:'https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=tr-TR',weapons:'https://valorant-api.com/v1/weapons?language=tr-TR',note:'Turkish game labels and current descriptions checked when building. Map images are permanent small crops of ground-level gallery screenshots, not aerial splashes.'},null,2));
 console.log(JSON.stringify({total:questions.length,maps:crops.length,agents:facts.length,skins:skinCount,selectSkins:questions.filter(q=>q.tier==='Select').length}));
 // Contact sheet for visual QA, no runtime dependency on sharp.
 const tiles=await Promise.all(crops.map(async(c,i)=>({input:await sharp(c.image).resize(140,140).extend({top:0,left:0,right:0,bottom:24,background:'#14202b'}).composite([{input:Buffer.from('<svg width="140" height="24"><text x="4" y="17" fill="white" font-size="12">'+c.map+' '+c.index+'</text></svg>'),top:140,left:0}]).png().toBuffer(),left:i%6*140,top:Math.floor(i/6)*164})));
 await sharp({create:{width:840,height:Math.ceil(crops.length/6)*164,channels:3,background:'#14202b'}}).composite(tiles).png().toFile('work/media-tools/quiz-map-contact.png');
})().catch(e=>{console.error(e);process.exitCode=1});

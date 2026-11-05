const fs=require('fs');let s=fs.readFileSync('profiles.js','utf8');
s=s.replace("act === 'all' ? 'Genel'","act === 'all' ? 'Tüm act’ler'");
s=s.replace("const text=el('div','rank-copy');text.append(el('span','rank-label','SON KAYITTAKİ RANK'),el('span','rank-name',group.rank?.name||'—'));rank.append(text);return rank;","rank.title=group.rank ? group.rank.name+' · Son kayıtlı maç' : 'Rank kaydı yok';rank.setAttribute('aria-label',rank.title);return rank;");
s=s.replace("function renderPlayer(data,player,act){\n  const group=player.groups[act]||player.groups.all;","function renderPlayer(data,player,act){\n  const scopeKey=new URLSearchParams(location.search).get('scope')||'team';\n  const group=player.scopes[scopeKey]?.[act]||player.groups[act];");
s=s.replace("location.href=\x60profiles.html?player=\x24{playerSelect.value}&act=\x24{act}\x60","location.href=\x60profiles.html?player=\x24{playerSelect.value}&act=\x24{act}&scope=\x24{scopeKey}\x60");
s=s.replace("filters.append(playerSelect,actSelect);toolbar.append(filters);",`const scopeSelect=el('select','profile-select');scopeSelect.setAttribute('aria-label','Maç kapsamı');
  [['team','Team · Beşli'],['solo','Solo'],['all','Tüm maçlar']].forEach(([value,label])=>{const o=el('option',null,label);o.value=value;o.selected=value===scopeKey;scopeSelect.append(o);});
  scopeSelect.addEventListener('change',()=>{const next=new URL(location.href);next.searchParams.set('scope',scopeSelect.value);history.replaceState(null,'',next);renderPlayer(data,player,act);document.querySelector('[aria-label="Maç kapsamı"]').focus();});
  filters.append(playerSelect,actSelect,scopeSelect);toolbar.append(filters);
  if(!group.matches){content.append(toolbar,el('p','empty-state','Bu seçimde maç kaydı yok. Solo istatistikleri için tek başına sıraya girilen maçların arşive eklenmesi gerekiyor.'));identity.replaceChildren(el('h1','identity-name',player.name));layout.append(identity,content);app.replaceChildren(layout);return;}`);
s=s.replace("} beşli maç ·","} maç ·");
s=s.replace("stat('MVP',number(group.mvp),'Arşivde doğrulanmış MVP bilgisi bulunmuyor.')","stat('MVP · ACS',number(group.mvp),'Maçın 10 oyuncusu arasında en yüksek ACS. Eşitlikler dahil; API MVP etiketi değildir.')");
s=s.replace("'Raund bazlı KAST hesabı henüz hazır değil.'","'Kill, asist, ölüm yaşamama veya 5 saniyede takım arkadaşı tarafından trade edilme olan raundların yüzdesi.'");
s=s.replace("'Clutch fırsatları ve başarı oranı henüz hesaplanmadı.'","group.clutchWins+' / '+group.clutchAttempts+' fırsat. Öldürme olaylarına göre 1vX; canlanma belirsizliği olan '+group.clutchExcluded+' raund hariç.'");
s=s.replace("const period=el('p','archive-note','Arşiv: 2 Eyl – 31 Eki 2026 · —: veri yok veya hesaplama henüz hazır değil.');","const period=el('p','archive-note','Arşiv: '+new Date(data.start).toLocaleDateString('tr-TR')+' – '+new Date(data.end).toLocaleDateString('tr-TR')+' · Seçili kapsamdaki kayıtlar.');");
s=s.replace("weapons,period);layout","weapons,profileDetails(group),methodNotes(),period);layout");
const pos=s.indexOf('async function init()');
s=s.slice(0,pos)+`
function tableSection(title,headers,rows,open=false){
 const section=el('details','data-section');section.open=open;section.append(el('summary',null,title));
 const wrap=el('div','table-scroll'),table=el('table','data-table'),head=el('thead'),tr=el('tr');
 headers.forEach(h=>tr.append(el('th',null,h)));head.append(tr);table.append(head);
 const body=el('tbody');rows.forEach(row=>{const tr=el('tr');row.forEach(value=>tr.append(el('td',null,value)));body.append(tr);});table.append(body);wrap.append(table);section.append(wrap);return section;
}
function profileDetails(g){
 const box=el('div','profile-details');
 const extra=el('dl','metrics-grid');extra.append(stat('ACS',number(g.acs,1)),stat('KDA',number(g.kda,2)),stat('TRADE',number(g.tradeKills)),stat('3K+ RAUND',number(g.multiKills)),stat('ACE',number(g.aces)),stat('CLUTCH KAZANILAN / FIRSAT',g.clutchWins+' / '+g.clutchAttempts));
 const details=el('details','data-section');details.append(el('summary',null,'Daha fazla istatistik'),extra);box.append(details);
 for(const [title,items] of [['Ajan performansı',g.agents],['Harita performansı',g.maps]])box.append(tableSection(title,['Ad','Maç','Kazanma','K/D','ADR'],items.map(x=>[x.name,x.matches,percent(100*x.wins/x.matches),number(x.kd,2),number(x.adr,1)])));
 const bins=[];for(let i=0;i<g.history.length;i+=10){const h=g.history.slice(i,i+10);bins.push([(i+1)+'–'+(i+h.length),number(h.reduce((n,x)=>n+x.damage,0)/h.reduce((n,x)=>n+x.rounds,0),1),percent(100*h.filter(x=>x.won).length/h.length)]);}
 box.append(tableSection('Zaman içindeki performans · 10 maçlık gruplar',['Maç sırası (eskiden yeniye)','ADR','Kazanma'],bins));
 box.append(tableSection('Maç geçmişi',['Tarih','Harita','Ajan','Skor','Sonuç','K / A / D'],g.history.slice().reverse().map(x=>[new Date(x.date).toLocaleDateString('tr-TR'),x.map,x.agent,x.score,x.won?'Galibiyet':'Galibiyet yok',x.kills+' / '+x.assists+' / '+x.deaths])));
 return box;
}
function methodNotes(){
 const d=el('details','data-section method-notes');d.append(el('summary',null,'Hesaplama notları'));
 d.append(el('p',null,'KAST: kill, kayıtlı kill asisti, hiç ölmeden bitirme veya ölümden sonraki 5 saniyede trade. Trade penceresi BayTracker tanımıdır. Clutch: olay sıralamasında 1vX kalan oyuncunun raund kazanması; canlanma tespit edilen raundlar hariç. Canlanmalar ve raund sonrasındaki öldürmeler için ayrı zaman çizelgesi olmadığından clutch olay tabanlı bir ölçümdür.'));
 d.append(el('p',null,'MVP · ACS: 10 oyuncu arasında en yüksek toplam savaş skoru (aynı raund sayısı), eşitlikler dahil. Performance Score, yalnızca API’de bulunan maçların raund ağırlıklı ortalamasıdır. ADR, ACS ve DDΔ/R kayıtlı raund sayısını kullanır. Solo: parti kimliği olan ve partisinde tek oyuncu bulunan maçlar. Team: aynı takım ve partideki beş oyuncumuz.'));
 const link=el('a',null,'KAST ve DDΔ tanımları · Tracker Network');link.href='https://feedback.tracker.gg/t/fullform-and-meaning-of-these-terms/20277';link.target='_blank';link.rel='noreferrer';d.append(link);return d;
}
`+s.slice(pos);
fs.writeFileSync('profiles.js',s);
let index=fs.readFileSync('index.html','utf8');index=index.replace('<button class="card statistics" data-section="statistics" aria-haspopup="dialog">','<a class="card statistics" href="statistics.html">').replace('<span class="card-bottom"><span class="card-title">İSTATİSTİKLER</span></span>\n        </button>','<span class="card-bottom"><span class="card-title">İSTATİSTİKLER</span></span>\n        </a>');fs.writeFileSync('index.html',index);
let html=fs.readFileSync('profiles.html','utf8').replace('Profiller —','İstatistikler —').replace('Profiller yükleniyor…','İstatistikler yükleniyor…').replace('<script src="profiles.js"></script>','<script src="profiles.js"></script><script src="statistics.js"></script>');
fs.writeFileSync('statistics.html',html);
s=fs.readFileSync('profiles.js','utf8').replace('init();',"if(!location.pathname.endsWith('statistics.html'))init();");fs.writeFileSync('profiles.js',s);

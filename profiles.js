const app = document.querySelector('#profile-app');
const query = new URLSearchParams(location.search);
const number = (value, digits=0) => value == null ? '—' : new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
const percent = value => value == null ? '—' : `${number(value,1)}%`;
const key = name => name.toLowerCase().replace(/[^a-z0-9-]/g,'-');
const actLabel = act => act === 'all' ? 'Tüm act’ler' : act.replace(/^e(\d+)a(\d+)$/, 'Bölüm $1 · Act $2');
const el = (tag, className, text) => { const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node; };
function image(src, className, alt='') {const img=el('img',className);img.src=src;img.alt=alt;return img;}
function stat(label,value,title){const box=el('div','stat');const name=el('dt','stat-label',label);const amount=el('dd','stat-value',value);if(title)box.title=title;box.append(name,amount);return box;}
function rankBadge(group){
  const rank=el('div','rank-badge');
  if(group.rank?.id>0)rank.append(image(`assets/ranks/${group.rank.id}.png`,'rank-icon'));
  rank.title=group.rank ? group.rank.name+' · Son kayıtlı maç' : 'Rank kaydı yok';rank.setAttribute('aria-label',rank.title);return rank;
}
function renderList(data){
  const heading=el('div','profiles-heading');heading.append(el('h1',null,'PROFİLLER'),el('span','subtle','BEŞ OYUNCU'));
  const grid=el('section','players-grid');grid.setAttribute('aria-label','Takım oyuncuları');
  data.players.forEach(player=>{
    const group=player.groups.all;
    const card=el('a','player-card');card.href=`profiles.html?player=${player.id}`;card.style.setProperty('--player-color',player.color);card.setAttribute('aria-label',`${player.name} profilini aç`);
    const art=el('div','player-art');art.append(image(`assets/agents/${key(group.agent)}.png`,'agent-portrait'));
    const agent=el('span','agent-label',group.agent.toUpperCase());
    const bottom=el('div','player-card-bottom');
    bottom.append(rankBadge(group),el('h2','player-name',player.name),el('span','player-tag',`#${player.tag}`));
    card.append(agent,art,bottom);grid.append(card);
  });
  const note=el('p','archive-note',data.team.all.matches+' beşli maçlık arşiv · Ranklar son kayıtlı maçtan alınmıştır.');
  app.replaceChildren(heading,grid,note);window.BayUI?.decorate(app);
}
function renderPlayer(data,player,act){
  const requestedScope=new URLSearchParams(location.search).get('scope');
  const scopeKey=['solo','no-team'].includes(requestedScope)?'no-team':'team';
  const group=player.scopes[scopeKey]?.[act]||player.groups[act];
  const back=document.querySelector('#return-link');back.href='profiles.html';document.querySelector('#return-label').textContent='Profiller';
  document.title=`${player.name} — BayTracker`;
  const layout=el('section','player-layout');layout.setAttribute('aria-label',`${player.name} istatistikleri`);layout.style.setProperty('--player-color',player.color);
  const identity=el('aside','player-identity');
  const agentName=el('span','identity-agent-name',group.agent?.toUpperCase()||'');
  const portrait=el('div','identity-portrait');if(group.agent)portrait.append(image(`assets/agents/${key(group.agent)}.png`,'agent-portrait'));
  const identityBottom=el('div','identity-bottom');identityBottom.append(rankBadge(group),el('h1','identity-name',player.name),el('span','identity-tag',`#${player.tag}`));
  identity.append(agentName,portrait,identityBottom);
  const content=el('div','player-content');
  const toolbar=el('div','profile-toolbar');toolbar.append(el('h2',null,'GENEL BAKIŞ'));
  const filters=el('div','profile-filters');
  const playerSelect=el('select','profile-select');playerSelect.setAttribute('aria-label','Oyuncu seç');
  data.players.forEach(p=>{const option=el('option',null,p.name);option.value=p.id;option.selected=p.id===player.id;playerSelect.append(option);});
  playerSelect.addEventListener('change',()=>{location.href=`profiles.html?player=${playerSelect.value}&act=${act}&scope=${scopeKey}`;});
  const actSelect=el('select','profile-select');actSelect.setAttribute('aria-label','Act seç');
  ['all',...data.acts].forEach(a=>{const option=el('option',null,actLabel(a));option.value=a;option.selected=a===act;actSelect.append(option);});
  actSelect.addEventListener('change',()=>{const next=new URL(location.href);next.searchParams.set('act',actSelect.value);history.replaceState(null,'',next);renderPlayer(data,player,actSelect.value);document.querySelector('[aria-label="Act seç"]').focus();});
  const scopeSelect=el('select','profile-select');scopeSelect.setAttribute('aria-label','Maç kapsamı');
  [['team','With team'],['no-team','No team']].forEach(([value,label])=>{const o=el('option',null,label);o.value=value;o.selected=value===scopeKey;scopeSelect.append(o);});
  scopeSelect.addEventListener('change',()=>{const next=new URL(location.href);next.searchParams.set('scope',scopeSelect.value);history.replaceState(null,'',next);renderPlayer(data,player,act);document.querySelector('[aria-label="Maç kapsamı"]').focus();});
  filters.append(playerSelect,actSelect,scopeSelect);toolbar.append(filters);
  if(!group.matches){content.append(toolbar,el('p','empty-state','Bu act ve maç kapsamında kayıt yok. Başka bir act veya kapsam seçebilirsin.'));identity.classList.add('empty-identity');identity.replaceChildren(el('h1','identity-name',player.name));layout.append(identity,content);app.replaceChildren(layout);window.BayUI?.decorate(app);return;}
  const scope=el('p','scope-note',`${group.matches} maç · ${group.wins} galibiyet · ${percent(group.matches?group.wins/group.matches*100:null)} kazanma`);scope.setAttribute('aria-live','polite');
  const headline=el('dl','headline-stats');
  headline.append(stat('K / A / D',`${number(group.kills)} / ${number(group.assists)} / ${number(group.deaths)}`,'Seçili dönemdeki toplam kill / asist / ölüm'),stat('K/D',number(group.kd,2)),stat('Maç MVP',number(group.mvp),'Kayıtlı maç MVP’si. Etiket eksikse en yüksek ACS kullanılır; eşitlikler dahil.'));
  const metrics=el('dl','metrics-grid');
  metrics.append(
    stat('HS%',percent(group.hs),'Kafa vuruşu / toplam isabetli vuruş'),
    stat('ADR',number(group.adr,1),'Toplam verilen hasar / kayıtlı raund sayısı'),
    stat('KAST',percent(group.kast),'Kill, asist, ölüm yaşamama veya 5 saniyede takım arkadaşı tarafından trade edilme olan raundların yüzdesi.'),
    stat('DDΔ / R',group.dd==null?'—':`${group.dd>=0?'+':''}${number(group.dd,1)}`,'Raund başına verilen ve alınan hasarın farkı'),
    stat('FIRST KILL / DEATH',`${number(group.fk)} / ${number(group.fd)}`,'Her raundun ilk rakip öldürmesi / ilk ölümü'),
    stat('CLUTCH',percent(group.clutch),group.clutchWins+' / '+group.clutchAttempts+' fırsat. Öldürme olaylarına göre 1vX; canlanma belirsizliği olan '+group.clutchExcluded+' raund hariç.')
  );
  const highlights=el('div','highlights');
  const agentPanel=el('section','highlight favorite-agent');agentPanel.append(el('h3',null,'EN ÇOK OYNANAN AJAN'));
  const agentRow=el('div','highlight-row');if(group.agent)agentRow.append(image(`assets/agents/${key(group.agent)}-icon.png`,'mini-agent'));const agentCopy=el('div');agentCopy.append(el('strong',null,group.agent||'—'),el('span',null,`${group.agentMatches} maç`));agentRow.append(agentCopy);agentPanel.append(agentRow);
  const mapPanel=el('section','highlight best-map');mapPanel.append(el('h3',null,'EN YÜKSEK KAZANMA ORANI'));
  if(group.bestMap){const mapName=group.bestMap.name;mapPanel.style.setProperty('--map-image',`url("assets/maps/${key(mapName)}-bg.png")`);const row=el('div','highlight-row');const copy=el('div');copy.append(el('strong',null,mapName),el('span',null,`${group.bestMap.wins}/${group.bestMap.matches} galibiyet · ${percent(group.bestMap.wins/group.bestMap.matches*100)}`));row.append(copy);mapPanel.append(row);mapPanel.title='Seçili dönemde en yüksek galibiyet oranı. Maç sayısıyla birlikte değerlendirin.';}
  const perfPanel=el('section','highlight performance');perfPanel.append(el('h3',null,'PERFORMANCE SCORE'),el('strong','performance-value',number(group.performance,1)),el('span','performance-note',`${group.performanceMatches}/${group.matches} maçta mevcut`));perfPanel.title='API tarafından verilen Performance Score; yalnızca mevcut maçlar üzerinden raund ağırlıklı ortalama.';
  highlights.append(agentPanel,mapPanel,perfPanel);
  const weapons=el('section','weapons');weapons.append(el('h3',null,'FAVORİ SİLAHLAR'));
  const weaponList=el('div','weapon-list');
  group.weapons.forEach(weapon=>{const item=el('div','weapon-item');item.append(image(`assets/weapons/${key(weapon.name)}.png`,'weapon-image'));const copy=el('div','weapon-copy');copy.append(el('strong',null,weapon.name),el('span',null,`${number(weapon.kills)} kill`));item.append(copy);weaponList.append(item);});weapons.append(weaponList);
  const period=el('p','archive-note','Arşiv: '+new Date(data.start).toLocaleDateString('tr-TR')+' – '+new Date(data.end).toLocaleDateString('tr-TR')+' · İndirilebilen kayıtlar; eksiksiz hesap geçmişi garantisi yok.');
  content.append(toolbar,scope,headline,metrics,highlights,weapons,referenceComparison(player,act),profileDetails(group),methodNotes(),period);layout.append(identity,content);app.replaceChildren(layout);window.BayUI?.decorate(app);
}

function tableSection(title,headers,rows,open=false){
 const section=el('details','data-section');section.open=open;section.append(el('summary',null,title));
 const wrap=el('div','table-scroll'),table=el('table','data-table'),head=el('thead'),tr=el('tr');
 headers.forEach(h=>tr.append(el('th',null,h)));head.append(tr);table.append(head);
 const body=el('tbody');rows.forEach(row=>{const tr=el('tr');row.forEach(value=>tr.append(el('td',null,value)));body.append(tr);});table.append(body);wrap.append(table);section.append(wrap);return section;
}
// Competitive totals transcribed from the two Tracker.gg screenshots supplied by 7Bay.
// Match count in Act 5 is inferred from 43 wins / 39.09%; the reference has no party or round events.
const seasonReference = {
  '7bay': {
    e11a5: {matches:110,wins:43,losses:64,kills:1180,deaths:1675,assists:667},
    e11a6: {matches:46,wins:21,losses:25,kills:523,deaths:674,assists:303}
  }
};
function referenceComparison(player, act) {
  const references=seasonReference[player.id];
  if(!references)return document.createDocumentFragment();
  const acts=act==='all'?Object.keys(references):[act];
  const wrap=document.createDocumentFragment();
  for(const period of acts){
    const ref=references[period];if(!ref)continue;
    const withTeam=player.scopes.team[period],noTeam=player.scopes['no-team'][period];
    if(!withTeam||!noTeam)continue;
    const archived={};
    for(const field of ['matches','wins','kills','deaths','assists','draws'])archived[field]=withTeam[field]+noTeam[field];
    archived.losses=archived.matches-archived.wins-archived.draws;
    const labels={matches:'Maç',wins:'Galibiyet',losses:'Mağlubiyet',kills:'Kill',deaths:'Ölüm',assists:'Asist'};
    const comparison=tableSection(actLabel(period)+' · Arşiv kapsamı '+archived.matches+'/'+ref.matches,
      ['Tüm rekabetçi maçlar','Tracker.gg görseli','Maç arşivi'],Object.keys(labels).map(k=>[labels[k],number(ref[k]),number(archived[k])]));
    comparison.append(el('p','archive-note','İki sütun da With team ve No team toplamıdır. Profil ve comp hesapları maç detayları bulunan kayıtları kullanır.'));
    wrap.append(comparison);
  }
  return wrap;
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
 d.append(el('p',null,'MVP: maçın kayıtlı MVP’si; etiket eksikse en yüksek ACS, eşitlikler dahil. Performance Score, yalnızca API’de bulunan maçların raund ağırlıklı ortalamasıdır. ADR, ACS ve DDΔ/R kayıtlı raund sayısını kullanır. With team: beş oyuncumuzun aynı takım ve partide olduğu maçlar. No team: oyuncunun diğer tüm maçları.'));
 const link=el('a',null,'KAST ve DDΔ tanımları · Tracker Network');link.href='https://feedback.tracker.gg/t/fullform-and-meaning-of-these-terms/20277';link.target='_blank';link.rel='noreferrer';d.append(link);return d;
}
async function init(){
  try{
    const response=await fetch('assets/profiles-data.json');if(!response.ok)throw Error('Data unavailable');const data=await response.json();
    const player=data.players.find(p=>p.id===query.get('player'));const act=data.acts.includes(query.get('act'))?query.get('act'):'all';
    if(player)renderPlayer(data,player,act);else renderList(data);
  }catch{const error=el('p','loading-note','Profiller yüklenemedi. Sayfayı yenileyerek tekrar deneyin.');error.setAttribute('role','alert');app.replaceChildren(error);}
  app.setAttribute('aria-busy','false');
}
if(!location.pathname.endsWith('statistics.html'))init();

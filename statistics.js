async function renderTeam(){
 try{
 const res=await fetch('assets/profiles-data.json');if(!res.ok)throw Error();const data=await res.json();
 const params=new URLSearchParams(location.search),act=data.acts.includes(params.get('act'))?params.get('act'):'all',g=data.team[act];
 const heading=el('div','profile-toolbar');heading.append(el('h1',null,'TAKIM İSTATİSTİKLERİ'));
 const select=el('select','profile-select');select.setAttribute('aria-label','Act seç');['all',...data.acts].forEach(a=>{const o=el('option',null,actLabel(a));o.value=a;o.selected=a===act;select.append(o);});
 select.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('act',select.value);history.replaceState(null,'',url);renderTeam();});heading.append(select);
 if(!g.matches){app.replaceChildren(heading,el('p','empty-state','Bu act için beşli takım maçı kaydı yok. Başka bir act veya Tüm act’ler seçin.'));app.setAttribute('aria-busy','false');return;}
 const scope=el('p','scope-note',g.matches+' beşli maç · '+g.wins+' galibiyet · '+g.rounds+' raund');
 const metrics=el('dl','team-overview metrics-grid');metrics.append(stat('KAZANMA',percent(g.wins/g.matches*100)),stat('RAUND KAZANMA',percent(g.roundWins/g.rounds*100)),stat('PİSTOL',percent(g.pistol.wins/g.pistol.rounds*100)),stat('İLK KİLL SONRASI',percent(g.opening.wins/g.opening.rounds*100)),stat('İLK ÖLÜM SONRASI',percent(g.conceded.wins/g.conceded.rounds*100)),stat('POST-PLANT',percent(g.postplant.wins/g.postplant.rounds*100)));
 [...metrics.children].forEach((card,index)=>card.querySelector('dt').prepend(metricIcon(index)));
 const groups=el('div','team-sections');
 const rows=data.players.map(p=>{const s=p.scopes.team[act];return [p.name,number(s.kd,2),number(s.adr,1),percent(s.kast),s.fk+' / '+s.fd,s.clutchWins+' / '+s.clutchAttempts,number(s.acs,1)];});
 groups.append(tableSection('Oyuncu karşılaştırması',['Oyuncu','K/D','ADR','KAST','FK / FD','Clutch','ACS'],rows,true));
 groups.append(tableSection('Haritalar',['Harita','Maç','Galibiyet','Kazanma'],g.maps.map(x=>[x.name,x.matches,x.wins,percent(x.wins/x.matches*100)]),true));
 groups.append(tableSection('Raund analizi',['Durum','Raund','Kazanılan','Başarı'],[['Saldırı',g.sides.attack],['Savunma',g.sides.defense],['Pistol',g.pistol],['İlk kill alındı',g.opening],['İlk ölüm verildi',g.conceded],['Spike bizde kuruldu',g.postplant],['Rakip spike kurdu',g.retake]].map(([name,x])=>[name,x.rounds,x.wins,percent(x.rounds?x.wins/x.rounds*100:null)])));
 groups.append(tableSection('Ekonomi',['Alım','Raund','Kazanılan','Başarı'],g.economy.map(x=>[x.name,x.rounds,x.wins,percent(x.wins/x.rounds*100)])));
 groups.append(tableSection('Birlikte trade',['Trade yapan','Kurtarılan ölüm','Trade sayısı'],g.pairs.map(x=>[x.by,x.saved,x.count])));
 groups.append(tableSection('Harita ve oyuncu–ajan dağılımı',['Harita','7Bay / Lain / OnlyHerif / SARIŞINSEVDALISI / burak6541','Maç','Kazanma'],g.comps.map(x=>[x.map,x.agents.join(' · '),x.matches,percent(x.wins/x.matches*100)])));
 decorateTables(groups,data,act,g);
 const insights=el('div','spotlight-grid');
 const eligible=g.maps.filter(map=>map.matches>=5).sort((a,b)=>b.wins/b.matches-a.wins/a.matches || b.matches-a.matches);
 if(eligible.length)insights.append(mapSpotlight('En yüksek kazanma · 5+ maç',eligible[0]));
 if(eligible.length>1)insights.append(mapSpotlight('En düşük kazanma · 5+ maç',eligible.at(-1)));
 const notes=methodNotes();notes.append(el('p',null,'Saldırı/savunma yalnızca tarafı açıkça kaydedilen veya spike kurulumuyla doğrulanabilen raundları içerir ('+(g.sides.attack.rounds+g.sides.defense.rounds)+'/'+g.rounds+'). Ekonomi: takımın ortalama ekipman değeri; Eco < 2.000, düşük/karma 2.000–3.899, full buy ≥ 3.900. Bunlar BayTracker gruplarıdır; pistol ayrı tutulur. Rakibin spike kurduğu raundlarda başarı, kazanılan raund oranıdır; yalnızca başarılı defuse sayısı değildir.'));
 app.replaceChildren(heading,scope,metrics,insights,groups,notes);window.BayUI?.decorate(app);app.setAttribute('aria-busy','false');
 }catch{app.replaceChildren(el('p','empty-state','İstatistikler yüklenemedi. Sayfayı yenileyin.'));}
}
renderTeam();

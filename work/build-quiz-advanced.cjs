const fs=require('fs');const questions=[];
function add(id,categoryId,prompt,options,answer,explanation,extra={}){questions.push({id,category:'valorant',categoryId,kind:'choice',difficulty:'expert',prompt,options,answer,explanation,...extra});}
const lore={
 Chamber:[
 ['Chamber’ın kartvizitinde Kingdom Defense Program için yazan görevi hangisidir?',['Chief Weapons Designer','Lead Radianite Researcher','Chief Security Officer','Head of Portal Engineering'],0,'Kartvizit onu Kingdom Defense Program’ın baş silah tasarımcısı olarak tanımlar.'],
 ['Fracture’daki şifreli mesajın şifre çözme anahtarı hangi dildeydi?',['Fransızca','İngilizce','Portekizce','Almanca'],0,'Mesaj İngilizceydi; çözüm anahtarı Fransızca bir ifadeydi.'],
 ['Chamber’ın Breeze bağlantısında ortaklık yaptığı adanın sahibi kimdir?',['Thurston Wolf','Oran McEneff','Rúben Pontes','Paul Delmann'],0,'Breeze’deki portal yatırımı Thurston Wolf ile yaptığı anlaşmayla bağlantılıdır.'],
 ['Chamber’ın kendine özel silahlarını geri çağırması hangi ayrıntıyla ilişkilidir?',['Altın dövmelerindeki nanoteknoloji','Gözlüğüne yerleşik bir portal çekirdeği','Kartvizitlerin radianite bataryaları','Ceketinin içindeki boyut modülü'],0,'Kendi silahlarını geri çağırması kol ve boynundaki altın dövmelerle bağlantılı nanoteknolojiye dayanır.']
 ],
 Fracture:[
 ['Everett-Linde’de Alpha ve Omega Kingdom kuruluşlarının doğru ad eşleşmesi hangisidir?',['Alpha: Kingdom Corporation · Omega: Kingdom Industries','Alpha: Kingdom Industries · Omega: Kingdom Corporation','Alpha: Kingdom Defense · Omega: Kingdom Corporation','Alpha: Kingdom Industries · Omega: Kingdom Defense'],0,'Alpha tarafı K-CORP, Omega tarafı K-IND olarak ayrılır.'],
 ['Fracture e-postalarındaki T-0 hangi planlanmış olaya göre sayılıyordu?',['Large Radian Collider’ın tam faaliyete geçişi','Alpha-Omega portalının ilk keşfi','Kingdom’un iki kuruma ayrılması','İlk Işık’ın yıldönümü'],0,'Geri sayım LRC’nin tam çalışır hale geleceği güne göreydi.'],
 ['Everett-Linde yazışmalarındaki doğru mühendis–kurum eşleşmesi hangisidir?',['Oran McEneff: K-CORP · Rúben Pontes: K-IND','Oran McEneff: K-IND · Rúben Pontes: K-CORP','Paul Delmann: K-IND · Oran McEneff: Atlas','Rúben Pontes: REALM · Paul Delmann: K-CORP'],0,'Oran Alpha’nın K-CORP’unda, Rúben Omega’nın K-IND’inde çalışıyordu.'],
 ['Fracture’daki kimlik kartı, Icebox’tan transfer edilen hangi çalışana aittir?',['Paul Delmann','Thurston Wolf','Vincent Fabron','Oran McEneff'],0,'Paul Delmann’ın Icebox’tan Everett-Linde’ye transferi harita içi duyurularda anlatılır.']
 ],
 Pearl:[
 ['SHATTERED’da Protocol’ün Pearl’e açtığı portal nereye çıkar?',['Savunmacı doğuşundaki çizgi roman dükkânının altına','Mid’deki dalış malzemesi dükkânına','B alanındaki müzenin arkasına','Saldıran doğuşundaki metro istasyonuna'],0,'Portal Defender Spawn’daki çizgi roman dükkânının altındadır.'],
 ['Pearl’ün kubbesinin doğru malzeme tanımı hangisidir?',['Radianite ile güçlendirilmiş polikarbonat','Saf radianite kristal örgüsü','Kingdom çeliği ve beton','Sadece su basıncını dengeleyen enerji alanı'],0,'Kubbe radianite ile güçlendirilmiş polikarbonattan yapılmıştır.'],
 ['Pearl’de radianite’ın yaşam desteği dışındaki görevi nedir?',['Gerçekliği kararlı tutmak','Zaman akışını hızlandırmak','Tüm halkı Radiant’a dönüştürmek','Alpha’ya geçişleri kapatmak'],0,'SHATTERED’da yaşam desteğinin yanında gerçeklik kararlılığı için kullanıldığı anlaşılır.'],
 ['Pearl’de kubbe içindeki su hakkında hangisi doğrudur?',['Tuzdan arındırılmıştır ve tarımda kullanılır','Kubbe dışındaki deniz suyuyla aynıdır','Tamamen radianite soğutma sıvısıdır','Sadece dekoratif yapay bir projeksiyondur'],0,'Kubbe içindeki su tuzdan arındırılır; hidroponik tarımda kullanılır.']
 ],
 Harbor:[
 ['Harbor’ın antik eser setinde suyu çağırma ve yönlendirme görevleri nasıl ayrılır?',['Bilezik çağırır, yüzükler yön ve sıcaklığı kontrol eder','Yüzükler çağırır, bilezik yön ve sıcaklığı kontrol eder','Bilezik yalnızca kalkan kurar, yüzükler suyu çağırır','Her yüzük ayrı bir element üretir'],0,'Bilezik suyu ortaya çıkarır; beş yüzük hareketi ve sıcaklığı yönetir.'],
 ['Harbor’ın eski işvereni REALM’ın temel görevi neydi?',['Karaborsaya düşen tarihî eserleri geri almak','Radiant mahkûmları nakletmek','Kingdom için radianite madenciliği yapmak','Omega ajanlarını işe almak'],0,'REALM tarihî eserlerin karaborsadan geri alınmasıyla ilgileniyordu.'],
 ['Harbor yeni bulduğu eseri ilk çatışmada kime karşı kendini savunmak için kullandı?',['Captain Greaves','Thurston Wolf','Oran McEneff','Vincent Fabron'],0,'Bileziği bulduktan sonra Captain Greaves ile çatışmasında kullandı.'],
 ['Harbor’ın bilezik ile birlikte kullandığı yüzük sayısı kaçtır?',['Beş','Dört','Altı','Üç'],0,'Antik eser seti bir bilezik ve beş yüzükten oluşur.']
 ],
 Omen:[
 ['Omen insan formundayken hangi örgüt adına suikast yapıyordu?',['Scions of Hourglass','Atlas','REALM','Kingdom Defense Program'],0,'Protocol öncesinde Scions of Hourglass için çalışan bir suikastçıydı.'],
 ['Fade’in dosyasındaki John, Fred ve Marcus isimleri Omen hakkında ne ifade eder?',['Geçmişte kullandığı takma kimlikler','Doğrulanmış gerçek adının parçaları','Ona deney yapan bilim insanları','Kaybettiği takım arkadaşlarının adları'],0,'Bunlar suikastçı dönemindeki takma kimlikleridir; gerçek adı doğrulanmış değildir.'],
 ['Omen temalı renge dönüşen Ancient Mysteries Revealed uğuru hangi silahla eşleşir?',['Soul Silencer Ghost','Eclipse Ghost','Silvanus Ghost','Reaver Ghost'],0,'Renk etkileşimi Omen’in Soul Silencer Ghost’u ile gerçekleşir.'],
 ['Pearl’deki Monster Redeemed anlatıları Omega Omen’in hangi eylemini anar?',['Sel sularındaki insanları ışınlanarak kurtarmasını','Kubbenin ilk radianite çekirdeğini üretmesini','Alpha portalını tek başına kapatmasını','Kingdom Industries’i kurmasını'],0,'Bu anlatılar Omega Omen’in sel sırasında insanları kurtarmasını konu eder.']
 ]};
for(const [page,rows]of Object.entries(lore))rows.forEach((r,i)=>add('lore-'+page.toLowerCase()+'-'+i,'lore',r[0],r[1],r[2],r[3],{source:'https://wiki.playvalorant.com/en-us/Lore:'+page}));
const mechanics=[
 ['Hangi üçlüde ikincil etkiler bütünüyle doğru eşleştirilmiştir?',['Mıhla: çürüme · Garez: sindirme · Asit Havuzu: savunmasızlık','Mıhla: savunmasızlık · Garez: çürüme · Asit Havuzu: sindirme','Mıhla: sindirme · Garez: savunmasızlık · Asit Havuzu: çürüme','Mıhla: çürüme · Garez: savunmasızlık · Asit Havuzu: sindirme'],0,'Mıhla çürüme, Garez sindirme ve savunmasızlık, Asit Havuzu savunmasızlık uygular.'],
 ['Hangi eşleşmede üç yeteneğin tetiklenme biçimi doğru verilmiştir?',['Sonik Sensör: ses · Kartvizit: görünür düşman · Keskin Sarmaşık: elle etkinleştirme','Sonik Sensör: görüş · Kartvizit: ses · Keskin Sarmaşık: düşman teması','Sonik Sensör: ses · Kartvizit: elle etkinleştirme · Keskin Sarmaşık: görüş','Sonik Sensör: temas · Kartvizit: görünür düşman · Keskin Sarmaşık: ses'],0,'Sensör düşman sesini, Kartvizit görünür düşmanı algılar; Sarmaşık oyuncu tarafından etkinleştirilir.'],
 ['Hangi iki yetenek patladıktan sonra hem çürüme hem sağırlaştırma uygular?',['Mıhla ve Darboğaz','İşgüzar ve Garez','Çekim Alanı ve Mıhla','Darboğaz ve Alarm Botu'],0,'Mıhla ve Darboğaz bağlama, çürüme ve sağırlaştırma etkilerini birlikte taşır.'],
 ['Geri alınabilen üç teçhizatın doğru kümesi hangisidir?',['Buluşma · Alarm Botu · Ark Gülü','Zehir Bulutu · Alarm Botu · Şok Oku','Buluşma · Nanosürü · Falso','Tecrit · Kartvizit · Kem Göz'],0,'Buluşma ve Alarm Botu geri çağrılabilir; Ark Gülü geri alınabilir.'],
 ['Görüş kısıtlama, sersemletme ve ağırlaştırma etkileri hangi sırada doğru eşleşir?',['Ecel · Av Peşinde · Tutulma','Musallat · Kılavuz Işık · Kırılma','Paranoya · Şaşkın · Işık Hızı','Kem Göz · Kankuş · Yakardöner'],0,'Ecel görüş kısıtlar, Av Peşinde sersemletir, Tutulma ağırlaştırır.'],
 ['Hangi üçlüde yeniden kullanım koşulları doğru verilmiştir?',['Zorba: bir kez geri alınır · Çatkapı: iki skorda yenilenir · Keskin Fırtına alt atışı: yenilemez','Zorba: iki kez geri alınır · Çatkapı: sürede yenilenir · Keskin Fırtına alt atışı: yeniler','Zorba: geri alınmaz · Çatkapı: iki asistte yenilenir · Keskin Fırtına alt atışı: yeniler','Zorba: bir kez geri alınır · Çatkapı: her skorda yenilenir · Keskin Fırtına alt atışı: yenilemez'],0,'Zorba tek kez geri alınabilir; Çatkapı iki skorda sıfırlanır; tüm bıçakları atan alternatif atış bıçakları yenilemez.'],
 ['Kendi takımını da etkileyebilen alanlar bakımından doğru üçlü hangisidir?',['Çekim Alanı · Asit Havuzu · M Patlaması','Kem Göz · Alarm Botu · Tecrit','Çelik Bahçesi · İzsürenler · Musallat','Gizli Dron · Kartvizit · Kem Göz'],0,'Bu üç alanın oyun içi açıklamalarındaki etkiler tüm oyunculara uygulanır.'],
 ['Hangi sırada kuvvetli savaş etkisi sağlayan üç farklı kaynak vardır?',['Armoni · İmparatoriçe · Kuvvet İşareti','Dinçleştirici Özüt · Çelik İrade · Armoni','Yüksek Devir · İmparatoriçe · Dalgakıran','Sömür · Kuvvet İşareti · Yakardöner'],0,'Armoni, İmparatoriçe ve Kuvvet İşareti kuvvetli savaş etkisi sağlar.'],
 ['Clove, KAY/O ve Phoenix’in geri dönüş koşullarını doğru birleştiren seçenek hangisidir?',['Clove: skor/hasar asisti · KAY/O: stabil hale getirilme · Phoenix: başlangıç zırhı','Clove: her türlü asist · KAY/O: kendiliğinden kalkış · Phoenix: sıfır zırh','Clove: skor/hasar asisti · KAY/O: Sage ultisi · Phoenix: daima ağır zırh','Clove: sadece skor · KAY/O: stabil hale getirilme · Phoenix: ölüm anındaki zırh'],0,'Clove hasar asistiyle de yaşayabilir; çöken KAY/O stabil hale getirilebilir; Phoenix ulti başındaki zırhla döner.'],
 ['Hangi iki yetenekte görüş biçimini değiştirmek için doldurma tuşu kullanılır?',['Karanlık Örtü ve Dalgakıran’ın görüş biçimi','Fay Hattı ve Güdümlü Salvo’nun menzili','Şok Oku ve Keşif Oku’nun sekme sayısı','Bariyer Küresi ve Taret’in dönüş yönü'],0,'Karanlık Örtü ve Dalgakıran’da doldurma tuşu görünüş/görüş biçimini değiştirir.']
];
mechanics.forEach((r,i)=>add('agent-mastery-'+i,'agent',r[0],r[1],r[2],r[3],{source:'https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=tr-TR'}));
// Numeric scenarios use current catalog damage ranges, no wall penetration or vulnerability.
const weapons=JSON.parse(fs.readFileSync('work/quiz-source-weapons.json')).data;
for(const w of weapons.filter(w=>w.weaponStats?.shotgunPelletCount===1&&w.weaponStats.damageRanges?.length)){
 const ranges=w.weaponStats.damageRanges;
 const range=ranges.at(-1),distance=Math.min(range.rangeEndMeters-1,Math.max(range.rangeStartMeters+5,35));
 const damage=range.bodyDamage,need=Math.ceil(150/damage);
 const counts=[need,need+1,Math.max(1,need-1),need+2];if(new Set(counts).size<4)continue;
 add('arsenal-body-'+w.uuid,'arsenal',w.displayName+' · '+distance+' metrede, gövdeye isabetlerle toplam 150 can/zırhı bitirmek için en az kaç mermi gerekir? (Duvar ve zayıflatma yok.)',counts.map(n=>n+' mermi'),0,'Bu mesafede gövde hasarı '+damage+'. Yukarı yuvarlanan 150 / '+damage+' = '+need+' mermi.',{source:'https://valorant-api.com/v1/weapons?language=tr-TR'});
 const total=range.headDamage+range.bodyDamage;if(total>=150)continue;const remaining=Math.max(0,150-total);
 const opts=[remaining,remaining+5,remaining+10,remaining+15].map(n=>n+' can/zırh');
 add('arsenal-combo-'+w.uuid,'arsenal',w.displayName+' · '+distance+' metrede 150 toplam can/zırhı olan hedefe 1 kafa + 1 gövde isabetinden sonra ne kadar kalır? (Duvar/zayıflatma yok.)',opts,0,'Kafa '+range.headDamage+' + gövde '+range.bodyDamage+' = '+total+' hasar; kalan '+remaining+'.',{source:'https://valorant-api.com/v1/weapons?language=tr-TR'});
}
const multiple=[
 ['Hangileri düşmanı hem çürütür hem sağırlaştırır? İki yeteneği işaretle.',['Mıhla','Darboğaz','İşgüzar','Çekim Alanı'],[0,1],'Mıhla ve Darboğaz bu iki etkiyi birlikte uygular.'],
 ['Hangileri bir takım arkadaşına kuvvetli savaş etkisi ve hız kazandırabilir? İki seçim.',['Armoni','Kuvvet İşareti','Dinçleştirici Özüt','Yüksek Devir'],[0,1],'Armoni ve Kuvvet İşareti takım arkadaşlarını güçlendirebilir; diğer ikisi kişiseldir.'],
 ['Hangileri düşmanlardan farklı olarak kendi takım arkadaşlarını hedefleyip iyileştirebilir? İki seçim.',['Can Küresi','Doğanın Şifası','Sömür','Dinçleştirici Özüt'],[0,1],'Can Küresi ve Doğanın Şifası silah arkadaşlarını iyileştirebilir.']
];
multiple.slice(0,2).forEach((r,i)=>add('agent-multi-'+i,'agent',r[0],r[1],r[2],r[3],{kind:'multiple'}));
const filtered=questions.filter(q=>!/^arsenal-body-/.test(q.id)||!['VANDAL','PHANTOM','SHERIFF','GUARDIAN','MARSHAL'].some(name=>q.prompt.startsWith(name+' ·'))).filter(q=>!q.id.startsWith('arsenal-combo-')||!q.options.some(option=>/\.\d/.test(option)));
fs.writeFileSync('work/quiz-advanced.json',JSON.stringify(filtered,null,2));console.log(questions.length+' advanced questions');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import catalog from './quiz-catalog.json' with {type:'json'};
import {makeQuestions,rankingQuestions,answerQuality,scoreAnswer,durationFor} from './quiz-questions.mjs';
for(const q of catalog){
 assert.equal(new Set(q.options).size,q.options.length,q.id);assert(q.options.length>=2,q.id);
 if(q.kind==='multiple'){assert(Array.isArray(q.answer));assert(q.answer.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length));}
 else assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,q.id);
 assert(q.explanation&&q.categoryId&&['hard','expert'].includes(q.difficulty),q.id);
 if(q.image||q.audio)assert(fs.existsSync(q.image||q.audio),q.id);
 assert(!q.id.startsWith('portrait-')&&!q.id.startsWith('sound-')&&q.effect!=='map-crop'&&q.effect!=='silhouette',q.id);
}
assert(!catalog.some(q=>/^agent-\d+$/.test(q.id)));
const skins=catalog.filter(q=>q.categoryId==='skin');assert(skins.length>=100);assert(skins.filter(q=>q.tier==='Select').length/skins.length>.7);
assert.equal(catalog.filter(q=>q.categoryId==='map').length,39);
const data=JSON.parse(fs.readFileSync('assets/profiles-data.json','utf8'));
for(const topic of ['team','valorant','mixed'])for(let i=0;i<20;i++){
 const questions=makeQuestions(data,topic,20);assert.equal(questions.length,20);assert.equal(new Set(questions.map(q=>q.id)).size,20);
 const maps=questions.filter(q=>q.categoryId==='map');assert.equal(new Set(maps.map(q=>q.id.replace(/-\d+$/,''))).size,maps.length);
}
for(const selected of [['lore'],['ranking'],['map','skin'],['agent','arsenal']]){
 const questions=makeQuestions(data,'mixed',5,selected);assert(questions.every(q=>selected.includes(q.categoryId)));
}
assert.throws(()=>makeQuestions(data,'mixed',5,[]));assert.throws(()=>makeQuestions(data,'mixed',40,['map']),/13 farklı/);
const previous=makeQuestions(data,'mixed',20,['ability']);const replay=makeQuestions(data,'mixed',20,['ability'],previous.map(q=>q.id));assert(!replay.some(q=>previous.some(p=>p.id===q.id)));
const rank=rankingQuestions(data).find(q=>q.id==='ranking-all-weapon-phantom');assert(rank);assert.equal(rank.options.length,5);assert.equal(durationFor(rank),35000);
assert.equal(answerQuality(rank,{order:rank.answer}).quality,1);assert.equal(answerQuality(rank,{order:[...rank.answer].reverse()}).quality,0);
const almost=[...rank.answer];[almost[0],almost[1]]=[almost[1],almost[0]];assert.equal(answerQuality(rank,{order:almost}).quality,.9);
assert.throws(()=>answerQuality(rank,{order:[0,0,1,2,3]}));assert.throws(()=>answerQuality(rank,{order:[0,1,2,3]}));
const tie={options:['a','b','c'],kind:'ranking',rankValues:[10,10,5]};assert.equal(answerQuality(tie,{order:[1,0,2]}).quality,1);
const multi={options:['a','b','c','d'],kind:'multiple',answer:[0,2]};assert.equal(answerQuality(multi,{choices:[2,0]}).quality,1);assert.equal(answerQuality(multi,{choices:[0]}).quality,.5);assert.equal(answerQuality(multi,{choices:[0,1,2,3]}).quality,0);assert.throws(()=>answerQuality(multi,{choices:[0,0]}));
assert.equal(Math.round(scoreAnswer(true,0,35000)*.9),900);
console.log('Passed question types, selected categories, replay avoidance, rarity balance, map deduplication, exact weapon rankings, ties and partial scoring.');

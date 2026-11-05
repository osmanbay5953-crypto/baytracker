import assert from 'node:assert/strict';
import fs from 'node:fs';
import catalog from './quiz-catalog.json' with {type:'json'};
import {makeQuestions} from './quiz-questions.mjs';

for(const q of catalog){
  assert.equal(new Set(q.options).size,4,q.id);
  assert.equal(q.options.length,4,q.id);
  assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id);
  assert(q.explanation,q.id);
  if(q.image||q.audio)assert(fs.existsSync(q.image||q.audio),q.id);
  assert(!q.id.startsWith('portrait-')&&q.effect!=='map-crop'&&q.effect!=='silhouette',q.id);
}
const skins=catalog.filter(q=>q.id.startsWith('skin-'));
assert(skins.length>=100);
assert(skins.filter(q=>q.tier==='Select').length/skins.length>.7);
assert.equal(catalog.filter(q=>q.id.startsWith('sound-')).length,8);
assert.equal(catalog.filter(q=>q.id.startsWith('map-')).length,39);
const data=JSON.parse(fs.readFileSync('assets/profiles-data.json','utf8'));
for(const topic of ['team','valorant','mixed'])for(let i=0;i<30;i++){
  const questions=makeQuestions(data,topic,20);
  assert.equal(questions.length,20);
  assert.equal(new Set(questions.map(q=>q.id)).size,20);
  const maps=questions.filter(q=>q.id.startsWith('map-'));
  assert.equal(new Set(maps.map(q=>q.id.replace(/-\d+$/,''))).size,maps.length);
  if(topic==='valorant')for(const family of ['ability','agent','map','skin','sound'])
    assert(questions.some(q=>q.id.startsWith(family+'-')),family);
}
console.log('Passed catalog assets, choices, rarity balance, removed easy types, and 90 balanced rounds.');

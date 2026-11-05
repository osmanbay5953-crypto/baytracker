const assert=require('node:assert/strict');
const expected=require('../assets/profiles-data.json');
const actual=require('../work/cloud-seed.json').profiles;
function compare(a,b,path='root') {
  if(typeof a==='number'&&typeof b==='number') {
    assert(Math.abs(a-b)<1e-8,path+': '+a+' != '+b);return;
  }
  if(Array.isArray(a)&&Array.isArray(b)&&path.endsWith('.pairs')) {
    a=[...a].sort((x,y)=>(x.by+x.saved).localeCompare(y.by+y.saved));
    b=[...b].sort((x,y)=>(x.by+x.saved).localeCompare(y.by+y.saved));
  }
  if(a&&typeof a==='object'&&b&&typeof b==='object') {
    for(const key of Object.keys(a))compare(a[key],b[key],path+'.'+key);
  } else assert.deepEqual(b,a,path);
}
compare(expected,actual);
compare(require('../assets/map-compositions.json'),require('../work/cloud-seed.json').compositions);
console.log('Cloud snapshot output matches every existing profile, act, scope and map composition.');

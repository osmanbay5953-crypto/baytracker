const fs=require('node:fs');
const {summarize,snapshots}=require('./snapshots.cjs');
const unique=new Map();
for(const file of fs.readdirSync('work/matches').filter(file=>file.endsWith('.json'))) {
  const match=JSON.parse(fs.readFileSync('work/matches/'+file,'utf8').replace(/^\uFEFF/,''));
  const summary=summarize(match);
  if(summary)unique.set(summary.id,summary);
}
const rows=[...unique.values()];
const data=snapshots(rows);
const quote=value=>"'"+value.replace(/'/g,"''")+"'";
const statements=rows.map(row=>'INSERT OR IGNORE INTO matches(id,started_at,act,summary) VALUES ('+
  [row.id,row.date,row.act,JSON.stringify(row)].map(quote).join(',')+');');
for(const [name,payload] of [['profiles',data.profiles],['compositions',data.compositions]]) {
  const text=JSON.stringify(payload);
  statements.push('INSERT OR IGNORE INTO snapshots(name,payload,updated_at) VALUES ('+
    [name,'',new Date().toISOString()].map(quote).join(',')+');');
  for(let offset=0;offset<text.length;offset+=16000){
    const chunk=text.slice(offset,offset+16000);
    const expected=Buffer.byteLength(text.slice(0,offset));
    statements.push('UPDATE snapshots SET payload=payload||'+quote(chunk)+' WHERE name='+quote(name)+
      ' AND length(CAST(payload AS BLOB))='+expected+';');
  }
}
fs.writeFileSync('work/database-seed.sql',statements.join('\n'));
fs.writeFileSync('work/cloud-seed.json',JSON.stringify(data));
console.log(rows.length+' matches prepared, '+Math.round(Buffer.byteLength(statements.join('\n'))/1024)+' KB');

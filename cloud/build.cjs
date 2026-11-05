const fs=require('node:fs');
const path=require('node:path');
fs.mkdirSync('dist/assets',{recursive:true});
for(const name of fs.readdirSync('.'))if(/\.(html|css|js)$/.test(name))
  fs.copyFileSync(name,path.join('dist',name));
fs.cpSync('assets','dist/assets',{recursive:true});
console.log('Public website built in dist/');

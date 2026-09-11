#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const dir=process.argv[2]||'dist';
for (const f of fs.readdirSync(dir,{recursive:true})){
 if(!f.endsWith('.js') && !f.endsWith('.mjs')) continue;
 const c=fs.readFileSync(path.join(dir,f),'utf8');
 const m=c.match(/from ['\"][^'\"]+['\"]/g)||[];
 for(const i of m){const p=i.match(/from ['\"]([^'\"]+)['\"]/)[1]; if(!/^\.|\.\.\//.test(p)) console.log(path.join(dir,f)+': '+p);}
}

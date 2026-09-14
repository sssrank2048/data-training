import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])}
let errors=[];
for(const file of [...files('dist/assets'),...files('scripts'),...files('tests')].filter(f=>f.endsWith('.mjs'))){
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status)errors.push(result.stderr);
 const source=fs.readFileSync(file,'utf8');
 for(const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g))if(!fs.existsSync(path.resolve(path.dirname(file),match[1])))errors.push('Missing import: '+file+' '+match[1]);
}
for(const match of fs.readFileSync('dist/index.html','utf8').matchAll(/(?:src|href)="(\/[^"#]+)"/g))if(!fs.existsSync('dist'+match[1]))errors.push('Missing asset: '+match[1]);
for(const file of files('dist'))if(/\.(xls|xlsx|csv)$/i.test(file)||file.includes('private')||file.includes('inspected-data'))errors.push('Course data must not be deployed: '+file);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log('Source syntax, imports, static assets and distribution boundary passed.');

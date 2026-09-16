import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {caseFile} from '../dist/assets/case-source.mjs';
const target='data/private/'+caseFile.filename,archive='data/private/rocket-source-download.zip';
await fs.mkdir('data/private',{recursive:true});
function verify(bytes){return bytes.length===caseFile.bytes&&createHash('sha256').update(bytes).digest('hex')===caseFile.sha256;}
if(existsSync(target)&&verify(await fs.readFile(target))){console.log('Existing complete file matches the pinned mirror and SHA-256.');process.exit(0);}
console.log('Downloading the pinned public teaching-data mirror; this is not an official-file certification.');
function run(cmd,args,collect=false){return new Promise((resolve,reject)=>{const chunks=[],child=spawn(cmd,args,{stdio:collect?['ignore','pipe','inherit']:'inherit'});if(collect)child.stdout.on('data',x=>chunks.push(x));child.on('error',reject);child.on('exit',code=>code===0?resolve(Buffer.concat(chunks)):reject(Error('Download/extraction failed; existing dataset was not replaced.')));});}
// The source archive is smaller than the uncompressed CSV. Only read the CSV; never execute source files.
await run('curl',['-fSL','--connect-timeout','25','--max-time','900',`https://codeload.github.com/OguzhanCetinkaya/rocketfuel/zip/${caseFile.commit}`,'-o',archive]);
const bytes=await run('unzip',['-p',archive,`rocketfuel-${caseFile.commit}/rocketfuel_data.csv`],true);
if(!verify(bytes))throw Error('File length or SHA-256 mismatch; existing dataset was not replaced.');
const temporary=target+'.download';await fs.writeFile(temporary,bytes);await fs.rename(temporary,target);console.log(`Saved ${target}: ${bytes.length} bytes, SHA-256 ${caseFile.sha256}`);

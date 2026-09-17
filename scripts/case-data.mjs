import {readFile,mkdir,open,link,rm} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {caseFile} from '../dist/assets/case-source.mjs';
import {createDownloadFetcher} from './download-transport.mjs';

export const privateRoot=fileURLToPath(new URL('../data/private/',import.meta.url));

export async function checkCaseData({directory=privateRoot,manifest=caseFile}={}){
 const target=path.join(directory,manifest.filename);
 let bytes;try{bytes=await readFile(target);}catch(error){if(error.code==='ENOENT')return {status:'missing',target};throw error;}
 const hash=createHash('sha256').update(bytes).digest('hex');
 return {status:bytes.length===manifest.bytes&&hash===manifest.sha256?'verified':'mismatch',target,bytes:bytes.length,hash};
}

export async function prepareCaseData({directory=privateRoot,manifest=caseFile,fetcher,log=console.log,timeoutMs=900000}={}){
 const options={directory,manifest},existing=await checkCaseData(options);
 if(existing.status==='verified'){log(`案例数据已核验：${existing.target}`);return existing;}
 if(existing.status==='mismatch')throw Error(`已有文件的长度或 SHA-256 不符，已保留原文件：${existing.target}。请核对并将其重命名备份后，再执行 npm run data:download。`);
 await mkdir(directory,{recursive:true});
 const temporary=path.join(directory,`.${manifest.filename}.${randomUUID()}.download`);
 let handle;
 try{
  log(`正在下载固定公开教学镜像（不代表官方原件认证）：${manifest.url}`);
  log(`本次下载最多等待 ${Math.ceil(timeoutMs/60000)} 分钟；无需下载时可使用 npm run serve。`);
  const request=fetcher||createDownloadFetcher({log,timeoutMs});
  const response=await request(manifest.url,{signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok)throw Error(`镜像下载返回 HTTP ${response.status}`);
  if(!response.body)throw Error('镜像未返回文件内容');
  handle=await open(temporary,'wx');
  const hash=createHash('sha256');let size=0,lastProgress=0;
  for await(const chunk of response.body){
   size+=chunk.byteLength;
   if(size>manifest.bytes)throw Error('下载文件超过固定版本的长度，校验未通过');
   hash.update(chunk);await handle.writeFile(chunk);
   if(size-lastProgress>=2*1024*1024){log(`已接收 ${(size/1024/1024).toFixed(1)} / ${(manifest.bytes/1024/1024).toFixed(1)} MiB`);lastProgress=size;}
  }
  if(size!==manifest.bytes||hash.digest('hex')!==manifest.sha256)throw Error('下载文件的长度或 SHA-256 不符；未安装不完整或不同版本的数据');
  await handle.close();handle=null;
  // Publish only verified bytes, atomically, without replacing a file created by another process.
  try{await link(temporary,existing.target);}catch(error){
   if(error.code!=='EEXIST')throw error;
   if((await checkCaseData(options)).status!=='verified')throw Error('下载期间目标文件发生变化，已保留已有文件');
  }
  log(`已保存并核验：${existing.target}\nSHA-256 ${manifest.sha256}`);
  return await checkCaseData(options);
 }catch(error){
  if(['TimeoutError','AbortError'].includes(error.name))throw Error('下载超时。请检查网络后运行 npm run data:download，或从固定镜像获取 CSV 后在网页导入。');
  throw error;
 }finally{
  if(handle)await handle.close();
  await rm(temporary,{force:true});
 }
}

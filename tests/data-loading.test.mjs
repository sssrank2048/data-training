import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {checkCaseData,prepareCaseData,privateRoot} from '../scripts/case-data.mjs';
import {readDataset,datasetHash} from '../dist/assets/data-loader.mjs';

// Transport fixtures only; these are not business records or course data.
const bytes=Buffer.from('download verification fixture\n');
const manifest={filename:'transport-fixture.txt',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),url:'https://example.invalid/pinned-fixture'};
async function setup(t){
 await mkdir(privateRoot,{recursive:true});const directory=await mkdtemp(path.join(privateRoot,'data-loading-test-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));return {directory,manifest,log:()=>{}};
}
test('empty environment downloads and validates; repeat preparation works offline without refetching',async t=>{
 const options=await setup(t);assert.equal((await checkCaseData(options)).status,'missing');
 let calls=0;const result=await prepareCaseData({...options,fetcher:async url=>{calls++;assert.equal(url,manifest.url);return new Response(bytes);}});
 assert.equal(result.status,'verified');assert.deepEqual(await readFile(result.target),bytes);
 assert.equal((await prepareCaseData({...options,fetcher:()=>{throw Error('must remain offline');}})).status,'verified');
 assert.equal(calls,1);assert.deepEqual(await readdir(options.directory),[manifest.filename]);
});
test('existing mismatched files are preserved without downloading replacements',async t=>{
 const options=await setup(t),target=path.join(options.directory,manifest.filename);await writeFile(target,'keep original');
 assert.equal((await checkCaseData(options)).status,'mismatch');
 await assert.rejects(prepareCaseData({...options,fetcher:()=>{assert.fail('must not download');}}),/已保留原文件/);
 assert.equal(await readFile(target,'utf8'),'keep original');
});
test('partial, oversized and wrong-hash downloads never become installed datasets',async t=>{
 for(const content of [bytes.subarray(0,-1),Buffer.concat([bytes,Buffer.from('x')]),Buffer.alloc(bytes.length)]){
  const options=await setup(t);await assert.rejects(prepareCaseData({...options,fetcher:async()=>new Response(content)}),/长度|SHA-256/);
  assert.equal((await checkCaseData(options)).status,'missing');assert.deepEqual(await readdir(options.directory),[]);
 }
});
test('HTTP, network, timeout and interrupted stream failures clean up temporary files',async t=>{
 for(const fetcher of [async()=>new Response('unavailable',{status:503}),async()=>{throw Error('offline');},async()=>{throw new DOMException('timeout','TimeoutError');},async()=>new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,5));c.error(Error('connection lost'));}}))]){
  const options=await setup(t);await assert.rejects(prepareCaseData({...options,fetcher}));
  assert.equal((await checkCaseData(options)).status,'missing');assert.deepEqual(await readdir(options.directory),[]);
 }
});
test('a file installed concurrently cannot be overwritten by the downloader',async t=>{
 const options=await setup(t),target=path.join(options.directory,manifest.filename);
 await assert.rejects(prepareCaseData({...options,fetcher:async()=>{await writeFile(target,'concurrent original');return new Response(bytes);}}),/目标文件发生变化/);
 assert.equal(await readFile(target,'utf8'),'concurrent original');assert.deepEqual(await readdir(options.directory),[manifest.filename]);
});
test('static 404 and HTML fallback pages explain data recovery instead of pretending to load CSV',async()=>{
 for(const response of [new Response('Not found',{status:404}),new Response('<!doctype html><html>',{headers:{'content-type':'text/html'}}),new Response('<!doctype html><html>',{headers:{'content-type':'text/plain'}})]){
  await assert.rejects(readDataset({url:'/__local/rocketfuel_data.csv'},async()=>response),/静态环境.*从公开镜像加载/);
 }
 await assert.rejects(readDataset({url:'/missing'},async()=>{throw Error('offline');}),/npm run data:download/);
 await assert.rejects(readDataset({url:manifest.url,source:'mirror'},async()=>{throw Error('offline');}),/无法连接公开镜像/);
});
test('browser mirror requests use pinned URL, validate exact bytes and hash, and keep manual import available',async()=>{
 const payload={url:manifest.url,source:'mirror',expectedBytes:manifest.bytes,expectedHash:manifest.sha256};
 const buffer=await readDataset(payload,async(url,options)=>{assert.equal(url,manifest.url);assert.ok(options.signal);return new Response(bytes);});
 assert.equal(await datasetHash(buffer,payload),manifest.sha256);
 await assert.rejects(datasetHash(buffer,{...payload,expectedBytes:manifest.bytes+1}),/文件长度/);
 await assert.rejects(datasetHash(buffer,{...payload,expectedHash:'wrong'}),/文件指纹/);
 assert.equal(await readDataset({buffer},()=>{assert.fail('manual imports never fetch');}),buffer);
 assert.equal(await datasetHash(buffer,{}),manifest.sha256);
});

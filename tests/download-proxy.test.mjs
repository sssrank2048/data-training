import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import {spawnSync,execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {proxyConfiguration,createDownloadFetcher} from '../scripts/download-transport.mjs';
import {prepareCaseData,privateRoot} from '../scripts/case-data.mjs';
import {caseFile} from '../dist/assets/case-source.mjs';

const proxyKeys=['COURSE_DATA_PROXY','HTTPS_PROXY','https_proxy','HTTP_PROXY','http_proxy','ALL_PROXY','all_proxy','NO_PROXY','no_proxy'];
const environment=changes=>({...process.env,...Object.fromEntries(proxyKeys.map(k=>[k,''])),...changes});
const hasCurl=spawnSync('curl',['--version'],{stdio:'ignore'}).status===0;
const hasOpenSSL=spawnSync('openssl',['version'],{stdio:'ignore'}).status===0;
const body=Buffer.from('proxy transport fixture\n'); // Not business records.
const manifest={filename:'transport-fixture.txt',bytes:body.length,sha256:createHash('sha256').update(body).digest('hex'),url:'http://fixture.invalid/data'};
async function folder(t){await mkdir(privateRoot,{recursive:true});const directory=await mkdtemp(path.join(privateRoot,'proxy-test-'));t.after(()=>rm(directory,{recursive:true,force:true}));return directory;}
async function listen(t,server){
 const sockets=new Set();server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{for(const socket of sockets)socket.destroy();return new Promise(resolve=>server.close(resolve));});
 return server.address().port;
}
const consume=async response=>{const chunks=[];for await(const chunk of response.body)chunks.push(chunk);return Buffer.concat(chunks);};

test('proxy selection uses explicit override, lowercase protocol, uppercase protocol, then ALL_PROXY',()=>{
 const url='https://fixture.invalid';
 assert.equal(proxyConfiguration(url,{HTTPS_PROXY:'http://upper:1',https_proxy:'http://lower:2'}).variable,'https_proxy');
 assert.equal(proxyConfiguration(url,{COURSE_DATA_PROXY:'socks5h://socks:3',HTTPS_PROXY:'http://upper:1'}).variable,'COURSE_DATA_PROXY');
 assert.equal(proxyConfiguration(url,{ALL_PROXY:'socks5h://socks:3'}).variable,'ALL_PROXY');
 assert.equal(proxyConfiguration('http://fixture.invalid',{HTTP_PROXY:'http://proxy:4'}).variable,'HTTP_PROXY');
 assert.equal(proxyConfiguration(url,{HTTP_PROXY:'http://proxy:4'}),null);
 const normalized=proxyConfiguration(url,{COURSE_DATA_PROXY:'http://override:4',HTTPS_PROXY:'http://old:1',NO_PROXY:'*',no_proxy:'localhost'}).childEnv;
 assert.equal(normalized.no_proxy,'localhost');assert.equal(normalized.https_proxy,'http://override:4');assert.equal(normalized.HTTPS_PROXY,undefined);
 for(const value of ['secret-password','ftp://user:secret-password@proxy:21','https://proxy/config.pac']){
  assert.throws(()=>proxyConfiguration(url,{HTTPS_PROXY:value}),error=>!error.message.includes('secret-password')&&/代理/.test(error.message));
 }
});

test('direct transport remains available and explains the generic fetch failed error',async()=>{
 const logs=[];let called=false;
 const request=createDownloadFetcher({env:{},log:s=>logs.push(s),directFetch:async()=>{called=true;throw TypeError('fetch failed');}});
 await assert.rejects(request(manifest.url),/HTTPS_PROXY.*COURSE_DATA_PROXY/);assert.ok(called);assert.match(logs.join(''),/未检测到/);
});

test('HTTP proxy downloads through the configured proxy with credentials, without logging them', {skip:!hasCurl},async t=>{
 const requests=[];
 const proxy=http.createServer((req,res)=>{requests.push({url:req.url,auth:req.headers['proxy-authorization']});res.end(body);});
 const port=await listen(t,proxy),directory=await folder(t),logs=[];
 const fetcher=createDownloadFetcher({env:environment({HTTP_PROXY:`http://test-user:secret-password@127.0.0.1:${port}`}),log:s=>logs.push(s)});
 const result=await prepareCaseData({directory,manifest,fetcher,log:s=>logs.push(s)});
 assert.equal(result.status,'verified');assert.equal(requests[0].url,manifest.url);
 assert.equal(requests[0].auth,'Basic '+Buffer.from('test-user:secret-password').toString('base64'));
 assert.doesNotMatch(logs.join(''),/test-user|secret-password|127\.0\.0\.1/);
 assert.deepEqual(await readdir(directory),[manifest.filename]);
});

test('NO_PROXY bypasses a configured broken proxy', {skip:!hasCurl},async t=>{
 const origin=http.createServer((req,res)=>res.end(body)),port=await listen(t,origin);
 const request=createDownloadFetcher({env:environment({HTTP_PROXY:'http://127.0.0.1:1',no_proxy:'127.0.0.1'}),log:()=>{}});
 assert.deepEqual(await consume(await request(`http://127.0.0.1:${port}/data`)),body);
});

test('HTTPS uses CONNECT and proxy authentication failures are actionable without leaking credentials', {skip:!hasCurl},async t=>{
 let target;const proxy=http.createServer();proxy.on('connect',(req,socket)=>{target=req.url;socket.end('HTTP/1.1 407 Proxy Authentication Required\r\nContent-Length: 0\r\n\r\n');});
 const port=await listen(t,proxy),directory=await folder(t),logs=[];
 const fetcher=createDownloadFetcher({env:environment({HTTPS_PROXY:`http://user:secret-password@127.0.0.1:${port}`}),log:s=>logs.push(s)});
 await assert.rejects(prepareCaseData({directory,manifest:{...manifest,url:'https://fixture.invalid/data'},fetcher,log:()=>{}}),/代理认证失败.*407/);
 assert.equal(target,'fixture.invalid:443');assert.doesNotMatch(logs.join(''),/secret-password/);assert.deepEqual(await readdir(directory),[]);
});

test('missing curl reports its dependency instead of falling back to direct access',async()=>{
 const request=createDownloadFetcher({env:{HTTPS_PROXY:'http://127.0.0.1:1'},curlCommand:'/nonexistent-course-curl',log:()=>{},directFetch:()=>assert.fail('must not bypass configured proxy')});
 await assert.rejects(consume(await request('https://fixture.invalid')),/找不到 curl/);
});

test('proxy timeout aborts the child download and cleans incomplete files', {skip:!hasCurl},async t=>{
 const proxy=http.createServer((req,res)=>{res.writeHead(200);res.write(body.subarray(0,5));});
 const port=await listen(t,proxy),directory=await folder(t);
 const fetcher=createDownloadFetcher({env:environment({HTTP_PROXY:`http://127.0.0.1:${port}`}),log:()=>{}});
 await assert.rejects(prepareCaseData({directory,manifest,fetcher,log:()=>{},timeoutMs:200}),/下载超时/);
 assert.deepEqual(await readdir(directory),[]);
});

test('complete real case downloads over HTTPS CONNECT with trusted test CA and keeps the pinned hash', {skip:!hasCurl||!hasOpenSSL},async t=>{
 const directory=await folder(t),key=path.join(directory,'key.pem'),cert=path.join(directory,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
 const original=await readFile(path.join(privateRoot,caseFile.filename));
 const origin=https.createServer({key:await readFile(key),cert:await readFile(cert)},(req,res)=>res.end(original));
 const originPort=await listen(t,origin);let connects=0;
 const proxy=http.createServer();proxy.on('connect',(req,socket,head)=>{
  assert.equal(req.url,`localhost:${originPort}`);connects++;
  const upstream=net.connect(originPort,'127.0.0.1',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});
  upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());socket.on('close',()=>upstream.destroy());
 });
 const proxyPort=await listen(t,proxy),url=`https://localhost:${originPort}/rocketfuel_data.csv`;
 const untrusted=createDownloadFetcher({env:environment({HTTPS_PROXY:`http://127.0.0.1:${proxyPort}`,CURL_CA_BUNDLE:'',SSL_CERT_FILE:''}),log:()=>{}});
 await assert.rejects(prepareCaseData({directory:path.join(directory,'untrusted'),manifest:{...caseFile,url},fetcher:untrusted,log:()=>{}}),/证书校验失败/);
 assert.deepEqual(await readdir(path.join(directory,'untrusted')),[]);
 const fetcher=createDownloadFetcher({env:environment({HTTPS_PROXY:`http://127.0.0.1:${proxyPort}`,CURL_CA_BUNDLE:cert}),log:()=>{}});
 const result=await prepareCaseData({directory:path.join(directory,'download'),manifest:{...caseFile,url},fetcher,log:()=>{}});
 assert.equal(connects,2);assert.equal(result.bytes,12024311);assert.equal(result.hash,caseFile.sha256);assert.equal(result.status,'verified');
});

test('SOCKS5h forwards hostname resolution to the proxy and can download verified data', {skip:!hasCurl},async t=>{
 let target;const proxy=net.createServer(socket=>{
  let stage=0,buffer=Buffer.alloc(0);
  socket.on('data',chunk=>{
   buffer=Buffer.concat([buffer,chunk]);
   if(stage===0){if(buffer.length<2+buffer[1])return;buffer=buffer.subarray(2+buffer[1]);socket.write(Buffer.from([5,0]));stage=1;}
   if(stage===1){
    if(buffer.length<5)return;assert.equal(buffer[0],5);assert.equal(buffer[3],3);
    const length=buffer[4];if(buffer.length<7+length)return;
    target=buffer.subarray(5,5+length).toString();buffer=buffer.subarray(7+length);
    socket.write(Buffer.from([5,0,0,1,127,0,0,1,0,80]));stage=2;
   }
   if(stage===2&&buffer.includes('\r\n\r\n')){stage=3;socket.end(Buffer.concat([Buffer.from(`HTTP/1.1 200 OK\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`),body]));}
  });
 });
 const port=await listen(t,proxy),directory=await folder(t);
 const fetcher=createDownloadFetcher({env:environment({ALL_PROXY:`socks5h://127.0.0.1:${port}`}),log:()=>{}});
 const result=await prepareCaseData({directory,manifest,fetcher,log:()=>{}});
 assert.equal(target,'fixture.invalid');assert.equal(result.status,'verified');
});

import {spawn} from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import {createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';
import {pipeline} from 'node:stream';

const supportedProxies=new Set(['http:','https:','socks4:','socks4a:','socks5:','socks5h:']);

export function proxyConfiguration(url,env=process.env){
 const protocol=new URL(url).protocol;
 const candidates=['COURSE_DATA_PROXY',...(protocol==='https:'?['https_proxy','HTTPS_PROXY']:['http_proxy','HTTP_PROXY']),'all_proxy','ALL_PROXY'];
 const variable=candidates.find(key=>env[key]?.trim());
 if(!variable)return null;
 let parsed;try{parsed=new URL(env[variable]);}catch{throw Error(`${variable} 不是有效代理地址，请使用 http://主机:端口 或 socks5h://主机:端口。`);}
 if(!supportedProxies.has(parsed.protocol)||!parsed.hostname||!['','/'].includes(parsed.pathname)||parsed.search||parsed.hash){
  throw Error(`${variable} 的代理格式不受支持，请填写 HTTP / HTTPS / SOCKS 代理地址，不要填写 PAC 配置文件地址。`);
 }
 // Keep credentials out of logs and process arguments. curl receives them only via its environment.
 const childEnv={...env};
 // Windows treats env names case-insensitively; remove duplicates before normalizing.
 for(const key of ['COURSE_DATA_PROXY','http_proxy','HTTP_PROXY','https_proxy','HTTPS_PROXY','all_proxy','ALL_PROXY','no_proxy','NO_PROXY'])delete childEnv[key];
 Object.assign(childEnv,{http_proxy:env[variable].trim(),https_proxy:env[variable].trim(),all_proxy:env[variable].trim(),no_proxy:env.no_proxy??env.NO_PROXY??''});
 return {variable,childEnv};
}

function curlFailure(code,status,proxyStatus){
 if(status==='407'||proxyStatus==='407')return Error('代理认证失败（HTTP 407），请检查代理账号配置；不要把密码贴到报错反馈中。');
 if(code===28)return new DOMException('代理下载超时，请检查代理连接或稍后重试。','TimeoutError');
 if([5,6].includes(code))return Error('代理或镜像域名解析失败；使用 SOCKS 代理时可尝试 socks5h://，由代理解析域名。');
 if(code===7)return Error('无法连接代理或目标地址，请确认代理程序已运行、地址与端口正确，且当前运行环境能够访问该代理。');
 if([35,51,58,60,77,83,90,91].includes(code))return Error('TLS 连接失败；本下载器已跳过服务器和 HTTPS 代理证书校验，请检查代理协议、端口或客户端证书配置。');
 if(status&&Number(status)>=400)return Error(`镜像下载返回 HTTP ${status}；请检查代理规则是否允许访问 raw.githubusercontent.com。`);
 return Error(`代理下载失败（curl 退出码 ${code??'未知'}），请检查代理连通性和访问规则。`);
}

async function* curlBody(url,{signal,env,command,timeoutMs}){
 signal?.throwIfAborted();
 // -q must be first. The user requested certificate bypass for this dataset download only.
 const args=['-q','--insecure','--proxy-insecure','--fail','--location','--compressed','--silent','--show-error','--proto','=http,https','--proto-redir','=https','--connect-timeout','25','--max-time',String(Math.max(1,timeoutMs/1000)),'--write-out','%{stderr}\nCOURSE_HTTP_STATUS:%{http_code};COURSE_PROXY_STATUS:%{http_connect}\n',url];
 const child=spawn(command,args,{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
 let stderr='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-8192);});
 const done=new Promise(resolve=>{child.once('error',error=>resolve({error}));child.once('close',code=>resolve({code}));});
 const abort=()=>child.kill('SIGTERM');signal?.addEventListener('abort',abort,{once:true});
 try{
  if(signal?.aborted)abort();
  for await(const chunk of child.stdout){signal?.throwIfAborted();yield chunk;}
  const result=await done;signal?.throwIfAborted();
  if(result.error)throw Error(result.error.code==='ENOENT'?'已检测到代理配置，但找不到 curl。请安装 curl 并加入 PATH，或通过网页导入案例 CSV。':'无法启动代理下载工具 curl，请检查系统执行权限。');
  if(result.code!==0)throw curlFailure(result.code,stderr.match(/COURSE_HTTP_STATUS:(\d+)/)?.[1],stderr.match(/COURSE_PROXY_STATUS:(\d+)/)?.[1]);
 }finally{
  signal?.removeEventListener('abort',abort);
  if(child.exitCode===null)child.kill('SIGTERM');
  await done;
 }
}

async function directDownload(url,{signal}={},redirects=5){
 const address=new URL(url);
 if(!['http:','https:'].includes(address.protocol))throw Error('Unsupported dataset protocol');
 const response=await new Promise((resolve,reject)=>{
  // A per-request agent keeps the requested bypass out of the global TLS configuration.
  const request=(address.protocol==='https:'?https:http).get(address,{agent:false,rejectUnauthorized:false,signal,headers:{'Accept-Encoding':'gzip,deflate,br'}},resolve);
  request.on('error',reject);
 });
 if([301,302,303,307,308].includes(response.statusCode)&&response.headers.location){
  response.destroy();
  const next=new URL(response.headers.location,address);
  if(redirects===0||next.protocol!=='https:')throw Error('Invalid dataset redirect');
  return directDownload(next,{signal},redirects-1);
 }
 if(response.statusCode<200||response.statusCode>=300){response.destroy();return {ok:false,status:response.statusCode,body:null};}
 const decoders={gzip:createGunzip,deflate:createInflate,br:createBrotliDecompress};
 const encoding=response.headers['content-encoding']?.toLowerCase();
 let body=response;
 if(encoding&&encoding!=='identity'){
  if(!Object.hasOwn(decoders,encoding)){response.destroy();throw Error('Unsupported dataset encoding');}
  body=decoders[encoding]();pipeline(response,body,()=>{});
 }
 const stream=(async function*(){
  try{for await(const chunk of body){signal?.throwIfAborted();yield chunk;}}
  catch(error){signal?.throwIfAborted();throw error;}
 })();
 return {ok:true,status:response.statusCode,body:stream};
}

export function createDownloadFetcher({env=process.env,log=console.log,timeoutMs=900000,curlCommand='curl',directFetch=directDownload}={}){
 return async(url,{signal}={})=>{
  const proxy=proxyConfiguration(url,env);
  log('案例下载已跳过 HTTPS 证书校验；文件长度和 SHA-256 校验仍然保留。');
  if(proxy){
   log(`检测到 ${proxy.variable}，使用 curl 处理代理，并遵守 NO_PROXY / no_proxy 绕过规则（不输出代理地址或凭据）。`);
   return {ok:true,body:curlBody(url,{signal,env:proxy.childEnv,command:curlCommand,timeoutMs})};
  }
  log('未检测到下载代理环境变量；使用 Node 请求。若仅设置了浏览器或系统代理，请为此命令设置 HTTPS_PROXY 或 COURSE_DATA_PROXY。');
  try{return await directFetch(url,{signal});}
  catch(error){
   if(['AbortError','TimeoutError'].includes(error.name))throw error;
   throw Error('无法连接数据镜像。代理环境请设置 HTTPS_PROXY 或 COURSE_DATA_PROXY 后重试；浏览器代理配置不会自动传给此命令。');
  }
 };
}

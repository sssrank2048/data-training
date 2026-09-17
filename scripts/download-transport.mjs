import {spawn} from 'node:child_process';

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
 if([35,51,58,60,77,83,90,91].includes(code))return Error('TLS / 证书校验失败。若代理使用企业证书，请用 CURL_CA_BUNDLE 配置可信 CA 文件；保持证书校验开启。');
 if(status&&Number(status)>=400)return Error(`镜像下载返回 HTTP ${status}；请检查代理规则是否允许访问 raw.githubusercontent.com。`);
 return Error(`代理下载失败（curl 退出码 ${code??'未知'}），请检查代理连通性和访问规则。`);
}

async function* curlBody(url,{signal,env,command,timeoutMs}){
 signal?.throwIfAborted();
 // -q must be first: ignore curlrc options that could alter TLS verification or write data elsewhere.
 const args=['-q','--fail','--location','--compressed','--silent','--show-error','--proto','=http,https','--proto-redir','=https','--connect-timeout','25','--max-time',String(Math.max(1,timeoutMs/1000)),'--write-out','%{stderr}\nCOURSE_HTTP_STATUS:%{http_code};COURSE_PROXY_STATUS:%{http_connect}\n',url];
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

export function createDownloadFetcher({env=process.env,log=console.log,timeoutMs=900000,curlCommand='curl',directFetch=fetch}={}){
 return async(url,{signal}={})=>{
  const proxy=proxyConfiguration(url,env);
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

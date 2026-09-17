export async function readDataset(payload,fetcher=fetch){
 if(payload.buffer)return payload.buffer;
 const missing='当前环境未提供案例 CSV。Node 环境请运行 npm run data:download；静态环境请点击“从公开镜像加载”或“导入案例 CSV”。';
 const remote=payload.source==='mirror';
 let response;
 try{response=await fetcher(payload.url,{signal:AbortSignal.timeout(180000)});}
 catch{throw Error(remote?'无法连接公开镜像或请求超时。请打开镜像文件链接，下载 CSV 后手动导入。':missing);}
 if(!response.ok)throw Error(remote?`镜像返回 HTTP ${response.status}，请从镜像文件链接获取 CSV 后导入。`:missing);
 if(response.headers.get('content-type')?.includes('text/html'))throw Error(remote?'镜像返回了网页，未作为案例数据使用。请下载原始 CSV 后导入。':missing);
 let bytes;try{bytes=await response.arrayBuffer();}catch{throw Error('数据传输中断或超时，请重试或下载 CSV 后手动导入。');}
 // Some static hosts return the SPA shell as a successful response for unknown endpoints.
 if(/^\s*(?:<!doctype html|<html)[\s>]/i.test(new TextDecoder().decode(bytes.slice(0,256))))throw Error(missing);
 return bytes;
}

export async function datasetHash(bytes,payload){
 if(!globalThis.crypto?.subtle)throw Error('文件校验需要 HTTPS 或 localhost / 127.0.0.1 环境，请通过安全地址访问课程。');
 if(payload.expectedBytes&&bytes.byteLength!==payload.expectedBytes)throw Error('文件长度与固定案例版本不符，未使用不完整数据。请重新下载或导入完整 CSV。');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(payload.expectedHash&&hash!==payload.expectedHash)throw Error('文件指纹与固定案例版本不符，未使用不同版本的数据。请重新下载或导入原始 CSV。');
 return hash;
}

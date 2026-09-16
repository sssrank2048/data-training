import {parseCSV,inspectData,rawQuery,exportRaw} from './analytics.mjs';
let parsed=null,summary=null;
self.onmessage=async({data})=>{
 const {id,type,payload}=data;
 try{
  if(type==='load'){
   const bytes=payload.buffer||await (async()=>{const response=await fetch(payload.url);if(!response.ok)throw Error('本机未找到数据文件，请导入原案例 CSV');return response.arrayBuffer();})();
   self.postMessage({id,progress:'正在校验文件并计算实验结果…'});
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   if(payload.expectedBytes&&bytes.byteLength!==payload.expectedBytes)throw Error('本机文件下载尚未完整，请等待下载完成后重新读取；不使用部分数据生成答案');
   if(payload.expectedHash&&hash!==payload.expectedHash)throw Error('本机文件指纹校验未通过，请重新下载案例数据');
   const candidate=parseCSV(new TextDecoder().decode(bytes)),next=inspectData(candidate);
   parsed=candidate;summary=next;
   self.postMessage({id,result:{summary,meta:{hash,bytes:bytes.byteLength,filename:payload.filename||'rocketfuel_data.csv'},raw:rawQuery(parsed)}});
  }else if(type==='query'){if(!parsed)throw Error('请先载入数据');self.postMessage({id,result:rawQuery(parsed,{...payload,issues:payload.onlyIssues?summary.issues:null})});}
  else if(type==='export'){if(!parsed)throw Error('请先载入数据');self.postMessage({id,result:exportRaw(parsed,{...payload,issues:payload.onlyIssues?summary.issues:null})});}
 }catch(error){self.postMessage({id,error:error.message});}
};

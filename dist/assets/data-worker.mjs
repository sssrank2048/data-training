import {parseCSV,inspectData,rawQuery,exportRaw} from './analytics.mjs';
import {readDataset,datasetHash} from './data-loader.mjs';
let parsed=null,summary=null;
self.onmessage=async({data})=>{
 const {id,type,payload}=data;
 try{
  if(type==='load'){
   const bytes=await readDataset(payload);
   self.postMessage({id,progress:'正在校验文件并计算实验结果…'});
   const hash=await datasetHash(bytes,payload);
   const candidate=parseCSV(new TextDecoder().decode(bytes)),next=inspectData(candidate);
   parsed=candidate;summary=next;
   self.postMessage({id,result:{summary,meta:{hash,bytes:bytes.byteLength,filename:payload.filename||'rocketfuel_data.csv'},raw:rawQuery(parsed)}});
  }else if(type==='query'){if(!parsed)throw Error('请先载入数据');self.postMessage({id,result:rawQuery(parsed,{...payload,issues:payload.onlyIssues?summary.issues:null})});}
  else if(type==='export'){if(!parsed)throw Error('请先载入数据');self.postMessage({id,result:exportRaw(parsed,{...payload,issues:payload.onlyIssues?summary.issues:null})});}
 }catch(error){self.postMessage({id,error:error.message});}
};

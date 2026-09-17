import {prepareCaseData} from './case-data.mjs';
try{await prepareCaseData({timeoutMs:180000});}
catch(error){
 console.error(`案例数据未就绪：${error.message}`);
 console.error('网站仍将启动，问题和答案文本可阅读。在数据页从镜像加载或导入 CSV；下载完成后点击“重新读取环境数据”。');
}
await import('./serve.mjs');

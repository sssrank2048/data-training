import {checkCaseData,prepareCaseData} from './case-data.mjs';
try{
 if(process.argv.includes('--check')){
  const result=await checkCaseData();console.log(JSON.stringify(result,null,2));
  if(result.status!=='verified'){console.error('请运行 npm run data:download；已有不匹配文件需先核对并重命名备份。');process.exitCode=1;}
 }else await prepareCaseData();
}catch(error){console.error(`案例数据准备失败：${error.message}`);process.exitCode=1;}

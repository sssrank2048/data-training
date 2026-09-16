import {ratio} from './analytics.mjs';
export const COURSE_REVISION='rocket-fuel-causal-1';
const Z=1.959963984540054;
export function wilson(k,n){if(!Number.isInteger(k)||!Number.isInteger(n)||n<=0||k<0||k>n)return null;const p=k/n,d=1+Z*Z/n,c=(p+Z*Z/(2*n))/d,h=Z*Math.sqrt(p*(1-p)/n+Z*Z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
export function effect(summary){
 if(!summary?.usable)return null;
 const [c,t]=summary.arms,pc=c.conversions/c.users,pt=t.conversions/t.users,ciC=wilson(c.conversions,c.users),ciT=wilson(t.conversions,t.users),delta=pt-pc;
 const ci=[delta-Math.hypot(pt-ciT[0],ciC[1]-pc),delta+Math.hypot(ciT[1]-pt,pc-ciC[0])];
 return {pc,pt,delta,ci,ciC,ciT,lift:ratio(delta,pc),baseline:t.users*pc,incremental:t.users*delta,incrementalCI:ci.map(x=>x*t.users)};
}
export function economics(summary,{cpm=9,margin=40,scope='pilot'}={}){
 const e=effect(summary);if(!e||!Number.isFinite(cpm)||!Number.isFinite(margin)||cpm<0||margin<0)return null;
 const impressions=scope==='treatment'?summary.arms[1].impressions:summary.all.impressions,cost=impressions*cpm/1000,contribution=e.incremental*margin,net=contribution-cost;
 return {...e,cpm,margin,scope,impressions,cost,contribution,net,roi:ratio(net,cost),naive:summary.arms[1].conversions*margin,netCI:e.incrementalCI.map(x=>x*margin-cost),roiCI:cost?e.incrementalCI.map(x=>(x*margin-cost)/cost):null,incrementalCPA:e.incremental>0?cost/e.incremental:null,breakEvenCPM:ratio(contribution*1000,impressions),breakEvenMargin:e.incremental>0?cost/e.incremental:null};
}
// Restricted expression grammar; no evaluation of JavaScript or arbitrary property access.
export function metricValue(formula,summary,population='all'){
 if(typeof formula!=='string'||formula.length>500)throw Error('公式长度需在 1–500 字符内');
 const arms=summary?.arms;let base=population==='treatment'?arms?.[1]:population==='control'?arms?.[0]:summary?.all;
 const refs=new Set();let pos=0,count=0;
 const ws=()=>{while(/\s/.test(formula[pos]||'')&&pos<formula.length)pos++;};
 function primary(){ws();if(++count>100)throw Error('公式过于复杂');const c=formula[pos];if(c==='+'||c==='-'){pos++;return (c==='-'?-1:1)*primary();}if(c==='('){pos++;const v=expr();ws();if(formula[pos++]!==')')throw Error('括号不匹配');return v;}
  const scope=formula.slice(pos).match(/^(T|C)\s*\(/);if(scope){pos+=scope[0].length;refs.add('test');const previous=base;base=arms?.[scope[1]==='T'?1:0];const v=expr();base=previous;ws();if(formula[pos++]!==')')throw Error('分组括号不匹配');return v;}
  const num=formula.slice(pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(num){pos+=num[0].length;return Number(num[0]);}
  const call=formula.slice(pos).match(/^(COUNT|SUM|MEAN)\s*\(\s*([a-z_]+)\s*\)/);if(!call)throw Error('仅支持 COUNT / SUM / MEAN、T / C 分组、四则运算与括号');
  pos+=call[0].length;const [,fn,f]=call;refs.add(f);
  if(!(['user_id','converted','tot_impr'].includes(f)))throw Error(`字段 ${f} 不可计算；本案例没有点击、收入或逐笔成本字段`);
  if(f==='user_id'&&fn!=='COUNT')throw Error('user_id 是标识符，只能计数');
  if(!summary?.usable||!base)return NaN;
  const sum=f==='converted'?base.conversions:base.impressions;
  return fn==='COUNT'?base.users:fn==='SUM'?sum:sum/base.users;
 }
 function term(){let v=primary();ws();while(formula[pos]==='*'||formula[pos]==='/'){const op=formula[pos++],r=primary();v=op==='*'?v*r:r===0?NaN:v/r;ws();}return v;}
 function expr(){let v=term();ws();while(formula[pos]==='+'||formula[pos]==='-'){const op=formula[pos++],r=term();v=op==='+'?v+r:v-r;ws();}return v;}
 if(!formula.trim())throw Error('请输入公式');const value=expr();ws();if(pos!==formula.length)throw Error('公式中含有不支持的字符或字段');return {value:Number.isFinite(value)?value:null,fields:[...refs]};
}
export function samplePlan({baseline,mdePP,controlShare=.5,dailyUsers=null}){
 const p0=Number(baseline),diff=Number(mdePP)/100,q=Number(controlShare),p1=p0+diff;
 if(!(p0>0&&p0<1&&diff>0&&p1<1&&q>=.01&&q<=.99))return null;
 // Large-sample two-sided test, alpha .05, power .80; ratio n_control / n_treatment.
 const r=q/(1-q),pooled=(p1+r*p0)/(1+r),nullSD=Math.sqrt(pooled*(1-pooled)*(1+1/r)),altSD=Math.sqrt(p1*(1-p1)+p0*(1-p0)/r);
 const treatment=Math.ceil(((Z*nullSD+.8416212335729143*altSD)/diff)**2),control=Math.ceil(treatment*r),total=treatment+control;
 return {treatment,control,total,p0,p1,diff,controlShare:q,days:Number(dailyUsers)>0?Math.ceil(total/Number(dailyUsers)):null};
}
export function allocationCheck(summary,expected=.04){if(!summary?.all.users||!(expected>0&&expected<1))return null;const n=summary.all.users,k=summary.arms[0].users,z=(k-n*expected)/Math.sqrt(n*expected*(1-expected));return {observed:k/n,expected,z,flag:Math.abs(z)>3.2905267314919255};}
// Signatures bind work to data, definitions, previous drafts and saved scenario/plan.
export function signature(value){let h=2166136261;const s=JSON.stringify(value);for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16);}
export function questionSignature(group,id,dataHash){const index=Number(id.slice(1));return signature({revision:COURSE_REVISION,dataHash,metrics:group.metrics,notes:Object.fromEntries(Array.from({length:index},(_,i)=>{const key='q'+(i+1);return [key,group.notes[key]||{}];})),scenario:index>=3?group.scenario:null,plan:index>=4?group.plan:null});}
export function submissionState(group,id,hash){const list=group.submissions[id]||[],last=list.at(-1);return !last?'draft':last.signature===questionSignature(group,id,hash)?'current':'stale';}
export function submitQuestion(group,id,hash,at=new Date().toISOString()){
 const n=Number(id.slice(1));if(!hash)throw Error('请先载入并核验数据');
 if(!group.notes[id]?.initial?.trim()||!group.notes[id]?.evidence?.trim()||!group.notes[id]?.answer?.trim())throw Error('请填写独立初判、证据和结论');
 if(n===1&&!group.metrics.length)throw Error('请先创建本组指标');
 for(let i=1;i<n;i++)if(submissionState(group,'q'+i,hash)!=='current')throw Error('请先重新提交前题证据，再引用到本题');
 const snapshot={at,dataHash:hash,signature:questionSignature(group,id,hash),notes:structuredClone(group.notes[id]),references:Object.fromEntries(Array.from({length:n-1},(_,i)=>['q'+(i+1),group.submissions['q'+(i+1)].at(-1).signature])),metrics:structuredClone(group.metrics),scenario:structuredClone(group.scenario),plan:structuredClone(group.plan)};
 return {...group,submissions:{...group.submissions,[id]:[...(group.submissions[id]||[]),snapshot]}};
}
export function newGroup(id,name){return {id,name,metrics:[],metricHistory:[],notes:{},submissions:{},scenario:{cpm:9,margin:40,scope:'pilot'},plan:{hypothesis:'',unit:'Cookie 用户（跨设备识别需另行验证）',primary:'转化用户数 / 随机入组用户数',window:'',guardrail:'',decision:'',mdePP:'',controlShare:'0.5',dailyUsers:''}};}
export function validateImport(value){
 if(value?.schema!=='rocket-fuel-course-v1'||!Array.isArray(value.groups)||!value.groups.length||value.groups.length>50)throw Error('不是本课程的小组导出文件');
 for(const g of value.groups){if(typeof g.name!=='string'||!Array.isArray(g.metrics)||g.metrics.length>100||!g.notes||!g.submissions||!g.plan||!g.scenario)throw Error('小组文件结构不完整');for(const m of g.metrics){if(['name','formula','unit','role','population','window','meaning'].some(k=>typeof m[k]!=='string'))throw Error('指标定义不完整');metricValue(m.formula,null);}for(const n of Object.values(g.notes)){if(['initial','evidence','answer'].some(k=>typeof n[k]!=='string'&&n[k]!==undefined))throw Error('练习文字格式错误');}}
 return value.groups;
}

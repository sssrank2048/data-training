import {lessons} from './course.mjs';
import {caseFile} from './case-source.mjs';
import {renderPage,rawResults,metricBoard,economicsResult,plannerResult} from './views.mjs';
import {esc,num,pct,pp,explorationChart} from './charts.mjs';
import {metricValue,samplePlan,newGroup,validateImport,submitQuestion,submissionState,effect,economics} from './investigation.mjs';
const KEY='rocket-fuel-course-v1',uid=()=>crypto.randomUUID(),initialGroup=newGroup(uid(),'第一组');
const state={summary:null,meta:null,raw:null,filters:{arm:'',converted:'',query:'',onlyIssues:false},groups:[initialGroup],groupId:initialGroup.id,dimension:'frequency',metricDraft:null,loadError:'',busy:false};
const group=()=>state.groups.find(g=>g.id===state.groupId)||state.groups[0];
let stored=null;try{stored=localStorage.getItem(KEY);if(stored){const value=JSON.parse(stored);state.groups=validateImport(value);state.groupId=state.groups.some(g=>g.id===value.groupId)?value.groupId:state.groups[0].id;}}catch{state.storageBlocked=true;}
function save(){if(state.storageBlocked){toast('已有本地记录无法读取；为保护原记录，本次不覆盖保存。请导出当前工作。');return false;}try{localStorage.setItem(KEY,JSON.stringify({schema:KEY,groupId:state.groupId,groups:state.groups}));return true;}catch{toast('浏览器存储空间不足或不可用，请导出小组记录。');return false;}}
function toast(text){const box=document.querySelector('#toast');box.textContent=text;box.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.remove('visible'),5500);}
const page=()=>location.hash.slice(1)||'story';
const navItems=[['story','01','案例故事'],['mission','02','本节课的任务'],...lessons.map(l=>[l.id,l.n,l.short]),['data','↳','数据与原始明细'],['groups','↳','小组工作区'],['sources','↳','来源与方法']];
function render(){const p=page();document.querySelector('#main').innerHTML=renderPage(state,p);document.querySelector('#breadcrumb').textContent=navItems.find(x=>x[0]===p)?.[2]||'案例故事';document.querySelector('#navigation').innerHTML=navItems.map(([id,n,title],i)=>`${i===2?'<div class="nav-section">四份分析交付</div>':i===6?'<div class="nav-section">课程工具</div>':''}<a href="#${id}" ${p===id?'aria-current="page"':''}><span>${n}</span>${title}</a>`).join('');document.querySelector('#group-label').textContent=group().name+' · 小组工作区 ↗';updateStatus();if(p==='q1')previewMetric();}
function updateStatus(){const el=document.querySelector('#data-status');el.textContent=state.busy?'正在核验案例数据…':state.meta?`${num(state.summary.audit.rows)} 条记录 · ${!state.summary.usable?'需检查异常':state.meta.hash===caseFile.sha256?'镜像已核验':'导入文件 · 未匹配镜像'}`:state.loadError?'数据未载入 · 查看原因':'数据尚未载入';el.className=state.meta&&state.summary.usable?'ready':'';}
function updateEvidence(){document.querySelectorAll('.evidence-state').forEach(el=>{el.textContent={draft:'尚未提交',current:'证据有效',stale:'口径或前题已变更 · 请重新提交'}[submissionState(group(),el.dataset.question,state.meta?.hash)];});}
let worker=new Worker('/assets/data-worker.mjs',{type:'module'}),requestId=0;const pending=new Map();
worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;if(data.progress){updateStatus();return;}pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.result);};
worker.onerror=()=>{for(const p of pending.values())p.reject(Error('数据计算进程异常，请刷新页面后重新导入'));pending.clear();};
const ask=(type,payload)=>new Promise((resolve,reject)=>{const id=++requestId;pending.set(id,{resolve,reject});worker.postMessage({id,type,payload});});
async function loadData(file,source='local'){if(state.busy)return;state.busy=true;state.loadError='';if(page()==='data')render();else updateStatus();try{if(file&&file.size>40*1024*1024)throw Error('请使用不超过 40 MiB 的案例 CSV');const payload=file?{buffer:await file.arrayBuffer(),filename:file.name}:{url:source==='mirror'?caseFile.url:caseFile.local,source,expectedHash:caseFile.sha256,expectedBytes:caseFile.bytes};const result=await ask('load',payload);state.summary=result.summary;state.meta={...result.meta,source:file?'import':source};state.raw=result.raw;state.filters={arm:'',converted:'',query:'',onlyIssues:false};if(state.meta.hash!==caseFile.sha256)toast('当前文件与固定镜像不同；分析按导入文件计算，旧证据需要重新核对。');else if(!state.summary.usable)toast('文件已载入，但存在质量问题；请到数据页检查原始行。');}catch(error){state.loadError=error.message;toast(error.message);}finally{state.busy=false;render();}}
async function download(text,name,type='text/plain;charset=utf-8'){
 const response=await fetch('/__local/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:name,body:text})});
 if(!response.ok)throw Error('本机导出未完成，请确认服务正在运行后重试');
 const result=await response.json(),box=document.querySelector('#export-result');box.hidden=false;box.innerHTML=`<span>已生成本机文件</span><a href="${esc(result.url)}" download="${esc(name)}">下载 ${esc(name)} ↓</a><button data-action="close-export" aria-label="关闭导出提示">×</button>`;
 toast('导出文件已保存到本机，点击右下角的下载链接获取。');
}

async function queryRaw(p=0){try{const result=await ask('query',{...state.filters,page:p});state.raw=result;const node=document.querySelector('#raw-results');if(node)node.innerHTML=rawResults(result);}catch(e){toast(e.message);}}
const formValues=form=>Object.fromEntries(new FormData(form));
function previewMetric(){const f=document.querySelector('#metric-form');if(!f)return;const m=formValues(f);state.metricDraft=m;const output=document.querySelector('#metric-preview');try{const result=metricValue(m.formula,state.summary,m.population);output.textContent=`${result.fields.join(' + ')||'常量'} → ${result.value===null?'等待有效数据 / 分母为零':m.unit==='%'?pct(result.value,3):m.unit==='百分点'?pp(result.value,3):num(result.value,3)}${['%','百分点'].includes(m.unit)?'':' · '+m.unit}`;output.className='valid';}catch(e){output.textContent=e.message;output.className='invalid';}}
function savePlan(form){const values=formValues(form);group().plan={...group().plan,...values};save();const el=document.querySelector('#planner-result');if(el)el.innerHTML=plannerResult(state);updateEvidence();}
async function exportReport(){const g=group(),e=effect(state.summary),money=economics(state.summary,g.scenario);let text=`# ${g.name} · Rocket Fuel 课程记录\n\n数据指纹：${state.meta?.hash||'未载入'}\n\n## 指标体系\n\n`+g.metrics.map(m=>`- ${m.name}｜${m.formula}｜${m.unit}｜${m.role}｜${m.population}｜${m.window}｜${m.meaning}`).join('\n');for(const l of lessons){const n=g.notes[l.id]||{};text+=`\n\n## ${l.n} ${l.title}\n\n初判：${n.initial||''}\n\n证据：${n.evidence||''}\n\n结论：${n.answer||''}\n\n提交状态：${submissionState(g,l.id,state.meta?.hash)}\n`;}
 if(e)text+=`\n## 当前文件计算摘要\n\n广告转化率 ${e.pt}；PSA 转化率 ${e.pc}；差值 ${e.delta}；95% 区间 ${e.ci.join(' 至 ')}。\n`;
 if(money)text+=`\n增量净贡献 $${money.net}；ROI ${money.roi}；成本范围 ${money.scope}；CPM ${money.cpm}；单位贡献 ${money.margin}。\n`;
 text+='\n## 下一轮实验计划（尚未执行）\n\n'+Object.entries(g.plan).map(([k,v])=>`- ${k}：${v}`).join('\n');await download(text,'rocket-fuel-team-report.md');}
document.addEventListener('input',event=>{const el=event.target;if(el.dataset.note){const g=group(),id=el.dataset.question;g.notes[id]={...(g.notes[id]||{}),[el.dataset.note]:el.value};save();updateEvidence();}if(el.closest('#metric-form'))previewMetric();if(el.closest('#plan-form'))savePlan(el.closest('form'));});
document.addEventListener('change',async event=>{const el=event.target;
 if(el.id==='csv-file'){const file=el.files[0];if(file)await loadData(file);el.value='';}
 if(el.id==='group-file'){try{const file=el.files[0];if(!file)return;if(file.size>5*1024*1024)throw Error('小组记录文件不得超过 5 MiB');const imports=validateImport(JSON.parse(await file.text()));for(const g of imports)state.groups.push({...structuredClone(g),id:uid(),name:g.name+'（导入副本）'});save();render();toast(`新增 ${imports.length} 个小组副本，原记录已保留。`);}catch(e){toast(e.message);}el.value='';}
 if(el.id==='group-select'){state.groupId=el.value;state.metricDraft=null;save();render();}
 if(el.id==='exploration-dimension'){state.dimension=el.value;document.querySelector('#exploration-chart').innerHTML=explorationChart(state.summary,state.dimension);}
 if(el.closest('#metric-form'))previewMetric();if(el.closest('#plan-form'))savePlan(el.closest('form'));
});
document.addEventListener('submit',async event=>{event.preventDefault();const f=event.target,v=formValues(f);try{
 if(f.getAttribute('id')==='raw-form'){state.filters={arm:v.arm,converted:v.converted,query:v.query,onlyIssues:!!v.onlyIssues};await queryRaw();}
 if(f.getAttribute('id')==='metric-form'){metricValue(v.formula,state.summary,v.population);const g=group(),index=g.metrics.findIndex(m=>m.id===v.id);const m={...v,id:v.id||uid()};g.metricHistory=[...(g.metricHistory||[]),{at:new Date().toISOString(),metrics:structuredClone(g.metrics)}];if(index>=0)g.metrics[index]=m;else g.metrics.push(m);state.metricDraft=null;save();render();toast('指标已保存；已有证据将按新定义重新校验。');}
 if(f.getAttribute('id')==='economic-form'){group().scenario={cpm:Number(v.cpm),margin:Number(v.margin),scope:v.scope};save();document.querySelector('#economic-result').innerHTML=economicsResult(state);document.querySelector('#scenario-label').textContent=v.cpm==='9'&&v.margin==='40'&&v.scope==='pilot'?'案例参数 · 整个试投':'学员敏感性情景';updateEvidence();}
 if(f.getAttribute('id')==='plan-form'){savePlan(f);if(!Number(v.mdePP))throw Error('请设定最小有意义效果 MDE');const e=effect(state.summary);if(!e)throw Error('请先载入有效数据计算样本量');if(!samplePlan({baseline:v.baseline==='psa'?e.pc:e.pt,mdePP:v.mdePP,controlShare:v.controlShare,dailyUsers:v.dailyUsers}))throw Error('MDE 与基线组合无效，请检查样本规划输入');toast('计划字段已填写并保存。请继续在证据区说明方案依据与可执行条件。');}
 if(f.getAttribute('id')==='group-form'){const g=newGroup(uid(),v.name.trim());if(!g.name)throw Error('请输入小组名称');state.groups.push(g);state.groupId=g.id;state.metricDraft=null;save();render();toast('已创建 '+g.name);}
 }catch(error){toast(error.message);}});
document.addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;try{
 if(action==='load')await loadData();
 if(action==='load-mirror')await loadData(null,'mirror');
 if(action==='import-csv')document.querySelector('#csv-file').click();
 if(action==='raw-prev')await queryRaw(state.raw.page-1);
 if(action==='raw-next')await queryRaw(state.raw.page+1);
 if(action==='export-raw'){button.disabled=true;try{await download(await ask('export',state.filters),'rocket-fuel-filtered-with-source-rows.csv','text/csv;charset=utf-8');}finally{button.disabled=false;}}
 if(action==='preset'){const k=button.dataset.kind;state.metricDraft={name:{conversion:'用户转化率',frequency:'人均曝光',users:'入组人数',increment:'增量转化率'}[k],formula:{conversion:'SUM(converted) / COUNT(user_id)',frequency:'SUM(tot_impr) / COUNT(user_id)',users:'COUNT(user_id)',increment:'T(MEAN(converted)) - C(MEAN(converted))'}[k],unit:{conversion:'%',frequency:'次/人',users:'人数',increment:'百分点'}[k],role:{conversion:'结果',frequency:'过程',users:'护栏',increment:'结果'}[k],population:'all',window:'整个案例活动期',meaning:{conversion:'衡量购买概率；需按随机两组分别比较',frequency:'观察投放强度，不直接作为因果剂量',users:'检查样本规模与随机分流',increment:'商业广告相对于 PSA 的用户购买概率差'}[k]};render();document.querySelector('[name="formula"]').focus();}
 if(action==='edit-metric'){state.metricDraft={...group().metrics.find(m=>m.id===button.dataset.id)};render();document.querySelector('[name="name"]').focus();}
 if(action==='submit-evidence'){if(!state.summary?.usable)throw Error('请先载入通过质量检查的案例数据');const g=group(),updated=submitQuestion(g,button.dataset.question,state.meta?.hash);state.groups[state.groups.indexOf(g)]=updated;save();render();toast('已保存本题证据快照与前题引用。');}
 if(action==='export-groups')await download(JSON.stringify({schema:KEY,groups:state.groups,groupId:state.groupId},null,2),'rocket-fuel-groups.json','application/json');
 if(action==='import-groups')document.querySelector('#group-file').click();
 if(action==='export-report')await exportReport();
 if(action==='close-export')document.querySelector('#export-result').hidden=true;
 }catch(error){toast(error.message);}});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
render();if(state.storageBlocked)toast('已有小组记录无法读取，已保护原存储；请使用导出保留本次工作。');loadData();

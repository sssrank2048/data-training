import {lessons} from './course.mjs';
import {caseFile} from './case-source.mjs';
import {parseWorkbookSheets,aggregate,groupRows,filteredRows,scenario,csvText} from './analytics.mjs';
import {esc,num,usd} from './charts.mjs';
import {views} from './views.mjs';
import {investigationController} from './investigation-controller.mjs';
import {explorerController} from './explorer-controller.mjs';
const main=document.querySelector('main'),storageKey='air-france-course-notes-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{}
if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
for(const l of lessons){const n=saved[l.id];if(!n||typeof n!=='object'||Array.isArray(n))delete saved[l.id];else {n.text=typeof n.text==='string'?n.text:'';n.complete=n.complete===true}}
const state={data:null,notes:saved,tab:'task',publisher:'',campaign:'',query:'',minClicks:0,page:0,tablePage:0,budgets:{},cap:null,cpcChange:0,cvrChange:0,importing:false};
const localAvailable=!!document.querySelector('meta[name="local-case"]');
const view=views(state,localAvailable),routes=new Set(['overview','brief','q1','q2','q3','q4','data','notes']);
let rawBytes=null,fileName='',toastTimer;
const controller=investigationController(state,{render,save,toast,download});
const explorer=explorerController(state,{render,toast,download});
const route=()=>routes.has(location.hash.slice(1))?location.hash.slice(1):'overview';
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500)}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state.notes));return true}catch{toast('浏览器无法保存，请及时导出作答。');return false}}
function download(content,name,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function updateScenario(){controller.updateScenario()}
function render(){
 const r=route();
 document.querySelectorAll('[data-route]').forEach(a=>{const active=a.dataset.route===r;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 document.querySelector('#breadcrumb').textContent=({overview:'案例故事与课程路线',brief:'案例故事与题目依据',data:'原始数据查看',notes:'我的分析记录'}[r]||lessons.find(l=>l.id===r)?.title);
 const d=document.querySelector('#data-status');d.textContent=state.data?`${num(state.data.rows.length)} 条数据已载入`:localAvailable?'完整镜像已下载':'镜像可下载';d.classList.toggle('ready',!!state.data||localAvailable);
 main.innerHTML=r.startsWith('q')?view.lesson(r):view[r]();
 if(r==='overview')main.querySelectorAll('.lesson').forEach((el,i)=>{if(controller.submitted(lessons[i].id))el.querySelector('.lesson-time').textContent='✓ 证据已提交'});
}
function applyDataset(data,bytes,name){state.data=data;rawBytes=bytes;fileName=name;state.publisher='';state.campaign='';state.query='';state.minClicks=0;state.page=0;state.tablePage=0;state.budgets={};explorer.reset();controller.dataLoaded();render();toast(`已载入 ${num(data.rows.length)} 条记录。`)}
async function loadParser(){if(globalThis.XLSX)return globalThis.XLSX;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Excel 读取组件不可用，请检查网站文件。'));document.head.append(s)});if(!globalThis.XLSX)throw Error('Excel 读取组件未初始化');return globalThis.XLSX}
async function importFile(file){if(state.importing)return;if(file.size>20*1024*1024){toast('文件超过 20 MB，请使用课程配套表格。');return}state.importing=true;const message=document.querySelector('#import-message');if(message){message.textContent='正在检查表头与数据口径…';message.classList.remove('error')}try{const XLSX=await loadParser(),bytes=await file.arrayBuffer(),wb=XLSX.read(bytes,{type:'array'});const sheets=wb.SheetNames.map(name=>({name,startRow:wb.Sheets[name]['!ref']?XLSX.utils.decode_range(wb.Sheets[name]['!ref']).s.r:0,startCol:wb.Sheets[name]['!ref']?XLSX.utils.decode_range(wb.Sheets[name]['!ref']).s.c:0,matrix:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null})}));const hash=crypto.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join(''):null;const data=parseWorkbookSheets(sheets,{filename:file.name,sha256:hash,sourceKind:hash===caseFile.sha256?'public-course-mirror':'local-import',authority:hash===caseFile.sha256?'与已核验公开镜像一致；尚未与官方文件核验':'用户本地导入；真实性未自动认证',sourceUrl:hash===caseFile.sha256?caseFile.repository:null,retrievedAt:new Date().toISOString()});applyDataset(data,bytes,file.name)}catch(e){if(message){message.textContent=e.message;message.classList.add('error')}toast('导入失败，原有数据保持不变。')}finally{state.importing=false}}
async function loadCaseMirror(useLocal){
 if(state.importing || (useLocal&&!localAvailable))return;
 state.importing=true;
 const message=document.querySelector('#dataset-message');
 if(message)message.textContent='正在读取完整工作簿并校验文件…';
 document.querySelectorAll('[data-action="load-local"],[data-action="load-mirror"]').forEach(b=>b.disabled=true);
 try{
  const response=await fetch(useLocal?'/__local/'+caseFile.filename:caseFile.url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error(`文件读取失败（HTTP ${response.status}）`);
  const bytes=await response.arrayBuffer();
  if(!crypto.subtle)throw Error('当前浏览器无法校验文件，请在本地或 HTTPS 网站中打开。');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==caseFile.bytes||hash!==caseFile.sha256)throw Error('镜像与已核验文件不同，未载入；请检查来源或导入自己的官方文件。');
  const XLSX=await loadParser(),wb=XLSX.read(bytes,{type:'array'});
  const sheets=wb.SheetNames.map(name=>({name,startRow:wb.Sheets[name]['!ref']?XLSX.utils.decode_range(wb.Sheets[name]['!ref']).s.r:0,startCol:wb.Sheets[name]['!ref']?XLSX.utils.decode_range(wb.Sheets[name]['!ref']).s.c:0,matrix:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null})}));
  const data=parseWorkbookSheets(sheets,{filename:caseFile.filename,sha256:hash,sourceKind:'public-course-mirror',sourceUrl:caseFile.repository,authority:'完整公开镜像，SHA-256 已核验；尚未与官方文件逐字节核对',retrievedAt:new Date().toISOString()});
  applyDataset(data,bytes,caseFile.filename);
 }catch(error){
  const text=error.name==='TimeoutError'?'镜像连接超时；可下载文件后在数据页导入。':error.message;
  if(message){message.textContent=text;message.classList.add('error')}toast(text);
 }finally{state.importing=false;document.querySelectorAll('[data-action="load-local"],[data-action="load-mirror"]').forEach(b=>b.disabled=false)}
}
function exportNotes(){controller.exportNotes()}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;if(explorer.click(a,b))return;if(await controller.click(a,b))return;if(a==='tab'){state.tab=b.dataset.tab;render();document.querySelector('#tab-'+state.tab)?.focus()}if(a==='load-local')await loadCaseMirror(true);if(a==='load-mirror')await loadCaseMirror(false);if(a==='download-original'&&rawBytes)download(new Blob([rawBytes]),fileName);if(a==='preview-page'||a==='keywords-page'){state[a==='preview-page'?'tablePage':'page']+=Number(b.dataset.delta);const y=window.scrollY;render();window.scrollTo(0,y)}if(a==='check-cpa'){const text=document.querySelector('#cpa-check').value,n=Number(text),expected=aggregate(state.data.rows).cpa;document.querySelector('#cpa-feedback').textContent=text!==''&&Number.isFinite(n)&&expected!==null&&Math.abs(n-expected)<=.015?'✓ 计算一致。请继续解释指标的经营意义。':`检查总花费 / 总预订量，当前结果为 ${usd(expected,2)}。`}if(a==='export-notes')exportNotes();if(a==='export-summary'){const groups=groupRows(state.data.rows,'publisher');download(csvText(['Publisher','Cost','Impressions','Clicks','Bookings','Revenue','CTR','CPC','CVR','CPA','ROAS','Revenue per booking'],groups.map(g=>[g.name,g.cost,g.impressions,g.clicks,g.bookings,g.revenue,g.ctr,g.cpc,g.cvr,g.cpa,g.roas,g.revenuePerBooking])),'Air-France-渠道汇总.csv','text/csv;charset=utf-8')}if(a==='export-keywords'){const rows=filteredRows(state.data.rows,{publisher:state.publisher,campaign:state.campaign,query:state.query,minClicks:state.minClicks});download(csvText(['Source Sheet','Source Row','Publisher','Campaign','Keyword','Match Type','Bid Strategy','Clicks','Cost','Bookings','Revenue'],rows.map(r=>[r.sourceSheet,r.sourceRow,r.publisher,r.campaign,r.keyword,r.matchType,r.bidStrategy,r.clicks,r.cost,r.bookings,r.revenue])),'Air-France-关键词筛选.csv','text/csv;charset=utf-8')}});
document.addEventListener('change',e=>{if(explorer.change(e.target))return;if(e.target.id==='case-file'&&e.target.files[0])importFile(e.target.files[0])});
document.addEventListener('input',e=>controller.input(e.target));
document.addEventListener('keydown',e=>{if(e.target.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const t=['task','analysis','reference'];let n=t.indexOf(state.tab);n=e.key==='Home'?0:e.key==='End'?2:(n+(e.key==='ArrowRight'?1:2))%3;state.tab=t[n];render();document.querySelector('#tab-'+state.tab)?.focus()}});
window.addEventListener('hashchange',()=>{state.tab='task';render();window.scrollTo(0,0);main.focus({preventScroll:true})});render();if(localAvailable)loadCaseMirror(true);
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const definitions=[{name:'read_course_state',title:'读取课程状态',description:'读取当前课程页、数据状态和自标记进度，不返回作答或原始记录。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(input&&Object.keys(input).length)throw Error('无需参数');return{route:route(),view:state.tab,rows:state.data?.rows.length||0,sourceKind:state.data?.meta.sourceKind||null,completed:lessons.filter(l=>controller.submitted(l.id)).map(l=>l.id)}}},{name:'navigate_course',title:'打开课程题目',description:'切换课程页或题目视图，不导入数据、不修改或提交作答。',inputSchema:{type:'object',properties:{route:{type:'string',enum:[...routes]},view:{type:'string',enum:['task','analysis','reference']}},required:['route'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!routes.has(input.route)||Object.keys(input).some(k=>!['route','view'].includes(k))||(input.view&&!['task','analysis','reference'].includes(input.view)))throw Error('无效的课程页或视图');history.replaceState(null,'','#'+input.route);state.tab=input.view||'task';render();window.scrollTo(0,0);return{route:route(),view:state.tab}}}];for(const tool of definitions){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true})}

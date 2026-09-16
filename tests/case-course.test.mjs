import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {caseFile,fieldGroups} from '../dist/reference/air-france/assets/case-source.mjs';
import {lessons,assignments,workedAnswers} from '../dist/reference/air-france/assets/course.mjs';
import {aggregate,parseWorkbookSheets,groupRows,originalRows,excelColumn} from '../dist/reference/air-france/assets/analytics.mjs';
import {views} from '../dist/reference/air-france/assets/views.mjs';
import {COURSE_REVISION,isSubmitted,courseEvidence} from '../dist/reference/air-france/assets/investigation.mjs';
import {explorerController} from '../dist/reference/air-france/assets/explorer-controller.mjs';
import {investigationController} from '../dist/reference/air-france/assets/investigation-controller.mjs';

const datasetPath='data/private/air-france-mirror.xls';
const hasFile=fs.existsSync(datasetPath);
function readCase(){
 const bytes=fs.readFileSync(datasetPath),context={};
 vm.runInNewContext(fs.readFileSync('dist/vendor/xlsx.full.min.js','utf8'),context);
 const wb=context.XLSX.read(bytes,{type:'buffer'});
 const sheets=wb.SheetNames.map(name=>({name,startRow:wb.Sheets[name]['!ref']?context.XLSX.utils.decode_range(wb.Sheets[name]['!ref']).s.r:0,matrix:context.XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null})}));
 return {bytes,data:parseWorkbookSheets(sheets,{sha256:caseFile.sha256,filename:caseFile.filename,sourceKind:'public-course-mirror'})};
}
function lessonState(data){return {data,notes:Object.fromEntries(lessons.map(l=>[l.id,{initial:'UI regression check',attemptHash:caseFile.sha256,complete:true,courseRevision:COURSE_REVISION,datasetHash:caseFile.sha256,text:'UI regression check',evidence:Object.fromEntries(assignments[l.id].evidence.map(([key])=>[key,'UI regression check']))}])),tab:'analysis',publisher:'',query:'',minClicks:0,page:0,tablePage:0};}

test('story leads the course and questions plus answer methods are open without data or submissions',()=>{
 const state=lessonState(null);state.tab='task';state.notes={};
 for(const l of lessons){const html=views(state,false).lesson(l.id);assert.ok(html.indexOf(assignments[l.id].context)<html.indexOf('data-solution'));assert.ok(html.includes(workedAnswers[l.id].conclusion));assert.match(html,/案例依据/);assert.match(html,/本题交付物/);assert.match(html,/不会用示例数值替代/);assert.doesNotMatch(html,/id="initial-|提交后解锁/);}
 assert.deepEqual(lessons.map(l=>assignments[l.id].originNumber),[3,1,2,4]);
 const landing=views(state,true).overview();assert.ok(landing.indexOf('story-title')<landing.indexOf('用原表看清业务处境'));assert.match(landing,/案例故事与业务困境/);
 const sourcePage=views(state,true).data();assert.match(sourcePage,/__local\/air-france-mirror.xls/);
 const fallback=views(state,false).overview();assert.match(fallback,/load-mirror/);assert.doesNotMatch(fallback,/完整镜像已下载到本机/);
});

test('unchanged complete workbook matches manifest, sheet names and field dictionary',{skip:!hasFile},()=>{
 const {bytes,data}=readCase();assert.equal(bytes.length,caseFile.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),caseFile.sha256);
 assert.equal(data.rows.length,caseFile.rows);assert.deepEqual([...data.meta.sheets],caseFile.sheets);
 assert.equal(data.meta.headers.length,caseFile.fields);assert.equal(groupRows(data.rows,'publisher').length,caseFile.publishers);
 assert.equal(groupRows(data.rows,'campaign').length,caseFile.campaigns);
 const dictionaryFields=fieldGroups.flatMap(x=>x[1].split(' · '));assert.deepEqual([...dictionaryFields].sort(),[...data.meta.headers].sort());
 const main=aggregate(data.rows),kayak=aggregate([data.kayak]);assert.equal(main.clicks,512849);assert.equal(main.bookings,3939);assert.equal(kayak.clicks,2839);assert.equal(kayak.bookings,208);assert.equal(kayak.ctr,null);
 assert.ok(Math.abs(kayak.cpa-3567.1335/208)<1e-10);assert.ok(Math.abs(kayak.roas-233694/3567.1335)<1e-10);
});

test('actual-file workbenches show all four case themes without fabricated scenario controls',{skip:!hasFile},()=>{
 const {data}=readCase(),state=lessonState(data),before=JSON.stringify(data);const v=views(state,true);
 for(const l of lessons){const html=v.lesson(l.id);assert.doesNotMatch(html,/NaN|undefined/);assert.doesNotMatch(html,/id="brand-terms"|id="budget-cap"|id="expansion-drop"/);}
 assert.match(v.lesson('q3'),/匹配方式与出价策略/);assert.match(v.lesson('q4'),/Kayak 独立核算/);assert.match(v.lesson('q4'),/2,839/);assert.equal(JSON.stringify(data),before);
 state.data={...data,kayak:null};const missing=views(state,true).lesson('q4');assert.match(missing,/没有可识别的 Kayak/);assert.doesNotMatch(missing,/Kayak 独立核算/);
});

test('q4 submits case evidence without a budget scenario; old evidence remains exportable',async()=>{
 const state=lessonState({meta:{sha256:caseFile.sha256,filename:caseFile.filename},rows:[]});state.notes.q4.complete=false;state.notes.q4.evidence.stress='Legacy text to preserve';
 let exported='';const c=investigationController(state,{render(){},save(){return true},toast(){},download(value){exported=value}});
 await c.click('complete',{dataset:{id:'q4'}});assert.ok(isSubmitted(state.notes.q4,caseFile.sha256));assert.equal(Object.keys(state.notes.q4.references).length,3);assert.equal(state.notes.q4.scenario,undefined);
 c.exportNotes();assert.match(exported,/Legacy text to preserve/);
 c.invalidate('q2');assert.ok(!isSubmitted(state.notes.q4,caseFile.sha256));assert.ok(isSubmitted(state.notes.q1,caseFile.sha256));
});


test('real-file answers are visible without learner records, share evidence is conserved and actions trace to raw status',{skip:!hasFile},()=>{
 const {data}=readCase(),state=lessonState(data),before=JSON.stringify(data);state.notes={};state.tab='task';
 const e=courseEvidence(data);
 assert.ok(Math.abs(e.channels.reduce((s,g)=>s+g.costShare,0)-1)<1e-12);
 assert.ok(Math.abs(e.channels.reduce((s,g)=>s+g.revenueShare,0)-1)<1e-12);
 assert.equal(e.leader.name,'Google - US');assert.equal(e.best.name,'Yahoo - US');
 assert.ok(Math.abs(e.activeTotal.cost+e.zeroTotal.cost-e.total.cost)<1e-8);
 assert.deepEqual(e.actions.map(a=>a.row.sourceRow),[83,327,3156]);
 assert.equal(e.actions[1].row.status,'Live');assert.equal(e.actions[2].row.status,'Paused');
 assert.equal(e.kayak.bookings,208);assert.equal(e.total.bookings,3939);
 for(const l of lessons){const html=views(state,true).lesson(l.id);assert.equal((html.match(/class="panel solution-step"/g)||[]).length,4);assert.ok(html.includes(workedAnswers[l.id].conclusion));assert.doesNotMatch(html,/NaN|undefined|提交后解锁/);}
 assert.match(views(state,true).lesson('q3'),/原表已经 Paused/);
 assert.match(views(state,true).lesson('q4'),/不同观察范围/);
 state.data={...data,kayak:null};assert.match(views(state,true).lesson('q4'),/缺少 Kayak，数值答案不能生成/);
 assert.equal(JSON.stringify(data),before);assert.deepEqual(state.notes,{});
});

test('original-cell viewer preserves blank columns, physical rows, sheet periods, filter scope and exported provenance',{skip:!hasFile},()=>{
 const {data}=readCase(),before=JSON.stringify(data),full=originalRows(data);
 assert.equal(full.rows.length,4512);assert.equal(full.columnCount,25);
 assert.equal(full.rows[1].rowNumber,2);assert.equal(full.rows[1].cells[3],'fly to florence');
 assert.equal(full.rows[338].cells[12],0);assert.equal(full.rows[338].cells[8],'');
 const filtered=originalRows(data,{publisher:'Google - US',campaign:'Air France Branded',query:'[AIR FRANCE]',sort:'cost'});
 assert.ok(filtered.rows.length);assert.equal(filtered.rows[0].rowNumber,83);
 assert.ok(filtered.rows.every(r=>r.record.publisher==='Google - US'&&r.record.campaign==='Air France Branded'));
 const kayak=originalRows(data,{sheetName:'Kayak'});assert.ok(kayak.rows.some(r=>r.rowNumber===9&&r.cells.includes(2839)));
 assert.equal(originalRows(data,{sheetName:'Copyright'}).columnCount,0);
 const notes={q1:{text:'Keep this learner text'}},state={data,notes,rawSheet:'DoubleClick',rawPublisher:'Google - US',rawCampaign:'Air France Branded',rawQuery:'[AIR FRANCE]',rawSort:'cost',rawColumns:'core'};
 let output='';const controller=explorerController(state,{render(){},toast(){},download(value){output=value}});
 assert.ok(controller.click('raw-export',{}));assert.match(output,/Source Sheet,Source Row,A,B,C/);assert.match(output,/DoubleClick,83,/);assert.match(output,/X,Y/);
 assert.equal(output.split('\r\n').length,filtered.rows.length+1);
 assert.equal(JSON.stringify(data),before);assert.equal(notes.q1.text,'Keep this learner text');
});

test('offset sheets keep source coordinates and original numeric strings independently of normalized values',()=>{
 // Minimal arithmetic/parser fixture, never used in course content or distributed data.
 const sheets=[{name:'DoubleClick',startRow:4,startCol:2,matrix:[['Publisher Name','Clicks','Total Cost','Bookings','Amount',null],['  A  ','10','2.50','1','9.00',null],Array(6).fill(null)]}];
 const before=JSON.stringify(sheets),data=parseWorkbookSheets(sheets),view=originalRows(data);
 assert.equal(data.rows[0].sourceRow,6);assert.equal(data.rows[0].publisher,'A');assert.equal(data.rows[0].cost,2.5);
 assert.equal(view.rows[1].cells[0],'  A  ');assert.equal(view.rows[1].cells[2],'2.50');assert.equal(view.rows[2].rowNumber,7);
 assert.equal(excelColumn(view.sheet.startCol),'C');assert.equal(excelColumn(25),'Z');assert.equal(excelColumn(26),'AA');
 assert.equal(JSON.stringify(sheets),before);
});

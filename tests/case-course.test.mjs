import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {caseFile,fieldGroups} from '../dist/assets/case-source.mjs';
import {lessons,assignments} from '../dist/assets/course.mjs';
import {aggregate,parseWorkbookSheets,groupRows} from '../dist/assets/analytics.mjs';
import {views} from '../dist/assets/views.mjs';
import {COURSE_REVISION,isSubmitted} from '../dist/assets/investigation.mjs';
import {investigationController} from '../dist/assets/investigation-controller.mjs';

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

test('all four introductions are available without data, before the initial-answer form',()=>{
 const state=lessonState(null);state.tab='task';
 for(const l of lessons){const html=views(state,false).lesson(l.id);assert.ok(html.indexOf(assignments[l.id].context)<html.indexOf(`id="initial-${l.id}"`));assert.match(html,/案例依据/);assert.match(html,/本题交付物/);}
 assert.deepEqual(lessons.map(l=>assignments[l.id].originNumber),[3,1,2,4]);
 const landing=views(state,true).overview();assert.ok(landing.indexOf('dataset-title')<landing.indexOf('story-title'));assert.match(landing,/__local\/air-france-mirror.xls/);
 const hosted=views(state,false).overview();assert.ok(hosted.includes(caseFile.url));assert.match(hosted,/load-mirror/);assert.doesNotMatch(hosted,/完整镜像已下载到本机/);
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

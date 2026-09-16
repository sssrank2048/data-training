import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseCSV,inspectData,rawQuery,exportRaw} from '../dist/assets/analytics.mjs';
import {effect,wilson,economics,metricValue,samplePlan,allocationCheck,newGroup,submitQuestion,submissionState,validateImport} from '../dist/assets/investigation.mjs';
import {caseFile} from '../dist/assets/case-source.mjs';
import {lessons,courseSchedule} from '../dist/assets/course.mjs';
import {renderPage} from '../dist/assets/views.mjs';
// Tiny arithmetic/parser fixtures are tests only; never course data.
const header='user_id,test,converted,tot_impr,mode_impr_day,mode_impr_hour';
const sample=()=>inspectData(parseCSV(header+'\r\n1,0,0,10,1,0\r\n2,0,1,20,1,12\r\n3,1,1,30,2,13\r\n4,1,1,40,2,18\r\n'));
const fixture=()=>({summary:null,meta:null,raw:null,filters:{arm:'',converted:'',query:''},groups:[newGroup('one','第一组')],groupId:'one',dimension:'frequency'});
test('CSV preserves source cells, BOM, source line offsets and filters; malformed input is rejected',()=>{
 const parsed=parseCSV('\uFEFF'+header+'\r\n"1",0,0,0010,1,0\r\n"2",1,1,20,1,12\r\n');assert.equal(parsed.rows[0].line,2);assert.equal(parsed.rows[0].cells[3],'0010');assert.equal(rawQuery(parsed,{arm:'1'}).rows[0].line,3);assert.equal(rawQuery(parsed,{query:'absent'}).total,0);assert.match(exportRaw(parsed,{arm:'1'}),/"source_row"/);assert.match(exportRaw(parsed,{arm:'1'}),/"3","2","1"/);assert.throws(()=>parseCSV(header+'\n"1'),/引号/);assert.throws(()=>parseCSV('foo,bar'),/六列/);
});
test('core anomalies block inference without deleting raw rows or converting blanks to zero',()=>{
 const parsed=parseCSV(header+'\n1,0,1,10,1,0\n1,1,1,20,1,2\n2,1,,20,1,2\n3,2,1,-1,9,24');const s=inspectData(parsed);assert.equal(s.audit.rows,4);assert.equal(parsed.rows.length,4);assert.equal(s.audit.duplicateIds,1);assert.equal(s.audit.invalidRows,3);assert.equal(s.audit.missingCells,1);assert.equal(s.usable,false);assert.equal(effect(s),null);assert.equal(s.issues[0].line,3);
});
test('rates use counts, intervals bounded, zero groups and post-treatment slices are handled',()=>{
 const s=sample(),e=effect(s);assert.equal(e.pc,.5);assert.equal(e.pt,1);assert.equal(e.delta,.5);assert.equal(e.baseline,1);assert.equal(e.incremental,1);assert.ok(e.ci[0]<e.delta&&e.ci[1]>e.delta);assert.equal(wilson(0,0),null);assert.ok(wilson(0,20)[0]===0);for(const dim of Object.values(s.splits))assert.equal(dim.reduce((n,g)=>n+g.arms[0].users+g.arms[1].users,0),4);
});
test('metric grammar computes aggregate ratios and rejects arbitrary code or unavailable fields',()=>{
 const s=sample(),before=JSON.stringify(s);assert.equal(metricValue('SUM(tot_impr) / COUNT(user_id)',s).value,25);assert.equal(metricValue('SUM(converted)/COUNT(user_id)',s,'control').value,.5);assert.equal(metricValue('MEAN(converted)',s,'treatment').value,1);assert.equal(metricValue('T(MEAN(converted)) - C(MEAN(converted))',s).value,.5);assert.equal(metricValue('( SUM(converted) + 1 ) / (COUNT(user_id) * 2)',s).value,.5);assert.equal(metricValue('SUM(converted) / 0',s).value,null);assert.equal(metricValue('SUM(converted)',null).value,null);for(const f of ['alert(1)','SUM(clicks)','SUM(user_id)','globalThis.process','COUNT(user_id);fetch(1)','SUM(converted) ** 2'])assert.throws(()=>metricValue(f,s));assert.equal(JSON.stringify(s),before);
});
test('economics separates pilot and treatment costs and propagates conditional effects only',()=>{
 const s=sample(),a=economics(s,{cpm:1000,margin:200,scope:'pilot'}),b=economics(s,{cpm:1000,margin:200,scope:'treatment'});assert.equal(a.cost,100);assert.equal(b.cost,70);assert.equal(a.contribution,200);assert.equal(a.net,100);assert.equal(a.roi,1);assert.equal(a.naive,400);assert.equal(a.breakEvenCPM,2000);assert.ok(a.netCI[0]<a.net);assert.equal(economics(s,{cpm:0,margin:40}).roi,null);assert.equal(economics(s,{cpm:-1}),null);
});
test('sample planning uses current comparison baseline and adjusts for control allocation',()=>{
 const equal=samplePlan({baseline:.025,mdePP:.5,controlShare:.5}),small=samplePlan({baseline:.025,mdePP:.5,controlShare:.04});assert.equal(equal.control,equal.treatment);assert.ok(small.total>equal.total);assert.ok(samplePlan({baseline:.025,mdePP:.25}).total>equal.total*3);assert.equal(samplePlan({baseline:.025,mdePP:0}),null);assert.equal(samplePlan({baseline:.99,mdePP:2}),null);assert.equal(equal.days,null);
});
test('evidence binds definitions, upstream text, data hash, scenarios and plans without losing history',()=>{
 let g=newGroup('one','一组');g.metrics=[{id:'m',name:'用户数',formula:'COUNT(user_id)',role:'护栏',unit:'人数',population:'all',window:'活动期',meaning:'检查规模'}];for(const id of ['q1','q2','q3','q4'])g.notes[id]={initial:'first '+id,evidence:'counts and sources',answer:'our answer '+id};for(const id of ['q1','q2','q3','q4'])g=submitQuestion(g,id,'abc','date');assert.equal(Object.keys(g.submissions.q4[0].references).length,3);assert.equal(submissionState(g,'q4','abc'),'current');g.notes.q1.answer='revised';assert.equal(submissionState(g,'q4','abc'),'stale');assert.equal(g.submissions.q1[0].notes.answer,'our answer q1');assert.equal(g.notes.q4.answer,'our answer q4');assert.throws(()=>submitQuestion(g,'q4','abc'),/前题/);for(const id of ['q1','q2','q3','q4'])g=submitQuestion(g,id,'abc','date2');assert.equal(g.submissions.q4.length,2);assert.equal(submissionState(g,'q4','changed-file'),'stale');g.scenario.cpm=10;assert.equal(submissionState(g,'q2','abc'),'current');assert.equal(submissionState(g,'q3','abc'),'stale');const v=validateImport({schema:'rocket-fuel-course-v1',groups:[g]});assert.equal(v[0].notes.q4.answer,'our answer q4');assert.throws(()=>validateImport({schema:'legacy',groups:[g]}));
});
test('all questions, full answer steps, and sources stay open with no data or learner submissions',()=>{
 const s=fixture();for(const l of lessons){const html=renderPage(s,l.id);assert.ok(html.includes(l.question));assert.ok(html.includes(l.answer));assert.ok(html.includes(l.boundary));assert.ok(html.includes('完整参考答案'));assert.ok(html.indexOf(l.question)<html.indexOf('WORKED ANSWER'));assert.doesNotMatch(html,/NaN|undefined|提交后解锁/);}for(const p of ['story','mission','data','groups','sources'])assert.doesNotMatch(renderPage(s,p),/NaN|undefined/);assert.equal(courseSchedule.reduce((n,[time])=>{const [a,b]=time.split('–').map(Number);return n+b-a;},0),120);
});
const file='data/private/rocketfuel_data.csv';
test('complete downloaded Rocket Fuel file matches pinned blob, counts and all partitions',()=>{
 assert.ok(fs.existsSync(file),'Download the case data before running integration tests');const bytes=fs.readFileSync(file);assert.equal(bytes.length,caseFile.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),caseFile.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),'07c1827ee0c10e498fc69c667b66bec711eca31e');
 const s=inspectData(parseCSV(bytes.toString('utf8')));assert.equal(s.usable,true);assert.equal(s.audit.rows,588101);assert.equal(s.arms[0].users,23524);assert.equal(s.arms[0].conversions,420);assert.equal(s.arms[1].users,564577);assert.equal(s.arms[1].conversions,14423);assert.equal(s.all.impressions,14597182);for(const dim of Object.values(s.splits))assert.equal(dim.reduce((n,g)=>n+g.arms[0].users+g.arms[1].users,0),588101);const e=effect(s),money=economics(s);assert.ok(Math.abs(e.incremental-4342.982145893556)<1e-5);assert.ok(Math.abs(money.cost-131374.638)<1e-6);assert.ok(!allocationCheck(s).flag);assert.ok(Math.abs(e.ci[0]-0.005873422353060636)<1e-14);assert.ok(Math.abs(e.ci[1]-0.009360028811460754)<1e-14);assert.equal(samplePlan({baseline:e.pt,mdePP:.5,controlShare:.04}).total,229618);const state={...fixture(),summary:s,meta:{hash:caseFile.sha256,filename:caseFile.filename,bytes:caseFile.bytes}};for(const p of ['story','q1','q2','q3','q4','data'])assert.doesNotMatch(renderPage(state,p),/NaN|undefined/);
});

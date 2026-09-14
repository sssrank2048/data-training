import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aggregate, groupRows } from '../dist/assets/analytics.mjs';
import { lessons } from '../dist/assets/course.mjs';
import { classifyKeyword, mixComparison, decomposeCPA, thresholdSensitivity, allocateBudget, comparePlans, stressPlan, isSubmitted } from '../dist/assets/investigation.mjs';
// Arithmetic fixtures only; no fixture is used in the course or deployment.
const row = (publisher, keyword, clicks, bookings, cost, revenue, sourceRow) => ({ publisher, keyword, clicks, bookings, cost, revenue, sourceRow, sourceSheet: 'fixture', impressions: null });
test('course schedule adds to 120 minutes including briefing and review', () => assert.equal(20 + lessons.reduce((s, l) => s + l.time, 0), 120));
test('brand rules normalize punctuation and respect complete phrase boundaries', () => {
  assert.equal(classifyKeyword('[AirFrance].com'), '品牌命中');
  assert.equal(classifyKeyword('AIR-FRANCE tickets'), '品牌命中');
  assert.equal(classifyKeyword('chair france'), '非品牌候选');
  assert.equal(classifyKeyword(''), '缺少关键词');
  assert.equal(classifyKeyword('airfrnace', 'airfrnace'), '品牌命中');
});
test('standardization uses common click weights and preserves excluded coverage', () => {
  const data = [row('A','air france',90,18,90,180,1),row('A','paris',10,0,20,0,2),row('B','air france',10,2,20,20,3),row('B','paris',90,0,180,0,4)];
  const result = mixComparison(data, 'A', 'B');
  assert.deepEqual(result.weights, {'品牌命中':.5,'非品牌候选':.5});
  assert.equal(result.channels[0].raw.cvr,.18);assert.equal(result.channels[1].raw.cvr,.02);
  assert.equal(result.channels[0].adjusted.cvr,.1);assert.equal(result.channels[1].adjusted.cvr,.1);
  const partial=mixComparison(data.slice(1), 'A', 'B');
  assert.equal(partial.channels[1].coverage,.9);assert.deepEqual(partial.common,['非品牌候选']);
  assert.equal(mixComparison(data,'A','A').valid,false);
});
test('symmetric CPA decomposition sums to the difference and reverses signs', () => {
  const a=aggregate([row('A','x',100,5,200,50,1)]),b=aggregate([row('B','x',100,10,100,50,2)]);
  const d=decomposeCPA(a,b),reverse=decomposeCPA(b,a);
  assert.equal(d.costContribution,15);assert.equal(d.conversionContribution,15);assert.equal(d.delta,30);
  assert.equal(reverse.delta,-30);assert.equal(d.costContribution+d.conversionContribution,d.to-d.from);
  assert.equal(decomposeCPA(aggregate([row('C','x',100,0,100,0,3)]),b),null);
});
test('threshold sensitivity is nested and overlap denominators use actual reference list', () => {
  const rows=[row('A','x',20,0,20,0,1),row('A','y',80,0,80,0,2),row('A','z',150,0,150,0,3),row('A','w',300,1,300,10,4)];
  const s=thresholdSensitivity(rows,50);
  assert.deepEqual(s.map(x=>x.count),[3,2,1,0]);assert.deepEqual(s.map(x=>x.cost),[250,230,150,0]);
  assert.equal(s[1].overlap,2);assert.equal(s[1].referenceCount,2);
});
test('whole-cent allocations balance and pressure only affects expansion', () => {
  const groups=groupRows([row('A','x',100,10,100,100,1),row('B','y',100,10,100,300,2)],'publisher');
  const base=allocateBudget(groups,200),custom={A:0,B:200};
  const before=stressPlan(groups,custom,base,{cap:200});
  const after=stressPlan(groups,custom,base,{cap:200,expansionDrop:50});
  assert.equal(before.revenue,600);assert.equal(after.revenue,450); // retained 300 + expanded 150
  const plans=comparePlans(groups,custom,{cap:200,expansionDrop:80});
  assert.equal(plans[0].result.revenue,400);assert.equal(plans[2].result.revenue,360);
  assert.equal(Object.values(allocateBudget(groups,100.01)).reduce((s,x)=>s+Math.round(x*100),0),10001);
  assert.throws(()=>allocateBudget(groups,NaN),/预算/);
});
test('submission validity includes course revision and exact data identity', () => {
  const note={complete:true,courseRevision:2,datasetHash:'file-A'};
  assert.ok(isSubmitted(note,'file-A'));assert.ok(!isSubmitted(note,'file-B'));assert.ok(!isSubmitted({...note,courseRevision:1},'file-A'));
});
const file='data/private/inspected-data.json';
test('real case: derived partitions conserve totals and budget benchmarks balance', {skip:!fs.existsSync(file)}, () => {
  const {rows}=JSON.parse(fs.readFileSync(file));const groups=groupRows(rows,'publisher'),t=aggregate(rows);
  const mix=mixComparison(rows,'Google - US','Yahoo - US');
  for(const c of mix.channels){assert.equal(Object.values(c.strata).reduce((s,x)=>s+x.clicks,0),c.raw.clicks);assert.ok(c.coverage<=1);}
  const cap=Number(t.cost.toFixed(2)),budget=allocateBudget(groups,cap);const plans=comparePlans(groups,budget,{cap,expansionDrop:40});
  for(const p of plans){assert.equal(Math.round(p.result.budget*100),Math.round(cap*100));assert.ok(p.result.valid);}
  assert.ok(Math.abs(plans[0].result.revenue-t.revenue)<1);assert.equal(plans[0].result.revenue,plans[2].result.revenue);
});

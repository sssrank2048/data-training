import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseWorkbookSheets,aggregate,groupRows,scenario,filteredRows,csvText} from '../dist/assets/analytics.mjs';
import {esc} from '../dist/assets/charts.mjs';
// Minimal arithmetic fixtures only. These are never used as course data.
const columns=['Publisher Name','Campaign','Keyword','Clicks','Click Charges','Total Cost','Total Volume of Bookings','Amount'];
const fixture=[columns,['A','C','one',10,99,20,2,200],['B','D','two',90,999,270,9,900]];
const parse=matrix=>parseWorkbookSheets([{name:'DoubleClick',matrix}]);
test('aggregate uses ratio of sums and preferred Total Cost field',()=>{
 const d=parse(fixture),t=aggregate(d.rows);
 assert.equal(t.cost,290);assert.equal(t.cpc,2.9);assert.equal(t.cvr,.11);assert.equal(t.roas,1100/290);
 assert.equal(t.ctr,null);assert.equal(d.audit.missingImpressions,2);
});
test('missing values fail instead of becoming fabricated zeroes',()=>{
 const rows=structuredClone(fixture);rows[1][5]='';assert.throws(()=>parse(rows),/空值不会自动补为零/);
 assert.throws(()=>parse([['Wrong column'],[12]]),/表头/);
});
test('zero denominator and bookings above clicks are retained',()=>{
 const d=parse([columns,['A','C','a',0,0,0,0,0],['A','C','b',1,1,1,9,90]]);
 assert.equal(d.rows.length,2);assert.equal(d.audit.bookingsAboveClicks,1);assert.equal(d.audit.zeroClicks,1);
 assert.equal(aggregate([d.rows[0]]).roas,null);assert.equal(aggregate([d.rows[1]]).cvr,9);
});
test('exact historical allocation reproduces observed revenue and relative changes',()=>{
 const groups=groupRows(parse(fixture).rows,'publisher'),budgets=Object.fromEntries(groups.map(g=>[g.name,g.cost]));
 const baseline=scenario(groups,budgets,{cap:290});assert.equal(baseline.revenue,1100);assert.equal(baseline.bookings,11);
 assert.equal(scenario(groups,budgets,{cpcChange:100}).revenue,550);
 assert.ok(scenario(groups,budgets,{cap:280}).overCap);
 assert.throws(()=>scenario(groups,{...budgets,A:-1}),/非负/);
 assert.throws(()=>scenario(groups,budgets,{cpcChange:-100}),/大于/);
});
test('unavailable channel efficiency is not silently predicted',()=>{
 const groups=groupRows(parse([columns,['A','C','a',10,20,20,0,0]]).rows,'publisher');
 assert.equal(scenario(groups,{A:20}).revenue,null);assert.equal(scenario(groups,{A:0}).revenue,0);
});
test('filter scope and spreadsheet escaping',()=>{
 assert.equal(filteredRows(parse(fixture).rows,{publisher:'B',query:'TWO',minClicks:50}).length,1);
 assert.equal(filteredRows(parse(fixture).rows,{publisher:'A',minClicks:50}).length,0);
 assert.match(csvText(['Keyword'],[['=CMD()']]),/'=CMD/);assert.equal(esc('<script>'),'&lt;script&gt;');
});
const file='data/private/air-france-mirror.xls';
test('actual downloaded workbook: all rows, provenance and separate Kayak', {skip:!fs.existsSync(file)},()=>{
 const context={};vm.runInNewContext(fs.readFileSync('dist/vendor/xlsx.full.min.js','utf8'),context);
 const wb=context.XLSX.read(fs.readFileSync(file),{type:'buffer'});
 const d=parseWorkbookSheets(wb.SheetNames.map(name=>({name,startRow:wb.Sheets[name]['!ref']?context.XLSX.utils.decode_range(wb.Sheets[name]['!ref']).s.r:0,matrix:context.XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null})})));
 const t=aggregate(d.rows);assert.equal(d.rows.length,4510);assert.equal(groupRows(d.rows,'publisher').length,7);
 assert.equal(t.clicks,512849);assert.equal(t.bookings,3939);assert.ok(Math.abs(t.cost-755315.921955912)<.00001);assert.ok(Math.abs(t.revenue-4661912.55)<.00001);
 assert.equal(d.kayak.clicks,2839);assert.equal(d.kayak.sourceRow,9);assert.match(d.meta.kayakPeriod,/6\/04\/07/);
 assert.equal(d.audit.bookingsAboveClicks,2);assert.equal(d.audit.zeroBookings,4142);
 const groups=groupRows(d.rows,'publisher'),r=scenario(groups,Object.fromEntries(groups.map(g=>[g.name,g.cost])));
 assert.ok(Math.abs(r.revenue-t.revenue)<.00001);
});

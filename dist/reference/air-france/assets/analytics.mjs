export const SCHEMA_VERSION=1;
const key=s=>String(s??'').trim().toLowerCase().replace(/[\s_.-]+/g,'');
const aliases={publisher:['Publisher Name','Publisher','Search Engine'],campaign:['Campaign','Campaign Name'],keyword:['Keyword'],keywordId:['Keyword ID'],matchType:['Match Type'],bidStrategy:['Bid Strategy'],status:['Status'],clicks:['Clicks'],cost:['Total Cost','Click Charges','Media Cost','Cost'],bookings:['Total Volume of Bookings','Total Bookings','Bookings'],revenue:['Amount','Total Revenue','Revenue'],impressions:['Impressions'],bid:['Search Engine Bid']};
const essential=['publisher','clicks','cost','bookings','revenue'];
const numeric=['clicks','cost','bookings','revenue','impressions','bid'];
export function divide(a,b){return b>0&&Number.isFinite(a)&&Number.isFinite(b)?a/b:null}
export function parseNumeric(value){if(value===null||value===undefined||String(value).trim()==='')return null;if(typeof value==='number')return Number.isFinite(value)?value:null;const v=String(value).trim().replace(/[$,\s]/g,'');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v))return null;const n=Number(v);return Number.isFinite(n)?n:null}
export function detectHeader(matrix){let best=null;for(let i=0;i<Math.min(40,matrix.length);i++){const normalized=matrix[i].map(key);const columns={};for(const [field,names] of Object.entries(aliases)){for(const name of names){const c=normalized.indexOf(key(name));if(c>=0){columns[field]=c;break}}}const score=essential.filter(x=>x in columns).length;if(score===essential.length){best={index:i,columns};break}}return best}
export function parseWorkbookSheets(sheets,meta={}){
 const candidates=[];
 for(const sheet of sheets){const header=detectHeader(sheet.matrix);if(header)candidates.push({...sheet,header})}
 if(!candidates.length)throw Error('未找到数据表头。需要 Publisher Name、Clicks、Total Cost（或 Click Charges）、Total Volume of Bookings、Amount（或 Total Revenue）。');
 const primary=candidates.find(s=>/doubleclick/i.test(s.name))||candidates.find(s=>!/kayak/i.test(s.name));
 if(!primary)throw Error('只发现 Kayak 汇总表，请导入包含 DoubleClick 明细的完整工作簿。');
 const audit={blankRows:0,summaryRows:0,errors:[],bookingsAboveClicks:0,zeroClicks:0,zeroBookings:0,duplicateKeywordKeys:0,missingImpressions:0,nonIntegerCounts:0};
 const seen=new Set();
 function parseCandidate(sheet,isPrimary){const result=[];for(let i=sheet.header.index+1;i<sheet.matrix.length;i++){const cells=sheet.matrix[i];if(cells.every(v=>v===null||v===undefined||String(v).trim()==='')){if(isPrimary)audit.blankRows++;continue}const pub=String(cells[sheet.header.columns.publisher]??'').trim();if(/^(grand\s*total|total|subtotal|合计|总计)$/i.test(pub)){if(isPrimary)audit.summaryRows++;continue}if(!pub){if(isPrimary)audit.errors.push(`第 ${i+1} 行：渠道为空，不能确定是否为明细`);continue}if(!isPrimary&&pub!=='Kayak')continue;
 const row={sourceSheet:sheet.name,sourceRow:i+1+(sheet.startRow||0)};
 for(const [field,col] of Object.entries(sheet.header.columns)){row[field]=numeric.includes(field)?parseNumeric(cells[col]):String(cells[col]??'').trim()}
 const bad=['clicks','cost','bookings','revenue'].filter(f=>row[f]===null||row[f]<0);
 if(bad.length){if(isPrimary)audit.errors.push(`第 ${row.sourceRow} 行：${bad.join(' / ')} 缺失、非数值或为负`);continue}
 if(row.impressions!==undefined&&row.impressions!==null&&row.impressions<0){if(isPrimary)audit.errors.push(`第 ${row.sourceRow} 行：曝光为负`);continue}
 row.impressions=row.impressions??null;row.campaign=row.campaign||'未提供';row.keyword=row.keyword||'';row.keywordId=row.keywordId||'';row.matchType=row.matchType||'未提供';row.bidStrategy=row.bidStrategy||'未提供';row.status=row.status||'未提供';
 if(isPrimary){if(row.bookings>row.clicks)audit.bookingsAboveClicks++;if(row.clicks===0)audit.zeroClicks++;if(row.bookings===0)audit.zeroBookings++;if(row.impressions===null)audit.missingImpressions++;if(!Number.isInteger(row.clicks)||!Number.isInteger(row.bookings)||(row.impressions!==null&&!Number.isInteger(row.impressions)))audit.nonIntegerCounts++;const id=JSON.stringify([row.publisher,row.keywordId||row.keyword]);if(seen.has(id))audit.duplicateKeywordKeys++;seen.add(id)}result.push(row)}return result}
 const rows=parseCandidate(primary,true);
 if(audit.errors.length)throw Error(`导入未完成：发现 ${audit.errors.length} 条不能计算的记录。${audit.errors.slice(0,4).join('；')}。请先核对原表，空值不会自动补为零。`);
 if(!rows.length)throw Error('工作表没有可计算的明细记录。');
 const ks=candidates.find(s=>s!==primary&&/kayak/i.test(s.name));const kayak=ks?parseCandidate(ks,false)[0]||null:null;
 const periodNotes=ks?ks.matrix.flat().filter(v=>typeof v==='string'&&/time period|one week/i.test(v)):[];
 return {version:SCHEMA_VERSION,rows,kayak,audit,rawSheets:sheets.map(s=>({name:s.name,startRow:s.startRow||0,startCol:s.startCol||0,matrix:s.matrix.map(row=>Array.from(row,v=>v??null))})),meta:{...meta,primarySheet:primary.name,headers:primary.matrix[primary.header.index].filter(x=>x!==null&&x!==''&&x!==undefined),mappedColumns:Object.fromEntries(Object.entries(primary.header.columns).map(([k,v])=>[k,primary.matrix[primary.header.index][v]])),sheets:sheets.map(s=>s.name),period:'DoubleClick 主表未提供日期字段；不得构造日趋势。',kayakPeriod:periodNotes.join(' ')||'期间未确认',currency:'USD（依据案例语境，正式版本导入后需核对）'}};
}
export function aggregate(rows){const t={count:rows.length,clicks:0,cost:0,bookings:0,revenue:0,impressions:0,impressionRows:0};for(const r of rows){for(const k of ['clicks','cost','bookings','revenue'])t[k]+=r[k];if(r.impressions!==null&&r.impressions!==undefined){t.impressions+=r.impressions;t.impressionRows++}}const complete=t.impressionRows===rows.length&&rows.length>0;return {...t,impressions:complete?t.impressions:null,cpc:divide(t.cost,t.clicks),cvr:divide(t.bookings,t.clicks),ctr:complete?divide(t.clicks,t.impressions):null,cpa:divide(t.cost,t.bookings),roas:divide(t.revenue,t.cost),revenuePerBooking:divide(t.revenue,t.bookings),balance:t.revenue-t.cost}}
export function groupRows(rows,field){const groups=new Map();for(const r of rows){const name=r[field]||'未提供';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r)}return [...groups].map(([name,items])=>({name,...aggregate(items)})).sort((a,b)=>b.cost-a.cost)}
export function filteredRows(rows,{publisher='',campaign='',query='',minClicks=0}={}){return rows.filter(r=>(!publisher||r.publisher===publisher)&&(!campaign||r.campaign===campaign)&&(!query||r.keyword.toLowerCase().includes(query.toLowerCase()))&&r.clicks>=minClicks)}
export function scenario(groups,budgets,{cpcChange=0,cvrChange=0,cap=null}={}){if(!Number.isFinite(cpcChange)||!Number.isFinite(cvrChange)||cpcChange<=-100||cvrChange< -100)throw Error('CPC 变化必须大于 -100%，CVR 变化不得低于 -100%。');if(cap!==null&&(!Number.isFinite(cap)||cap<0))throw Error('预算上限必须为非负数。');let total=0;const rows=groups.map(g=>{const budget=budgets[g.name];if(!Number.isFinite(budget)||budget<0)throw Error('每个渠道预算都必须为非负数。');total+=budget;const cpc=g.cpc===null?null:g.cpc*(1+cpcChange/100);const cvr=g.cvr===null?null:g.cvr*(1+cvrChange/100);const valid=cpc>0&&cvr!==null&&g.revenuePerBooking!==null;if(budget===0)return {name:g.name,budget,clicks:0,bookings:0,revenue:0,balance:0,valid:true};if(!valid)return{name:g.name,budget,clicks:null,bookings:null,revenue:null,balance:null,valid:false};const clicks=budget/cpc;const bookings=clicks*cvr;const revenue=bookings*g.revenuePerBooking;return{name:g.name,budget,clicks,bookings,revenue,balance:revenue-budget,valid:true}});const valid=rows.every(r=>r.valid);return{rows,budget:total,overCap:cap!==null&&total>cap+0.005,valid,revenue:valid?rows.reduce((s,r)=>s+r.revenue,0):null,bookings:valid?rows.reduce((s,r)=>s+r.bookings,0):null,balance:valid?rows.reduce((s,r)=>s+r.balance,0):null}}
export function csvText(headers,rows){const escape=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s)&&typeof v!=='number')s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s};return '\ufeff'+[headers,...rows].map(row=>row.map(escape).join(',')).join('\r\n')}


// Preserve original cell values and physical row numbers; never replace empty cells with zero.
export function originalRows(data,{sheetName=data?.meta.primarySheet,query='',publisher='',campaign='',sort='row'}={}) {
 const sheet=data?.rawSheets?.find(s=>s.name===sheetName);
 if(!sheet)return {sheet:null,rows:[],columnCount:0};
 const records=new Map(data.rows.filter(r=>r.sourceSheet===sheetName).map(r=>[r.sourceRow,r]));
 const needle=query.trim().toLowerCase();
 let rows=sheet.matrix.map((cells,i)=>({rowNumber:(sheet.startRow||0)+i+1,cells,record:records.get((sheet.startRow||0)+i+1)}));
 rows=rows.filter(r=>(!needle||r.cells.some(v=>String(v??'').toLowerCase().includes(needle)))&&(!publisher||r.record?.publisher===publisher)&&(!campaign||r.record?.campaign===campaign));
 if(['cost','bookings','revenue'].includes(sort))rows.sort((a,b)=>(b.record?.[sort]??-Infinity)-(a.record?.[sort]??-Infinity)||a.rowNumber-b.rowNumber);
 return {sheet,rows,columnCount:Math.max(0,...sheet.matrix.map(r=>r.length))};
}
export function excelColumn(index){let value=index+1,label='';while(value>0){value--;label=String.fromCharCode(65+value%26)+label;value=Math.floor(value/26)}return label}

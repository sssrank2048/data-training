// CSV cells and physical source lines are retained separately from numeric analysis.
export const FIELDS=['user_id','test','converted','tot_impr','mode_impr_day','mode_impr_hour'];
export const FREQUENCY_BINS=[[1,5,'1–5'],[6,10,'6–10'],[11,20,'11–20'],[21,40,'21–40'],[41,80,'41–80'],[81,160,'81–160'],[161,Infinity,'161+']];
export function parseCSV(text){
 const rows=[];let cells=[],value='',quoted=false,line=1,start=1;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else if(quoted||value==='')quoted=!quoted;else throw Error(`第 ${line} 行引号位置异常`);}
  else if(c===','&&!quoted){cells.push(value);value='';}
  else if((c==='\n'||c==='\r')&&!quoted){cells.push(value);rows.push({line:start,cells});cells=[];value='';if(c==='\r'&&text[i+1]==='\n')i++;line++;start=line;}
  else{value+=c;if(c==='\n')line++;}
 }
 if(quoted)throw Error('CSV 引号未闭合');
 if(value!==''||cells.length){cells.push(value);rows.push({line:start,cells});}
 if(!rows.length)throw Error('CSV 没有内容');
 const headers=rows.shift().cells.map((x,i)=>i===0?x.replace(/^\uFEFF/,''):x);
 if(headers.length!==FIELDS.length||FIELDS.some((f,i)=>f!==headers[i]))throw Error('需要原案例的六列 CSV：'+FIELDS.join(', '));
 return {headers,rows};
}
const blankArm=()=>({users:0,conversions:0,impressions:0});
function add(arm,row){arm.users++;arm.conversions+=row[2];arm.impressions+=row[3];}
export function inspectData(parsed){
 const arms=[blankArm(),blankArm()],all=blankArm(),ids=new Set(),issues=[],valid=[];
 const audit={rows:parsed.rows.length,duplicateIds:0,invalidRows:0,blankRows:0,missingCells:0,minimumImpressions:null,maximumImpressions:null};
 const splits={frequency:FREQUENCY_BINS.map(b=>({label:b[2],arms:[blankArm(),blankArm()]})),day:Array.from({length:7},(_,i)=>({label:['周一','周二','周三','周四','周五','周六','周日'][i],arms:[blankArm(),blankArm()]})),hour:Array.from({length:24},(_,i)=>({label:`${i}:00`,arms:[blankArm(),blankArm()]}))};
 for(const r of parsed.rows){
  const errors=[],c=r.cells,n=c.map(Number);
  if(c.every(x=>x===''))audit.blankRows++;
  audit.missingCells+=c.filter(x=>x.trim()==='').length;
  if(c.length!==6)errors.push('列数不是 6');
  if(c.some(x=>x.trim()===''))errors.push('存在空单元格');
  if(!/^\d+$/.test(c[0]||''))errors.push('用户 ID 非整数');
  if(ids.has(c[0])){audit.duplicateIds++;errors.push('重复用户 ID');}ids.add(c[0]);
  if(![0,1].includes(n[1])||!['0','1'].includes(c[1]?.trim()))errors.push('test 不在 0/1');
  if(![0,1].includes(n[2])||!['0','1'].includes(c[2]?.trim()))errors.push('converted 不在 0/1');
  if(!Number.isSafeInteger(n[3])||n[3]<0)errors.push('曝光次数无效');
  if(!Number.isInteger(n[4])||n[4]<1||n[4]>7)errors.push('星期不在 1–7');
  if(!Number.isInteger(n[5])||n[5]<0||n[5]>23)errors.push('小时不在 0–23');
  if(errors.length){audit.invalidRows++;issues.push({line:r.line,errors});continue;}
  valid.push(r);add(all,n);add(arms[n[1]],n);
  audit.minimumImpressions=audit.minimumImpressions===null?n[3]:Math.min(audit.minimumImpressions,n[3]);audit.maximumImpressions=Math.max(audit.maximumImpressions??0,n[3]);
  const bin=FREQUENCY_BINS.findIndex(([lo,hi])=>n[3]>=lo&&n[3]<=hi);
  if(bin>=0)add(splits.frequency[bin].arms[n[1]],n);
  add(splits.day[n[4]-1].arms[n[1]],n);add(splits.hour[n[5]].arms[n[1]],n);
 }
 const usable=audit.invalidRows===0&&all.users>0&&arms.every(a=>a.users>0);
 return {all,arms,audit,issues,splits,usable,validRows:valid.length};
}
export function rawQuery(parsed,{arm='',converted='',query='',page=0,size=30,issues=null}={}){
 const q=query.toLowerCase().trim(),bad=issues?new Set(issues.map(x=>x.line)):null;
 const filtered=parsed.rows.filter(r=>(arm===''||r.cells[1]===arm)&&(converted===''||r.cells[2]===converted)&&(!q||r.cells.some(x=>x.toLowerCase().includes(q))||String(r.line)===q)&&(!bad||bad.has(r.line)));
 const pages=Math.max(1,Math.ceil(filtered.length/size)),p=Math.min(pages-1,Math.max(0,Number(page)||0));
 return {total:filtered.length,page:p,pages,rows:filtered.slice(p*size,(p+1)*size),headers:parsed.headers};
}
export function csvEncode(cells){return cells.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',');}
export function exportRaw(parsed,filters={}){const rows=rawQuery(parsed,{...filters,page:0,size:Number.MAX_SAFE_INTEGER}).rows;return [csvEncode(['source_row',...parsed.headers]),...rows.map(r=>csvEncode([r.line,...r.cells]))].join('\r\n');}
export function ratio(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&b!==0?a/b:null;}

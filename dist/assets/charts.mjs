import {effect,wilson} from './investigation.mjs';
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const num=(v,d=0)=>v==null||!Number.isFinite(v)?'—':v.toLocaleString('zh-CN',{maximumFractionDigits:d,minimumFractionDigits:d});
export const pct=(v,d=2)=>v==null?'—':num(v*100,d)+'%';
export const pp=(v,d=3)=>v==null?'—':num(v*100,d)+' 个百分点';
export const usd=v=>v==null?'—':'$'+num(v,2);
export const stat=(label,value,note='')=>`<div class="stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
export const empty=(text='载入案例 CSV 后，这里将显示从明细计算的结果。')=>`<div class="empty"><span>↳</span><p>${text}</p><a href="#data">查看数据与导入</a></div>`;
const svg=(label,body,h=250)=>`<svg class="chart" viewBox="0 0 720 ${h}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</svg>`;
export function rateChart(summary){const e=effect(summary);if(!e)return empty();const max=Math.max(...e.ciC,...e.ciT)*1.3,scale=v=>135+v/max*490;
 let body='';for(let i=0;i<=4;i++){const x=135+i*490/4;body+=`<path class="grid" d="M${x},30 V174"/><text x="${x}" y="202" text-anchor="middle">${pct(max*i/4,1)}</text>`;}
 [[e.pc,e.ciC,'PSA 对照',summary.arms[0],'#82948e'],[e.pt,e.ciT,'商业广告',summary.arms[1],'#087c63']].forEach(([p,ci,label,a,color],i)=>{const y=55+i*76;body+=`<text x="10" y="${y+7}">${label}</text><rect x="135" y="${y-15}" width="${scale(p)-135}" height="29" rx="3" fill="${color}"/><path d="M${scale(ci[0])},${y} H${scale(ci[1])} M${scale(ci[0])},${y-8} V${y+8} M${scale(ci[1])},${y-8} V${y+8}" stroke="#102c2b" stroke-width="2"/><text x="${scale(ci[1])+10}" y="${y+5}" class="value">${pct(p,3)}</text><text x="135" y="${y+35}">n = ${num(a.users)} · 购买 ${num(a.conversions)}</text>`;});
 return `<figure>${svg('两组用户转化率与 Wilson 95% 区间；横轴从零起',body,225)}<figcaption>横轴：用户转化率；须线：Wilson 95% 置信区间。两组分母分别为各自用户数。</figcaption></figure>`;
}
export function effectChart(summary){const e=effect(summary);if(!e)return empty();const min=Math.min(0,e.ci[0])*1.2,max=Math.max(.001,e.ci[1])*1.25,x=v=>80+(v-min)/(max-min)*540;
 let b=`<path d="M${x(0)},15 V130" stroke="#92a5a0" stroke-dasharray="4 4"/><text x="${x(0)}" y="150" text-anchor="middle">0 · 无差异</text><path d="M${x(e.ci[0])},70 H${x(e.ci[1])}" stroke="#087c63" stroke-width="5"/><circle cx="${x(e.delta)}" cy="70" r="8" fill="#087c63"/>`;
 for(const [v,y] of [[e.ci[0],103],[e.ci[1],103],[e.delta,38]])b+=`<text x="${x(v)}" y="${y}" text-anchor="middle">${num(v*100,3)} pp</text>`;
 return `<figure>${svg('商业广告减 PSA 的转化率差，标注点估计、95% 区间和零基准',b,174)}<figcaption>Newcombe / Wilson 两独立比例差 95% 区间。pp = 百分点。</figcaption></figure>`;
}
export function attributionChart(summary){const e=effect(summary);if(!e)return empty();if(e.incremental<0)return `<p>当前数据估计增量为 ${num(e.incremental,1)} 人；不能显示为正向增加。</p>`;
 const total=summary.arms[1].conversions;if(!total)return '<p>广告组没有购买用户，不能按购买占比绘制分解图；请结合差值区间解释。</p>';const base=e.baseline/total*100;
 return `<figure class="attribution"><div class="stacked" role="img" aria-label="广告组购买分解：PSA 基线估计 ${num(e.baseline,1)} 人，增量估计 ${num(e.incremental,1)} 人"><span style="width:${base}%" class="baseline"></span><span style="width:${100-base}%" class="increment"></span></div><div class="split-labels"><p><i class="dot gray"></i>PSA 基线估计 <b>${num(e.baseline,1)}</b> 人</p><p><i class="dot"></i>增量估计 <b>${num(e.incremental,1)}</b> 人</p></div><figcaption>广告组共 ${num(total)} 位购买用户。分解结果是统计估计，不能逐个识别“被广告说服的人”。</figcaption></figure>`;
}
export function moneyChart(e){if(!e)return empty();const vals=[e.contribution,e.cost,Math.abs(e.net)],max=Math.max(1,...vals)*1.05;
 return `<figure><div class="money-bars">${[['广告带来的增量贡献',e.contribution,'green'],[e.scope==='pilot'?'整个试投的投放成本':'商业曝光投放成本',e.cost,'coral'],['扣投放费后的增量净贡献',e.net,e.net>=0?'green':'coral']].map(([l,v,c])=>`<div><span>${l}</span><b>${usd(v)}</b><div class="money-track"><i class="${c}" style="width:${Math.abs(v)/max*100}%"></i></div></div>`).join('')}</div><figcaption>条形长度统一按美元绝对值编码；成本单列，净贡献正负以数值标明。${e.scope==='pilot'?'包含商业广告与 PSA 曝光。':'当前切换为仅商业曝光成本。'}</figcaption></figure>`;
}
export function explorationChart(summary,dimension='frequency'){
 if(!summary?.usable)return empty();const groups=summary.splits[dimension].filter((_,i)=>dimension!=='hour'||i>=8),max=Math.max(.01,...groups.flatMap(g=>g.arms.map(a=>a.users?a.conversions/a.users:0)))*1.16;
 const width=570/groups.length,x=i=>100+i*width+width/2,y=p=>205-p/max*160;
 let b='';for(let i=0;i<=4;i++){const p=max*i/4;b+=`<path class="grid" d="M70,${y(p)} H690"/><text x="58" y="${y(p)+5}" text-anchor="end">${pct(p,1)}</text>`;}
 [0,1].forEach(arm=>{let points=[];groups.forEach((g,i)=>{const a=g.arms[arm];if(!a.users)return;const xx=x(i),yy=y(a.conversions/a.users);points.push(`${xx},${yy}`);b+=`<circle cx="${xx}" cy="${yy}" r="4" fill="${arm?'#087c63':'#a88370'}"><title>${g.label} ${arm?'商业广告':'PSA'}：${pct(a.conversions/a.users,3)}，n=${a.users}</title></circle>`;});b+=`<polyline fill="none" stroke="${arm?'#087c63':'#a88370'}" stroke-width="2" points="${points.join(' ')}"/>`;});groups.forEach((g,i)=>{b+=`<text x="${x(i)}" y="229" text-anchor="middle" font-size="${groups.length>10?10:12}">${g.label}</text>`;});
 return `<figure>${svg('按投放后变量切片的描述性转化率；不是频次或时段的因果效果',b,254)}<div class="legend"><span><i class="dot"></i>商业广告</span><span><i class="dot brown"></i>PSA</span></div><figcaption>纵轴：切片内购买用户 / 切片内用户。横轴：${{frequency:'累计曝光次数（人为分箱用于展示）',day:'曝光最多的星期',hour:'曝光最多的小时（按原题展示 8–23 时）'}[dimension]}。连线仅连接离散分组；未校正多重比较。</figcaption></figure><details><summary>查看每个切片的分子与分母</summary><div class="table-scroll"><table><thead><tr><th>切片</th><th>PSA 购买 / 用户</th><th>PSA 转化率</th><th>广告购买 / 用户</th><th>广告转化率</th></tr></thead><tbody>${groups.map(g=>`<tr><td>${g.label}</td>${g.arms.map(a=>`<td>${num(a.conversions)} / ${num(a.users)}</td><td>${pct(a.users?a.conversions/a.users:null,3)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

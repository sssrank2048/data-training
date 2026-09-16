import { originalRows, excelColumn, detectHeader, groupRows } from './analytics.mjs';
import { esc, num } from './charts.mjs';

export function explorerSelection(state){return originalRows(state.data,{sheetName:state.rawSheet||state.data?.meta.primarySheet,query:state.rawQuery||'',publisher:state.rawPublisher||'',campaign:state.rawCampaign||'',sort:state.rawSort||'row'})}
export function dataExplorer(state){
 const d=state.data;
 if(!d?.rawSheets)return `<section class="panel"><h2>原始明细查看器</h2><p>载入原始工作簿后，可按工作表、原列和实际行号查看数据。</p></section>`;
 const s=explorerSelection(state),isPrimary=s.sheet?.name===d.meta.primarySheet,all=state.rawColumns==='all',size=state.rawSize||20;
 if(!s.sheet)return '';
 const header=detectHeader(s.sheet.matrix),startCol=s.sheet.startCol||0;
 const core=['publisher','campaign','keyword','status','matchType','clicks','cost','bookings','revenue'];
 const columns=!all&&isPrimary&&header?core.map(f=>header.columns[f]).filter(x=>x!==undefined):Array.from({length:s.columnCount},(_,i)=>i);
 state.rawPage=Math.min(Math.max(0,state.rawPage||0),Math.max(0,Math.ceil(s.rows.length/size)-1));
 const pageRows=s.rows.slice(state.rawPage*size,(state.rawPage+1)*size);
 const selected=s.rows.find(r=>r.rowNumber===state.rawSelected);
 const publishers=groupRows(d.rows,'publisher');
 const campaignRows=d.rows.filter(r=>!state.rawPublisher||r.publisher===state.rawPublisher);
 const selectOptions=(items,value)=>items.map(g=>`<option value="${esc(g.name)}" ${g.name===value?'selected':''}>${esc(g.name)}</option>`).join('');
 const cell=(v)=>v===null||v===undefined||v===''?'<span class="empty-cell" aria-label="空白单元格">∅</span>':esc(String(v));
 return `<section class="panel explorer-panel" id="data-explorer"><div class="section-head no-margin"><div><div class="eyebrow">原始数据 / 可追溯单元格</div><h2>像看工作簿一样查看明细</h2></div><button class="button compact" data-action="download-original">下载完整原文件 ↓</button></div>
 <p>保留原表单元格的值、空白与实际行号。表中数值不经过指标汇总或显示精度舍入；公式单元格展示文件保存的结果，不重算公式。∅ 表示空白，不是零。</p>
 <div class="sheet-tabs" role="group" aria-label="原始工作表">${d.rawSheets.map(sheet=>`<button class="button ${s.sheet.name===sheet.name?'primary':''}" data-action="raw-sheet" data-sheet="${esc(sheet.name)}" aria-pressed="${s.sheet.name===sheet.name}">${esc(sheet.name)}</button>`).join('')}</div>
 <div class="filters raw-filters"><label>搜索原始单元格<input id="raw-query" type="search" value="${esc(state.rawQuery||'')}" placeholder="关键词、ID、策略或其他单元格值"></label><label>渠道<select id="raw-publisher" ${isPrimary?'':'disabled'}><option value="">全部渠道</option>${selectOptions(publishers,state.rawPublisher)}</select></label><label>活动<select id="raw-campaign" ${isPrimary?'':'disabled'}><option value="">全部活动</option>${selectOptions(groupRows(campaignRows,'campaign'),state.rawCampaign)}</select></label><label>排序<select id="raw-sort" ${isPrimary?'':'disabled'}>${[['row','原始行号'],['cost','花费降序'],['bookings','预订降序'],['revenue','收入降序']].map(([k,v])=>`<option value="${k}" ${state.rawSort===k?'selected':''}>${v}</option>`).join('')}</select></label><button class="button primary" data-action="raw-filter">应用查看条件</button><button class="button quiet" data-action="raw-reset">重置</button></div>
 <div class="raw-toolbar"><label>原始列<select id="raw-columns">${[['core','核心原始列'],['all','全部原始列']].map(([k,v])=>`<option value="${k}" ${state.rawColumns===k?'selected':''}>${v}</option>`).join('')}</select></label><label>每页行数<select id="raw-size">${[20,50,100].map(n=>`<option value="${n}" ${size===n?'selected':''}>${n}</option>`).join('')}</select></label><label>跳转到原始行<input id="raw-row-number" type="number" min="1" step="1" placeholder="例如 83"></label><button class="button compact" data-action="raw-jump">定位源行</button><button class="button compact" data-action="raw-export">导出当前筛选 CSV ↓</button></div>
 <p class="small">${esc(s.sheet.name)} · ${num(s.rows.length)} 行（按当前条件；可包含表头、说明和空行）· 当前显示 ${columns.length} / ${s.columnCount} 列。点击行号查看该行全部单元格。改变查看条件不改写数据或学员作答。</p>
 ${s.columnCount?`<div class="table-scroll raw-table-scroll" tabindex="0" role="region" aria-label="原始工作表，可横向滚动"><table class="raw-table"><caption>${esc(s.sheet.name)} 原始单元格 · ${esc(d.meta.filename)}</caption><thead><tr><th scope="col">源行</th>${columns.map(c=>`<th scope="col">${excelColumn(c+startCol)}${header?`<small>${esc(s.sheet.matrix[header.index][c]||'空表头')}</small>`:''}</th>`).join('')}</tr></thead><tbody>${pageRows.map(r=>`<tr ${r.rowNumber===state.rawSelected?'class="selected-source"':''}><th scope="row"><button data-action="raw-select" data-row="${r.rowNumber}" aria-label="查看原始第 ${r.rowNumber} 行">${r.rowNumber}</button></th>${columns.map(c=>`<td>${cell(r.cells[c])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length+1}">没有匹配的原始行，请调整条件。</td></tr>`}</tbody></table></div>`:'<div class="notice"><p>此工作表没有可读取的单元格区域，可能含图形或嵌入对象。已保留原文件，请下载工作簿查看。</p></div>'}
 <div class="pagination"><span>第 ${state.rawPage+1} / ${Math.max(1,Math.ceil(s.rows.length/size))} 页</span><div><button class="button compact" data-action="raw-page" data-delta="-1" ${state.rawPage===0?'disabled':''}>上一页</button> <button class="button compact" data-action="raw-page" data-delta="1" ${(state.rawPage+1)*size>=s.rows.length?'disabled':''}>下一页</button></div></div>
 ${selected?`<section class="raw-inspector" id="raw-inspector" tabindex="-1"><div class="section-head"><h3>${esc(s.sheet.name)}!${selected.rowNumber} · 全部原始单元格</h3><span class="pill">${s.columnCount} 列</span></div><div class="raw-cells">${Array.from({length:s.columnCount},(_,c)=>`<div><code>${excelColumn(c+startCol)}${selected.rowNumber}</code><span>${esc(header?s.sheet.matrix[header.index][c]||'空表头':'原始值')}</span><strong>${cell(selected.cells[c])}</strong></div>`).join('')}</div></section>`:''}
 </section>`;
}

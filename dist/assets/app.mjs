import { sources, lessons, assignments } from './course.mjs';
import { caseFile, fieldGroups } from './case-source.mjs';
import { esc } from './charts.mjs';

export function datasetIntro(localAvailable, data) {
  return `<section class="panel dataset-intro" aria-labelledby="dataset-title">
    <div class="section-head no-margin"><div><div class="eyebrow">01 / 先认识数据</div><h2 id="dataset-title">一份完整工作簿，两个分析范围</h2></div><span class="pill ${localAvailable ? 'ready' : 'subtle'}">${localAvailable ? '完整镜像已下载到本机' : '完整镜像可下载'}</span></div>
    <p>Kellogg Air France 案例 KEL319 的配套数据编号为 KEL321。这里准备的是公开仓库中的完整 XLS 副本，保留原表与原始记录，没有生成或补造经营数据。</p>
    <div class="dataset-numbers"><div><strong>4,510</strong><span>DoubleClick 明细记录</span></div><div><strong>7</strong><span>渠道原始标签</span></div><div><strong>24</strong><span>不同活动名称</span></div><div><strong>23</strong><span>主表非空字段</span></div></div>
    <div class="workbook-sheets"><article><span>工作表 01</span><h3>Copyright</h3><p>原工作簿的版权说明，完整保留。</p></article><article><span>工作表 02 · 主分析表</span><h3>DoubleClick</h3><p>关键词投放记录。按渠道 → 活动 → 关键词分析曝光、点击、花费、预订和收入。主表没有日期列。</p></article><article><span>工作表 03 · 独立汇总</span><h3>Kayak</h3><p>2007-06-04 至 06-10 的单周表现。与主表期间未证实一致，第四题单独比较。</p></article></div>
    <div class="dataset-actions">${localAvailable ? `<a class="button primary" href="/__local/${caseFile.filename}" download="${caseFile.filename}">下载完整 Excel · 1.98 MB ↓</a><button class="button" data-action="load-local">载入已下载数据</button>` : `<a class="button primary" href="${caseFile.url}" target="_blank" rel="noopener">下载完整 Excel · 1.98 MB ↗</a><button class="button" data-action="load-mirror">载入公开镜像</button>`}<a class="button quiet" href="#data">字段字典与原表预览 →</a></div>
    <p id="dataset-message" class="small" role="status">${data ? `当前分析文件：${esc(data.meta.filename)}，${data.rows.length.toLocaleString('zh-CN')} 条记录。` : '读取文件后生成图表；数据只在此浏览器处理，不上传。'}</p>
    <details class="provenance-details"><summary>查看文件来源与完整性校验</summary><p>文件 ${caseFile.filename} · ${caseFile.bytes.toLocaleString('zh-CN')} 字节 · ${caseFile.sheets.join(' / ')}。上方规模来自已核验镜像，不代替你导入的其他文件。</p><p>公开镜像未与出版方文件逐字节核对，不能标为“官方认证”。保留 Copyright 表；公开可下载不等于课程分发授权。</p><p><a href="${caseFile.repository}" target="_blank" rel="noopener">查看镜像仓库 ↗</a> · <a href="${sources.data}" target="_blank" rel="noopener">出版方 KEL321 入口 ↗</a></p><div class="file-hash">SHA-256 <code>${caseFile.sha256}</code></div></details>
  </section>`;
}

export function caseStory() {
  return `<section class="case-story" aria-labelledby="story-title"><div class="story-lead"><div class="eyebrow">02 / 案例的业务起点</div><h2 id="story-title">Air France 的搜索广告，<br>下一步该怎样投？</h2><div class="story-person">Rob Griffin<small>Media Contacts · 美国搜索业务负责人</small></div></div><div class="story-copy"><p>Rob Griffin 面临的任务，是帮助 Air France 改善搜索营销，让广告投入带来更好的在线机票销售表现。</p><p>摆在团队面前的选择有两个层次：在 Google、MSN、Yahoo 等渠道间怎样配置投入；在渠道内部，又该选择哪些关键词与出价策略。案例同时把 Kayak 纳入了渠道选择的讨论。</p><p>要做出建议，团队需要先约定成功指标，再比较渠道和活动。你将沿着这条决策线阅读配套工作簿，最后回答：哪些投放应调整，Kayak 的机会又应如何验证。</p><p class="story-source">业务背景据 <a href="${sources.case}" target="_blank" rel="noopener">Kellogg 官方案例摘要 ↗</a> 概述。课堂分析角色是教学安排；未添加虚构人物、预算或经营事件。</p></div></section>`;
}

export function questionSource(a) {
  return `<div class="case-basis"><span class="eyebrow">案例依据 · 对应讨论主题 ${a.originNumber}</span><p><strong>${a.origin}</strong></p><p>${a.basis}</p><a href="${sources.case}" target="_blank" rel="noopener">官方学习目标 ↗</a> · <a href="${sources.questions}" target="_blank" rel="noopener">四项讨论主题出处（课程大纲转载）↗</a><p class="small">题干为中文重述；分析步骤、时间和评分为本课上机安排，不是官方原题逐字译文或标准答案。</p></div>`;
}

export function sourceMapping() {
  return `<section class="panel"><h2>四题与实际案例怎样对应</h2><p>题目依据官方案例学习目标，以及 Brandeis BUS 257f 课程大纲转载中列出的四项 Air France 讨论主题。为便于上机，先做指标题，再做渠道、活动和未来 SEM；没有新增虚构经营情节。</p><div class="table-scroll"><table><caption>本课顺序 → 参考讨论主题</caption><thead><tr><th>本课四题</th><th>对应主题</th><th>本课可视化</th></tr></thead><tbody>${lessons.map((l,i)=>`<tr><th><a href="#${l.id}">${l.n} ${l.title}</a></th><td>第 ${assignments[l.id].originNumber} 项：${assignments[l.id].origin}</td><td>${['指标卡与投放路径','CPC–CVR 四象限与渠道规模','活动花费、策略比较与源行明细','Kayak 独立指标与渠道效率参照'][i]}</td></tr>`).join('')}</tbody></table></div><p class="small"><a href="${sources.questions}" target="_blank" rel="noopener">查看大纲转载中的 Air France 章节 ↗</a>（第三方转载，未找到学校当前托管原件） · <a href="${sources.nyu}" target="_blank" rel="noopener">NYU Stern 官方课程大纲 ↗</a> 用于核实该案例的课程采用情况，不作为四题逐字来源。</p></section>`;
}

export function fieldDictionary() {
  return `<section class="panel"><h2>数据里有什么</h2><div class="table-scroll"><table><caption>已核验镜像的 23 个非空主表字段，按分析用途分组</caption><thead><tr><th>用途</th><th>原始字段</th><th>怎样使用</th></tr></thead><tbody>${fieldGroups.map(([a,b,c])=>`<tr><th>${a}</th><td class="prose-cell">${b}</td><td class="prose-cell">${c}</td></tr>`).join('')}</tbody></table></div><p class="small">一行是原表的一条关键词投放记录，不是一个用户、一次点击或一天。24 个活动名称分布在 45 个“渠道 + 活动”组合中。DoubleClick 是工作表名称，不能当成一个渠道与 Google 相加。</p><div class="notice info"><p>没有日期序列、广告文案、落地页、用户路径、退款、机票成本或实验分组。本课覆盖搜索广告的目标评价 → 渠道配置 → 投放优化 → 未来方案与复盘；不把缺失环节伪装成完整观测。</p></div></section>`;
}

export function overview(localAvailable, data) {
  return `<div class="page-head"><div><div class="eyebrow">AIR FRANCE / KELLOGG CASE KEL319</div><h1>从真实投放数据，走进经营决策。</h1><p>先认识工作簿，再读业务背景，最后完成源于实际案例的四道上机题。</p></div><div class="head-meta">120 MIN<br>产品 · 运营 · 数据分析</div></div>${datasetIntro(localAvailable,data)}${caseStory()}<section class="question-overview"><div class="section-head"><div><div class="eyebrow">03 / 四道题，形成一份 SEM 建议</div><h2>从指标到投放方案</h2></div><a class="button compact" href="/downloads/course-guide.md" download>下载完整题目 ↓</a></div><p>10 分钟数据与案例导入 + 100 分钟上机 + 10 分钟讲评。题目说明始终可读；先保存独立初判，再使用计算工作台核对。</p><div class="lesson-grid">${lessons.map(l=>`<article class="lesson"><div class="lesson-top"><span class="lesson-number">${l.n}</span><span class="lesson-time">${l.time} 分钟</span></div><div class="lesson-tag">${l.tag} · 参考主题 ${assignments[l.id].originNumber}</div><h3><a href="#${l.id}">${l.title}</a></h3><p>${l.desc}</p><div class="lesson-bottom"><span>${l.output}</span><a href="#${l.id}" aria-label="阅读第 ${l.n} 题完整介绍">完整题目 ↗</a></div></article>`).join('')}</div></section>${sourceMapping()}`;
}
